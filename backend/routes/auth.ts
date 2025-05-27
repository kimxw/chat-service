import { FastifyInstance } from "fastify";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
// import * as dotenv from 'dotenv';
// dotenv.config();

import prisma from "../utils/db";

export async function authRoutes(fastify: FastifyInstance) {
  // Login endpoint to issue JWTs
  console.log("function called");
  fastify.post("/login", async (request, reply) => {
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
  });
}
