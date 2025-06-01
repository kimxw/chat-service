import Fastify from "fastify";
import { messageRoutes } from "../../backend/routes/messages";
import { PrismaClient } from "@prisma/client";

const supertest = require("supertest");
jest.setTimeout(20000);

const prisma = new PrismaClient();

describe("Message Routes Integration Tests", () => {
  let fastify;

  // Test data IDs
  let customerId: bigint;
  let agentId: bigint;
  let conversationId: bigint;
  let messageId: bigint;

  beforeAll(async () => {
    fastify = Fastify();
    fastify.register(messageRoutes);
    await fastify.ready();

    // Clear DB before tests
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Create test users
    const customer = await prisma.user.create({
      data: {
        username: "testcustomer",
        email: "customer@test.com",
        password: "hashedpassword",
        role: "CUSTOMER",
      },
    });
    customerId = customer.id;

    const agent = await prisma.user.create({
      data: {
        username: "testagent",
        email: "agent@test.com",
        password: "hashedpassword",
        role: "AGENT",
      },
    });
    agentId = agent.id;

    const business = await prisma.business.create({
        data: {
            name: "Test Business",
        },
    });

    // Create a conversation
    const conversation = await prisma.conversation.create({
      data: {
        type: "SUPPORT_ROOM",
        businessId: business.id,
      },
    });
    conversationId = conversation.id;

    // Add participants
    await prisma.participant.createMany({
      data: [
        { userId: customerId, conversationId, role: "CUSTOMER" },
        { userId: agentId, conversationId, role: "AGENT" },
      ],
    });

    // Create a message
    const message = await prisma.message.create({
        data: {
            conversationId,
            senderId: customerId,
            contentType: "TEXT",  // use one of MessageContentType enums, e.g., "TEXT"
            body: "Hello world",  // the actual text content is stored here
            readByCustomer: false,
        },
    });
    messageId = message.id;
  });

  afterAll(async () => {
    // Clean DB after tests
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.participant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    await prisma.$disconnect();
    await fastify.close();
  });

  describe("GET /conversations/:id/messages", () => {
    it("returns 200 and messages if conversation exists", async () => {
      const res = await supertest(fastify.server).get(`/conversations/${conversationId}/messages`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty("body", "Hello world");
    });

    it("returns 404 if conversation does not exist", async () => {
      const res = await supertest(fastify.server).get("/conversations/999999/messages");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("POST /conversations/:id/messages", () => {
    it("creates a new message and returns 201", async () => {
      const res = await supertest(fastify.server)
        .post(`/conversations/${conversationId}/messages`)
        .send({
          senderId: agentId.toString(),
          body: "A new test message",
          currentRole: "AGENT",
        });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("body", "A new test message");
      expect(res.body).toHaveProperty("sender");
      expect(res.body.sender.id).toBe(agentId.toString());
    });

    it("returns 400 if no content provided", async () => {
      const res = await supertest(fastify.server)
        .post(`/conversations/${conversationId}/messages`)
        .send({
          senderId: agentId.toString(),
          currentRole: "AGENT",
        });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PATCH /conversations/:cid/messages/:mid/read/customer", () => {
    it("marks message as read and returns updated message", async () => {
      const res = await supertest(fastify.server)
        .patch(`/conversations/${conversationId}/messages/${messageId}/read/customer`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message.readByCustomer", true);
    });
  });

  describe("GET /messages/:id", () => {
    it("returns message by ID", async () => {
      const res = await supertest(fastify.server).get(`/messages/${messageId}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toHaveProperty("id", messageId.toString());
      expect(res.body.message.sender).toHaveProperty("id");
    });

    it("returns 404 if message not found", async () => {
      const res = await supertest(fastify.server).get("/messages/9999999");
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });
});
