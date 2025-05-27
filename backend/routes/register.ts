import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
// import * as dotenv from 'dotenv';
// dotenv.config();

import prisma from '../utils/db';

export async function registerRoutes(fastify : FastifyInstance) {
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

    const newUser = await prisma.user.create({
        data: {
        username,
        email,
        password: hashedPassword,
        role: 'AGENT',
        businessId: parsedBusinessId,
        },
    });

    reply.send({ id: newUser.id.toString(), username: newUser.username, email: newUser.email });
    });
}