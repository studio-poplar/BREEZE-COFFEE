import { SignJWT, jwtVerify } from "jose";
import { sql } from "@/lib/db";
import { newId } from "@/lib/ids";
import type { Customer } from "@/lib/types";

/**
 * Customer identity comes from LINE, via LIFF, in production:
 * the client calls `liff.getIDToken()` and sends it as a bearer token;
 * we verify it server-side against LINE's endpoint rather than trusting
 * whatever profile fields the client sends, so nobody can place an order
 * (or read someone's "favorites") under another customer's identity.
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

async function verifyLiffIdToken(idToken: string): Promise<LineIdentity | null> {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!channelId) return null;

  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { sub?: string; name?: string; picture?: string };
  if (!data.sub) return null;
  return {
    lineUserId: data.sub,
    displayName: data.name ?? "ゲスト",
    pictureUrl: data.picture ?? null,
  };
}

export async function verifyCustomerToken(token: string): Promise<LineIdentity | null> {
  if (devAuthEnabled()) {
    const dev = await verifyDevToken(token);
    if (dev) return dev;
  }
  return await verifyLiffIdToken(token);
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
