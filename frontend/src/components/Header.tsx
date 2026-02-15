"use client";

import { ShoppingBag } from "lucide-react";

export function Header({ compact }: { compact?: boolean }) {
  return (
    <header className={`w-full border-b border-border bg-white sticky top-0 z-50 ${compact ? "py-2" : "py-3"}`}>
      <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
            Shop<span className="text-emerald-600">Agent</span>
          </h1>
        </div>
        {!compact && (
          <div className="hidden sm:flex items-center gap-6 text-sm text-gray-500">
            <span>Deals</span>
            <span>Trending</span>
            <span>How It Works</span>
          </div>
        )}
      </div>
    </header>
  );
}
