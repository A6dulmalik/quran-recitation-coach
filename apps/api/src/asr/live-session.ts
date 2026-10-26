import type { LiveSession } from "@repo/types";

/** Creates short-lived credentials for browser-side streaming recognition. */
export abstract class LiveSessionProvider {
  abstract isConfigured(): boolean;
  abstract create(): Promise<LiveSession>;
}

export class LiveSessionError extends Error {
  constructor(
    message: string,
    readonly status: 502 | 503,
  ) {
    super(message);
  }
}
