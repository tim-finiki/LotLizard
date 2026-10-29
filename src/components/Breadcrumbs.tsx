import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";

export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb" className="text-xs text-neutral-500">
        <ol className="flex flex-wrap items-center gap-1">
          {items.map((it, i) => (
            <li key={it.path} className="flex items-center gap-1">
              {i > 0 && <span aria-hidden>›</span>}
              {i === items.length - 1 ? (
                <span aria-current="page" className="text-neutral-700 dark:text-neutral-300">{it.name}</span>
              ) : (
                <Link href={it.path} className="hover:underline">{it.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
