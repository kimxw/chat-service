import Fastify from "fastify";
import { registerRoutes } from "../backend/routes/register";
import { clientChatRoutes } from "../backend/routes/client-conversations";
import { PrismaClient } from "@prisma/client";

jest.mock("../backend/utils/verifyJWT", () => ({
  verifyJWT: (_req: any, _reply: any) => ({ userId: BigInt(1) }),
}));

// require("dotenv").config({ path: ".env.test" }); //might have to add this to every test file, check the config later

const prisma = new PrismaClient();
const supertest = require('supertest');

describe("Client Conversations API", () => {
  let fastify;
  let business;

  beforeAll(async () => {
    fastify = Fastify();
    fastify.register(registerRoutes);
    fastify.register(clientChatRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fastify.close();
  });

  beforeEach(async () => {
    await prisma.message.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.business.deleteMany();


    await prisma.user.create({
      data: {
        id: BigInt(1), // match mocked userId
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        role: "CLIENT",
      },
    });

    business = await prisma.business.create({
      data: {
        name: "NEW Test Business",
      },
    });
  });

  it("should create a conversation for a valid client and business", async () => {
    const response = await supertest(fastify.server)
      .post("/createClientConversation")
      .set("Authorization", `Bearer dummyToken`)
      .send({ businessId: business.id.toString() });

    expect(response.status).toBe(200);
    expect(response.body.conversation).toHaveProperty("id");
    expect(response.body.conversation.businessId).toBe(business.id.toString());
  });

  it("should return 400 for missing businessId", async () => {
    const response = await supertest(fastify.server)
      .post("/createClientConversation")
      .set("Authorization", `Bearer dummyToken`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Missing businessId/i);
  });

  it("should return 400 for non-existing businessId", async () => {
    const nonExistentBusinessId = "999999999";
    const response = await supertest(fastify.server)
      .post("/createClientConversation")
      .set("Authorization", `Bearer dummyToken`)
      .send({ businessId: nonExistentBusinessId });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/does not exist|not found|error/i);
  });
});
