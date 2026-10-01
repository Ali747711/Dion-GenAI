export type CapabilityKey = "music" | "cover" | "sound" | "speech" | "voices" | "transcribe" | "media" | "workflows";
export type Release = "R1" | "R2" | "R3" | "R4";

export interface Capability {
  key: CapabilityKey;
  label: string;
  release: Release;
  available: boolean;
  reason: string | null;
  limits?: Record<string, unknown>;
}

export interface ConnectionStatus {
  mode: "mock" | "live";
  status: "configured" | "missing" | "unavailable";
  checkedAt: string;
}
