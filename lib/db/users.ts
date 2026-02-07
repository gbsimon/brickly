// Server-side database functions for users (Postgres)

import { db, query } from '@/lib/db/client';

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
    const existingUserById = await query<
      { id: string; email: string | null; name: string | null; image: string | null }
    >`select id, email, name, image from "users" where id = ${userId} limit 1`;

    if (existingUserById[0]) {
      // User exists, update if needed
      const current = existingUserById[0];
      const updated = await query<
        { id: string; email: string | null; name: string | null; image: string | null }
      >`update "users"
        set email = ${email || current.email},
            name = ${name || current.name},
            image = ${image || current.image}
        where id = ${userId}
        returning id, email, name, image`;
      return updated[0];
    }

    // User doesn't exist by ID, check if email exists (if provided)
    if (email) {
      const existingUserByEmail = await query<
        { id: string; email: string | null; name: string | null; image: string | null }
      >`select id, email, name, image from "users" where email = ${email} limit 1`;

      if (existingUserByEmail[0]) {
        // User exists with same email but different ID
        // Keep the existing user record to preserve data continuity
        const current = existingUserByEmail[0];
        const updated = await query<
          { id: string; email: string | null; name: string | null; image: string | null }
        >`update "users"
          set email = ${email || current.email},
              name = ${name || current.name},
              image = ${image || current.image}
          where id = ${current.id}
          returning id, email, name, image`;
        return updated[0];
      }
    }

    // No existing user, create new one
    const created = await query<
      { id: string; email: string | null; name: string | null; image: string | null }
    >`insert into "users" (id, email, name, image)
      values (${userId}, ${email || null}, ${name || null}, ${image || null})
      returning id, email, name, image`;
    return created[0];
  } catch (error) {
    // If we still get a unique constraint error, try to handle it gracefully
    const errorCode = (error as { code?: string })?.code;
    if (errorCode === "23505") {
      // Fallback: try to find and return existing user
      if (email) {
        const existingUser = await query<
          { id: string; email: string | null; name: string | null; image: string | null }
        >`select id, email, name, image from "users" where email = ${email} limit 1`;
        if (existingUser[0]) {
          return existingUser[0];
        }
      }
      // If no email, try by ID again
      const existingUser = await query<
        { id: string; email: string | null; name: string | null; image: string | null }
      >`select id, email, name, image from "users" where id = ${userId} limit 1`;
      if (existingUser[0]) {
        return existingUser[0];
      }
    }
    throw error;
  }
}
