import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(
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
      include: {
        program: { select: { id: true, titleEn: true, titleAr: true } },
        questions: { orderBy: { order: "asc" } }
      }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    // Fetch all attempts for this exam
    const attempts = await prisma.examAttempt.findMany({
      where: { examId: id },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
            studentUniqueId: true
          }
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                order: true,
                questionText: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
                correctOption: true,
                marks: true
              }
            }
          }
        }
      },
      orderBy: { startedAt: "desc" }
    });

    const now = new Date();

    // Group into active (in-progress) and submitted
    const inProgress = attempts
      .filter(a => a.status === "IN_PROGRESS")
      .map(attempt => {
        const started = new Date(attempt.startedAt).getTime();
        const durationMs = exam.durationMinutes * 60 * 1000;
        const elapsedMs = now.getTime() - started;
        const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
        const answeredCount = attempt.answers.filter(ans => ans.selectedOption !== null).length;

        return {
          id: attempt.id,
          student: attempt.student,
          startedAt: attempt.startedAt,
          answeredCount,
          totalQuestions: exam.questions.length,
          remainingSeconds,
          tabSwitches: attempt.tabSwitches,
          hasExpired: remainingSeconds <= 0
        };
      });

    const submitted = attempts
      .filter(a => a.status === "SUBMITTED" || a.status === "TIMED_OUT")
      .map(attempt => {
        return {
          id: attempt.id,
          student: attempt.student,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          status: attempt.status,
          scoreObtained: attempt.scoreObtained ?? 0,
          totalMarks: exam.totalMarks,
          grade: attempt.grade || "F",
          tabSwitches: attempt.tabSwitches,
          answers: attempt.answers.map(ans => ({
            questionOrder: ans.question.order,
            questionText: ans.question.questionText,
            optionA: ans.question.optionA,
            optionB: ans.question.optionB,
            optionC: ans.question.optionC,
            optionD: ans.question.optionD,
            selectedOption: ans.selectedOption,
            correctOption: ans.question.correctOption,
            isCorrect: ans.isCorrect ?? false,
            marksAwarded: ans.marksAwarded ?? 0,
            questionMarks: ans.question.marks
          })).sort((a, b) => a.questionOrder - b.questionOrder)
        };
      });

    // Also get list of enrolled students who haven't started yet
    const enrollments = await prisma.enrollment.findMany({
      where: { programId: exam.programId, approvalStatus: "APPROVED" },
      include: {
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } }
      }
    });

    const attemptedStudentIds = new Set(attempts.map(a => a.studentId));
    const notStarted = enrollments
      .filter(e => !attemptedStudentIds.has(e.user.id))
      .map(e => e.user);

    return NextResponse.json({
      success: true,
      data: {
        exam,
        stats: {
          totalEnrolled: enrollments.length,
          inProgressCount: inProgress.length,
          submittedCount: submitted.length,
          notStartedCount: notStarted.length
        },
        inProgress,
        submitted,
        notStarted
      }
    });
  } catch (error) {
    console.error("GET /api/teacher/exams/[id]/monitor error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
