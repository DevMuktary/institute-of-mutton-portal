import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, calculateGrade } from "@/lib/auth";

export async function POST(
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
        program: true,
        questions: { orderBy: { order: "asc" } }
      }
    });

    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }

    // Get all submitted or timed-out attempts with existing answers
    const submittedAttempts = await prisma.examAttempt.findMany({
      where: {
        examId: id,
        status: { in: ["SUBMITTED", "TIMED_OUT"] }
      },
      include: {
        answers: true
      }
    });

    if (submittedAttempts.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No submitted attempts to sync for this examination."
      }, { status: 400 });
    }

    // Re-evaluate and sync each student's score
    let syncedCount = 0;
    for (const attempt of submittedAttempts) {
      const answerMap = new Map<string, any>();
      attempt.answers.forEach(a => {
        answerMap.set(a.questionId, a);
      });

      let calculatedScore = 0;

      // Ensure every question has an ExamAnswer record with proper grading
      for (const q of exam.questions) {
        const existingAns = answerMap.get(q.id);
        const selected = existingAns?.selectedOption || null;
        const isCorrect = selected ? selected.toUpperCase() === q.correctOption.toUpperCase() : false;
        const marksAwarded = isCorrect ? q.marks : 0;
        calculatedScore += marksAwarded;

        await prisma.examAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: q.id
            }
          },
          update: {
            selectedOption: selected,
            isCorrect,
            marksAwarded
          },
          create: {
            attemptId: attempt.id,
            questionId: q.id,
            selectedOption: selected,
            isCorrect,
            marksAwarded
          }
        });
      }

      const grade = calculateGrade(calculatedScore, exam.totalMarks);

      // Update attempt score and grade
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: {
          scoreObtained: calculatedScore,
          grade
        }
      });

      // Sync verified score into ExamMark for Master Marksheet / Certificates
      await prisma.examMark.upsert({
        where: {
          studentId_programId: {
            studentId: attempt.studentId,
            programId: exam.programId
          }
        },
        update: {
          score: calculatedScore,
          date: new Date()
        },
        create: {
          studentId: attempt.studentId,
          programId: exam.programId,
          score: calculatedScore,
          date: new Date()
        }
      });
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized and verified ${syncedCount} student examination score(s) to the Master Marksheet.`,
      syncedCount
    });
  } catch (error) {
    console.error("POST /api/teacher/exams/[id]/sync error:", error);
    return NextResponse.json({ success: false, error: "Failed to synchronize exam scores." }, { status: 500 });
  }
}
