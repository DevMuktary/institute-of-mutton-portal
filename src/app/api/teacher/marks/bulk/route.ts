import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

// Helper to authenticate teacher
async function authenticateTeacher() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload;
    if (payload.role !== "TEACHER" && payload.role !== "ADMIN") return null;
    return payload;
  } catch {
    return null;
  }
}

// GET: Fetch existing marks for a specific program and day
export async function GET(request: NextRequest) {
  try {
    const teacher = await authenticateTeacher();
    if (!teacher) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const dayNumber = parseInt(searchParams.get("dayNumber") || "1");

    if (!programId) return NextResponse.json({ success: false, error: "Program ID required." }, { status: 400 });

    const marks = await prisma.dailyMark.findMany({
      where: { programId, dayNumber }
    });

    return NextResponse.json({ success: true, data: marks }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}

// POST: Save or update an entire day's marks at once
export async function POST(request: NextRequest) {
  try {
    const teacher = await authenticateTeacher();
    if (!teacher) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { programId, dayNumber, marks } = body; 
    // marks is an array: [{ studentId, score, notes }]

    if (!programId || !dayNumber || !Array.isArray(marks)) {
       return NextResponse.json({ success: false, error: "Invalid data format." }, { status: 400 });
    }

    const teacherId = teacher.id as string;

    // Use Prisma's interactive transaction to upsert (update if exists, insert if new) all marks at once
    const operations = marks.map((mark) => 
      prisma.dailyMark.upsert({
        where: {
          studentId_programId_dayNumber: {
            studentId: mark.studentId,
            programId: programId,
            dayNumber: dayNumber
          }
        },
        update: {
          score: parseFloat(mark.score),
          notes: mark.notes || null,
          teacherId: teacherId
        },
        create: {
          studentId: mark.studentId,
          programId: programId,
          dayNumber: dayNumber,
          score: parseFloat(mark.score),
          notes: mark.notes || null,
          teacherId: teacherId
        }
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({ success: true, message: "Marks saved successfully." }, { status: 200 });
  } catch (error) {
    console.error("Bulk Mark Logging Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}