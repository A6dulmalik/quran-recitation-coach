import { BadRequestException, Body, Controller, Post } from "@nestjs/common";
import type { ComparisonResult } from "@repo/types";
import { ComparisonService } from "./comparison.service";
import type { CompareRequestDto } from "./dto/compare-request.dto";

@Controller()
export class ComparisonController {
  constructor(private readonly comparisonService: ComparisonService) {}

  @Post("compare")
  compare(@Body() body: CompareRequestDto): ComparisonResult {
    if (
      typeof body?.expected !== "string" ||
      typeof body?.actual !== "string"
    ) {
      throw new BadRequestException("expected and actual must be strings");
    }

    if (!body.expected.trim() || !body.actual.trim()) {
      throw new BadRequestException("expected and actual are required");
    }

    return this.comparisonService.compare(body.expected, body.actual);
  }
}
