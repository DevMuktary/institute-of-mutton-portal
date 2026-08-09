import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    // Setting maxAge to 0 destroys the cookie immediately
    cookieStore.set("auth_token", "", { maxAge: 0, path: "/" });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to log out." }, { status: 500 });
  }
}