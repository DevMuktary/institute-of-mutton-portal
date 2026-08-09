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
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let payload;
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      payload = verified.payload;
    } catch (err) {
      return NextResponse.json({ success: false, error: "Session expired." }, { status: 401 });
    }

    // Ensure only Teachers or Admins can access this data
    if (payload.role !== "TEACHER" && payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Access denied. Teachers only." }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");

    if (programId) {
      // Fetch all approved students for the requested program
      const enrollments = await prisma.enrollment.findMany({
        where: { programId, approvalStatus: "APPROVED" },
        include: {
          user: {
            select: { id: true, fullName: true, email: true, phoneNumber: true }
          }
        },
        orderBy: { user: { fullName: 'asc' } }
      });
      
      const students = enrollments.map(e => e.user);
      return NextResponse.json({ success: true, data: students }, { status: 200 });
    } else {
      // Fetch all programs
      const programs = await prisma.program.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return NextResponse.json({ success: true, data: programs }, { status: 200 });
    }
  } catch (error) {
    console.error("Teacher API Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error." }, { status: 500 });
  }
}