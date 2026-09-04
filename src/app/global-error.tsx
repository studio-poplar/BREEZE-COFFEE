"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import NextError from "next/error";

// App Router only reports errors caught by nearby error.tsx boundaries;
// this root-level file is the one Sentry needs to also see failures during
// the initial render/hydration of the page shell itself.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
