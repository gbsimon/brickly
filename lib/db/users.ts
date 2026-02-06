// Server-side database functions for users (using Prisma)

import { prisma } from '@/lib/prisma';

/**
 * Ensure a user exists in the database
 * Creates the user if they don't exist, otherwise returns existing user
 * Prefers existing users by email to keep data continuity across auth IDs
 */
export async function ensureUser(
  userId: string,
  email?: string | null,
  name?: string | null,
  image?: string | null
) {
  try {
    // First, try to find user by ID
    const existingUserById = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (existingUserById) {
      // User exists, update if needed
      return prisma.user.update({
        where: { id: userId },
        data: {
          email: email || existingUserById.email,
          name: name || existingUserById.name,
          image: image || existingUserById.image,
        },
      });
    }

    // User doesn't exist by ID, check if email exists (if provided)
    if (email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        // User exists with same email but different ID
        // Keep the existing user record to preserve data continuity
        return prisma.user.update({
          where: { id: existingUserByEmail.id },
          data: {
            email: email || existingUserByEmail.email,
            name: name || existingUserByEmail.name,
            image: image || existingUserByEmail.image,
          },
        });
      }
    }

    // No existing user, create new one
    return prisma.user.create({
      data: {
        id: userId,
        email: email || null,
        name: name || null,
        image: image || null,
      },
    });
  } catch (error) {
    // If we still get a unique constraint error, try to handle it gracefully
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      // Fallback: try to find and return existing user
      if (email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });
        if (existingUser) {
          return existingUser;
        }
      }
      // If no email, try by ID again
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (existingUser) {
        return existingUser;
      }
    }
    throw error;
  }
}
