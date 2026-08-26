import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StaffRole } from "@/lib/types";

const COOKIE_NAME = "groove_staff_session";
const SESSION_TTL = "12h";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_STAFF_SECRET ?? "dev-only-staff-secret-change-me");
}

export interface StaffSession {
  staffId: string;
  username: string;
  displayName: string;
  role: StaffRole;
  storeIds: string[];
}

export async function createStaffSession(session: StaffSession) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearStaffSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      staffId: payload.staffId as string,
      username: payload.username as string,
      displayName: payload.displayName as string,
      role: payload.role as StaffRole,
      storeIds: payload.storeIds as string[],
    };
  } catch {
    return null;
  }
}

/** Throws-free guard for API routes: returns null (→ caller responds 401) instead of throwing. */
export async function requireStaff(role?: StaffRole): Promise<StaffSession | null> {
  const session = await getStaffSession();
  if (!session) return null;
  if (role && session.role !== role && session.role !== "admin") return null;
  return session;
}
