import { Injectable } from "@nestjs/common";
import type { ComparisonResult } from "@repo/types";
import { ComparisonService } from "../../comparison/comparison.service";
import { AsrService, type TranscriptionResult } from "../asr/asr.service";

export type EvaluationResult = {
  transcription: string;
  comparison: ComparisonResult;
};

@Injectable()
export class AudioService {
  constructor(
    private readonly asrService: AsrService,
    private readonly comparisonService: ComparisonService,
  ) {}

  async transcribe(
    buffer: Buffer,
    mimetype: string,
  ): Promise<TranscriptionResult> {
    return this.asrService.transcribe(buffer, mimetype);
  }

  async evaluate(
    buffer: Buffer,
    mimetype: string,
    expected: string,
  ): Promise<EvaluationResult> {
    const { text } = await this.asrService.transcribe(buffer, mimetype);
    const comparison = this.comparisonService.compare(expected, text);
    return { transcription: text, comparison };
  }
}
