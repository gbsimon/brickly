// Server-side database functions for users (using Prisma)

import { prisma } from '@/lib/prisma';

/**
 * Ensure a user exists in the database
 * Creates the user if they don't exist, otherwise returns existing user
 * Handles unique constraint on email by checking if user exists first
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
        // We need to migrate all their data (sets, progress) to the new user ID
        // IMPORTANT: Create the new user FIRST, then migrate, then delete old user
        // This prevents foreign key constraint violations
        
        // Step 1: Check if new user already exists
        let newUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        
        if (!newUser) {
          // Step 2: Create new user with new ID (temporarily without email to avoid unique constraint)
          // We'll update the email after deleting the old user
          try {
            newUser = await prisma.user.create({
              data: {
                id: userId,
                email: null, // Temporarily null to avoid unique constraint
                name: name || existingUserByEmail.name,
                image: image || existingUserByEmail.image,
              },
            });
          } catch (createError: any) {
            // If user already exists (race condition), fetch it
            if (createError?.code === 'P2002') {
              newUser = await prisma.user.findUnique({
                where: { id: userId },
              });
            } else {
              throw createError;
            }
          }
        }
        
        // Step 3: Migrate sets to new userId (now the user exists, so FK constraint is satisfied)
        await prisma.set.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: userId },
        });
        
        // Step 4: Migrate progress to new userId
        await prisma.progress.updateMany({
          where: { userId: existingUserByEmail.id },
          data: { userId: userId },
        });
        
        // Step 5: Delete old user (only if it still exists)
        try {
          await prisma.user.delete({
            where: { id: existingUserByEmail.id },
          });
        } catch (deleteError: any) {
          // If user was already deleted or doesn't exist, that's fine
          if (deleteError?.code !== 'P2025') {
            throw deleteError;
          }
        }
        
        // Step 6: Update new user with correct email (now that old user is deleted)
        // Ensure newUser exists (should always be true at this point)
        if (!newUser) {
          throw new Error('Failed to create new user during migration');
        }
        
        return prisma.user.update({
          where: { id: userId },
          data: {
            email: email || null,
            name: name || newUser.name,
            image: image || newUser.image,
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

