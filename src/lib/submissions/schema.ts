import { z } from "zod";

export const SUBMISSION_KINDS = ["price", "review", "lot_info", "correction", "exit_time"] as const;
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number];

const base = {
  venueSlug: z.string().min(1).max(120),
  facilitySlug: z.string().min(1).max(120).optional(),
  displayName: z.string().trim().max(40).optional(),
  email: z.email().max(200).optional(),
  /** Honeypot: real users never fill this in. */
  website: z.string().max(0).optional(),
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const submissionInputSchema = z.discriminatedUnion("kind", [
  z.object({
    ...base,
    kind: z.literal("price"),
    facilitySlug: base.facilitySlug.unwrap(),
    amount: z.number().int().min(0).max(2000),
    vehicle: z.enum(["car", "rv", "bus", "limo", "motorcycle"]),
    eventDate: isoDate,
    notes: z.string().trim().max(500).optional(),
  }),
  z.object({
    ...base,
    kind: z.literal("review"),
    facilitySlug: base.facilitySlug.unwrap(),
    rating: z.number().int().min(1).max(5),
    tailgateRating: z.number().int().min(1).max(5).optional(),
    exitRating: z.number().int().min(1).max(5).optional(),
    body: z.string().trim().min(20).max(2000),
  }),
  z.object({
    ...base,
    kind: z.literal("lot_info"),
    lotName: z.string().trim().min(2).max(120),
    address: z.string().trim().max(200).optional(),
    body: z.string().trim().min(10).max(2000),
  }),
  z.object({
    ...base,
    kind: z.literal("correction"),
    body: z.string().trim().min(10).max(2000),
  }),
  z.object({
    ...base,
    kind: z.literal("exit_time"),
    facilitySlug: base.facilitySlug.unwrap(),
    minutes: z.number().int().min(1).max(300),
    eventDate: isoDate,
    notes: z.string().trim().max(500).optional(),
  }),
]);

export type SubmissionInput = z.infer<typeof submissionInputSchema>;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type StoredSubmissionInput = DistributiveOmit<SubmissionInput, "website">;

export type SubmissionStatus = "pending" | "approved" | "rejected";

export interface Submission {
  id: string;
  createdAt: string;
  status: SubmissionStatus;
  /** Automated pre-moderation flags shown to moderators. */
  flags: string[];
  input: StoredSubmissionInput;
  moderatedAt?: string;
  moderationNote?: string;
}

/** Public projection: never exposes reporter email. */
export function toPublic(s: Submission) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { email, ...input } = s.input;
  return { id: s.id, createdAt: s.createdAt, status: s.status, input };
}

export const moderationSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(500).optional(),
});
