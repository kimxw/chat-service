import Fastify from 'fastify';
import jwt from 'jsonwebtoken';
import { authRoutes } from '../backend/routes/auth'; 
import { PrismaClient } from '@prisma/client';
const dotenv = require('dotenv');
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

const prisma = new PrismaClient();
const supertest = require('supertest');
const bcrypt = require('bcrypt');

describe('Auth endpoints', () => {
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
    await prisma.user.deleteMany();
    const hashedPassword = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        username: 'authtestuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'CLIENT',
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should return 401 on invalid login', async () => {
    const response = await supertest(fastify.server)
      .post('/login')
      .send({
        username: 'authnonexistent',
        password: 'password123',
      });
    expect(response.status).toBe(401);
  });

  it('should login successfully and return JWT', async () => {
    const response = await supertest(fastify.server)
      .post('/login')
      .send({
        username: 'authtestuser',
        password: 'password123',
      });
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
