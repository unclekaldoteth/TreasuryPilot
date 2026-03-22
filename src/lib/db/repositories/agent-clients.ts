import { db } from "@/lib/db/client";

export async function findAgentClientByTokenHash(authTokenHash: string) {
  return db.agentClient.findUnique({
    where: {
      authTokenHash,
    },
  });
}

export async function findOrCreateAgentClient(input: {
  preferredId?: string;
  name: string;
  authTokenHash: string;
  callbackUrl?: string;
}) {
  const existingByToken = await db.agentClient.findUnique({
    where: {
      authTokenHash: input.authTokenHash,
    },
  });

  if (existingByToken) {
    return existingByToken;
  }

  if (input.preferredId) {
    const existingById = await db.agentClient.findUnique({
      where: {
        id: input.preferredId,
      },
    });

    if (existingById) {
      return existingById;
    }
  }

  return db.agentClient.create({
    data: {
      id: input.preferredId,
      name: input.name,
      authTokenHash: input.authTokenHash,
      callbackUrl: input.callbackUrl,
      status: "enabled",
    },
  });
}
