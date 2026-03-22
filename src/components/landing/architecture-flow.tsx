"use client";

import { useEffect, useState } from "react";

const nodes = [
  { key: "request", label: "Request", icon: "📝", description: "Natural language" },
  { key: "agent", label: "Agent", icon: "🤖", description: "Parse intent" },
  { key: "policy", label: "Policy", icon: "🛡️", description: "Enforce rules" },
  { key: "wallet", label: "Wallet", icon: "💳", description: "WDK execution" },
  { key: "audit", label: "Audit", icon: "📋", description: "Immutable log" },
] as const;

export function ArchitectureFlow() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showConnectors, setShowConnectors] = useState(false);

  useEffect(() => {
    const nodeTimers: ReturnType<typeof setTimeout>[] = [];

    nodes.forEach((_, index) => {
      nodeTimers.push(
        setTimeout(() => {
          setVisibleCount(index + 1);
        }, 300 + index * 280),
      );
    });

    const connectorTimer = setTimeout(() => {
      setShowConnectors(true);
    }, 200);

    return () => {
      nodeTimers.forEach(clearTimeout);
      clearTimeout(connectorTimer);
    };
  }, []);

  return (
    <div className="architecture-flow py-2">
      <div className="flex items-center justify-center gap-0">
        {nodes.map((node, index) => {
          const appeared = index < visibleCount;
          const isLast = index === nodes.length - 1;

          return (
            <div key={node.key} className="flex items-center">
              <div
                className={`flex flex-col items-center gap-1.5 rounded-[1.2rem] border border-[var(--border)] bg-white/80 px-4 py-3 shadow-[0_8px_24px_-16px_var(--shadow)] transition-all duration-500 ${
                  appeared
                    ? "opacity-100 translate-y-0 scale-100"
                    : "opacity-0 translate-y-4 scale-90"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <span className="text-xl leading-none">{node.icon}</span>
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--ink)]">
                  {node.label}
                </span>
                <span className="text-[9px] leading-3 text-[var(--muted)]">
                  {node.description}
                </span>
              </div>

              {!isLast && (
                <div className="flex items-center px-1">
                  <div
                    className={`h-[2px] w-5 transition-all duration-700 ${
                      showConnectors && appeared
                        ? "bg-[var(--mint)] opacity-80 scale-x-100"
                        : "bg-[var(--border)] opacity-0 scale-x-0"
                    }`}
                    style={{
                      transformOrigin: "left",
                      transitionDelay: `${index * 280 + 400}ms`,
                    }}
                  />
                  <div
                    className={`text-[10px] transition-all duration-500 ${
                      showConnectors && appeared
                        ? "text-[var(--mint)] opacity-70"
                        : "opacity-0"
                    }`}
                    style={{ transitionDelay: `${index * 280 + 500}ms` }}
                  >
                    →
                  </div>
                  <div
                    className={`h-[2px] w-5 transition-all duration-700 ${
                      showConnectors && appeared
                        ? "bg-[var(--mint)] opacity-80 scale-x-100"
                        : "bg-[var(--border)] opacity-0 scale-x-0"
                    }`}
                    style={{
                      transformOrigin: "left",
                      transitionDelay: `${index * 280 + 550}ms`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
