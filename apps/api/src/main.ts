import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { APP_CONFIG, type AppConfig } from "./config";

async function bootstrap() {
  try {
    process.loadEnvFile(); // .env in the working directory, if present
  } catch {
    // No .env file: configuration comes from the environment.
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);
  configureApp(app, config);
  app.enableShutdownHooks();

  await app.listen(config.port);
  const logger = new Logger("Bootstrap");
  logger.log(`API listening on :${config.port} (CORS: ${config.corsOrigins.join(", ")})`);
  if (!config.openaiApiKey) {
    logger.warn("OPENAI_API_KEY is not set: /recitations/evaluate will return 503");
  }
}

void bootstrap();
