import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, calculateGrade } from "@/lib/auth";

// DELETE /api/teacher/exams/[id]/attempts/[attemptId]
// Deletes a student's attempt to allow them to retake the exam from scratch
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { id: examId, attemptId } = await params;

    // Verify attempt belongs to this exam
    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, examId },
      include: {
        exam: { select: { programId: true } },
        student: { select: { fullName: true } }
      }
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found for this examination." }, { status: 404 });
    }

    // Delete attempt (cascade deletes ExamAnswer automatically)
    await prisma.examAttempt.delete({
      where: { id: attemptId }
    });

    // Also remove the student's master marksheet entry for this program so it resets cleanly
    await prisma.examMark.deleteMany({
      where: {
        studentId: attempt.studentId,
        programId: attempt.exam.programId
      }
    });

    return NextResponse.json({
      success: true,
      message: `Exam attempt for ${attempt.student.fullName} has been reset. The student can now retake the examination.`
    });
  } catch (error) {
    console.error("DELETE /api/teacher/exams/[id]/attempts/[attemptId] error:", error);
    return NextResponse.json({ success: false, error: "Failed to reset examination attempt." }, { status: 500 });
  }
}

// PUT /api/teacher/exams/[id]/attempts/[attemptId]
// Manually adjusts a student's exam score and updates their grade in both attempt and master marksheet
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { id: examId, attemptId } = await params;
    const body = await request.json();
    const { score } = body;

    const numericScore = parseFloat(score);

    const attempt = await prisma.examAttempt.findFirst({
      where: { id: attemptId, examId },
      include: {
        exam: { select: { totalMarks: true, programId: true } },
        student: { select: { fullName: true } }
      }
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "Attempt not found for this examination." }, { status: 404 });
    }

    if (isNaN(numericScore) || numericScore < 0 || numericScore > attempt.exam.totalMarks) {
      return NextResponse.json({
        success: false,
        error: `Score must be a number between 0 and ${attempt.exam.totalMarks}.`
      }, { status: 400 });
    }

    const newGrade = calculateGrade(numericScore, attempt.exam.totalMarks);

    // Update attempt
    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        scoreObtained: numericScore,
        grade: newGrade
      }
    });

    // Sync to ExamMark for Master Marksheet and certificates
    await prisma.examMark.upsert({
      where: {
        studentId_programId: {
          studentId: attempt.studentId,
          programId: attempt.exam.programId
        }
      },
      update: {
        score: numericScore,
        date: new Date()
      },
      create: {
        studentId: attempt.studentId,
        programId: attempt.exam.programId,
        score: numericScore,
        date: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Score for ${attempt.student.fullName} updated to ${numericScore}/${attempt.exam.totalMarks} (Grade ${newGrade}).`,
      data: updated
    });
  } catch (error) {
    console.error("PUT /api/teacher/exams/[id]/attempts/[attemptId] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update student score." }, { status: 500 });
  }
}

