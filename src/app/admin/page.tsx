import type { Metadata } from "next";
import { ModerationQueue } from "@/components/ModerationQueue";

export const metadata: Metadata = {
  title: "Moderation",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-extrabold">Moderation queue</h1>
      <div className="mt-4">
        <ModerationQueue />
      </div>
    </div>
  );
}
