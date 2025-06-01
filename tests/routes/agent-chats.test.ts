import Fastify from "fastify";
import { registerRoutes } from "../../backend/routes/register";
import { agentChatRoutes } from "../../backend/routes/agent-chats";
import { PrismaClient } from "@prisma/client";

jest.mock("../../backend/utils/verifyJWT", () => ({
  verifyJWT: (_req: any, _reply: any) => ({ userId: BigInt(2) }), // use agent userId for this suite
}));

jest.setTimeout(10000);

require("dotenv").config({ path: ".env.test" });

const prisma = new PrismaClient();
const supertest = require("supertest");

describe("Agent Chats API", () => {
  let fastify;
  let business;
  let agent;
  let conversation;
  let customer;

  beforeAll(async () => {
    fastify = Fastify();
    fastify.register(registerRoutes);
    fastify.register(agentChatRoutes);
    await fastify.ready();

    // Clean DB
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
      prisma.business.deleteMany(),
    ]);

    // Setup users and business
    customer = await prisma.user.create({
      data: {
        id: BigInt(1),
        username: "testcustomer",
        email: "customer@example.com",
        password: "hashedpassword",
        role: "CUSTOMER",
      },
    });

    agent = await prisma.user.create({
      data: {
        id: BigInt(2),
        username: "testagent",
        email: "agent@example.com",
        password: "hashedpassword",
        role: "AGENT",
      },
    });

    business = await prisma.business.create({
      data: {
        id: BigInt(1),
        name: "Test Business",
      },
    });

    conversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        type: "SUPPORT_ROOM",
      },
    });

    // Add participants: agent and customer
    await prisma.participant.createMany({
      data: [
        {
          userId: customer.id,
          conversationId: conversation.id,
          role: "CUSTOMER",
        },
        {
          userId: agent.id,
          conversationId: conversation.id,
          role: "AGENT",
        },
      ],
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

  it("should return the agent's participant list when chats exist", async () => {
    const response = await supertest(fastify.server)
      .get("/getAgentChats")
      .set("Authorization", `Bearer dummyToken`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userAsParticipantList.length).toBeGreaterThan(0);

    const participant = response.body.userAsParticipantList[0];
    expect(participant).toHaveProperty("id");
    expect(participant).toHaveProperty("conversationId");
    expect(participant).toHaveProperty("userId", "2"); // mocked agent id
    expect(participant).toHaveProperty("role", "AGENT");
  });

  it("should return an empty list if the agent has no chats", async () => {
    // Clean up agent's participants
    await prisma.participant.deleteMany({
      where: { userId: agent.id },
    });

    const response = await supertest(fastify.server)
      .get("/getAgentChats")
      .set("Authorization", `Bearer dummyToken`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.userAsParticipantList).toHaveLength(0);
  });

  it("deletes chat for all participants and returns success", async () => {
    // Create a new conversation with participants to test deletion
    const testConversation = await prisma.conversation.create({
      data: {
        businessId: business.id,
        type: "SUPPORT_ROOM",
      },
    });

    await prisma.participant.createMany({
      data: [
        {
          userId: customer.id,
          conversationId: testConversation.id,
          role: "CUSTOMER",
        },
        {
          userId: agent.id,
          conversationId: testConversation.id,
          role: "AGENT",
        },
      ],
    });

    // Send DELETE request
    const res = await supertest(fastify.server)
      .delete("/deleteChatForAll")
      .send({ conversationId: testConversation.id.toString() })
      .set("Authorization", `Bearer dummyToken`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      success: true,
      message: "Chat deleted successfully",
    });

    // Confirm all participants removed for that conversation
    const participantsAfter = await prisma.participant.findMany({
      where: { conversationId: testConversation.id },
    });
    expect(participantsAfter).toHaveLength(0);
  });


});
