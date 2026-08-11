import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

export async function POST(request: Request) {
  try {
    const { password, token } = await request.json(); // Notice we now look for a token in the body!

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    let userId = "";

    // Flow A: They clicked the "Forgot Password" email link
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        if (verified.payload.purpose !== "password_reset") throw new Error("Invalid token type");
        userId = verified.payload.id as string;
      } catch (err) {
        return NextResponse.json({ success: false, error: "Reset link is invalid or has expired." }, { status: 401 });
      }
    } 
    // Flow B: They just logged in for the first time and must reset it (from cookies)
    else {
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get("auth_token")?.value;
      if (!cookieToken) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });

      try {
        const verified = await jwtVerify(cookieToken, JWT_SECRET);
        userId = verified.payload.id as string;
      } catch (err) {
        return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
      }
    }

    // Hash & Update DB
    const hashedPassword = await bcrypt.hash(password, 10);
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustResetPass: false }
    });

    // Auto-login after reset by setting a fresh cookie
    const freshToken = await new SignJWT({ 
      id: updatedUser.id, 
      email: updatedUser.email, 
      role: updatedUser.role,
      mustResetPass: updatedUser.mustResetPass 
    })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(JWT_SECRET);

    const cookieStore = await cookies();
    cookieStore.set("auth_token", freshToken, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/",
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." }, { status: 200 });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}
