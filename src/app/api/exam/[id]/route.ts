import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(
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
        program: {
          select: { id: true, titleEn: true, titleAr: true }
        },
        attempts: {
          where: { studentId: user.id },
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true
          }
        },
        _count: {
          select: { questions: true }
        }
      }
    });

    if (!exam || exam.status !== "PUBLISHED") {
      return NextResponse.json({ success: false, error: "Exam not found or unavailable." }, { status: 404 });
    }

    // Verify student is enrolled in the program
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_programId: {
          userId: user.id,
          programId: exam.programId
        }
      }
    });

    if (!enrollment || enrollment.approvalStatus !== "APPROVED") {
      return NextResponse.json({ success: false, error: "You are not enrolled in this program." }, { status: 403 });
    }

    const now = new Date();
    const attempt = exam.attempts[0] || null;

    const isSubmitted = attempt?.status === "SUBMITTED" || attempt?.status === "TIMED_OUT";
    const isWithinWindow = now >= new Date(exam.startsAt) && now <= new Date(exam.endsAt);

    return NextResponse.json({
      success: true,
      data: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        program: exam.program,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        questionsCount: exam._count.questions,
        isWithinWindow,
        isSubmitted,
        attempt: attempt ? { id: attempt.id, status: attempt.status, startedAt: attempt.startedAt } : null
      }
    });
  } catch (error) {
    console.error("GET /api/exam/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
