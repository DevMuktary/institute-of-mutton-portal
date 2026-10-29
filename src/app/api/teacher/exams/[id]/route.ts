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
        program: { select: { id: true, titleEn: true, titleAr: true, slug: true } },
        questions: { orderBy: { order: "asc" } },
        _count: { select: { attempts: true } }
      }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: exam });
  } catch (error) {
    console.error("GET /api/teacher/exams/[id] error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      title,
      description,
      instructions,
      startsAt,
      endsAt,
      durationMinutes,
      status,
      totalMarks,
      markPerQuestion,
      questions
    } = body;

    const existingExam = await prisma.exam.findUnique({ where: { id } });
    if (!existingExam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (instructions !== undefined) updateData.instructions = instructions ? instructions.trim() : null;
    if (startsAt) updateData.startsAt = new Date(startsAt);
    if (endsAt) updateData.endsAt = new Date(endsAt);
    if (durationMinutes) updateData.durationMinutes = parseInt(durationMinutes, 10);
    if (status) updateData.status = status;
    if (totalMarks !== undefined) updateData.totalMarks = Number(totalMarks);
    if (markPerQuestion !== undefined) updateData.markPerQuestion = Number(markPerQuestion);

    // If questions are updated
    if (Array.isArray(questions)) {
      // Delete existing questions and replace
      await prisma.examQuestion.deleteMany({ where: { examId: id } });
      updateData.questions = {
        create: questions.map((q: any, index: number) => ({
          order: index + 1,
          questionText: q.questionText?.trim() || "",
          optionA: q.optionA?.trim() || "",
          optionB: q.optionB?.trim() || "",
          optionC: q.optionC?.trim() || "",
          optionD: q.optionD?.trim() || "",
          correctOption: q.correctOption?.toUpperCase() || "A",
          marks: Number(q.marks) || Number(existingExam.markPerQuestion) || 2
        }))
      };
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: updateData,
      include: { questions: { orderBy: { order: "asc" } } }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PUT /api/teacher/exams/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update exam." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.exam.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Exam deleted successfully." });
  } catch (error) {
    console.error("DELETE /api/teacher/exams/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete exam." }, { status: 500 });
  }
}
