import { Module } from "@nestjs/common";
import { ComparisonModule } from "../../comparison/comparison.module";
import { AsrModule } from "../asr/asr.module";
import { AudioController } from "./audio.controller";
import { AudioService } from "./audio.service";

@Module({
  imports: [AsrModule, ComparisonModule],
  controllers: [AudioController],
  providers: [AudioService],
})
export class AudioModule {}
