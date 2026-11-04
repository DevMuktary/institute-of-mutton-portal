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

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: user.id,
          examId: id
        }
      },
      include: {
        exam: {
          select: {
            durationMinutes: true,
            endsAt: true,
            startsAt: true,
            status: true
          }
        }
      }
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({
        success: true,
        data: {
          isActive: false,
          remainingSeconds: 0
        }
      });
    }

    const now = Date.now();
    const started = new Date(attempt.startedAt).getTime();
    const durationMs = attempt.exam.durationMinutes * 60 * 1000;
    const elapsedMs = now - started;

    const remainingFromDuration = Math.max(0, Math.floor((durationMs - elapsedMs) / 1000));
    const remainingFromWindow = Math.max(0, Math.floor((new Date(attempt.exam.endsAt).getTime() - now) / 1000));
    const remainingSeconds = Math.min(remainingFromDuration, remainingFromWindow);

    return NextResponse.json({
      success: true,
      data: {
        isActive: remainingSeconds > 0,
        remainingSeconds,
        durationMinutes: attempt.exam.durationMinutes,
        endsAt: attempt.exam.endsAt
      }
    });
  } catch (error) {
    console.error("GET /api/exam/[id]/time error:", error);
    return NextResponse.json({ success: false, error: "Failed to sync time" }, { status: 500 });
  }
}

