"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Copy, Check, ExternalLink, Loader2, AlertCircle, RefreshCw,
  Tag, Percent, TrendingDown, TrendingUp, Minus, Star,
  CheckCircle2, XCircle, DollarSign, ArrowDown, BarChart3,
} from "lucide-react";
import { SavingsResponse } from "@/lib/types";
import { useToast } from "@/lib/toast-context";

interface SavingsPanelProps {
  open: boolean;
  onClose: () => void;
  data: SavingsResponse | null;
  loading: boolean;
  error: boolean;
  productName: string;
  platform: string;
  onRetry: () => void;
}

const dealBadge = (score: number) => {
  if (score >= 80) return { label: "Great Deal", color: "bg-emerald-100 text-emerald-800" };
  if (score >= 60) return { label: "Good Deal", color: "bg-lime-100 text-lime-800" };
  if (score >= 40) return { label: "Fair Price", color: "bg-amber-100 text-amber-800" };
  return { label: "Overpriced", color: "bg-red-100 text-red-700" };
};

function CopyCodeButton({ text, toastMsg }: { text: string; toastMsg: string }) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(toastMsg);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={handleCopy}>
      {copied ? <><Check className="h-3 w-3 mr-1 text-emerald-600" /> Copied!</> : <><Copy className="h-3 w-3 mr-1" /> Copy Code</>}
    </Button>
  );
}

function TrendIcon({ trend }: { trend: string | null }) {
  if (trend === "falling") return <TrendingDown className="h-4 w-4 text-emerald-600" />;
  if (trend === "rising") return <TrendingUp className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

function TrendLabel({ trend }: { trend: string | null }) {
  if (trend === "falling") return <span className="text-emerald-600 font-medium">Falling <ArrowDown className="inline h-3 w-3" /></span>;
  if (trend === "rising") return <span className="text-red-500 font-medium">Rising <TrendingUp className="inline h-3 w-3" /></span>;
  if (trend === "stable") return <span className="text-gray-500 font-medium">Stable <Minus className="inline h-3 w-3" /></span>;
  return <span className="text-gray-400">Unknown</span>;
}

export function SavingsPanel({
  open, onClose, data, loading, error, productName, platform, onRetry,
}: SavingsPanelProps) {
  const { showToast } = useToast();

  const badge = data ? dealBadge(data.deal_quality_score) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white border-gray-200">
        <SheetHeader>
          <SheetTitle className="text-left text-base font-semibold text-gray-900 pr-6 flex items-center gap-2">
            <DollarSign className="h-4.5 w-4.5 text-emerald-600" />
            Savings Breakdown
          </SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600 line-clamp-1">{productName}</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{platform}</span>
          </div>
        </SheetHeader>

        <div className="space-y-5 mt-5">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-gray-500">Finding savings...</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AlertCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm text-gray-600">Couldn&apos;t load savings data. Please try again.</p>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
              </Button>
            </div>
          )}

          {/* Success */}
          {!loading && !error && data && (
            <>
              {/* Savings summary banner */}
              <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-bold text-emerald-700">
                    Save up to ${data.total_savings.toFixed(2)} on this product
                  </span>
                  {badge && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-sm text-emerald-600">
                  Pay as low as <span className="font-bold text-emerald-800">${data.effective_price.toFixed(2)}</span>
                  <span className="text-gray-400 line-through ml-2">${data.current_price.toFixed(2)}</span>
                </p>
              </div>

              {/* Coupons section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-emerald-600" />
                  Coupon Codes
                </h4>
                {data.coupons.length > 0 ? (
                  <div className="space-y-2">
                    {data.coupons.map((coupon) => (
                      <div key={coupon.code} className="flex items-center justify-between rounded-lg border border-dashed border-emerald-300 px-3 py-2.5 bg-emerald-50/50">
                        <div className="flex items-center gap-3 min-w-0">
                          <code className="text-sm font-mono font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                            {coupon.code}
                          </code>
                          <div className="min-w-0">
                            <span className="text-xs text-gray-600 block truncate">{coupon.description}</span>
                            {coupon.discount != null && (
                              <span className="text-xs font-medium text-emerald-600">
                                {typeof coupon.discount === "number" && coupon.discount > 50
                                  ? `${coupon.discount}% off`
                                  : `$${coupon.discount} off`}
                              </span>
                            )}
                          </div>
                          {coupon.verified && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">Verified</span>
                          )}
                        </div>
                        <CopyCodeButton text={coupon.code} toastMsg="Coupon code copied!" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-500">
                    No coupon codes found for this retailer right now.
                  </div>
                )}
              </div>

              {/* Cashback section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                  <Percent className="h-4 w-4 text-emerald-600" />
                  Cashback Offers
                </h4>
                {data.cashback.length > 0 ? (
                  <div className="space-y-2">
                    {data.cashback.map((cb) => {
                      const dollarBack = ((data.current_price * cb.percent) / 100).toFixed(2);
                      return (
                        <div key={cb.provider} className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                          <div>
                            <span className="text-sm font-medium text-gray-900">{cb.provider}</span>
                            <div className="text-xs text-gray-500">
                              <span className="text-emerald-600 font-medium">{cb.percent}% cashback</span>
                              <span className="mx-1">=</span>
                              <span className="font-semibold text-emerald-700">${dollarBack} back</span>
                            </div>
                          </div>
                          <a href={cb.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50">
                              <ExternalLink className="h-3 w-3 mr-1" /> Activate
                            </Button>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-500">
                    No cashback offers available for this retailer.
                  </div>
                )}
              </div>

              {/* Price Match section (only if eligible) */}
              {data.price_match_eligible && data.cheapest_competitor && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <Star className="h-4 w-4 text-amber-500" />
                    Price Match Opportunity
                  </h4>
                  <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/50 p-4">
                    <p className="text-sm font-medium text-emerald-800 mb-2">
                      A competitor has this product for less!
                    </p>
                    <p className="text-sm text-gray-700 mb-3">
                      <span className="font-semibold">{data.cheapest_competitor.platform}</span> sells this for{" "}
                      <span className="font-bold text-emerald-700">${data.cheapest_competitor.price.toFixed(2)}</span>{" "}
                      &mdash; that&apos;s <span className="font-semibold text-emerald-700">
                        ${(data.current_price - data.cheapest_competitor.price).toFixed(2)} less
                      </span> than {platform}.
                    </p>

                    <div className="space-y-1.5 mb-3">
                      <p className="text-xs font-semibold text-gray-700">Steps to price match:</p>
                      {[
                        `Go to ${platform}'s customer service (chat, phone, or in-store)`,
                        `Request a price match with ${data.cheapest_competitor.platform}`,
                        `Provide this URL as proof: ${data.cheapest_competitor.url}`,
                      ].map((step, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                          <span className="text-emerald-600 font-bold shrink-0">{i + 1}.</span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                      onClick={async () => {
                        const msg = `Hi, I'd like to request a price match. I found the ${productName} for $${data.cheapest_competitor!.price.toFixed(2)} at ${data.cheapest_competitor!.platform}. Here's the link: ${data.cheapest_competitor!.url}. Could you match this price?`;
                        await navigator.clipboard.writeText(msg);
                        showToast("Price match request copied!");
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1.5" /> Copy Price Match Request
                    </Button>
                  </div>
                </div>
              )}

              {/* Price History section */}
              {data.price_history && (data.price_history.lowest != null || data.price_history.average != null) && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    Price History
                  </h4>

                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {data.price_history.lowest != null && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-center">
                        <span className="text-[10px] text-gray-500 block">Lowest</span>
                        <span className="text-sm font-bold text-emerald-700">${data.price_history.lowest}</span>
                      </div>
                    )}
                    {data.price_history.average != null && (
                      <div className="rounded-lg bg-gray-50 border border-gray-200 p-2.5 text-center">
                        <span className="text-[10px] text-gray-500 block">Average</span>
                        <span className="text-sm font-bold text-gray-700">${data.price_history.average}</span>
                      </div>
                    )}
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-center">
                      <span className="text-[10px] text-gray-500 block">Current</span>
                      <span className="text-sm font-bold text-blue-700">${data.current_price}</span>
                    </div>
                  </div>

                  {/* Price position badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {data.price_history.lowest != null && data.current_price <= data.price_history.lowest * 1.05 && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        Near lowest price!
                      </span>
                    )}
                    {data.price_history.average != null && data.current_price > data.price_history.average && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        Above average
                      </span>
                    )}
                    {data.price_history.trend && (
                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        Price is <TrendLabel trend={data.price_history.trend} />
                      </span>
                    )}
                  </div>

                  {/* Prediction */}
                  {data.price_prediction && (
                    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm text-gray-700 flex gap-2">
                      <TrendIcon trend={data.price_history.trend} />
                      <span>{data.price_prediction}</span>
                    </div>
                  )}

                  {/* Buy / wait recommendation */}
                  <div className="mt-2 rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-sm">
                    {data.price_history.lowest != null && data.current_price <= data.price_history.lowest * 1.05 ? (
                      <span className="text-emerald-700 font-medium">Great time to buy &mdash; near lowest price ever!</span>
                    ) : data.price_history.trend === "falling" ? (
                      <span className="text-amber-700 font-medium">Consider waiting &mdash; price is trending down.</span>
                    ) : data.price_history.average != null && data.current_price < data.price_history.average ? (
                      <span className="text-emerald-700 font-medium">Good time to buy &mdash; below historical average.</span>
                    ) : (
                      <span className="text-gray-600">Monitor for price drops before purchasing.</span>
                    )}
                  </div>
                </div>
              )}

              {/* Competitor Prices table */}
              {data.competitor_prices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">Compare Prices</h4>
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="grid grid-cols-[1fr_80px_80px_40px] text-xs font-medium text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <span>Platform</span>
                      <span>Price</span>
                      <span>Status</span>
                      <span></span>
                    </div>
                    {data.competitor_prices.map((cp) => {
                      const cheapest = data.cheapest_competitor;
                      const isCheapest = cheapest && cp.price === cheapest.price && cp.platform === cheapest.platform;
                      const isCurrent = cp.platform === platform;
                      return (
                        <div key={cp.platform} className={`grid grid-cols-[1fr_80px_80px_40px] text-sm px-3 py-2 border-b last:border-0 border-gray-100 ${isCheapest ? "bg-emerald-50" : ""}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={isCheapest ? "text-emerald-700 font-medium" : "text-gray-700"}>{cp.platform}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">You&apos;re here</span>
                            )}
                          </div>
                          <span className={isCheapest ? "text-emerald-700 font-semibold" : "text-gray-900 font-medium"}>${cp.price}</span>
                          <span>
                            {cp.in_stock
                              ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 className="h-3.5 w-3.5" /> In Stock</span>
                              : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="h-3.5 w-3.5" /> Out</span>}
                          </span>
                          <a href={cp.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5 text-gray-400 hover:text-gray-700" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
