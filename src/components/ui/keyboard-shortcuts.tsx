"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const routes = [
  "/dashboard",
  "/policy",
  "/payments",
  "/bridges",
  "/approvals",
  "/audit",
];

export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey) {
        const digit = parseInt(event.key, 10);
        if (digit >= 1 && digit <= routes.length) {
          event.preventDefault();
          router.push(routes[digit - 1]);
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  return null;
}
