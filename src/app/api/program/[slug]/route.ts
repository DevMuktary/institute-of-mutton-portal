import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(
  request: NextRequest,
  // In Next.js 15+, params is a Promise
  context: { params: Promise<{ slug: string }> }
) {
  try {
    // Await the params promise to extract the slug safely
    const { slug } = await context.params;

    const program = await prisma.program.findUnique({
      where: { slug },
      select: { titleEn: true, isRegOpen: true },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (!program.isRegOpen) {
      return NextResponse.json(
        { error: "Registration is closed for this program" },
        { status: 403 }
      );
    }

    // Return the actual database name so the UI can display it
    return NextResponse.json({ titleEn: program.titleEn }, { status: 200 });
  } catch (error) {
    console.error("Program Fetch Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}