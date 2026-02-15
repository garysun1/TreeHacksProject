"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Star, ShieldCheck, ShieldAlert, ShieldX, ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Product } from "@/lib/types";
import { useCart } from "@/lib/cart-context";

const platformColors: Record<string, string> = {
  Amazon: "bg-amber-100 text-amber-800",
  eBay: "bg-blue-100 text-blue-800",
  Walmart: "bg-blue-100 text-blue-700",
  "Best Buy": "bg-yellow-100 text-yellow-800",
  "Facebook Marketplace": "bg-sky-100 text-sky-800",
  Craigslist: "bg-violet-100 text-violet-800",
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
  const { addToCart, isInCart } = useCart();
  const inCart = isInCart(product.id);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (showToast) {
      const t = setTimeout(() => setShowToast(false), 1500);
      return () => clearTimeout(t);
    }
  }, [showToast]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!inCart) {
      addToCart(product);
      setShowToast(true);
    }
  };

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
            {price.effectivePrice > 0 ? (
              <span className="text-xl font-bold text-gray-900">${price.effectivePrice.toFixed(2)}</span>
            ) : (
              <span className="text-sm font-medium text-gray-400 italic">Price unavailable</span>
            )}
            {price.savings > 0 && price.originalPrice > 0 && (
              <span className="text-sm text-gray-400 line-through">${price.originalPrice.toFixed(2)}</span>
            )}
          </div>
          {price.savings > 0 && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-medium text-emerald-600">Save ${price.savings.toFixed(2)} ({savingsPercent}% off)</span>
            </div>
          )}
          {price.savingsBreakdown ? (
            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{price.savingsBreakdown}</p>
          ) : null}
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
        <div className="flex gap-2 mt-1 relative">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-9"
            onClick={() => onViewDetails(product)}
          >
            View Deal
          </Button>
          <Button
            size="sm"
            variant={inCart ? "outline" : "outline"}
            className={`h-9 px-2.5 ${inCart ? "border-emerald-300 text-emerald-600" : "border-gray-300 text-gray-600 hover:border-emerald-400 hover:text-emerald-600"}`}
            onClick={handleAddToCart}
            disabled={inCart}
          >
            {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          </Button>
          {showToast && (
            <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg z-10">
              Added to cart
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
