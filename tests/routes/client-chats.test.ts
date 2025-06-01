import Fastify from "fastify";
import { registerRoutes } from "../../backend/routes/register";
import { clientChatRoutes } from "../../backend/routes/client-chats";
import { PrismaClient } from "@prisma/client";
import { createClientChat } from "../../backend/services/client-service";

jest.mock("../../backend/utils/verifyJWT", () => ({
  verifyJWT: (_req: any, _reply: any) => ({ userId: BigInt(1) }),
}));

jest.setTimeout(10000);

require("dotenv").config({ path: ".env.test" }); //might have to add this to every test file, check the config later

const prisma = new PrismaClient();
const supertest = require("supertest");

describe("Client Chats API", () => {
  let fastify;
  let business;

  beforeAll(async () => {
    fastify = Fastify();
    fastify.register(registerRoutes);
    fastify.register(clientChatRoutes);
    await fastify.ready();

    //clean db
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.business.deleteMany(),
    ]);

    await prisma.user.create({
      data: {
        id: BigInt(1), // match mocked userId
        username: "testuser",
        email: "test@example.com",
        password: "hashedpassword",
        role: "CUSTOMER",
      },
    });

    business = await prisma.business.create({
      data: {
        id: BigInt(1),
        name: "NEW Test Business",
      },
    });
  });

  afterAll(async () => {
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.business.deleteMany(),
    ]);
    await prisma.$disconnect();
    await fastify.close();
  });

  it("should create a participant (and conversation) for a valid client and business", async () => {
    const response = await supertest(fastify.server)
      .post("/createClientChat") // updated endpoint
      .set("Authorization", `Bearer dummyToken`)
      .send({ businessId: business.id.toString() });

    expect(response.status).toBe(200);

    // We expect a 'newParticipantEntry' field now
    const participant = response.body.newParticipantEntry;

    expect(participant).toHaveProperty("id");
    expect(participant).toHaveProperty("conversationId");
    expect(participant).toHaveProperty("userId");
    expect(participant).toHaveProperty("role");

    // userId should be BigInt 1 serialized as string
    expect(participant.userId).toBe("1");
    expect(participant.role).toBe("CUSTOMER");

    const conversation = await prisma.conversation.findUnique({
      where: { id: BigInt(participant.conversationId) },
    });
    expect(conversation).not.toBeNull();
    expect(conversation?.businessId.toString()).toBe(business.id.toString());
  });

  it("should return 400 for missing businessId", async () => {
    const response = await supertest(fastify.server)
      .post("/createClientChat")
      .set("Authorization", `Bearer dummyToken`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/Missing businessId/i);
  });

  it("should return 400 for non-existing businessId", async () => {
    const nonExistentBusinessId = "999999999";
    const response = await supertest(fastify.server)
      .post("/createClientChat")
      .set("Authorization", `Bearer dummyToken`)
      .send({ businessId: nonExistentBusinessId });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/does not exist|not found|error/i);
  });

  it("should return the participant list when chats exist", async () => {
    // First, create a participant via the actual API
    const createResponse = await supertest(fastify.server)
      .post("/createClientChat")
      .set("Authorization", `Bearer dummyToken`)
      .send({ businessId: business.id.toString() });

    expect(createResponse.status).toBe(200);

    // Then, get the participant list
    const getResponse = await supertest(fastify.server)
      .get("/getClientChats")
      .set("Authorization", `Bearer dummyToken`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.success).toBe(true);
    const retrievedParticipant = getResponse.body.userAsParticipantList[0];
    expect(retrievedParticipant).toHaveProperty("id");
    expect(retrievedParticipant).toHaveProperty("conversationId");
    expect(retrievedParticipant).toHaveProperty("userId", "1");
    expect(retrievedParticipant).toHaveProperty("role", "CUSTOMER");
  });
});
