import Fastify from "fastify";
import jwt from "jsonwebtoken";
import { authRoutes } from "../../backend/routes/auth";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const supertest = require("supertest");
const bcrypt = require("bcrypt");

// Mock JWT verification (simulate a userId of 1)
jest.mock("../../backend/utils/verifyJWT", () => ({
  verifyJWT: (_req: any, _reply: any) => ({ userId: BigInt(1) }),
}));

describe("Auth endpoints", () => {
  let fastify;

  beforeAll(async () => {
    fastify = Fastify();
    fastify.register(authRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fastify.close();
  });

  beforeEach(async () => {
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.business.deleteMany(),
    ]);
    const hashedPassword = await bcrypt.hash("password123", 10);
    const business = await prisma.business.create({
      data: { name: "Test Business" },
    });

    await prisma.user.create({
      data: {
        id: BigInt(1), // match mocked userId
        username: "authtestuser",
        email: "test@example.com",
        password: hashedPassword,
        role: "CLIENT",
        businessId: business.id,
      },
    });
  });

  afterEach(async () => {
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.business.deleteMany(),
    ]);
  });

  it("should return 401 on invalid login", async () => {
    const response = await supertest(fastify.server).post("/login").send({
      username: "authnonexistent",
      password: "password123",
    });
    expect(response.status).toBe(401);
  });

  it("should login successfully and return JWT", async () => {
    const response = await supertest(fastify.server).post("/login").send({
      username: "authtestuser",
      password: "password123",
    });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  it("should return user details for a valid user", async () => {
    const response = await supertest(fastify.server)
      .get("/getUserDetails")
      .set("Authorization", `Bearer validToken`);
    
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      username: "authtestuser",
      role: "CLIENT",
      businessName: "Test Business",
    });
  });

  it("should return 404 if user does not exist", async () => {
    // Delete the user before calling the endpoint
    await prisma.user.deleteMany();

    const response = await supertest(fastify.server)
      .get("/getUserDetails")
      .set("Authorization", `Bearer validToken`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("error", "User not found");
  });
});
