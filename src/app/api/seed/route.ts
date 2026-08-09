import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET() {
  try {
    // This will create a test program in your database, or update it if it already exists
    const program = await prisma.program.upsert({
      where: { slug: "test-batch-1" },
      update: {},
      create: {
        slug: "test-batch-1",
        titleEn: "Test Memorization Batch 1",
        isPaid: true, // We set it to true so it Auto-Approves you immediately for testing
        isRegOpen: true,
        maxDailyMark: 100,
      }
    });

    const urlToTest = `/register/${program.slug}`;
    
    return NextResponse.json({
      message: "Success! Your test program is ready in the database.",
      goHereToTest: urlToTest,
      programDetails: program
    });
  } catch (error) {
    console.error("Seeding Error:", error);
    return NextResponse.json(
      { error: "Failed to seed database", details: String(error) }, 
      { status: 500 }
    );
  }
}