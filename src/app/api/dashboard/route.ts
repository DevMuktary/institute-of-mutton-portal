import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired. Please log in again." }, { status: 401 });
    }

    // Fetch the user and all their program enrollments
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        enrollments: {
          include: {
            program: {
              select: {
                id: true,
                titleEn: true,
                slug: true,
                maxDailyMark: true,
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user }, { status: 200 });

  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json({ success: false, error: "An internal server error occurred." }, { status: 500 });
  }
}