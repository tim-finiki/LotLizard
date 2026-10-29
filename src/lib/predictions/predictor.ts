import type { ConfidenceLevel } from "@/lib/types";

export interface PredictionRequest {
  venueSlug: string;
  facilitySlug: string;
  eventStartsAt?: string;
}

export interface MinutesRange {
  p50: number;
  p90: number;
}

export type PredictionResult =
  | {
      status: "available";
      arrival?: MinutesRange;
      exit?: MinutesRange;
      confidence: ConfidenceLevel;
      modelVersion: string;
      basedOn: string;
    }
  | { status: "unavailable"; reason: string };

/**
 * Future models (historical exit reports, traffic, event metadata) implement this interface and
 * write predictions that pages read through it. Until a model passes backtesting we return
 * "unavailable" rather than a guess.
 */
export interface ArrivalExitPredictor {
  predict(req: PredictionRequest): Promise<PredictionResult>;
}

export class UnavailablePredictor implements ArrivalExitPredictor {
  async predict(): Promise<PredictionResult> {
    return {
      status: "unavailable",
      reason: "We're collecting exit-time reports from fans. Predictions launch once we have enough real data to be accurate.",
    };
  }
}

export function getPredictor(): ArrivalExitPredictor {
  return new UnavailablePredictor();
}
