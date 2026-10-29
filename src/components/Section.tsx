export function Section({ id, title, children, aside }: { id: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={id} className="text-lg font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function FactCard({ title, body, badge }: { title: string; body: string; badge?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 dark:bg-ink-soft dark:ring-white/10">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold leading-tight">{title}</h3>
        {badge}
      </div>
      <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{body}</p>
    </div>
  );
}
