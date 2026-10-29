import type { Submission, SubmissionStatus } from "@/lib/submissions/schema";

export interface SubmissionStore {
  readonly kind: "memory" | "upstash";
  /** False when data does not survive restarts/redeploys. */
  readonly durable: boolean;
  add(submission: Submission): Promise<void>;
  get(id: string): Promise<Submission | undefined>;
  list(filter?: { status?: SubmissionStatus; venueSlug?: string; facilitySlug?: string }): Promise<Submission[]>;
  update(submission: Submission): Promise<void>;
}

function matches(s: Submission, f: Parameters<SubmissionStore["list"]>[0] = {}) {
  return (
    (!f.status || s.status === f.status) &&
    (!f.venueSlug || s.input.venueSlug === f.venueSlug) &&
    (!f.facilitySlug || s.input.facilitySlug === f.facilitySlug)
  );
}

const newestFirst = (a: Submission, b: Submission) => b.createdAt.localeCompare(a.createdAt);

/** Development/preview store. Per-process and lost on restart — not for production. */
export class MemorySubmissionStore implements SubmissionStore {
  readonly kind = "memory" as const;
  readonly durable = false;
  private items = new Map<string, Submission>();

  async add(s: Submission) {
    this.items.set(s.id, s);
  }
  async get(id: string) {
    return this.items.get(id);
  }
  async list(filter?: Parameters<SubmissionStore["list"]>[0]) {
    return [...this.items.values()].filter((s) => matches(s, filter)).sort(newestFirst);
  }
  async update(s: Submission) {
    this.items.set(s.id, s);
  }
}

/**
 * Upstash Redis over its REST API (free tier available). Submissions are stored as JSON in a
 * hash keyed by ID; fine for pilot volumes. Move to Postgres for querying at scale.
 */
export class UpstashSubmissionStore implements SubmissionStore {
  readonly kind = "upstash" as const;
  readonly durable = true;
  private static KEY = "lotlizard:submissions";

  constructor(
    private url: string,
    private token: string,
  ) {}

  private async command<T>(...args: string[]): Promise<T> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash error ${res.status}`);
    const json = (await res.json()) as { result: T };
    return json.result;
  }

  async add(s: Submission) {
    await this.command("HSET", UpstashSubmissionStore.KEY, s.id, JSON.stringify(s));
  }
  async get(id: string) {
    const raw = await this.command<string | null>("HGET", UpstashSubmissionStore.KEY, id);
    return raw ? (JSON.parse(raw) as Submission) : undefined;
  }
  async list(filter?: Parameters<SubmissionStore["list"]>[0]) {
    const raw = await this.command<string[]>("HVALS", UpstashSubmissionStore.KEY);
    return raw
      .map((r) => JSON.parse(r) as Submission)
      .filter((s) => matches(s, filter))
      .sort(newestFirst);
  }
  async update(s: Submission) {
    await this.add(s);
  }
}

const globalForStore = globalThis as unknown as { __lotlizardStore?: SubmissionStore };

export function getSubmissionStore(): SubmissionStore {
  if (!globalForStore.__lotlizardStore) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    globalForStore.__lotlizardStore = url && token ? new UpstashSubmissionStore(url, token) : new MemorySubmissionStore();
  }
  return globalForStore.__lotlizardStore;
}
