import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { APP_CONFIG, describeKey, shadowedEnvVars, type AppConfig } from "./config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  let shadowed: string[] = [];
  try {
    shadowed = shadowedEnvVars(parseEnv(readFileSync(".env", "utf8")));
    process.loadEnvFile(); // .env in the working directory, if present
  } catch {
    // No .env file: configuration comes from the environment.
  }
  if (shadowed.length) {
    logger.warn(
      `${shadowed.join(", ")} is also set in your shell/OS environment with a different value; ` +
        "that value is used and the one in .env is ignored.",
    );
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AppConfig>(APP_CONFIG);
  configureApp(app, config);
  app.enableShutdownHooks();

  await app.listen(config.port);
  logger.log(`API listening on :${config.port} (CORS: ${config.corsOrigins.join(", ")})`);
  if (!config.openaiApiKey) {
    logger.warn("OPENAI_API_KEY is not set: /recitations/evaluate will return 503");
  } else {
    logger.log(`OPENAI_API_KEY: ${describeKey(config.openaiApiKey)}; model ${config.asrModel}`);
  }
}

void bootstrap();
