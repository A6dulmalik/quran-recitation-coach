import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { toFile } from "openai";
import { Readable } from "stream";

export type TranscriptionResult = {
  text: string;
};

@Injectable()
export class AsrService {
  private readonly client: OpenAI;
  private readonly logger = new Logger(AsrService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>("OPENAI_API_KEY");
    if (!apiKey) {
      throw new InternalServerErrorException("OPENAI_API_KEY is not set");
    }
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(
    buffer: Buffer,
    mimetype: string,
  ): Promise<TranscriptionResult> {
    try {
      // Derive a filename extension from the mime type so Whisper identifies the codec
      const ext = mimetype.split("/")[1]?.split(";")[0] ?? "webm";
      const filename = `audio.${ext}`;

      const stream = Readable.from(buffer);
      const file = await toFile(stream, filename, { type: mimetype });

      const response = await this.client.audio.transcriptions.create({
        model: "whisper-1",
        file,
        language: "ar",
        response_format: "text",
      });

      // With response_format "text" the SDK returns a plain string
      return { text: response.trim() };
    } catch (error) {
      this.logger.error("Whisper transcription failed", error);
      throw new InternalServerErrorException("Transcription failed");
    }
  }
}
