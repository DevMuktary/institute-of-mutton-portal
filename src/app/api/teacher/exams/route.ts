import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    const whereClause: any = {};
    if (programId) whereClause.programId = programId;

    const exams = await prisma.exam.findMany({
      where: whereClause,
      include: {
        program: {
          select: { id: true, titleEn: true, titleAr: true, slug: true }
        },
        _count: {
          select: {
            questions: true,
            attempts: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    console.error("GET /api/teacher/exams error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || (user.role !== "TEACHER" && user.role !== "ADMIN")) {
      return NextResponse.json({ success: false, error: "Access denied." }, { status: 403 });
    }

    const body = await request.json();
    const {
      programId,
      title,
      description,
      instructions,
      startsAt,
      endsAt,
      durationMinutes,
      markPerQuestion = 2,
      totalMarks = 60,
      status = "DRAFT",
      questions = []
    } = body;

    if (!programId || !title) {
      return NextResponse.json(
        { success: false, error: "Program and Examination Title are required." },
        { status: 400 }
      );
    }

    const start = startsAt ? new Date(startsAt) : new Date();
    const end = endsAt ? new Date(endsAt) : new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Verify program exists
    const program = await prisma.program.findUnique({ where: { id: programId } });
    if (!program) {
      return NextResponse.json({ success: false, error: "Program not found." }, { status: 404 });
    }

    // Process questions
    const computedQuestions = questions.map((q: any, index: number) => ({
      order: index + 1,
      questionText: q.questionText?.trim() || "",
      optionA: q.optionA?.trim() || "",
      optionB: q.optionB?.trim() || "",
      optionC: q.optionC?.trim() || "",
      optionD: q.optionD?.trim() || "",
      correctOption: q.correctOption?.toUpperCase() || "A",
      marks: Number(q.marks) || Number(markPerQuestion) || 2
    }));

    const finalTotalMarks = Number(totalMarks) || (computedQuestions.length * Number(markPerQuestion)) || 60;
    const finalStatus = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? status : "DRAFT";

    const exam = await prisma.exam.create({
      data: {
        programId,
        title: title.trim(),
        description: description?.trim() || null,
        instructions: instructions?.trim() || null,
        startsAt: start,
        endsAt: end,
        durationMinutes: parseInt(durationMinutes || 45, 10),
        markPerQuestion: Number(markPerQuestion) || 2,
        totalMarks: finalTotalMarks,
        status: finalStatus,
        questions: {
          create: computedQuestions
        }
      },
      include: {
        questions: true,
        program: true
      }
    });

    return NextResponse.json({ success: true, data: exam }, { status: 201 });
  } catch (error) {
    console.error("POST /api/teacher/exams error:", error);
    return NextResponse.json({ success: false, error: "Failed to create examination." }, { status: 500 });
  }
}
