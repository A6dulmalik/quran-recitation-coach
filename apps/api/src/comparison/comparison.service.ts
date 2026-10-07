import { Injectable } from "@nestjs/common";
import type { ComparisonResult } from "@repo/types";
import { compareRecitation } from "@repo/utils";

@Injectable()
export class ComparisonService {
  compare(expected: string, recited: string): ComparisonResult {
    return compareRecitation(expected, recited);
  }
}
