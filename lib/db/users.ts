// Server-side database functions for users
// TEMPORARILY DISABLED: Prisma has been removed - returns safe fallback

/**
 * Ensure a user exists in the database
 * TEMPORARILY DISABLED: Returns a mock user object since Prisma is disabled
 * Multi-device sync is temporarily disabled - app runs in offline/Dexie-only mode
 */
export async function ensureUser(
  userId: string,
  email?: string | null,
  name?: string | null,
  image?: string | null
) {
  // Return a mock user object to prevent errors
  // The app will work in offline mode using Dexie only
  return {
    id: userId,
    email: email || null,
    name: name || null,
    image: image || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
