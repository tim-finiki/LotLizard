import { NextResponse } from "next/server";
import { buildInfo } from "@/lib/build-info";

/** Reports the commit this deployment serves, to confirm which build a preview URL is on. */
export async function GET() {
  return NextResponse.json(buildInfo(), { headers: { "Cache-Control": "no-store" } });
}
