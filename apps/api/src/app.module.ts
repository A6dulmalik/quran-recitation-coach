import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { ComparisonModule } from "./comparison/comparison.module";
import { AudioModule } from "./modules/audio/audio.module";
import { AsrModule } from "./modules/asr/asr.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ComparisonModule,
    AudioModule,
    AsrModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
