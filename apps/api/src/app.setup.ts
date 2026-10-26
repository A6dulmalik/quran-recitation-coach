import type { NestExpressApplication } from "@nestjs/platform-express";
import helmet from "helmet";
import type { AppConfig } from "./config";

/** HTTP hardening shared by main.ts and the integration tests. */
export function configureApp(app: NestExpressApplication, config: AppConfig): void {
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(helmet());
  app.enableCors({
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    maxAge: 600,
  });
}
