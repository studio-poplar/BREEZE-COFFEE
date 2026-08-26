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
  token: string | null;
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
      value={{ ready, isDevMode: !LIFF_ID, token, profile, recordOrderMessage, setDevName }}
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
