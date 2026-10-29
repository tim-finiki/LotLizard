import Image from "next/image";
import head from "../../public/brand/lotlizard-mascot-head.png";
import fullLogo from "../../public/brand/lotlizard-logo-full.png";
import mascot from "../../public/brand/lotlizard-mascot.png";

/**
 * Approved brand marks (A2). The illustrated assets are derived from the original artwork by
 * scripts/brand/build_assets.py; never redraw them here.
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

/** Mascot head + wordmark lockup used in the site header and footer. */
export function HeaderLogo({ size = "md" }: { size?: "md" | "sm" }) {
  const h = size === "md" ? "h-9 sm:h-10" : "h-8";
  return (
    <span className="flex items-center gap-1.5">
      <Image src={head} alt="" priority className={`${h} w-auto`} sizes="64px" />
      <Wordmark className={size === "md" ? "text-[22px] sm:text-2xl" : "text-xl"} />
    </span>
  );
}

/** Full primary logo (stadium scene) — the brand's hero mark. */
export function PrimaryLogo({ className = "", priority = false, sizes = "320px" }: { className?: string; priority?: boolean; sizes?: string }) {
  return <Image src={fullLogo} alt="LotLizard" className={className} priority={priority} sizes={sizes} />;
}

/** Mascot bust (no wordmark), for the homepage hero. */
export function Mascot({ className = "", sizes = "420px" }: { className?: string; sizes?: string }) {
  return <Image src={mascot} alt="" className={className} sizes={sizes} priority />;
}
