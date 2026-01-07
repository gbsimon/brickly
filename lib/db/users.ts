// Server-side database functions for users (using Prisma)

import { prisma } from '@/lib/prisma';

/**
 * Ensure a user exists in the database
 * Creates the user if they don't exist, otherwise returns existing user
 */
export async function ensureUser(
  userId: string,
  email?: string | null,
  name?: string | null,
  image?: string | null
) {
  return prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      email: email || null,
      name: name || null,
      image: image || null,
    },
    update: {
      // Update user info if it changed
      email: email || null,
      name: name || null,
      image: image || null,
    },
  });
}

