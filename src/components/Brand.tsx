/* eslint-disable @next/next/no-img-element -- brand art is served as pre-sized lossless PNGs, not re-encoded */

/**
 * Approved brand marks. The A2 artwork in public/brand is the source of truth and is displayed exactly
 * as approved: pre-sized lossless PNGs (straight resamples made by scripts/brand/build_assets.py), never
 * re-encoded, recreated or recoloured here.
 */

/** Header B wordmark: live Sora text, white "Lot" + lime "Lizard" with dark edge and lime outline. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`ll-wordmark ${className}`}>
      <span className="ll-wordmark__lot">Lot</span>
      <span className="ll-wordmark__lizard">Lizard</span>
    </span>
  );
}

/** Header B: A2 mascot head + wordmark. Website navigation only. */
export function HeaderLogo() {
  return (
    <span className="flex items-center gap-1.5">
      <img src="/brand/lotlizard-mascot-head-160.png" alt="" width={160} height={123} className="h-9 w-auto sm:h-10" fetchPriority="high" />
      <Wordmark className="text-[22px] sm:text-2xl" />
    </span>
  );
}

/** Full A2 primary logo (stadium scene): the main brand mark. */
export function PrimaryLogo({ className = "", priority = false, sizes = "260px" }: { className?: string; priority?: boolean; sizes?: string }) {
  return (
    <img
      src="/brand/lotlizard-logo-full-520.png"
      srcSet="/brand/lotlizard-logo-full-520.png 520w, /brand/lotlizard-logo-full-760.png 760w, /brand/lotlizard-logo-full.png 1254w"
      sizes={sizes}
      alt="LotLizard"
      width={1254}
      height={989}
      className={className}
      {...(priority ? { fetchPriority: "high" as const } : { loading: "lazy" as const })}
      decoding="async"
    />
  );
}
