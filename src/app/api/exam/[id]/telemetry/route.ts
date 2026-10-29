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

    const attempt = await prisma.examAttempt.findUnique({
      where: {
        studentId_examId: {
          studentId: user.id,
          examId: id
        }
      }
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ success: true });
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { tabSwitches: { increment: 1 } },
      select: { tabSwitches: true }
    });

    return NextResponse.json({ success: true, tabSwitches: updated.tabSwitches });
  } catch (error) {
    console.error("POST /api/exam/[id]/telemetry error:", error);
    return NextResponse.json({ success: true }); // Silent fail to avoid disrupting student
  }
}
