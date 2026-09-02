import { SignJWT, jwtVerify } from "jose";
import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Customer } from "@/lib/types";

/**
 * Customer identity comes from LINE, via LIFF, in production: the client
 * sends `liff.getAccessToken()` as a bearer token, and we check it live
 * against LINE's own profile endpoint rather than trusting anything the
 * client claims, so nobody can place an order (or read someone's
 * "favorites") under another customer's identity.
 *
 * Deliberately the access token, not `liff.getIDToken()`: the ID token is a
 * JWT minted once at login with its own fixed expiry, and calling
 * getIDToken() again just returns that same (possibly now-expired) string —
 * there is no client-side refresh for it. The access token is the one LIFF's
 * SDK actually keeps valid, auto-renewing it under the hood, so re-reading
 * it right before each request is what makes "fetch a fresh token" actually
 * fresh. (This bit a real customer: an order placed a few minutes after
 * opening the app failed with a stale ID token even after an earlier fix
 * that re-read getIDToken() per-request — the token itself just never
 * became valid again.)
 *
 * Until a real LINE Login channel is wired up (see .env), requests carry a
 * locally-signed dev token instead (minted by POST /api/dev/token). It is
 * verified the same way, just against a local secret, so the rest of the
 * app (order creation, favorites, ticket page) is exercised for real.
 */

interface LineIdentity {
  lineUserId: string;
  displayName: string;
  pictureUrl: string | null;
}

function devSecret() {
  return new TextEncoder().encode(
    process.env.AUTH_DEV_CUSTOMER_SECRET ?? "dev-only-customer-secret-change-me"
  );
}

export function devAuthEnabled(): boolean {
  // Disabled outright once a real LIFF channel is configured, so a leftover
  // dev token can never impersonate a customer in production.
  return !process.env.NEXT_PUBLIC_LIFF_ID;
}

export async function mintDevCustomerToken(displayName: string): Promise<string> {
  if (!devAuthEnabled()) {
    throw new Error("dev auth disabled: NEXT_PUBLIC_LIFF_ID is configured");
  }
  const lineUserId = `dev:${newId()}`;
  return await new SignJWT({ sub: lineUserId, name: displayName, dev: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(devSecret());
}

async function verifyDevToken(token: string): Promise<LineIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, devSecret());
    if (!payload.dev || typeof payload.sub !== "string") return null;
    return {
      lineUserId: payload.sub,
      displayName: (payload.name as string) ?? "ゲスト",
      pictureUrl: null,
    };
  } catch {
    return null;
  }
}

async function verifyLiffAccessToken(accessToken: string): Promise<LineIdentity | null> {
  // Calling LINE's own profile endpoint doubles as token verification: it
  // only succeeds with a currently-valid access token, and hands back the
  // user id straight from LINE's server rather than anything client-supplied.
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { userId?: string; displayName?: string; pictureUrl?: string };
  if (!data.userId) return null;
  return {
    lineUserId: data.userId,
    displayName: data.displayName ?? "ゲスト",
    pictureUrl: data.pictureUrl ?? null,
  };
}

export async function verifyCustomerToken(token: string): Promise<LineIdentity | null> {
  if (devAuthEnabled()) {
    const dev = await verifyDevToken(token);
    if (dev) return dev;
  }
  return await verifyLiffAccessToken(token);
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

export async function ensureCustomer(identity: LineIdentity): Promise<Customer> {
  const rows = (await sql`
    INSERT INTO customers (customer_id, line_user_id, display_name, picture_url, created_at)
    VALUES (${newId()}, ${identity.lineUserId}, ${identity.displayName}, ${identity.pictureUrl}, ${new Date().toISOString()})
    ON CONFLICT (line_user_id) DO UPDATE SET
      display_name = excluded.display_name,
      picture_url = excluded.picture_url
    RETURNING *
  `) as Customer[];
  return rows[0];
}

/** Verifies the bearer token on `req` and returns the matching customer row, or null. */
export async function authenticateCustomer(req: Request): Promise<Customer | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const identity = await verifyCustomerToken(token);
  if (!identity) return null;
  return ensureCustomer(identity);
}
