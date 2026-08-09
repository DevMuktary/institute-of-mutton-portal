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

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      if (verified.payload.role !== "TEACHER" && verified.payload.role !== "ADMIN") {
        return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) return NextResponse.json({ success: false, error: "Program ID required." }, { status: 400 });

    // Fetch students with all their daily marks and exam marks for this program
    const enrollments = await prisma.enrollment.findMany({
      where: { programId, approvalStatus: "APPROVED" },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            studentUniqueId: true,
            dailyMarks: {
              where: { programId },
              orderBy: { dayNumber: 'asc' }
            },
            examMarks: true 
          }
        }
      },
      orderBy: { user: { fullName: 'asc' } }
    });

    const students = enrollments.map(e => e.user);

    // Find the maximum day number across all students to build our table columns
    let maxDay = 0;
    students.forEach(student => {
      student.dailyMarks.forEach(mark => {
        if (mark.dayNumber > maxDay) maxDay = mark.dayNumber;
      });
    });

    return NextResponse.json({ 
      success: true, 
      data: { students, maxDay } 
    }, { status: 200 });

  } catch (error) {
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}