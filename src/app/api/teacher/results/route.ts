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
      if (verified.payload.role !== "TEACHER" && verified.payload.role !== "ADMIN") throw new Error();
    } catch {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) {
      return NextResponse.json({ success: false, error: "Program ID required." }, { status: 400 });
    }

    // 1. Get all students enrolled in this program
    const enrollments = await prisma.enrollment.findMany({
      where: { programId, approvalStatus: "APPROVED" },
      include: {
        user: { select: { id: true, fullName: true } },
        program: { select: { maxExamMark: true } }
      }
    });

    if (enrollments.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const studentIds = enrollments.map(e => e.user.id);
    const maxExamMark = enrollments[0].program.maxExamMark;

    // 2. Aggregate sum of daily marks per student
    const dailyMarksSum = await prisma.dailyMark.groupBy({
      by: ['studentId'],
      where: { programId, studentId: { in: studentIds } },
      _sum: { score: true }
    });

    // 3. Get exam marks per student
    const examMarks = await prisma.examMark.findMany({
      where: { programId, studentId: { in: studentIds } }
    });

    // 4. Combine, Calculate, and Sort exactly like the old PHP script
    const finalResults = enrollments.map(enrollment => {
      const studentId = enrollment.user.id;
      
      const dailySumObj = dailyMarksSum.find(d => d.studentId === studentId);
      const programTotalScore = dailySumObj?._sum.score || 0;
      
      const examObj = examMarks.find(e => e.studentId === studentId);
      const finalExamScore = examObj?.score || 0;
      
      const totalScore = programTotalScore + finalExamScore;

      return {
        fullName: enrollment.user.fullName,
        programTotalScore,
        finalExamScore,
        totalScore,
        maxExamMark
      };
    });

    // Sort: Highest Total Score First, then Alphabetical
    finalResults.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({ success: true, data: finalResults });
  } catch (error) {
    console.error("Results API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
