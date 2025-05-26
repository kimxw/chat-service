import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const fastify = Fastify();
fastify.register(fastifyWebsocket);

fastify.register(cors, {
  origin: ['http://127.0.0.1:8080'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

const prisma = new PrismaClient();

// Dummy users for now
// const users = [
//   { username: 'alice', password: 'password123', role: 'AGENT', sub: 'user1' },
//   { username: 'bob', password: 'password123', role: 'CLIENT', sub: 'user2' }
// ];

// Login endpoint to issue JWTs
fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body as { username: string; password: string };

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return reply.status(401).send({ error: 'Invalid username or password' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return reply.status(401).send({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  return { token };
});

// WebSocket route
fastify.get('/ws', { websocket: true }, (conn, req) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      conn.socket.close(4001, 'Unauthorized');
      return;
    }

    const token = authHeader.split(' ')[1];
    const user = jwt.verify(token, process.env.JWT_SECRET!);
    console.log('Authenticated user:', user);

    conn.socket.on('message', (msg) => {
      console.log(`Received from ${user.sub}:`, msg.toString());
    });

  } catch (err) {
    conn.socket.close(4001, 'Invalid token');
  }
});

fastify.post('/register', async (request, reply) => {
  try {
    console.log("register pressed")
    const { username, email, password, role } = request.body as {
      username: string;
      email: string;
      password: string;
      role: string;
    };

    console.log("object created")

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return reply.status(400).send({ error: 'Username already taken' });
    }

    console.log("new user valid")

    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("password hashed")

    const newUser = await prisma.user.create({
      data: { username, email, password: hashedPassword, role },
    });

    console.log("new user created")

    reply.send({ id: newUser.id.toString(), username: newUser.username, email: newUser.email, role: newUser.role });

    console.log("reply sent")
  } catch (error) {
    console.error("Error during registration:", error);
    reply.status(500).send({ error: 'Internal Server Error', details: error instanceof Error ? error.message : error });
  }
});


fastify.post('/register-business', async (request, reply) => {
  const { name } = request.body as { name: string };
  const business = await prisma.business.create({
    data: { name },
  });
  reply.send({
  ...business,
  id: business.id.toString(),
}); //because of bigInt serialisation

});

fastify.post('/register-agent', async (request, reply) => {
  const { username, email, password, businessId } = request.body as {
  username: string;
  email: string;
  password: string;
  businessId: string;  // json doesnt handle bigint natively!
};

  const parsedBusinessId = BigInt(businessId);
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: 'AGENT',
      businessId: parsedBusinessId,
    },
  });

  reply.send({ id: user.id, username: user.username, email: user.email });
});


// Start server
fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
