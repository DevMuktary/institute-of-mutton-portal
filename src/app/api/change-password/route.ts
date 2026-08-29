import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { sendPasswordChangeOtpEmail, sendPasswordChangedConfirmationEmail } from "@/lib/email";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const maskedLocal = local.length <= 2 ? local[0] + "***" : local[0] + "***" + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
};

const hashOtp = (otp: string, userId: string) => {
  return crypto.createHash("sha256").update(`${otp}:${userId}:${process.env.JWT_SECRET || "fallback-salt"}`).digest("hex");
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;

    if (!authToken) {
      return NextResponse.json({ success: false, error: "Please log in to change your password." }, { status: 401 });
    }

    let payload;
    try {
      const verified = await jwtVerify(authToken, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired. Please log in again." }, { status: 401 });
    }

    const userId = payload.id as string;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ success: false, error: "User account not found." }, { status: 404 });
    }

    const body = await request.json();
    const { action, currentPassword, otp, newPassword, otpToken } = body;

    // ==========================================
    // ACTION 1: REQUEST OTP WITH CURRENT PASSWORD
    // ==========================================
    if (action === "REQUEST_OTP") {
      if (!currentPassword) {
        return NextResponse.json(
          { success: false, error: "Please provide your current password." },
          { status: 400 }
        );
      }

      // Check current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Incorrect current password. Please enter your valid current password." },
          { status: 400 }
        );
      }

      // Generate 6-digit OTP code
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpChecksum = hashOtp(generatedOtp, user.id);

      // Sign short-lived OTP verification JWT (10 minutes)
      const signedOtpToken = await new SignJWT({
        id: user.id,
        hashedOtp: otpChecksum,
        purpose: "change_password_otp",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("10m")
        .sign(JWT_SECRET);

      // Send OTP to student email
      sendPasswordChangeOtpEmail(user.email, user.fullName, generatedOtp).catch((err) => {
        console.error("Failed to dispatch password change OTP email:", err);
      });

      return NextResponse.json(
        {
          success: true,
          otpToken: signedOtpToken,
          emailMasked: maskEmail(user.email),
          message: `Verification code sent to ${maskEmail(user.email)}.`,
        },
        { status: 200 }
      );
    }

    // ==========================================
    // ACTION 2: VERIFY OTP AND CHANGE PASSWORD
    // ==========================================
    if (action === "VERIFY_AND_CHANGE") {
      if (!currentPassword || !otp || !newPassword || !otpToken) {
        return NextResponse.json(
          { success: false, error: "All fields are required (Current password, OTP, and New password)." },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { success: false, error: "New password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      // Re-verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Current password does not match our records." },
          { status: 400 }
        );
      }

      // Check if new password is same as current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return NextResponse.json(
          { success: false, error: "New password cannot be the same as your current password." },
          { status: 400 }
        );
      }

      // Verify OTP Token
      let otpPayload;
      try {
        const verifiedOtp = await jwtVerify(otpToken, JWT_SECRET);
        otpPayload = verifiedOtp.payload;
      } catch (err) {
        return NextResponse.json(
          { success: false, error: "Verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      if (otpPayload.purpose !== "change_password_otp" || otpPayload.id !== user.id) {
        return NextResponse.json(
          { success: false, error: "Invalid verification code token." },
          { status: 400 }
        );
      }

      // Validate OTP match
      const expectedHash = otpPayload.hashedOtp as string;
      const actualHash = hashOtp(otp.trim(), user.id);

      if (expectedHash !== actualHash) {
        return NextResponse.json(
          { success: false, error: "Invalid verification code. Please check your email and try again." },
          { status: 400 }
        );
      }

      // Hash new password and update User in database
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedNewPassword,
          mustResetPass: false,
        },
      });

      // Issue refreshed auth token with mustResetPass = false
      const freshAuthToken = await new SignJWT({
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        mustResetPass: false,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      cookieStore.set("auth_token", freshAuthToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      // Dispatch confirmation email
      sendPasswordChangedConfirmationEmail(user.email, user.fullName).catch((err) => {
        console.error("Failed to send password changed confirmation email:", err);
      });

      return NextResponse.json(
        {
          success: true,
          message: "Your password has been changed successfully.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: false, error: "Invalid action specified." }, { status: 400 });
  } catch (error) {
    console.error("Change Password API Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}
