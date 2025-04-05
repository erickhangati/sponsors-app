import { signIn } from 'next-auth/react';

/**
 * Handles user login
 */
export const authenticateUser = async (username: string, password: string) => {
  return signIn('credentials', { redirect: false, username, password });
};
