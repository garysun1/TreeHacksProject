"use client";

import { PipelineStage } from "@/lib/types";
import { Check, Loader2 } from "lucide-react";

function StageChip({ stage }: { stage: PipelineStage }) {
  const isActive = stage.status === "active";
  const isComplete = stage.status === "complete";
  const isError = stage.status === "error";

  if (stage.status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 px-2.5 py-1 rounded-full bg-gray-100">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
        {stage.name}
      </span>
    );
  }

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
        <Loader2 className="h-3 w-3 animate-spin" />
        {stage.statusText || stage.name}
      </span>
    );
  }

  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 px-2.5 py-1 rounded-full bg-emerald-50">
        <Check className="h-3 w-3" />
        {stage.name}
      </span>
    );
  }

  if (isError) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-600 px-2.5 py-1 rounded-full bg-red-50">
        ✕ {stage.name}
      </span>
    );
  }

  return null;
}

export function PipelineTracker({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="w-full bg-white border-b border-border py-2.5">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-1.5">
              <StageChip stage={stage} />
              {i < stages.length - 1 && (
                <span className="text-gray-300 text-xs">›</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
