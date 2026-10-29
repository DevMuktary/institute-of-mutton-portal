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
        user: { select: { id: true, fullName: true } }
      }
    });

    if (enrollments.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const studentIds = enrollments.map(e => e.user.id);

    // 2. Aggregate sum of daily marks per student
    const dailyMarksSum = await prisma.dailyMark.groupBy({
      by: ['studentId'],
      where: { programId, studentId: { in: studentIds } },
      _sum: { score: true }
    });

    // 3. Fetch Exam Marks per student
    const examMarks = await prisma.examMark.findMany({
      where: { programId, studentId: { in: studentIds } }
    });

    // 4. Combine, Calculate Grand Total, and Assign Grade
    const finalResults = enrollments.map(enrollment => {
      const studentId = enrollment.user.id;
      
      const dailySumObj = dailyMarksSum.find(d => d.studentId === studentId);
      const dailyScore = dailySumObj?._sum.score || 0;

      const examMarkObj = examMarks.find(em => em.studentId === studentId);
      const examScore = examMarkObj?.score !== null && examMarkObj?.score !== undefined 
        ? Number(examMarkObj.score) 
        : null;

      const grandTotal = dailyScore + (examScore ?? 0);

      let grade = "-";
      if (examScore !== null) {
        // Compute letter grade on 60 or scale
        const pct = (examScore / 60) * 100;
        if (pct >= 80) grade = "A";
        else if (pct >= 65) grade = "B";
        else if (pct >= 50) grade = "C";
        else if (pct >= 40) grade = "D";
        else grade = "F";
      }

      return {
        studentId,
        fullName: enrollment.user.fullName,
        dailyScore,
        examScore: examScore !== null ? examScore : "--",
        hasExamScore: examScore !== null,
        grandTotal,
        grade,
        programTotalScore: dailyScore // Kept for backwards compatibility
      };
    });

    // Sort: Highest Grand Total First, then Alphabetical
    finalResults.sort((a, b) => {
      if (b.grandTotal !== a.grandTotal) return b.grandTotal - a.grandTotal;
      return a.fullName.localeCompare(b.fullName);
    });

    return NextResponse.json({ success: true, data: finalResults });
  } catch (error) {
    console.error("Results API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
