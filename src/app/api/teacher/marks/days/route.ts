import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return NextResponse.json({ success: false, maxDay: 1 }, { status: 401 });

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch {
      return NextResponse.json({ success: false, maxDay: 1 }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (!programId) return NextResponse.json({ success: false, maxDay: 1 });

    // Find the highest dayNumber recorded for this program
    const result = await prisma.dailyMark.aggregate({
      where: { programId },
      _max: { dayNumber: true }
    });

    const maxDay = result._max.dayNumber || 1; // Default to 1 if no marks exist yet
    
    return NextResponse.json({ success: true, maxDay });
  } catch (error) {
    console.error("Failed to fetch max days:", error);
    return NextResponse.json({ success: false, maxDay: 1 }, { status: 500 });
  }
}
