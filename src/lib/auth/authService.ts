/**
 * Simple JWT Authentication Service
 * 
 * Provides user registration, login, and token validation.
 */

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// In production, use a proper database. This is an in-memory store for demo.
interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
}

const users: Map<string, User> = new Map();

// Demo user (pre-seeded)
const DEMO_USER: User = {
  id: 'demo-user-001',
  email: 'demo@docuextract.com',
  passwordHash: bcrypt.hashSync('demo123', 10),
  name: 'Demo User',
  createdAt: new Date(),
};
users.set(DEMO_USER.email, DEMO_USER);

// JWT Configuration
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'docuextract-secret-key-change-in-production'
);
const JWT_EXPIRY = '24h';

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; user?: Omit<User, 'passwordHash'> }> {
  // Check if user exists
  if (users.has(email)) {
    return { success: false, error: 'User already exists' };
  }

  // Validate input
  if (!email || !password || !name) {
    return { success: false, error: 'Email, password, and name are required' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }

  // Create user
  const id = `user-${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);
  
  const user: User = {
    id,
    email,
    passwordHash,
    name,
    createdAt: new Date(),
  };

  users.set(email, user);

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Login and get JWT token
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; token?: string; user?: Omit<User, 'passwordHash'> }> {
  const user = users.get(email);

  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, error: 'Invalid email or password' };
  }

  // Generate JWT
  const token = await new SignJWT({
    userId: user.id,
    email: user.email,
    name: user.name,
  } as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    },
  };
}

/**
 * Verify JWT token
 */
export async function verifyToken(
  token: string
): Promise<{ valid: boolean; payload?: TokenPayload; error?: string }> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      valid: true,
      payload: payload as unknown as TokenPayload,
    };
  } catch {
    return { valid: false, error: 'Invalid or expired token' };
  }
}

/**
 * Get current user from token
 */
export async function getCurrentUser(
  token: string
): Promise<Omit<User, 'passwordHash'> | null> {
  const result = await verifyToken(token);
  if (!result.valid || !result.payload) return null;

  const user = users.get(result.payload.email);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

/**
 * List all users (admin only, for demo)
 */
export function listUsers(): Omit<User, 'passwordHash'>[] {
  return Array.from(users.values()).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
  }));
}
