import { NextResponse, NextRequest } from "next/server";
import { PrismaClient, ApprovalStatus, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from "@/lib/email";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-super-secret-key-change-me");

const generatePassword = () =>
  Math.random().toString(36).slice(-4) + Math.random().toString(36).slice(-4).toUpperCase() + "!9";

const generateStudentId = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MUT-${year}-${rand}`;
};

// Helper to authenticate Admin or Teacher
async function authenticateStaff() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;
  if (!token) return null;

  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    const payload = verified.payload;
    if (payload.role !== "TEACHER" && payload.role !== "ADMIN") return null;
    return payload;
  } catch (err) {
    return null;
  }
}

// GET: List applications with rich filtering, search, sorting and aggregate stats
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateStaff();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const status = searchParams.get("status"); // "ALL" | "PENDING" | "APPROVED" | "REJECTED"
    const search = searchParams.get("search")?.trim();
    const gender = searchParams.get("gender");
    const arabicLevel = searchParams.get("arabicLevel");
    const islamicKnowledge = searchParams.get("islamicKnowledge");
    const country = searchParams.get("country");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    // 1. Build Filter Conditions
    const where: Prisma.EnrollmentWhereInput = {};

    if (programId && programId !== "ALL") {
      where.programId = programId;
    }

    if (status && status !== "ALL" && Object.values(ApprovalStatus).includes(status as ApprovalStatus)) {
      where.approvalStatus = status as ApprovalStatus;
    }

    const userConditions: Prisma.UserWhereInput = {};

    if (search) {
      userConditions.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { studentUniqueId: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
      ];
    }

    if (gender && gender !== "ALL") {
      userConditions.gender = gender;
    }

    if (arabicLevel && arabicLevel !== "ALL") {
      userConditions.arabicLevel = arabicLevel;
    }

    if (islamicKnowledge && islamicKnowledge !== "ALL") {
      userConditions.islamicKnowledge = islamicKnowledge;
    }

    if (country && country !== "ALL") {
      userConditions.country = country;
    }

    if (Object.keys(userConditions).length > 0) {
      where.user = userConditions;
    }

    // 2. Fetch Enrollments with User and Program relations
    const [enrollments, allPrograms] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              studentUniqueId: true,
              fullName: true,
              email: true,
              phoneNumber: true,
              country: true,
              dob: true,
              gender: true,
              islamicKnowledge: true,
              arabicLevel: true,
              role: true,
              createdAt: true,
              enrollments: {
                select: {
                  id: true,
                  programId: true,
                  approvalStatus: true,
                  program: {
                    select: {
                      id: true,
                      titleEn: true,
                    },
                  },
                },
              },
            },
          },
          program: {
            select: {
              id: true,
              slug: true,
              titleEn: true,
              titleAr: true,
              isPaid: true,
              isRegOpen: true,
            },
          },
        },
        orderBy:
          sortBy === "fullName"
            ? { user: { fullName: sortOrder } }
            : sortBy === "approvalStatus"
            ? { approvalStatus: sortOrder }
            : { createdAt: sortOrder },
      }),
      prisma.program.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          titleEn: true,
          titleAr: true,
          isPaid: true,
          isRegOpen: true,
          _count: {
            select: {
              enrollments: true,
            },
          },
        },
      }),
    ]);

    // 3. Compute Aggregate Stats (Contextual and Global)
    const baseProgramWhere = programId && programId !== "ALL" ? { programId } : {};

    const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.enrollment.count({ where: baseProgramWhere }),
      prisma.enrollment.count({ where: { ...baseProgramWhere, approvalStatus: "PENDING" } }),
      prisma.enrollment.count({ where: { ...baseProgramWhere, approvalStatus: "APPROVED" } }),
      prisma.enrollment.count({ where: { ...baseProgramWhere, approvalStatus: "REJECTED" } }),
    ]);

    // Compute distinct programs and counts
    const programBreakdown = await prisma.enrollment.groupBy({
      by: ["programId", "approvalStatus"],
      _count: {
        id: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          enrollments,
          programs: allPrograms,
          stats: {
            total: totalCount,
            pending: pendingCount,
            approved: approvedCount,
            rejected: rejectedCount,
            filteredCount: enrollments.length,
          },
          programBreakdown,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Admissions GET Error:", error);
    return NextResponse.json({ success: false, error: "Failed to retrieve applications." }, { status: 500 });
  }
}

// PATCH: Single or Bulk Approval / Rejection / Reset to Pending
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateStaff();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentIds, action, rejectionReason } = body;

    if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return NextResponse.json({ success: false, error: "No applications selected." }, { status: 400 });
    }

    if (!["APPROVE", "REJECT", "PENDING"].includes(action)) {
      return NextResponse.json({ success: false, error: "Invalid action specified." }, { status: 400 });
    }

    // Fetch the target enrollments with user details
    const targetEnrollments = await prisma.enrollment.findMany({
      where: { id: { in: enrollmentIds } },
      include: {
        user: true,
        program: true,
      },
    });

    if (targetEnrollments.length === 0) {
      return NextResponse.json({ success: false, error: "No matching applications found." }, { status: 404 });
    }

    if (action === "APPROVE") {
      const emailTasks: Array<() => Promise<void>> = [];

      for (const enr of targetEnrollments) {
        const user = enr.user;
        const program = enr.program;

        // Check if user has an active password or has dummy placeholder "pending-approval-no-access"
        // We verify against bcrypt match or if user has no studentUniqueId
        let isPlaceholderPassword = false;
        try {
          isPlaceholderPassword = await bcrypt.compare("pending-approval-no-access", user.password);
        } catch (e) {
          isPlaceholderPassword = false;
        }

        let plainTempPassword: string | undefined = undefined;
        const userUpdateData: Prisma.UserUpdateInput = {};

        if (isPlaceholderPassword) {
          plainTempPassword = generatePassword();
          const hashedPassword = await bcrypt.hash(plainTempPassword, 10);
          userUpdateData.password = hashedPassword;
          userUpdateData.mustResetPass = true;
        }

        if (!user.studentUniqueId) {
          userUpdateData.studentUniqueId = generateStudentId();
        }

        if (Object.keys(userUpdateData).length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: userUpdateData,
          });
        }

        // Queue Approval Email
        emailTasks.push(() =>
          sendApplicationApprovedEmail(
            user.email,
            user.fullName,
            program.titleEn,
            !!plainTempPassword,
            plainTempPassword
          )
        );
      }

      // Bulk update enrollments to APPROVED
      await prisma.enrollment.updateMany({
        where: { id: { in: enrollmentIds } },
        data: { approvalStatus: "APPROVED" },
      });

      // Fire off background emails
      Promise.allSettled(emailTasks.map((task) => task())).catch((err) =>
        console.error("Admissions approval email dispatch error:", err)
      );

      return NextResponse.json({
        success: true,
        message: `Successfully approved ${enrollmentIds.length} application(s).`,
        count: enrollmentIds.length,
      });
    }

    if (action === "REJECT") {
      // Bulk update enrollments to REJECTED
      await prisma.enrollment.updateMany({
        where: { id: { in: enrollmentIds } },
        data: { approvalStatus: "REJECTED" },
      });

      // Dispatch rejection notification emails in background
      Promise.allSettled(
        targetEnrollments.map((enr) =>
          sendApplicationRejectedEmail(enr.user.email, enr.user.fullName, enr.program.titleEn, rejectionReason)
        )
      ).catch((err) => console.error("Admissions rejection email dispatch error:", err));

      return NextResponse.json({
        success: true,
        message: `Successfully rejected ${enrollmentIds.length} application(s).`,
        count: enrollmentIds.length,
      });
    }

    if (action === "PENDING") {
      // Revert status to PENDING
      await prisma.enrollment.updateMany({
        where: { id: { in: enrollmentIds } },
        data: { approvalStatus: "PENDING" },
      });

      return NextResponse.json({
        success: true,
        message: `Status reverted to Pending for ${enrollmentIds.length} application(s).`,
        count: enrollmentIds.length,
      });
    }
  } catch (error) {
    console.error("Admissions PATCH Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update applications." }, { status: 500 });
  }
}

// DELETE: Remove enrollment records (e.g. duplicate or erroneous applications)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateStaff();
    if (!auth) {
      return NextResponse.json({ success: false, error: "Unauthorized access." }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentIds } = body;

    if (!Array.isArray(enrollmentIds) || enrollmentIds.length === 0) {
      return NextResponse.json({ success: false, error: "No applications selected for removal." }, { status: 400 });
    }

    const deleteResult = await prisma.enrollment.deleteMany({
      where: { id: { in: enrollmentIds } },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.count} application(s).`,
      count: deleteResult.count,
    });
  } catch (error) {
    console.error("Admissions DELETE Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete applications." }, { status: 500 });
  }
}
