import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            order: true,
            questionText: true,
            optionA: true,
            optionB: true,
            optionC: true,
            optionD: true,
            marks: true
            // IMPORTANT: correctOption is strictly omitted!
          }
        }
      }
    });

    if (!exam || exam.status !== "PUBLISHED") {
      return NextResponse.json({ success: false, error: "Examination not available." }, { status: 404 });
    }

    // Verify enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_programId: {
          userId: user.id,
          programId: exam.programId
        }
      }
    });

    if (!enrollment || enrollment.approvalStatus !== "APPROVED") {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const now = new Date();

    // Check window
    if (now < new Date(exam.startsAt)) {
      return NextResponse.json({ success: false, error: "This exam has not opened yet." }, { status: 400 });
    }

    if (now > new Date(exam.endsAt)) {
      return NextResponse.json({ success: false, error: "The window for this exam has closed." }, { status: 400 });
    }

    // Check or create attempt
    let attempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: user.id,
          examId: id
        }
      },
      include: {
        answers: true
      }
    });

    if (attempt) {
      if (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT") {
        return NextResponse.json(
          { success: false, error: "You have already completed and submitted this examination." },
          { status: 403 }
        );
      }
    } else {
      // Create new attempt
      attempt = await prisma.examAttempt.create({
        data: {
          studentId: user.id,
          examId: id,
          status: "IN_PROGRESS",
          startedAt: now
        },
        include: {
          answers: true
        }
      });
    }

    // Calculate remaining seconds
    const started = new Date(attempt.startedAt).getTime();
    const durationMs = exam.durationMinutes * 60 * 1000;
    const elapsedMs = now.getTime() - started;
    const remainingSeconds = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));

    if (remainingSeconds <= 0) {
      // Time expired
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: "TIMED_OUT", submittedAt: now }
      });
      return NextResponse.json(
        { success: false, error: "Your allotted exam duration has expired." },
        { status: 403 }
      );
    }

    // Map existing answers
    const answersMap: Record<string, string> = {};
    attempt.answers.forEach(ans => {
      if (ans.selectedOption) {
        answersMap[ans.questionId] = ans.selectedOption;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        examTitle: exam.title,
        durationMinutes: exam.durationMinutes,
        remainingSeconds,
        questions: exam.questions,
        answers: answersMap,
        tabSwitches: attempt.tabSwitches
      }
    });
  } catch (error) {
    console.error("POST /api/exam/[id]/start error:", error);
    return NextResponse.json({ success: false, error: "Failed to initialize examination session." }, { status: 500 });
  }
}
