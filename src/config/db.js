import { PrismaClient } from '@prisma/client';

let client;

export function getPrisma() {
  if (!client)
    client = new PrismaClient({ transactionOptions: { maxWait: 10000, timeout: 20000 } });
  return client;
}

export async function disconnectPrisma() {
  if (client) await client.$disconnect();
  client = undefined;
}
