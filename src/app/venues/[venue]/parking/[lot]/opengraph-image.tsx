import { LOT_CARD_SIZE, LOT_CARD_TYPE, lotCard, lotCardAlt } from "@/lib/og/lot-card";

export const size = LOT_CARD_SIZE;
export const contentType = LOT_CARD_TYPE;

/** One share image per lot, with alt text naming the lot and venue. */
export async function generateImageMetadata({ params }: { params: { venue: string; lot: string } }) {
  const { venue, lot } = params;
  return [{ id: "card", alt: await lotCardAlt(venue, lot), size, contentType }];
}

export default async function Image({ params }: { params: Promise<{ venue: string; lot: string }> }) {
  const { venue, lot } = await params;
  return lotCard(venue, lot);
}
