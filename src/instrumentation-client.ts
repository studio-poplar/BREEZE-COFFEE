import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Local dev hits Next.js Fast Refresh noise ("Router action dispatched
  // before initialization" and the like) constantly — none of that is a
  // real bug, so only report from the actual deployed production site.
  enabled: process.env.NODE_ENV === "production",
  // Small cafe app, low traffic — full sampling is cheap and gives complete data.
  tracesSampleRate: 1,
  // Session replay only matters when something actually broke.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.replayIntegration()],
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
