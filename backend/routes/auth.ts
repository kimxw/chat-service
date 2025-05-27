import { FastifyInstance } from "fastify";
// import bcrypt from "bcrypt";
// import * as dotenv from 'dotenv';
// dotenv.config();

import prisma from "../utils/db";
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

export async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint to issue JWTs
  fastify.post("/login", async (request, reply) => {
    try { 
        const { username, password } = request.body as {
        username: string;
        password: string;
        };

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
        return reply.status(401).send({ error: "Invalid username or password" });
        }

        console.log("found unique");

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
        return reply.status(401).send({ error: "Invalid username or password" });
        }
        console.log("password hashed and validated");

        const token = jwt.sign(
        { id: user.id.toString(), role: user.role, username: user.username },
        process.env.JWT_SECRET!,
        { expiresIn: "1h" },
        );

        console.log("token made");

        return { token };
  } catch (err) {
        console.error("JWT sign error:", err);
        return reply.status(500).send({ error: "Token generation failed" });
  }
});
}