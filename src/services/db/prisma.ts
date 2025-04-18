import { PrismaClient } from '@prisma/client';

// Singleton-Instanz des Prisma-Clients
const prisma = new PrismaClient();

export default prisma;