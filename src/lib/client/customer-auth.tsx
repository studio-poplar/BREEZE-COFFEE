"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const DEV_TOKEN_KEY = "groove_dev_customer_token";
const DEV_NAME_KEY = "groove_dev_customer_name";

interface CustomerProfile {
  displayName: string;
  pictureUrl: string | null;
}

interface CustomerAuthState {
  ready: boolean;
  isDevMode: boolean;
  /** Present once logged in — use to gate UI, but don't send it to the API: it can go
   *  stale while the customer browses. Call getAuthToken() for actual requests. */
  token: string | null;
  /** Always returns a fresh token at call time (re-reads liff.getIDToken() rather than
   *  a value cached at mount), since LINE ID tokens can expire while someone browses
   *  the menu for a few minutes before checking out. */
  getAuthToken: () => Promise<string | null>;
  profile: CustomerProfile | null;
  /** Records the confirmed order in the customer's own LINE chat via liff.sendMessages (no-op outside real LIFF). */
  recordOrderMessage: (text: string) => Promise<void>;
  setDevName: (name: string) => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID;

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liffInstance, setLiffInstance] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      if (LIFF_ID) {
        const liff = (await import("@line/liff")).default;
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return; // page will reload after redirect
        }
        const idToken = liff.getIDToken();
        const p = await liff.getProfile();
        if (cancelled) return;
        setLiffInstance(liff);
        setToken(idToken);
        setProfile({ displayName: p.displayName, pictureUrl: p.pictureUrl ?? null });
        setReady(true);
        return;
      }

      // Dev fallback: reuse a locally-signed token until a real LIFF channel exists.
      const cachedToken = localStorage.getItem(DEV_TOKEN_KEY);
      const cachedName = localStorage.getItem(DEV_NAME_KEY);
      if (cachedToken && cachedName) {
        setToken(cachedToken);
        setProfile({ displayName: cachedName, pictureUrl: null });
      }
      setReady(true);
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []);

  async function setDevName(name: string) {
    const res = await fetch("/api/dev/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name }),
    });
    if (!res.ok) throw new Error("dev token issue failed");
    const { token: newToken } = await res.json();
    localStorage.setItem(DEV_TOKEN_KEY, newToken);
    localStorage.setItem(DEV_NAME_KEY, name);
    setToken(newToken);
    setProfile({ displayName: name, pictureUrl: null });
  }

  async function getAuthToken(): Promise<string | null> {
    if (LIFF_ID) {
      // Re-read from the SDK rather than returning the `token` state captured at
      // mount — liff manages the underlying session and is the source of truth
      // for whether that token is still valid.
      return liffInstance ? (liffInstance.getIDToken() ?? null) : null;
    }
    return localStorage.getItem(DEV_TOKEN_KEY);
  }

  async function recordOrderMessage(text: string) {
    if (!liffInstance || !liffInstance.isInClient?.()) return;
    try {
      await liffInstance.sendMessages([{ type: "text", text }]);
    } catch {
      // best-effort: history message failing shouldn't block the order flow
    }
  }

  return (
    <CustomerAuthContext.Provider
      value={{ ready, isDevMode: !LIFF_ID, token, getAuthToken, profile, recordOrderMessage, setDevName }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
