import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-super-secret-key-change-me"
);

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  mustResetPass?: boolean;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;

    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function calculateGrade(score: number, totalMarks: number): string {
  if (totalMarks <= 0) return "F";
  const percentage = (score / totalMarks) * 100;
  if (percentage >= 80) return "A";
  if (percentage >= 65) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}
