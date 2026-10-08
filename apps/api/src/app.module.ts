import { Global, Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppController } from "./app.controller";
import { OpenAiSpeechRecognizer } from "./asr/openai-speech-recognizer";
import { SpeechRecognizer } from "./asr/speech-recognizer";
import { APP_CONFIG, loadConfig, type AppConfig } from "./config";
import { QuranService } from "./quran/quran.service";
import { RecitationController } from "./recitation/recitation.controller";

const MINUTE = 60_000;

@Global()
@Module({
  providers: [{ provide: APP_CONFIG, useFactory: () => loadConfig() }],
  exports: [APP_CONFIG],
})
export class ConfigModule {}

@Module({
  imports: [
    ConfigModule,
    MulterModule.registerAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        limits: { fileSize: config.maxAudioBytes, files: 1, fields: 4 },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => [
        { name: "default", ttl: MINUTE, limit: 120 },
        // Each evaluation is a paid speech-recognition call.
        { name: "asr", ttl: MINUTE, limit: config.evaluationsPerMinute },
      ],
    }),
  ],
  controllers: [AppController, RecitationController],
  providers: [QuranService, { provide: SpeechRecognizer, useClass: OpenAiSpeechRecognizer }],
})
export class AppModule {}
