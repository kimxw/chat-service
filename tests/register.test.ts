import Fastify from "fastify";
import { registerRoutes } from "../backend/routes/register";
import { PrismaClient } from "@prisma/client";
// import bcrypt from 'bcrypt';


const prisma = new PrismaClient();
const supertest = require("supertest"); //rmb supertest uses commonjs export!!

describe("Auth endpoints", () => {
  let fastify;

  beforeAll(async () => {
    fastify = Fastify();
    fastify.register(registerRoutes);
    await fastify.ready();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await fastify.close();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it("should register a new user successfully", async () => {
    const response = await supertest(fastify.server).post("/register").send({
      username: "regtestuser",
      email: "test@example.com",
      password: "password123",
      role: "CLIENT",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.username).toBe("regtestuser");
  });

  it("should not register with duplicate username", async () => {
    await prisma.user.create({
      data: {
        username: "regtestuser",
        email: "test@example.com",
        password: "hashedpassword",
        role: "CLIENT",
      },
    });

    const response = await supertest(fastify.server).post("/register").send({
      username: "regtestuser",
      email: "new@example.com",
      password: "password123",
      role: "CLIENT",
    });

    expect(response.status).toBe(400);
  });

  it("should not register an agent with a non-existing business ID", async () => {
    const response = await supertest(fastify.server)
      .post("/register-agent")
      .send({
        username: "agentuser",
        email: "agent@example.com",
        password: "password123",
        role: "AGENT",
        businessId: "123456789",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/does not exist/);
  });

  it("should register a business", async () => {
    const response = await supertest(fastify.server)
      .post("/register-business")
      .send({
        name: "Test Business",
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Test Business");
  });

  it("should register an agent linked to an existing business", async () => {
    const business = await prisma.business.create({
      data: { name: "AgentCo" },
    });

    const response = await supertest(fastify.server)
      .post("/register-agent")
      .send({
        username: "agentuser",
        email: "agent@example.com",
        password: "password123",
        role: "AGENT",
        businessId: business.id.toString(),
      });

    expect(response.status).toBe(200);
    expect(response.body.username).toBe("agentuser");
    expect(response.body.email).toBe("agent@example.com");
  });
});
