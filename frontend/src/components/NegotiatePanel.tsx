"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, CheckCircle2, AlertCircle, Loader2, MessageSquare,
  RefreshCw, ExternalLink, Info,
} from "lucide-react";
import { NegotiateResponse } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

interface NegotiatePanelProps {
  open: boolean;
  onClose: () => void;
  data: NegotiateResponse | null;
  loading: boolean;
  error: boolean;
  productName: string;
  platform: string;
  onRetry: () => void;
}

const platformColors: Record<string, string> = {
  "Facebook Marketplace": "bg-sky-100 text-sky-800",
  Craigslist: "bg-violet-100 text-violet-800",
  eBay: "bg-blue-100 text-blue-800",
};

function CopyMessageButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(label ?? "Message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      size="sm"
      className={`h-8 text-xs ${copied ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white"}`}
      onClick={handleCopy}
    >
      {copied ? (
        <><Check className="h-3 w-3 mr-1" /> Copied!</>
      ) : (
        <><Copy className="h-3 w-3 mr-1" /> Copy Message</>
      )}
    </Button>
  );
}

function getMessages(data: NegotiateResponse): { aggressive: string; moderate: string; friendly: string } {
  // The backend may return messages in conversation_log (keyed by role)
  const aggressive = data.conversation_log?.find((m) => m.role === "buyer_aggressive")?.content ?? "";
  const moderate = data.conversation_log?.find((m) => m.role === "buyer_moderate")?.content ?? "";
  const friendly = data.conversation_log?.find((m) => m.role === "buyer_friendly")?.content ?? "";
  return { aggressive, moderate, friendly };
}

function parseNextSteps(steps: string[]): {
  tips: string[];
  walkAway: string | null;
  counterRange: string | null;
  fallback: string | null;
} {
  const tips: string[] = [];
  let walkAway: string | null = null;
  let counterRange: string | null = null;
  let fallback: string | null = null;

  for (const step of steps) {
    const lower = step.toLowerCase();
    if (lower.startsWith("walk-away price:") || lower.includes("walk-away price")) {
      walkAway = step;
    } else if (lower.startsWith("expected counter") || lower.includes("counter-offer range")) {
      counterRange = step;
    } else if (lower.startsWith("fallback:") || lower.includes("fallback:")) {
      fallback = step.replace(/^fallback:\s*/i, "");
    } else {
      tips.push(step);
    }
  }
  return { tips, walkAway, counterRange, fallback };
}

export function NegotiatePanel({
  open, onClose, data, loading, error, productName, platform, onRetry,
}: NegotiatePanelProps) {
  const strategyLabel = data?.strategy_used
    ? data.strategy_used.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "";

  const messages = data ? getMessages(data) : { aggressive: "", moderate: "", friendly: "" };
  const parsed = data ? parseNextSteps(data.next_steps) : { tips: [], walkAway: null, counterRange: null, fallback: null };

  const platformKey = platform;
  const badgeColor = platformColors[platformKey] ?? "bg-gray-100 text-gray-700";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white border-gray-200">
        <SheetHeader>
          <SheetTitle className="text-left text-base font-semibold text-gray-900 pr-6 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-indigo-600" />
            Negotiation Strategy
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600 line-clamp-1">{productName}</span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>{platform}</span>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-gray-500">Generating negotiation strategy...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-gray-600">Couldn&apos;t generate negotiation strategy. Please try again.</p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          )}

          {/* Success */}
          {!loading && !error && data && (
            <>
              {/* Offer summary card */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                    {strategyLabel}
                  </span>
                  {data.success && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Viable
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-3">
                  <div>
                    <span className="text-xs text-gray-500">Asking price</span>
                    <div className="text-lg text-gray-400 line-through">${data.original_price.toFixed(2)}</div>
                  </div>
                  {data.negotiated_price != null && (
                    <div>
                      <span className="text-xs text-gray-500">Suggested offer</span>
                      <div className="text-2xl font-bold text-indigo-700">${data.negotiated_price.toFixed(2)}</div>
                    </div>
                  )}
                  {data.savings != null && data.savings > 0 && (
                    <span className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full self-center">
                      Save ${data.savings.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Strategy reasoning */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 flex gap-2.5">
                <Info className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-sm text-gray-700 leading-relaxed">{data.reasoning}</p>
              </div>

              {/* Message variants in tabs */}
              {(messages.aggressive || messages.moderate || messages.friendly) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Draft Messages</h4>
                  <Tabs defaultValue="moderate">
                    <TabsList className="grid w-full grid-cols-3 h-9 bg-gray-100">
                      <TabsTrigger value="aggressive" className="text-xs">Direct</TabsTrigger>
                      <TabsTrigger value="moderate" className="text-xs">Balanced</TabsTrigger>
                      <TabsTrigger value="friendly" className="text-xs">Friendly</TabsTrigger>
                    </TabsList>
                    {(["aggressive", "moderate", "friendly"] as const).map((tone) => (
                      <TabsContent key={tone} value={tone}>
                        <div className={`rounded-lg border p-3.5 text-sm text-gray-700 leading-relaxed ${
                          tone === "aggressive" ? "bg-red-50/50 border-red-200" :
                          tone === "moderate" ? "bg-indigo-50/50 border-indigo-200" :
                          "bg-emerald-50/50 border-emerald-200"
                        }`}>
                          {messages[tone] || <span className="text-gray-400 italic">No message generated for this tone.</span>}
                        </div>
                        {messages[tone] && (
                          <div className="mt-2 flex justify-end">
                            <CopyMessageButton text={messages[tone]} />
                          </div>
                        )}
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}

              {/* Platform-specific actions */}
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                {platformKey === "Craigslist" && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <ExternalLink className="h-4 w-4 text-violet-600 shrink-0" />
                    <span>Reply via email with the selected message variant pre-filled.</span>
                  </div>
                )}
                {platformKey === "Facebook Marketplace" && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <ExternalLink className="h-4 w-4 text-sky-600 shrink-0" />
                    <span>Open the listing on Facebook Marketplace and paste this message to the seller.</span>
                  </div>
                )}
                {platformKey === "eBay" && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <ExternalLink className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Use this message with eBay&apos;s &quot;Make Offer&quot; or &quot;Contact Seller&quot; feature.</span>
                  </div>
                )}
              </div>

              {/* Next steps */}
              {parsed.tips.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Next Steps</h4>
                  <div className="space-y-1.5">
                    {parsed.tips.map((step, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Walk-away + counter range cards */}
              {(parsed.walkAway || parsed.counterRange) && (
                <div className="grid grid-cols-2 gap-3">
                  {parsed.counterRange && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <span className="text-xs text-gray-500">Expected Counter</span>
                      <div className="text-sm font-semibold text-gray-900 mt-0.5">{parsed.counterRange.replace(/^expected counter-offer range:\s*/i, "")}</div>
                    </div>
                  )}
                  {parsed.walkAway && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <span className="text-xs text-gray-500">Walk-Away Price</span>
                      <div className="text-sm font-semibold text-amber-700 mt-0.5">{parsed.walkAway.replace(/^walk-away price:\s*/i, "")}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Fallback plan */}
              {parsed.fallback && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <span className="text-xs text-gray-500 block mb-1">If negotiation fails</span>
                  <p className="text-sm text-gray-700">{parsed.fallback}</p>
                </div>
              )}

              {/* Price match request copy (for Craigslist) */}
              {platformKey === "Craigslist" && messages.moderate && (
                <div className="pt-1">
                  <Button
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10 text-sm"
                    onClick={() => {
                      const subject = encodeURIComponent(`Re: ${productName}`);
                      const body = encodeURIComponent(messages.moderate);
                      window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Reply via Email
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
