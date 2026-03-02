"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function OpenRouterCallback() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("code");
    if (code && window.opener) {
      window.opener.postMessage({ type: "openrouter_code", code }, "*");
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-sm text-zinc-400">Completing login... you can close this window.</p>
    </div>
  );
}
