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
    const body = await request.json();
    const { questionId, selectedOption } = body;

    if (!questionId || !selectedOption) {
      return NextResponse.json({ success: false, error: "Question ID and option are required." }, { status: 400 });
    }

    const optionNormalized = selectedOption.toUpperCase();
    if (!["A", "B", "C", "D"].includes(optionNormalized)) {
      return NextResponse.json({ success: false, error: "Invalid option selected." }, { status: 400 });
    }

    // Verify active attempt
    const attempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: user.id,
          examId: id
        }
      },
      include: { exam: true }
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ success: false, error: "No active examination in progress." }, { status: 403 });
    }

    // Check timer duration
    const started = new Date(attempt.startedAt).getTime();
    const durationMs = (attempt.exam.durationMinutes * 60 + 30) * 1000; // 30s grace period for latency
    const now = Date.now();

    if (now - started > durationMs) {
      return NextResponse.json({ success: false, error: "Exam time has expired." }, { status: 403 });
    }

    // Upsert answer
    const answer = await prisma.examAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId: attempt.id,
          questionId
        }
      },
      update: {
        selectedOption: optionNormalized
      },
      create: {
        attemptId: attempt.id,
        questionId,
        selectedOption: optionNormalized
      }
    });

    return NextResponse.json({ success: true, data: { questionId, selectedOption: answer.selectedOption } });
  } catch (error) {
    console.error("POST /api/exam/[id]/answer error:", error);
    return NextResponse.json({ success: false, error: "Failed to save response." }, { status: 500 });
  }
}
