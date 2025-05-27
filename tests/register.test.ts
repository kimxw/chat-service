import Fastify from 'fastify';
import { registerRoutes } from '../backend/routes/register';
import { PrismaClient } from '@prisma/client';
// import bcrypt from 'bcrypt';
const dotenv = require('dotenv');
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const prisma = new PrismaClient();
const supertest = require('supertest'); //rmb supertest uses commonjs export!!

describe('Auth endpoints', () => {
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

  it('should register a new user successfully', async () => {
    const response = await supertest(fastify.server)
      .post('/register')
      .send({
        username: 'regtestuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'CLIENT',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
    expect(response.body.username).toBe('regtestuser');
  });

  it('should not register with duplicate username', async () => {
    await prisma.user.create({
      data: {
        username: 'regtestuser',
        email: 'test@example.com',
        password: 'hashedpassword',
        role: 'CLIENT',
      },
    });

    const response = await supertest(fastify.server)
      .post('/register')
      .send({
        username: 'regtestuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'CLIENT',
      });

    expect(response.status).toBe(400);
  });

});
