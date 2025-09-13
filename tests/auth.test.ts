import request from "supertest";
import { prisma } from "../src/prisma";
import { app } from "../src/index";

describe("Auth API", () => {
  beforeAll(async () => {
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a user", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "test@example.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });

  it("logs in a user", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "test@example.com", password: "secret123" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
  });
});
