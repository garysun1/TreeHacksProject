"use client";

import Image from "next/image";
import { Star, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Product } from "@/lib/types";

const platformColors: Record<string, string> = {
  Amazon: "bg-amber-100 text-amber-800",
  eBay: "bg-blue-100 text-blue-800",
  Walmart: "bg-blue-100 text-blue-700",
  "Best Buy": "bg-yellow-100 text-yellow-800",
};

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  index: number;
}

function TrustIcon({ score }: { score: number }) {
  if (score >= 85) return <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />;
  if (score >= 70) return <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />;
  return <ShieldX className="h-3.5 w-3.5 text-red-500" />;
}

export function ProductCard({ product, onViewDetails }: ProductCardProps) {
  const { trust, price } = product;
  const savingsPercent = Math.round(((price.originalPrice - price.effectivePrice) / price.originalPrice) * 100);

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          unoptimized
        />
        {/* Platform badge */}
        <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${platformColors[product.platform] || "bg-gray-100 text-gray-700"}`}>
          {product.platform}
        </span>
        {product.condition !== "New" && (
          <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {product.condition}
          </span>
        )}
      </div>

      <div className="p-3.5 flex flex-col flex-1 gap-2">
        {/* Name */}
        <h3 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3.5 w-3.5 ${s <= Math.round(product.rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            {product.rating} · {product.reviewCount.toLocaleString()} reviews
          </span>
        </div>

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900">${price.effectivePrice}</span>
            {price.savings > 0 && (
              <span className="text-sm text-gray-400 line-through">${price.originalPrice}</span>
            )}
          </div>
          {price.savings > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-medium text-emerald-600">Save ${price.savings} ({savingsPercent}% off)</span>
            </div>
          )}
          {price.savings > 0 && (
            <p className="text-[11px] text-emerald-600/80 mt-0.5">{price.savingsBreakdown}</p>
          )}
        </div>

        {/* Trust + Deal row */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-default">
                <TrustIcon score={trust.overall} />
                <span className={trust.overall >= 85 ? "text-emerald-600" : trust.overall >= 70 ? "text-amber-600" : "text-red-500"}>
                  {trust.overall}% trusted
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Seller: {trust.sellerScore} · Reviews: {trust.reviewAuthenticity} · Product: {trust.productLegitimacy}
            </TooltipContent>
          </Tooltip>
          <span className={`font-medium ${
            price.dealQuality === "Great Deal" || price.dealQuality === "Good Deal"
              ? "text-emerald-600"
              : price.dealQuality === "Fair Price"
              ? "text-gray-500"
              : "text-red-500"
          }`}>
            {price.dealQuality}
          </span>
        </div>

        {/* CTA */}
        <Button
          size="sm"
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9 mt-1"
          onClick={() => onViewDetails(product)}
        >
          View Deal
        </Button>
      </div>
    </div>
  );
}
