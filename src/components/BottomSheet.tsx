"use client";

import { useEffect, useRef, useState } from "react";

export type SheetSnap = "peek" | "half" | "full";

/** Snap heights as a fraction of the container (peek is a fixed pixel height). */
export const PEEK_PX = 168;
const HALF = 0.5;
const FULL = 0.86;

export function snapHeight(snap: SheetSnap, containerPx: number): number {
  if (snap === "peek") return Math.min(PEEK_PX, containerPx);
  return Math.round(containerPx * (snap === "half" ? HALF : FULL));
}

/** The snap point nearest to a dragged height, biased by flick direction. */
export function nearestSnap(heightPx: number, containerPx: number, velocity = 0): SheetSnap {
  const snaps: SheetSnap[] = ["peek", "half", "full"];
  if (Math.abs(velocity) > 0.5) {
    // Flick: move one step in the flick direction from the nearest snap.
    const nearest = nearestSnap(heightPx, containerPx);
    const i = snaps.indexOf(nearest) + (velocity < 0 ? 1 : -1);
    return snaps[Math.min(snaps.length - 1, Math.max(0, i))];
  }
  return snaps.reduce((best, s) =>
    Math.abs(snapHeight(s, containerPx) - heightPx) < Math.abs(snapHeight(best, containerPx) - heightPx) ? s : best,
  );
}

const NEXT: Record<SheetSnap, SheetSnap> = { peek: "half", half: "full", full: "peek" };
const SNAP_LABEL: Record<SheetSnap, string> = { peek: "collapsed", half: "half open", full: "expanded" };

/**
 * Mobile results sheet over the map: drag the handle (or tap / use the keyboard) to move between
 * peek, half and full. From the lg breakpoint it becomes a static side panel.
 */
export function BottomSheet({
  snap,
  onSnapChange,
  containerHeight,
  header,
  children,
  label,
}: {
  snap: SheetSnap;
  onSnapChange: (s: SheetSnap) => void;
  containerHeight: number;
  header: React.ReactNode;
  children: React.ReactNode;
  label: string;
}) {
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startH: number; lastY: number; lastT: number; v: number; moved: boolean } | null>(null);

  const height = dragHeight ?? snapHeight(snap, containerHeight);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startH: height, lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dy = e.clientY - d.startY;
    if (Math.abs(dy) > 4) d.moved = true;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDragHeight(Math.min(containerHeight, Math.max(PEEK_PX * 0.6, d.startH - dy)));
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      setDragHeight(null);
      onSnapChange(NEXT[snap]);
      return;
    }
    const finalH = dragHeight ?? d.startH;
    setDragHeight(null);
    onSnapChange(nearestSnap(finalH, containerHeight, d.v));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const order: SheetSnap[] = ["peek", "half", "full"];
    const i = order.indexOf(snap);
    if (e.key === "ArrowUp") onSnapChange(order[Math.min(2, i + 1)]);
    else if (e.key === "ArrowDown") onSnapChange(order[Math.max(0, i - 1)]);
    else if (e.key === "Enter" || e.key === " ") onSnapChange(NEXT[snap]);
    else return;
    e.preventDefault();
  }

  // Escape collapses the sheet from anywhere inside it.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && snap !== "peek" && onSnapChange("peek");
    el.addEventListener("keydown", onEsc);
    return () => el.removeEventListener("keydown", onEsc);
  }, [snap, onSnapChange]);

  return (
    <section
      ref={ref}
      aria-label={label}
      style={{ height }}
      className={`absolute inset-x-0 bottom-0 z-[600] flex flex-col rounded-t-3xl bg-white shadow-[0_-8px_30px_rgba(0,0,0,0.18)] dark:bg-ink-soft ${
        dragHeight === null ? "transition-[height] duration-300 ease-out" : ""
      } lg:static lg:z-auto lg:h-full! lg:rounded-none lg:shadow-none lg:transition-none`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label={`Results panel, ${SNAP_LABEL[snap]}. Press to resize.`}
        aria-expanded={snap !== "peek"}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2 active:cursor-grabbing lg:hidden"
      >
        <span aria-hidden className="h-1.5 w-10 rounded-full bg-neutral-300 dark:bg-neutral-600" />
      </div>
      <div className="shrink-0 px-4 pb-2 lg:pt-4">{header}</div>
      <div
        className={`min-h-0 flex-1 overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] ${
          snap === "peek" ? "overflow-hidden lg:overflow-y-auto" : "overflow-y-auto"
        }`}
        data-sheet-scroll
      >
        {children}
      </div>
    </section>
  );
}
