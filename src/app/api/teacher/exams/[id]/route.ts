import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { parseExamDateOnServer } from "@/lib/timezone";

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

    const existingExam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            _count: { select: { answers: true } }
          }
        },
        _count: { select: { attempts: true } }
      }
    });
    if (!existingExam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (instructions !== undefined) updateData.instructions = instructions ? instructions.trim() : null;
    if (startsAt) updateData.startsAt = parseExamDateOnServer(startsAt);
    if (endsAt) updateData.endsAt = parseExamDateOnServer(endsAt);
    if (durationMinutes) updateData.durationMinutes = parseInt(durationMinutes, 10);
    if (status) updateData.status = status;
    if (totalMarks !== undefined) updateData.totalMarks = Number(totalMarks);
    if (markPerQuestion !== undefined) updateData.markPerQuestion = Number(markPerQuestion);

    // If questions are provided, perform safe in-place updates without cascade wiping
    if (Array.isArray(questions) && questions.length > 0) {
      const existingQuestionsMap = new Map(existingExam.questions.map(q => [q.id, q]));
      const incomingIds = new Set<string>();

      for (let index = 0; index < questions.length; index++) {
        const q = questions[index];
        const questionPayload = {
          order: index + 1,
          questionText: q.questionText?.trim() || "",
          optionA: q.optionA?.trim() || "",
          optionB: q.optionB?.trim() || "",
          optionC: q.optionC?.trim() || "",
          optionD: q.optionD?.trim() || "",
          correctOption: q.correctOption?.toUpperCase() || "A",
          marks: Number(q.marks) || Number(existingExam.markPerQuestion) || 2
        };

        const matchedExisting = (q.id && existingQuestionsMap.get(q.id)) || (!q.id && existingExam.questions[index]);

        if (matchedExisting) {
          // Question already exists: update in-place to preserve question ID and student answers!
          incomingIds.add(matchedExisting.id);
          await prisma.examQuestion.update({
            where: { id: matchedExisting.id },
            data: questionPayload
          });
        } else {
          // New question: create without touching existing questions
          const created = await prisma.examQuestion.create({
            data: {
              examId: id,
              ...questionPayload
            }
          });
          incomingIds.add(created.id);
        }
      }

      // Handle removed questions safely: never delete a question that has student answers
      for (const oldQ of existingExam.questions) {
        if (!incomingIds.has(oldQ.id)) {
          if (oldQ._count.answers > 0) {
            return NextResponse.json(
              {
                success: false,
                error: `Cannot remove question #${oldQ.order} because students have already answered it. Student exam records are strictly protected.`
              },
              { status: 400 }
            );
          }
          await prisma.examQuestion.delete({ where: { id: oldQ.id } });
        }
      }
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

export async function PATCH(
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
    const { endsAt, durationMinutes, startsAt, status, title } = body;

    const existingExam = await prisma.exam.findUnique({ where: { id } });
    if (!existingExam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (endsAt) updateData.endsAt = parseExamDateOnServer(endsAt);
    if (startsAt) updateData.startsAt = parseExamDateOnServer(startsAt);
    if (durationMinutes !== undefined) updateData.durationMinutes = parseInt(durationMinutes, 10);
    if (status) updateData.status = status;
    if (title) updateData.title = title.trim();

    const updated = await prisma.exam.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Exam schedule updated successfully without modifying questions."
    });
  } catch (error) {
    console.error("PATCH /api/teacher/exams/[id] error:", error);
    return NextResponse.json({ success: false, error: "Failed to update exam schedule." }, { status: 500 });
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
