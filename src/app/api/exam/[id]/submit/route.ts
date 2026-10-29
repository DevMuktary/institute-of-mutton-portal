import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, calculateGrade } from "@/lib/auth";

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
      },
      include: {
        exam: {
          include: {
            questions: true
          }
        },
        answers: true
      }
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "Exam attempt not found." }, { status: 404 });
    }

    if (attempt.status === "SUBMITTED" || attempt.status === "TIMED_OUT") {
      return NextResponse.json(
        { success: true, message: "Examination has already been submitted." },
        { status: 200 }
      );
    }

    const questions = attempt.exam.questions;
    const studentAnswers = attempt.answers;

    // Create lookup map of answers
    const answerMap = new Map<string, string>();
    studentAnswers.forEach(a => {
      if (a.selectedOption) answerMap.set(a.questionId, a.selectedOption);
    });

    let totalScore = 0;

    // Grade each question server-side
    for (const q of questions) {
      const selected = answerMap.get(q.id);
      const isCorrect = selected === q.correctOption;
      const marksAwarded = isCorrect ? q.marks : 0;
      totalScore += marksAwarded;

      // Update or create answer record with grading evaluation
      await prisma.examAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId: attempt.id,
            questionId: q.id
          }
        },
        update: {
          isCorrect,
          marksAwarded
        },
        create: {
          attemptId: attempt.id,
          questionId: q.id,
          selectedOption: selected || null,
          isCorrect,
          marksAwarded
        }
      });
    }

    // Determine letter grade
    const grade = calculateGrade(totalScore, attempt.exam.totalMarks);

    // Update attempt
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        scoreObtained: totalScore,
        grade
      }
    });

    // Automatically sync score to ExamMark for Master Marksheet / Certificates
    try {
      await prisma.examMark.upsert({
        where: {
          studentId_programId: {
            studentId: user.id,
            programId: attempt.exam.programId
          }
        },
        update: {
          score: totalScore,
          date: new Date()
        },
        create: {
          studentId: user.id,
          programId: attempt.exam.programId,
          score: totalScore,
          date: new Date()
        }
      });
    } catch (syncErr) {
      console.warn("Auto-sync to ExamMark warning:", syncErr);
    }

    // PRIVACY NOTICE: Do NOT return score or grade to the student!
    return NextResponse.json({
      success: true,
      message: "Your examination has been submitted successfully. Your answers have been recorded for teacher evaluation."
    });
  } catch (error) {
    console.error("POST /api/exam/[id]/submit error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit examination." }, { status: 500 });
  }
}
