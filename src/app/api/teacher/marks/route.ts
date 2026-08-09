import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
    }

    if (payload.role !== "TEACHER" && payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, programId, dayNumber, score, notes } = body;

    if (!studentId || !programId || !dayNumber || score === undefined || score === "") {
       return NextResponse.json({ success: false, error: "All fields are required." }, { status: 400 });
    }

    const program = await prisma.program.findUnique({ where: { id: programId } });
    if (!program) return NextResponse.json({ success: false, error: "Program not found." }, { status: 404 });

    const numScore = parseFloat(score);
    if (numScore < 0 || numScore > program.maxDailyMark) {
       return NextResponse.json({ success: false, error: `Score must be between 0 and ${program.maxDailyMark}.` }, { status: 400 });
    }

    // Using upsert ensures we don't violate the unique constraint if a mark already exists
    const mark = await prisma.dailyMark.upsert({
      where: {
        studentId_programId_dayNumber: {
          studentId,
          programId,
          dayNumber: parseInt(dayNumber)
        }
      },
      update: {
        score: numScore,
        notes: notes || null,
        teacherId: payload.id as string
      },
      create: {
        studentId,
        programId,
        dayNumber: parseInt(dayNumber),
        score: numScore,
        notes: notes || null,
        teacherId: payload.id as string
      }
    });

    return NextResponse.json({ success: true, data: mark }, { status: 201 });
  } catch (error) {
    console.error("Mark Logging API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}