"use client";

import { Loader2 } from "lucide-react";
import { PipelineStage } from "@/lib/types";

interface AgentActivityIndicatorProps {
  stages: PipelineStage[];
}

export function AgentActivityIndicator({ stages }: AgentActivityIndicatorProps) {
  const activeStage = stages.find((s) => s.status === "active");

  if (!activeStage) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3.5 py-2 shadow-lg">
      <Loader2 className="h-3.5 w-3.5 text-emerald-600 animate-spin" />
      <span className="text-xs text-gray-600">{activeStage.statusText || "Processing..."}</span>
    </div>
  );
}
