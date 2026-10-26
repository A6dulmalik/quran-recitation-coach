import type { LiveSession } from "@repo/types";

// Streams microphone audio to OpenAI's Realtime transcription service and
// reports the transcript as it grows. The browser connects directly with an
// ephemeral secret from the API (POST /recitations/live-session), so the real
// key never reaches the client. All provider-specific details live in this file.

export interface LiveRecognizerHandlers {
  /** Everything heard so far in this recording, in order */
  onText: (text: string) => void;
  onError: (error: Error) => void;
}

export interface LiveRecognizer {
  stop: () => void;
}

// AudioWorklet that resamples microphone audio to `targetRate` and emits PCM16.
const WORKLET_SOURCE = `
class Pcm16Downsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / options.processorOptions.targetRate;
    this.pos = 0;
    this.buffer = [];
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (; this.pos < channel.length; this.pos += this.ratio) {
      const i = Math.floor(this.pos);
      const f = this.pos - i;
      const a = channel[i];
      const b = channel[Math.min(i + 1, channel.length - 1)];
      this.buffer.push(a + (b - a) * f);
    }
    this.pos -= channel.length;
    if (this.buffer.length >= 2400) { // ~100 ms at 24 kHz
      const out = new Int16Array(this.buffer.length);
      for (let k = 0; k < out.length; k++) {
        const v = Math.max(-1, Math.min(1, this.buffer[k]));
        out[k] = v < 0 ? v * 32768 : v * 32767;
      }
      this.buffer = [];
      this.port.postMessage(out.buffer, [out.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm16-downsampler", Pcm16Downsampler);
`;

export function liveRecognitionSupported(): boolean {
  return typeof window !== "undefined" && typeof AudioWorkletNode !== "undefined" && typeof WebSocket !== "undefined";
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Transcript text per recognised speech segment, joined in order. */
class Transcript {
  private order: string[] = [];
  private text = new Map<string, string>();

  delta(id: string, delta: string) {
    if (!this.text.has(id)) this.order.push(id);
    this.text.set(id, (this.text.get(id) ?? "") + delta);
  }
  complete(id: string, transcript: string) {
    if (!this.text.has(id)) this.order.push(id);
    this.text.set(id, transcript);
  }
  toString() {
    return this.order
      .map((id) => this.text.get(id)?.trim() ?? "")
      .filter(Boolean)
      .join(" ");
  }
}

export async function startLiveRecognizer(
  session: LiveSession,
  stream: MediaStream,
  { onText, onError }: LiveRecognizerHandlers,
): Promise<LiveRecognizer> {
  const transcript = new Transcript();
  let stopped = false;
  const queued: string[] = [];

  const socket = new WebSocket(session.url, [
    "realtime",
    `openai-insecure-api-key.${session.clientSecret}`,
    "openai-beta.realtime-v1",
  ]);

  const ctx = new AudioContext();
  const moduleUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: "text/javascript" }));
  try {
    await ctx.audioWorklet.addModule(moduleUrl);
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
  const source = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, "pcm16-downsampler", {
    processorOptions: { targetRate: session.sampleRate },
  });
  const send = (audio: string) => socket.send(JSON.stringify({ type: "input_audio_buffer.append", audio }));
  node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
    if (stopped) return;
    const audio = toBase64(e.data);
    if (socket.readyState === WebSocket.OPEN) send(audio);
    else if (socket.readyState === WebSocket.CONNECTING) queued.push(audio); // flushed on open
  };
  source.connect(node); // no destination: the microphone is never played back

  socket.onopen = () => {
    for (const audio of queued.splice(0)) send(audio);
  };
  socket.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    let message: { type?: string; item_id?: string; delta?: string; transcript?: string; error?: { message?: string } };
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    switch (message.type) {
      case "conversation.item.input_audio_transcription.delta":
        if (message.item_id && message.delta) transcript.delta(message.item_id, message.delta);
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (message.item_id && message.transcript !== undefined) transcript.complete(message.item_id, message.transcript);
        break;
      case "error":
        onError(new Error(message.error?.message ?? "Live recognition failed"));
        return;
      default:
        return;
    }
    onText(transcript.toString());
  };
  socket.onerror = () => {
    if (!stopped) onError(new Error("Live recognition connection failed"));
  };

  return {
    stop() {
      if (stopped) return;
      stopped = true;
      node.port.onmessage = null;
      source.disconnect();
      node.disconnect();
      void ctx.close().catch(() => undefined);
      socket.onmessage = null;
      socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    },
  };
}
