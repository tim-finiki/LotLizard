import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { getSubmissionStore } from "@/lib/submissions/store";
import type { SubmissionStatus } from "@/lib/submissions/schema";

const STATUSES: SubmissionStatus[] = ["pending", "approved", "rejected"];

export async function GET(request: Request) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = new URL(request.url).searchParams.get("status") as SubmissionStatus | null;
  const store = getSubmissionStore();
  const submissions = await store.list(status && STATUSES.includes(status) ? { status } : undefined);
  return NextResponse.json({ store: { kind: store.kind, durable: store.durable }, submissions });
}
