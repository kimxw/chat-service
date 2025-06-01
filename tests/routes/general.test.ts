import { generalUserServicesRoutes } from "../../backend/routes/general";
import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";

const supertest = require("supertest");
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
    fastify.register(generalUserServicesRoutes);
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

  describe("General User Services Routes", () => {
  it("GET /presence/online-users returns empty initially", async () => {
    const res = await supertest(fastify.server).get("/presence/online-users");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /conversations/:id/participants returns all participants", async () => {
    const res = await supertest(fastify.server).get(`/conversations/${conversationId}/participants`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
    const roles = res.body.map(p => p.role);
    expect(roles).toContain("CUSTOMER");
    expect(roles).toContain("AGENT");
  });

  it("PATCH /conversations/:id/markAllAsRead/AGENT marks unread messages as read by agents", async () => {
    // Add an unread message
    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderId: customerId,
        contentType: "TEXT",
        body: "Agent unread message",
        readByAgents: false,
      },
    });

    const res = await supertest(fastify.server)
      .patch(`/conversations/${conversationId}/markAllAsRead/AGENT`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.count).toBeGreaterThan(0);

    const updatedMsg = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(updatedMsg?.readByAgents).toBe(true);
  });

  it("PATCH /conversations/:id/markAllAsRead/CUSTOMER marks unread messages as read by customer", async () => {
    const msg = await prisma.message.create({
      data: {
        conversationId,
        senderId: agentId,
        contentType: "TEXT",
        body: "Customer unread message",
        readByCustomer: false,
      },
    });

    const res = await supertest(fastify.server)
      .patch(`/conversations/${conversationId}/markAllAsRead/CUSTOMER`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.count).toBeGreaterThan(0);

    const updatedMsg = await prisma.message.findUnique({ where: { id: msg.id } });
    expect(updatedMsg?.readByCustomer).toBe(true);
  });

  it("POST /conversations/:id/typing returns success even if no sockets are connected", async () => {
    const res = await supertest(fastify.server)
      .post(`/conversations/${conversationId}/typing`)
      .send({
        userId: agentId.toString(),
        username: "testagent",
        isTyping: true,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
  });

  it("GET /getAllBusinesses returns the test business", async () => {
    const res = await supertest(fastify.server).get("/getAllBusinesses");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(Array.isArray(res.body.businesses)).toBe(true);
    expect(res.body.businesses[0]).toHaveProperty("name", "Test Business");
  });
});
  
});



