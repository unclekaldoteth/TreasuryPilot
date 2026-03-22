"use client";

import { useEffect, useState } from "react";
import type { Decision } from "@/lib/types";

type PipelineStage = {
  key: string;
  label: string;
  description: string;
};

const stages: PipelineStage[] = [
  { key: "parsing", label: "Parsing", description: "Interpreting request intent" },
  { key: "policy", label: "Policy", description: "Evaluating treasury rules" },
  { key: "decision", label: "Decision", description: "Determining action" },
  { key: "execution", label: "Execution", description: "Submitting to wallet" },
];

function getStopIndex(decision: Decision, totalStages: number) {
  return decision === "reject" ? 2 : decision === "escalate" ? 3 : totalStages;
}

function getStageOutcome(
  stageIndex: number,
  decision: Decision,
  totalStages: number,
): "active" | "passed" | "stopped-red" | "stopped-gold" | "passed-green" | "waiting" {
  const stopIndex =
    decision === "reject" ? 1 : decision === "escalate" ? 2 : totalStages - 1;
  if (stageIndex < stopIndex) return "passed";
  if (stageIndex === stopIndex) {
    if (decision === "reject") return "stopped-red";
    if (decision === "escalate") return "stopped-gold";
    return "passed-green";
  }
  return "waiting";
}

const outcomeStyles: Record<string, string> = {
  waiting:
    "border-[var(--border)] bg-white/40 text-[var(--muted)] opacity-40",
  active:
    "border-[var(--gold)] bg-[rgba(183,133,18,0.08)] text-[var(--gold)]",
  passed:
    "border-[rgba(31,143,98,0.3)] bg-[rgba(31,143,98,0.06)] text-[var(--mint)]",
  "stopped-red":
    "border-[rgba(182,74,74,0.35)] bg-[rgba(182,74,74,0.08)] text-[var(--rose)]",
  "stopped-gold":
    "border-[rgba(183,133,18,0.35)] bg-[rgba(183,133,18,0.1)] text-[var(--gold)]",
  "passed-green":
    "border-[rgba(31,143,98,0.4)] bg-[rgba(31,143,98,0.1)] text-[var(--mint)]",
};

const outcomeIcons: Record<string, string> = {
  waiting: "○",
  active: "◎",
  passed: "✓",
  "stopped-red": "✕",
  "stopped-gold": "⇡",
  "passed-green": "✓",
};

const connectorColors: Record<string, string> = {
  waiting: "bg-[var(--border)]",
  passed: "bg-[var(--mint)]",
  "stopped-red": "bg-[var(--rose)]",
  "stopped-gold": "bg-[var(--gold)]",
  "passed-green": "bg-[var(--mint)]",
  active: "bg-[var(--gold)]",
};

export function DecisionPipeline({
  decision,
  animate,
}: {
  decision: Decision;
  animate: boolean;
}) {
  const stopIndex = getStopIndex(decision, stages.length);
  const [visibleCount, setVisibleCount] = useState(() => (animate ? 0 : stopIndex));

  useEffect(() => {
    if (!animate) {
      return;
    }

    let current = 0;
    const interval = window.setInterval(() => {
      current += 1;
      setVisibleCount(current);
      if (current >= stopIndex) {
        window.clearInterval(interval);
      }
    }, 380);

    return () => window.clearInterval(interval);
  }, [animate, stopIndex]);

  const resolvedVisibleCount = animate ? visibleCount : stopIndex;
  const visibleStages = stages.slice(0, stopIndex);

  return (
    <div className="pipeline-container">
      <div className="flex items-stretch gap-0">
        {visibleStages.map((stage, index) => {
          const appeared = index < resolvedVisibleCount;
          const isActive =
            animate &&
            appeared &&
            resolvedVisibleCount === index + 1 &&
            resolvedVisibleCount < stopIndex;
          const outcome = !appeared
            ? "waiting"
            : isActive
              ? "active"
              : getStageOutcome(index, decision, stages.length);
          const isLast = index === visibleStages.length - 1;

          return (
            <div
              key={stage.key}
              className="flex flex-1 items-center"
            >
              <div
                className={`pipeline-stage flex flex-1 flex-col items-center gap-2 rounded-[1.2rem] border px-3 py-4 transition-all duration-500 ${
                  outcomeStyles[outcome]
                } ${appeared ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-2 scale-95"}`}
                style={{
                  transitionDelay: animate ? `${index * 80}ms` : "0ms",
                }}
              >
                <span className="text-xl leading-none">{outcomeIcons[outcome]}</span>
                <span className="text-xs font-bold uppercase tracking-[0.18em]">
                  {stage.label}
                </span>
                <span className="text-center text-[10px] leading-4 opacity-70">
                  {stage.description}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`pipeline-connector mx-[-2px] h-[2px] w-6 shrink-0 transition-all duration-500 ${
                    appeared ? connectorColors[outcome] : "bg-[var(--border)]"
                  } ${appeared ? "opacity-100 scale-x-100" : "opacity-30 scale-x-50"}`}
                  style={{
                    transitionDelay: animate ? `${index * 80 + 200}ms` : "0ms",
                    transformOrigin: "left",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      <div
        className={`mt-3 text-center transition-all duration-500 ${
          resolvedVisibleCount >= stopIndex ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        style={{
          transitionDelay: animate ? `${stopIndex * 380 + 200}ms` : "0ms",
        }}
      >
        {decision === "execute" && (
          <p className="text-sm font-semibold text-[var(--mint)]">
            ✓ Payment approved and submitted to wallet
          </p>
        )}
        {decision === "escalate" && (
          <p className="text-sm font-semibold text-[var(--gold)]">
            ⇡ Escalated for human approval
          </p>
        )}
        {decision === "reject" && (
          <p className="text-sm font-semibold text-[var(--rose)]">
            ✕ Rejected by treasury policy
          </p>
        )}
      </div>
    </div>
  );
}
