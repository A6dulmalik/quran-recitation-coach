import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { AudioService, type EvaluationResult } from "./audio.service";
import type { TranscriptionResult } from "../asr/asr.service";

@Controller("audio")
export class AudioController {
  constructor(private readonly audioService: AudioService) {}

  @Post("transcribe")
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — Whisper API limit
    }),
  )
  async transcribe(
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<TranscriptionResult> {
    this.validateAudioFile(file);
    return this.audioService.transcribe(file!.buffer, file!.mimetype);
  }

  @Post("evaluate")
  @UseInterceptors(
    FileInterceptor("audio", {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async evaluate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body("expected") expected: string | undefined,
  ): Promise<EvaluationResult> {
    this.validateAudioFile(file);

    if (typeof expected !== "string" || !expected.trim()) {
      throw new BadRequestException(
        "expected field is required and must be a non-empty string",
      );
    }

    return this.audioService.evaluate(
      file!.buffer,
      file!.mimetype,
      expected.trim(),
    );
  }

  private validateAudioFile(file: Express.Multer.File | undefined): void {
    if (!file) {
      throw new BadRequestException('No audio file provided in field "audio"');
    }
    if (!file.mimetype.startsWith("audio/")) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Expected an audio file.`,
      );
    }
  }
}
