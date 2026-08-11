import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { SignJWT } from "jose";
import { sendPasswordResetEmail } from "@/lib/email";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ success: false }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    
    // Always return success even if user not found to prevent email enumeration
    if (!user) return NextResponse.json({ success: true });

    // Generate a secure, 15-minute token specifically for resetting passwords
    const resetToken = await new SignJWT({ id: user.id, purpose: "password_reset" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("15m")
      .sign(JWT_SECRET);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-railway-domain.com";
    const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

    await sendPasswordResetEmail(user.email, user.fullName, resetLink);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot Password API Error:", error);
    return NextResponse.json({ success: false, error: "Internal error" }, { status: 500 });
  }
}
