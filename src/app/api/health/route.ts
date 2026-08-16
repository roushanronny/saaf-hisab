import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || null;

  try {
    const events = await prisma.event.count();
    return NextResponse.json({
      ok: true,
      hasDb,
      appUrl,
      events,
      runtime: process.env.VERCEL ? "vercel" : "local",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        hasDb,
        appUrl,
        error: message,
        runtime: process.env.VERCEL ? "vercel" : "local",
      },
      { status: 500 }
    );
  }
}
