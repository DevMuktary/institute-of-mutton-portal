import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Secret key for signing the JWT (You should add JWT_SECRET to your Railway variables later)
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body; // identifier can be email or phone

    if (!identifier || !password) {
      return NextResponse.json({ success: false, error: "Please provide both email/phone and password." }, { status: 400 });
    }

    // 1. Find User by Email OR Phone Number
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phoneNumber: identifier }
        ]
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    // 2. Check if account is blocked
    if (user.isBlocked) {
      return NextResponse.json({ success: false, error: "This account has been suspended. Contact administration." }, { status: 403 });
    }

    // 3. Verify Password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ success: false, error: "Invalid credentials." }, { status: 401 });
    }

    // 4. Create the JWT Token
    const token = await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      role: user.role,
      mustResetPass: user.mustResetPass 
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d") // Token expires in 7 days
      .sign(JWT_SECRET);

    // 5. Set HTTP-Only Cookie securely
    // In Next.js 15+, cookies() is asynchronous
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
      path: "/",
    });

    return NextResponse.json({ 
      success: true, 
      mustResetPass: user.mustResetPass,
      message: "Login successful" 
    }, { status: 200 });

  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}