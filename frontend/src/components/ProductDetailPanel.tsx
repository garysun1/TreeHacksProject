"use client";

import { useState } from "react";
import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Shield, Star, Copy, Check, ExternalLink, AlertTriangle, Info, AlertCircle,
  TrendingDown, Ticket, Percent, CheckCircle2, ShieldCheck, ShoppingCart
} from "lucide-react";
import { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface ProductDetailPanelProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopy}>
      {copied ? (
        <>
          <Check className="h-3 w-3 mr-1 text-emerald-600" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 mr-1" />
          Copy
        </>
      )}
    </Button>
  );
}

function TrustBar({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? "bg-emerald-500" : score >= 70 ? "bg-amber-400" : "bg-red-400";
  const textColor = score >= 85 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-500";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-medium w-8 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "info" | "warning" | "critical" }) {
  if (severity === "critical") return <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
}

export function ProductDetailPanel({ product, open, onClose }: ProductDetailPanelProps) {
  const { addToCart, isInCart } = useCart();

  if (!product) return null;

  const inCart = isInCart(product.id);
  const { trust, price, negotiation } = product;
  const currentPrice = price.competitorPrices.find((p) => p.platform === product.platform)?.price || price.effectivePrice;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white border-gray-200">
        <SheetHeader>
          <SheetTitle className="text-left text-base font-semibold text-gray-900 pr-6">{product.name}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Image */}
          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-50">
            <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
            <span className="absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full bg-white/90 text-gray-700 shadow-sm">
              {product.platform}
            </span>
          </div>

          {/* Price + Rating */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-gray-900">${price.effectivePrice}</span>
            {price.savings > 0 && (
              <>
                <span className="text-sm text-gray-400 line-through">${price.originalPrice}</span>
                <span className="text-sm font-medium text-emerald-600">Save ${price.savings}</span>
              </>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= Math.round(product.rating) ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
              ))}
              <span className="text-xs text-gray-500 ml-1">({product.reviewCount.toLocaleString()})</span>
            </div>
          </div>

          {/* Add to Cart */}
          <Button
            className={`w-full h-11 text-sm font-medium ${
              inCart
                ? "bg-gray-100 text-emerald-600 hover:bg-gray-100 cursor-default"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
            onClick={() => !inCart && addToCart(product)}
            disabled={inCart}
          >
            {inCart ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                In Cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Add to Cart &middot; ${price.effectivePrice.toFixed(2)}
              </>
            )}
          </Button>

          {/* Specs */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">Specifications</h4>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {Object.entries(product.specs).map(([key, value], i) => (
                <div key={key} className={`flex text-sm ${i % 2 === 0 ? "bg-gray-50" : "bg-white"}`}>
                  <span className="w-1/3 px-3 py-2 text-gray-500 font-medium">{key}</span>
                  <span className="w-2/3 px-3 py-2 text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Analysis */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Trust Analysis
            </h4>

            <div className="space-y-2.5 mb-3">
              <TrustBar score={trust.overall} label="Overall Trust" />
              <TrustBar score={trust.sellerScore} label="Seller Score" />
              <TrustBar score={trust.reviewAuthenticity} label="Review Quality" />
              <TrustBar score={trust.productLegitimacy} label="Product Legitimacy" />
            </div>

            {trust.flags.length > 0 && (
              <div className="space-y-1.5 mt-3 p-3 bg-gray-50 rounded-lg">
                {trust.flags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <SeverityIcon severity={flag.severity} />
                    <span>{flag.text}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-2 flex-wrap">
              {trust.sourcesChecked.map((src) => (
                <a key={src.name} href={src.url} className="text-[11px] text-blue-600 hover:underline">
                  {src.name}
                </a>
              ))}
            </div>
          </div>

          {/* Price Intelligence */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-emerald-600" />
              Price History
            </h4>

            <div className="h-40 mb-4 bg-gray-50 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={price.priceHistory}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={["auto", "auto"]} hide />
                  <ReTooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#6b7280" }}
                    itemStyle={{ color: "#059669" }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#059669" strokeWidth={2} dot={false} />
                  <ReferenceLine y={currentPrice} stroke="#059669" strokeDasharray="3 3" label={{ value: "Current", fill: "#059669", fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Competitor Prices */}
            <h5 className="text-xs font-semibold text-gray-700 mb-2">Compare Prices</h5>
            <div className="rounded-lg border border-gray-200 overflow-hidden mb-3">
              <div className="grid grid-cols-4 text-xs font-medium text-gray-500 px-3 py-2 bg-gray-50 border-b border-gray-200">
                <span>Platform</span>
                <span>Price</span>
                <span>In Stock</span>
                <span></span>
              </div>
              {price.competitorPrices.map((cp) => {
                const isCheapest = cp.price === Math.min(...price.competitorPrices.filter((p) => p.inStock).map((p) => p.price));
                return (
                  <div key={cp.platform} className={`grid grid-cols-4 text-sm px-3 py-2 border-b last:border-0 border-gray-100 ${isCheapest ? "bg-emerald-50" : ""}`}>
                    <span className={isCheapest ? "text-emerald-700 font-medium" : "text-gray-700"}>{cp.platform}</span>
                    <span className={isCheapest ? "text-emerald-700 font-semibold" : "text-gray-900 font-medium"}>${cp.price}</span>
                    <span>{cp.inStock ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <span className="text-gray-400">No</span>}</span>
                    <a href={cp.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 text-gray-400 hover:text-gray-700" />
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Coupons */}
            {price.coupons.length > 0 && (
              <div className="space-y-2 mb-3">
                <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Ticket className="h-3.5 w-3.5 text-emerald-600" />
                  Available Coupons
                </h5>
                {price.coupons.map((coupon) => (
                  <div key={coupon.code} className="flex items-center justify-between rounded-lg border border-dashed border-emerald-300 px-3 py-2 bg-emerald-50">
                    <div>
                      <span className="text-sm font-mono font-semibold text-emerald-700">{coupon.code}</span>
                      <span className="text-xs text-gray-500 ml-2">{coupon.description}</span>
                    </div>
                    <CopyButton text={coupon.code} />
                  </div>
                ))}
              </div>
            )}

            {/* Cashback */}
            {price.cashback.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-emerald-600" />
                  Cashback Options
                </h5>
                {price.cashback.map((cb) => (
                  <div key={cb.provider} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{cb.provider}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-600 font-medium">{cb.percentage}% back</span>
                      <a href={cb.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Negotiation */}
          {negotiation.viable && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                Negotiation Strategy
              </h4>

              <p className="text-sm text-gray-600 mb-3">{negotiation.explanation}</p>

              <Tabs defaultValue="moderate" className="mb-4">
                <TabsList className="grid w-full grid-cols-3 h-9 bg-gray-100">
                  <TabsTrigger value="aggressive" className="text-xs">Aggressive</TabsTrigger>
                  <TabsTrigger value="moderate" className="text-xs">Balanced</TabsTrigger>
                  <TabsTrigger value="friendly" className="text-xs">Friendly</TabsTrigger>
                </TabsList>
                {(["aggressive", "moderate", "friendly"] as const).map((tone) => (
                  <TabsContent key={tone} value={tone}>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 leading-relaxed">
                      {negotiation.messages[tone]}
                      <div className="mt-2 flex justify-end">
                        <CopyButton text={negotiation.messages[tone]} />
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>

              <div className="space-y-1.5 mb-3">
                <h5 className="text-xs font-semibold text-gray-700">Next Steps</h5>
                {negotiation.nextSteps.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="text-xs text-gray-500">Expected Counter</span>
                  <div className="text-sm font-semibold text-gray-900">${negotiation.expectedCounterRange.low} — ${negotiation.expectedCounterRange.high}</div>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="text-xs text-gray-500">Walk-Away Price</span>
                  <div className="text-sm font-semibold text-amber-600">${negotiation.walkAwayPrice}</div>
                </div>
              </div>
            </div>
          )}

          {/* Ranking breakdown */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Why this ranking?</h4>
            <div className="space-y-2">
              {Object.entries(product.rankingExplanation).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs capitalize text-gray-500 w-16">{key}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 w-8 text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
