"use client";

// This component is no longer used in the redesign.
// Savings info is integrated into individual product cards.
// Keeping the file to avoid import errors.

import { Product } from "@/lib/types";

interface SavingsBannerProps {
  products: Product[];
  totalSavings: number;
  flaggedSellers: number;
  bestDeal: { name: string; price: number; discount: number } | null;
}

export function SavingsBanner({ }: SavingsBannerProps) {
  return null;
}
