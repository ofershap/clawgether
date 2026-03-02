"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function CallbackHandler() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code && window.opener) {
      window.opener.postMessage({ type: "openrouter_code", code }, "*");
      window.close();
    }
  }, [searchParams]);

  return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Completing login...</p>;
}

export default function OpenRouterCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
      <Suspense fallback={<p className="text-sm" style={{ color: "var(--text-tertiary)" }}>Loading...</p>}>
        <CallbackHandler />
      </Suspense>
    </div>
  );
}
