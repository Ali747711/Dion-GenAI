import { env } from "../../config/env";
import type { AudioStudioProviderAdapter } from "./audioStudio.types";
import { LiveNoizProvider } from "./live.provider";
import { MockNoizProvider } from "./mock.provider";
import type { MusicProviderAdapter } from "./provider.types";

let instance: MusicProviderAdapter | null = null;

export function getMusicProvider(): MusicProviderAdapter {
  if (!instance) {
    instance = env.NOIZ_MODE === "live" ? new LiveNoizProvider() : new MockNoizProvider();
  }
  return instance;
}

/** Test-only override so worker/job-service tests can inject a fake adapter. */
export function setMusicProviderForTests(adapter: MusicProviderAdapter | null): void {
  instance = adapter;
}

// A separate singleton from `instance` above (both the mock and live classes
// implement both interfaces, so in real mock/live modes these are just two
// stateless instances of the same class). Kept separate so R1's
// MusicProviderAdapter tests (which inject a MusicProviderAdapter-only
// FakeProvider) never need to satisfy the wider R2 interface.
let audioStudioInstance: AudioStudioProviderAdapter | null = null;

export function getAudioStudioProvider(): AudioStudioProviderAdapter {
  if (!audioStudioInstance) {
    audioStudioInstance = env.NOIZ_MODE === "live" ? new LiveNoizProvider() : new MockNoizProvider();
  }
  return audioStudioInstance;
}

/** Test-only override so worker/job-service tests can inject a fake R2 adapter. */
export function setAudioStudioProviderForTests(adapter: AudioStudioProviderAdapter | null): void {
  audioStudioInstance = adapter;
}
