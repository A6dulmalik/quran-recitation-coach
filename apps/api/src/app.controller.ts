import { Controller, Get } from "@nestjs/common";
import { appName } from "@repo/utils";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return {
      status: "ok",
      app: appName,
      time: new Date().toISOString(),
    };
  }
}
