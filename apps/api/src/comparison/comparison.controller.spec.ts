import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ComparisonModule } from "./comparison.module";

describe("POST /compare", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ComparisonModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("scores diacritized expected text against plain recited text", async () => {
    const res = await request(app.getHttpServer())
      .post("/compare")
      .send({
        expected: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
        actual: "بسم الله الرحمن الرحيم",
      })
      .expect(201);

    expect(res.body.accuracy).toBe(1);
    expect(res.body.words).toHaveLength(4);
  });

  it("rejects non-string fields", async () => {
    await request(app.getHttpServer())
      .post("/compare")
      .send({ expected: 1, actual: "x" })
      .expect(400);
  });

  it("rejects blank fields", async () => {
    await request(app.getHttpServer())
      .post("/compare")
      .send({ expected: "الحمد", actual: "   " })
      .expect(400);
  });
});
