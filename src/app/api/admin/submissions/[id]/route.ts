import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { moderationSchema } from "@/lib/submissions/schema";
import { getSubmissionStore } from "@/lib/submissions/store";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/submissions/[id]">) {
  if (!isAdmin(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const parsed = moderationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid moderation decision" }, { status: 400 });

  const store = getSubmissionStore();
  const existing = await store.get(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = { ...existing, status: parsed.data.status, moderationNote: parsed.data.note, moderatedAt: new Date().toISOString() };
  await store.update(updated);
  return NextResponse.json(updated);
}
