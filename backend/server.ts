import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';

dotenv.config();

const fastify = Fastify();
fastify.register(fastifyWebsocket);

fastify.register(cors, {
  origin: ['http://127.0.0.1:54489'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
});

// Dummy users for now
const users = [
  { username: 'alice', password: 'password123', role: 'AGENT', sub: 'user1' },
  { username: 'bob', password: 'password123', role: 'CLIENT', sub: 'user2' }
];

// Login endpoint to issue JWTs
fastify.post('/login', async (request, reply) => {
  const { username, password } = request.body as { username: string; password: string };

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return reply.status(401).send({ error: 'Invalid username or password' });
  }

  // Sign JWT with user info
  const token = jwt.sign(
    {
      sub: user.sub,
      role: user.role,
      username: user.username,
    },
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
      console.log(`💬 Received from ${user.sub}:`, msg.toString());
    });

  } catch (err) {
    conn.socket.close(4001, 'Invalid token');
  }
});

// Start server
fastify.listen({ port: 3001 }, (err, address) => {
  if (err) throw err;
  console.log(`Server listening at ${address}`);
});
