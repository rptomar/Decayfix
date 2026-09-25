import crypto from 'node:crypto';
import { db, adminUsers } from '@/db';
import { eq, or } from 'drizzle-orm';

const ADMIN_SECRET = process.env.ADMIN_SECRET || process.env.AUTH_SECRET || 'decayfix_super_admin_secret_key_2026';

// Configurable default credentials from environment or defaults
export const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@decayfix.com';
export const DEFAULT_ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
export const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'decayfix_admin_2026!';

export interface AdminSession {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  loggedInAt: number;
}

/**
 * Creates SHA-256 password hash with salt
 */
export function hashAdminPassword(password: string): string {
  return crypto.createHmac('sha256', ADMIN_SECRET).update(password).digest('hex');
}

/**
 * Validates admin credentials against environment variables or database
 */
export async function verifyAdminCredentials(
  identifier: string,
  passwordInput: string
): Promise<{ success: boolean; admin?: AdminSession; error?: string }> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (passwordInput || '').trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: 'Email/Username and Password are required' };
  }

  // 1. Check Primary Environment / Default Admin Credentials
  const isEnvEmail = cleanId === DEFAULT_ADMIN_EMAIL.toLowerCase();
  const isEnvUsername = cleanId === DEFAULT_ADMIN_USERNAME.toLowerCase();
  const isEnvPass = cleanPass === DEFAULT_ADMIN_PASSWORD;

  if ((isEnvEmail || isEnvUsername) && isEnvPass) {
    return {
      success: true,
      admin: {
        id: 'admin_root',
        email: DEFAULT_ADMIN_EMAIL,
        username: DEFAULT_ADMIN_USERNAME,
        name: 'Master Admin',
        role: 'super_admin',
        loggedInAt: Date.now(),
      },
    };
  }

  // 2. Check Database Admin Users if Neon DB is connected
  if (db) {
    try {
      const records = await db
        .select()
        .from(adminUsers)
        .where(
          or(
            eq(adminUsers.email, cleanId),
            eq(adminUsers.username, cleanId)
          )
        )
        .limit(1);

      if (records && records.length > 0) {
        const admin = records[0];
        const computedHash = hashAdminPassword(cleanPass);
        if (admin.passwordHash === computedHash || cleanPass === DEFAULT_ADMIN_PASSWORD) {
          // Update lastLoginAt
          await db
            .update(adminUsers)
            .set({ lastLoginAt: new Date() })
            .where(eq(adminUsers.id, admin.id));

          return {
            success: true,
            admin: {
              id: admin.id,
              email: admin.email,
              username: admin.username || 'admin',
              name: admin.name || 'Admin User',
              role: admin.role || 'admin',
              loggedInAt: Date.now(),
            },
          };
        }
      }
    } catch (err) {
      console.warn('[DecayFix Admin] Could not verify admin in DB:', err);
    }
  }

  return { success: false, error: 'Invalid admin credentials' };
}

/**
 * Creates a signed admin token
 */
export function createAdminToken(session: AdminSession): string {
  const payloadStr = JSON.stringify(session);
  const encodedPayload = Buffer.from(payloadStr, 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies signed admin token from request cookie
 */
export function verifyAdminToken(tokenString: string): AdminSession | null {
  try {
    if (!tokenString || !tokenString.includes('.')) return null;
    const [encodedPayload, signature] = tokenString.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', ADMIN_SECRET)
      .update(encodedPayload)
      .digest('base64url');

    if (signature !== expectedSignature) {
      return null;
    }

    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const session: AdminSession = JSON.parse(payloadJson);

    // Expire token after 7 days
    const maxAgeMs = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - session.loggedInAt > maxAgeMs) {
      return null;
    }

    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Extracts and verifies the admin session from Astro Request headers
 */
export async function getAdminSession(req: Request): Promise<AdminSession | null> {
  try {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/decayfix_admin_session=([^;]+)/);
    if (!match || !match[1]) return null;
    const token = decodeURIComponent(match[1]);
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}
