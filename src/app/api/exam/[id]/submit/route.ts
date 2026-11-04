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
    const body = await request.json().catch(() => ({}));
    const clientAnswers: Record<string, string> = body?.answers || {};

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
            questions: {
              orderBy: { order: "asc" }
            }
          }
        },
        answers: true
      }
    });

    if (!attempt) {
      return NextResponse.json({ success: false, error: "Exam attempt not found." }, { status: 404 });
    }

    // Only reject if already submitted and fully scored
    if (attempt.status === "SUBMITTED" && attempt.scoreObtained !== null) {
      return NextResponse.json(
        { success: true, message: "Examination has already been submitted." },
        { status: 200 }
      );
    }

    const questions = attempt.exam.questions;
    const studentAnswers = attempt.answers;

    // Create lookup map of answers, starting with whatever is in DB
    const answerMap = new Map<string, string>();
    studentAnswers.forEach(a => {
      if (a.selectedOption) answerMap.set(a.questionId, a.selectedOption.toUpperCase());
    });

    // Merge in answers provided directly in client submission payload (failsafe for connection drops)
    if (clientAnswers && typeof clientAnswers === "object") {
      Object.entries(clientAnswers).forEach(([qId, opt]) => {
        if (opt && typeof opt === "string") {
          const norm = opt.trim().toUpperCase();
          if (["A", "B", "C", "D"].includes(norm)) {
            answerMap.set(qId, norm);
          }
        }
      });
    }

    let totalScore = 0;

    // Grade each question server-side and persist full response record
    for (const q of questions) {
      const selected = answerMap.get(q.id) || null;
      const isCorrect = selected ? selected === q.correctOption : false;
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
