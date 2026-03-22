"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const themeStorageKey = "tp-theme";
const themeChangeEvent = "tp-theme-change";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

function getThemeSnapshot(): Theme {
  if (typeof document !== "undefined") {
    const documentTheme = document.documentElement.getAttribute("data-theme");

    if (isTheme(documentTheme)) {
      return documentTheme;
    }
  }

  if (typeof window !== "undefined") {
    const storedTheme = window.localStorage.getItem(themeStorageKey);

    if (isTheme(storedTheme)) {
      return storedTheme;
    }
  }

  return "light";
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(themeChangeEvent, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(themeChangeEvent, handleChange);
  };
}

function applyTheme(theme: Theme) {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(themeStorageKey, theme);
  window.dispatchEvent(new Event(themeChangeEvent));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, () => "light");

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    applyTheme(next);
  }

  return (
    <button
      onClick={toggleTheme}
      className="rounded-full border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-strong)]"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
