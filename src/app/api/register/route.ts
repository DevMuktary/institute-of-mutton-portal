import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { sendRegistrationEmail } from "@/lib/email";

const prisma = new PrismaClient();

// Auto-generate a secure random password for approved users
const generatePassword = () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      email,
      phone,
      country,
      dob,
      gender,
      knowledge,
      arabic,
      programSlug,
    } = body;

    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 2. Fetch Program by SLUG to determine if it is Paid (Auto-Approve) or Free (Pending)
    const program = await prisma.program.findUnique({ where: { slug: programSlug } });
    
    if (!program) {
      return NextResponse.json(
        { success: false, error: "Invalid program selected." },
        { status: 404 }
      );
    }

    if (!program.isRegOpen) {
      return NextResponse.json(
        { success: false, error: "This program is no longer accepting registrations." },
        { status: 403 }
      );
    }

    // 3. Determine Approval Status & Generate Password
    const isApproved = program.isPaid;
    const plainPassword = isApproved ? generatePassword() : "pending-approval-no-access-yet";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 4. Save User to PostgreSQL
    const newUser = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        phoneNumber: phone,
        country,
        dob,
        gender,
        islamicKnowledge: knowledge,
        arabicLevel: arabic,
        programId: program.id,
        approvalStatus: isApproved ? "APPROVED" : "PENDING",
        mustResetPass: true,
      }
    });

    // 5. Send Email via ZeptoMail
    await sendRegistrationEmail(
      newUser.email, 
      newUser.fullName, 
      program.titleEn, 
      newUser.approvalStatus, 
      isApproved ? plainPassword : undefined
    );

    // 6. Return Success Response
    return NextResponse.json(
      { success: true, status: newUser.approvalStatus },
      { status: 201 }
    );

  } catch (error) {
    console.error("Registration API Error:", error);
    return NextResponse.json(
      { success: false, error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}