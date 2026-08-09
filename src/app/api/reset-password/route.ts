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
    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters long." }, { status: 400 });
    }

    // 1. Get the current authentication token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized. Please log in again." }, { status: 401 });
    }

    // 2. Verify the token to securely get the user's ID
    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired or invalid. Please log in again." }, { status: 401 });
    }

    const userId = payload.id as string;

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Update the user in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        mustResetPass: false, // They have now reset it
      }
    });

    // 5. Generate a fresh JWT token (with mustResetPass set to false)
    const freshToken = await new SignJWT({ 
      id: updatedUser.id, 
      email: updatedUser.email, 
      role: updatedUser.role,
      mustResetPass: updatedUser.mustResetPass 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    // 6. Update the cookie with the fresh token
    cookieStore.set("auth_token", freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." }, { status: 200 });

  } catch (error) {
    console.error("Reset Password API Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}