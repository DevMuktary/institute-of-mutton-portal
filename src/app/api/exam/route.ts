import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get user's approved enrollments
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: user.id, approvalStatus: "APPROVED" },
      select: { programId: true }
    });

    const programIds = enrollments.map(e => e.programId);
    if (programIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Fetch published exams for these programs
    const exams = await prisma.exam.findMany({
      where: {
        programId: { in: programIds },
        status: "PUBLISHED"
      },
      include: {
        program: {
          select: { id: true, titleEn: true, titleAr: true, slug: true }
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
      },
      orderBy: { startsAt: "asc" }
    });

    const now = new Date();

    const formattedExams = exams.map(exam => {
      const attempt = exam.attempts[0] || null;
      let state: "UPCOMING" | "OPEN" | "IN_PROGRESS" | "COMPLETED" | "CLOSED" = "UPCOMING";

      if (attempt?.status === "SUBMITTED" || attempt?.status === "TIMED_OUT") {
        state = "COMPLETED";
      } else if (attempt?.status === "IN_PROGRESS") {
        const started = new Date(attempt.startedAt).getTime();
        const durationMs = exam.durationMinutes * 60 * 1000;
        const elapsed = now.getTime() - started;
        if (elapsed > durationMs + 60000) {
          state = "COMPLETED"; // Expired
        } else {
          state = "IN_PROGRESS";
        }
      } else if (now < new Date(exam.startsAt)) {
        state = "UPCOMING";
      } else if (now >= new Date(exam.startsAt) && now <= new Date(exam.endsAt)) {
        state = "OPEN";
      } else {
        state = "CLOSED";
      }

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        program: exam.program,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        durationMinutes: exam.durationMinutes,
        totalMarks: exam.totalMarks,
        questionsCount: exam._count.questions,
        state,
        attempt: attempt ? { id: attempt.id, status: attempt.status } : null
      };
    });

    return NextResponse.json({ success: true, data: formattedExams });
  } catch (error) {
    console.error("GET /api/exam error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}
