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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ enrollmentId: string }> }
) {
  try {
    const { enrollmentId } = await context.params;

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired. Please log in again." }, { status: 401 });
    }

    const userId = payload.id as string;

    // 1. Verify the enrollment belongs to this user
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        program: {
          select: { id: true, titleEn: true, maxDailyMark: true }
        }
      }
    });

    if (!enrollment || enrollment.userId !== userId) {
      return NextResponse.json({ success: false, error: "Enrollment not found or unauthorized." }, { status: 404 });
    }

    // 2. Fetch all daily marks for this specific student and program
    const marks = await prisma.dailyMark.findMany({
      where: {
        studentId: userId,
        programId: enrollment.program.id
      },
      orderBy: { date: 'desc' }, // Newest first
    });

    return NextResponse.json({ 
      success: true, 
      data: {
        program: enrollment.program,
        marks: marks
      } 
    }, { status: 200 });

  } catch (error) {
    console.error("Fetch marks API Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}