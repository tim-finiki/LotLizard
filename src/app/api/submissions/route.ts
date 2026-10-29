import { NextResponse } from "next/server";
import { submissionInputSchema, type Submission } from "@/lib/submissions/schema";
import { preModerationFlags } from "@/lib/submissions/checks";
import { getSubmissionStore } from "@/lib/submissions/store";
import { rateLimit } from "@/lib/submissions/rate-limit";
import { facilityExists, getFacility, getVenue, listEvents } from "@/lib/data/repository";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`submit:${ip}`)) {
    return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Honeypot: pretend success so bots learn nothing.
  if (body && typeof body === "object" && "website" in body && (body as { website?: unknown }).website) {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  const parsed = submissionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, { status: 400 });
  }
  const input = parsed.data;
  if (!facilityExists(input.venueSlug, input.facilitySlug)) {
    return NextResponse.json({ error: "Unknown venue or lot" }, { status: 400 });
  }

  if (input.kind === "payment" && input.eventId) {
    const venue = await getVenue(input.venueSlug);
    const events = venue ? await listEvents(venue.id) : [];
    if (!events.some((e) => e.id === input.eventId)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }
  }

  const facility = input.facilitySlug ? (await getFacility(input.venueSlug, input.facilitySlug))?.facility : undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { website, ...stored } = input;
  const submission: Submission = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
    flags: preModerationFlags(input, facility),
    input: stored,
  };
  await getSubmissionStore().add(submission);
  return NextResponse.json({ id: submission.id, status: submission.status }, { status: 201 });
}
