import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  Logger,
  Post,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkipThrottle, ThrottlerGuard } from "@nestjs/throttler";
import type { AyahEvaluation } from "@repo/types";
import { evaluateRecitation, tokenizeArabic } from "@repo/utils";
import { detectAudioFormat } from "../asr/audio-format";
import { SpeechRecognitionError, SpeechRecognizer } from "../asr/speech-recognizer";
import { QuranService } from "../quran/quran.service";

type RefBody = { surah?: unknown; ayah?: unknown };

function parseRef(body: RefBody): { surah: number; ayah: number } {
  const surah = Number(body?.surah);
  const ayah = Number(body?.ayah);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) {
    throw new BadRequestException("surah and ayah must be integers");
  }
  return { surah, ayah };
}

const MAX_TEXT_LENGTH = 5_000;

@Controller("recitations")
@UseGuards(ThrottlerGuard)
export class RecitationController {
  private readonly logger = new Logger(RecitationController.name);

  constructor(
    private readonly quran: QuranService,
    private readonly recognizer: SpeechRecognizer,
  ) {}

  /**
   * Grade a recorded ayah.
   * multipart/form-data: audio (file), surah, ayah
   */
  @Post("evaluate")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("audio"))
  async evaluate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: RefBody,
  ): Promise<AyahEvaluation> {
    const ref = parseRef(body);
    const ayah = await this.quran.getAyah(ref.surah, ref.ayah);

    if (!file?.buffer?.length) {
      throw new BadRequestException('Attach the recording as the "audio" field');
    }
    const format = detectAudioFormat(file.buffer);
    if (!format) {
      throw new UnsupportedMediaTypeException(
        "Unsupported audio format. Use WebM, Ogg, MP4/M4A, MP3, WAV or FLAC.",
      );
    }
    if (!this.recognizer.isConfigured()) {
      throw new HttpException("Speech recognition is not configured on the server.", 503);
    }

    const startedAt = Date.now();
    let transcription;
    try {
      transcription = await this.recognizer.transcribe(file.buffer, format);
    } catch (error) {
      if (error instanceof SpeechRecognitionError) throw new HttpException(error.message, error.status);
      throw error;
    }

    if (tokenizeArabic(transcription.text).length === 0) {
      throw new UnprocessableEntityException(
        "We couldn't hear any recitation. Check your microphone and try again.",
      );
    }

    const result = evaluateRecitation(
      ayah.words,
      transcription.words?.length ? transcription.words : transcription.text,
      ref,
    );
    this.logger.log(
      `evaluate ${ref.surah}:${ref.ayah} ${format} ${file.size}B score=${result.score} ` +
        `errors=${result.errors.length} in ${Date.now() - startedAt}ms`,
    );
    return result;
  }

  /**
   * Grade typed or externally transcribed text (no audio, no timing checks).
   * JSON: { surah, ayah, text }
   */
  @Post("check")
  @HttpCode(200)
  @SkipThrottle({ asr: true })
  async check(@Body() body: RefBody & { text?: unknown }): Promise<AyahEvaluation> {
    const ref = parseRef(body);
    if (typeof body.text !== "string" || body.text.length > MAX_TEXT_LENGTH) {
      throw new BadRequestException(`text must be a string of at most ${MAX_TEXT_LENGTH} characters`);
    }
    const ayah = await this.quran.getAyah(ref.surah, ref.ayah);
    return evaluateRecitation(ayah.words, body.text, ref);
  }
}
