import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { sendRegistrationEmail } from "@/lib/email";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const generatePassword = () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, country, dob, gender, knowledge, arabic, programSlug } = body;

    const program = await prisma.program.findUnique({ where: { slug: programSlug } });
    if (!program) return NextResponse.json({ success: false, error: "Invalid program selected." }, { status: 404 });
    if (!program.isRegOpen) return NextResponse.json({ success: false, error: "This program is closed." }, { status: 403 });

    const isApproved = program.isPaid;
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phoneNumber: phone }]
      }
    });

    let plainPassword;
    let isNewUser = false;

    if (user) {
      // User exists. Let's check if they are already enrolled in THIS program.
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: { userId_programId: { userId: user.id, programId: program.id } }
      });

      if (existingEnrollment) {
        return NextResponse.json({ success: false, error: "You have already applied for this specific program." }, { status: 409 });
      }
    } else {
      // New User creation
      isNewUser = true;
      plainPassword = isApproved ? generatePassword() : "pending-approval-no-access";
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      user = await prisma.user.create({
        data: {
          fullName, email, phoneNumber: phone, country, dob, gender,
          islamicKnowledge: knowledge, arabicLevel: arabic,
          password: hashedPassword, mustResetPass: true,
        }
      });
    }

    // Create the enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: user.id,
        programId: program.id,
        approvalStatus: isApproved ? "APPROVED" : "PENDING"
      }
    });

    // FIRE AND FORGET: Execute email sending in the background without making the user wait.
    sendRegistrationEmail(
      user.email,
      user.fullName,
      program.titleEn,
      isApproved ? "APPROVED" : "PENDING",
      isNewUser && isApproved ? plainPassword : undefined
    ).catch(emailError => {
      console.error("Background Email Error:", emailError);
    });

    // Return success to the UI instantly
    return NextResponse.json({ success: true, status: enrollment.approvalStatus }, { status: 201 });

  } catch (error) {
    console.error("Registration API Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}