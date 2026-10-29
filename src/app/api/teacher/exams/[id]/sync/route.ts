import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: { program: true }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    // Get all submitted attempts
    const submittedAttempts = await prisma.examAttempt.findMany({
      where: {
        examId: id,
        status: { in: ["SUBMITTED", "TIMED_OUT"] }
      }
    });

    if (submittedAttempts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No submitted attempts to sync for this examination."
      }, { status: 400 });
    }

    // Sync each student's score into ExamMark for the program
    let syncedCount = 0;
    for (const attempt of submittedAttempts) {
      const score = attempt.scoreObtained ?? 0;

      await prisma.examMark.upsert({
        where: {
          studentId_programId: {
            studentId: attempt.studentId,
            programId: exam.programId
          }
        },
        update: {
          score: score,
          date: new Date()
        },
        create: {
          studentId: attempt.studentId,
          programId: exam.programId,
          score: score,
          date: new Date()
        }
      });
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${syncedCount} student examination score(s) to the Master Marksheet.`,
      syncedCount
    });
  } catch (error) {
    console.error("POST /api/teacher/exams/[id]/sync error:", error);
    return NextResponse.json({ success: false, error: "Failed to synchronize exam scores." }, { status: 500 });
  }
}
