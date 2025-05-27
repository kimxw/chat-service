import jwt from "jsonwebtoken";
import { FastifyRequest, FastifyReply } from "fastify";

export const verifyJWT = (
  request: FastifyRequest,
  reply: FastifyReply,
): { userId: bigint } => {
  const authHeader = request.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply
      .code(401)
      .send({ message: "Missing or invalid Authorization header" });
    throw new Error("Unauthorized");
  }

  const token = authHeader.split(" ")[1];
  try {
    const secret = process.env.JWT_SECRET || "default_secret";
    const decoded = jwt.verify(token, secret) as { id: string }; // JWT userId is string

    if (!decoded.id) {
      reply.code(401).send({ message: "Invalid token payload" });
      throw new Error("Unauthorized");
    }

    return { userId: BigInt(decoded.id) };
  } catch (err) {
    reply.code(401).send({ message: "Invalid token" });
    throw new Error("Unauthorized");
  }
};
