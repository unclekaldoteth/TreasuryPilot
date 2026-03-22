import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

const themeInitScript = `
  try {
    const storedTheme = window.localStorage.getItem("tp-theme");
    const theme = storedTheme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
  } catch {
    document.documentElement.setAttribute("data-theme", "light");
  }
`;

export const metadata: Metadata = {
  title: "TreasuryPilot — Policy-Controlled Treasury Agent",
  description:
    "A self-custodial treasury agent that reads plain-language payment requests, enforces deterministic treasury rules, and executes stablecoin operations through Tether WDK with a full audit trail.",
  openGraph: {
    title: "TreasuryPilot — Policy-Controlled Treasury Agent",
    description:
      "AI-powered treasury operations with deterministic policy enforcement and Tether WDK wallet execution.",
    type: "website",
  },
  keywords: ["treasury", "stablecoin", "tether", "WDK", "policy", "agent", "USDt"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full antialiased">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
