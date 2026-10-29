"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { aiSource, outboundEvent } from "@/lib/analytics";

/**
 * Conversion and AI-referral events for Vercel Web Analytics. One delegated listener, so no
 * component needs tracking code. Custom events need a Vercel plan that includes them; without
 * one, page views and referrers are still recorded.
 */
export function AnalyticsEvents() {
  useEffect(() => {
    const source = aiSource(document.referrer, window.location.href);
    if (source) track("AI referral", { source, path: window.location.pathname });

    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const event = outboundEvent(link.href, window.location.hostname);
      if (!event) return;
      const { name, ...props } = event;
      track(name, { ...props, path: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
