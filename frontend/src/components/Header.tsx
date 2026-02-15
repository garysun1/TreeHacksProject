"use client";

import { useState, useEffect, useRef } from "react";
import { ShoppingBag, ShoppingCart, ChevronDown } from "lucide-react";
import { SearchSection } from "@/components/SearchSection";
import { useCart } from "@/lib/cart-context";

// ── Category data ────────────────────────────────────────────────────
const QUICK_TAGS = [
  "Trending",
  "Top Rated",
  "Deals",
  "Electronics",
  "Home & Office",
  "Audio",
  "Cameras",
  "Fitness",
  "Gaming",
  "Kitchen",
  "Outdoor",
];

const TAG_QUERIES: Record<string, string> = {
  Trending: "trending products best sellers 2026",
  "Top Rated": "top rated products highest reviews",
  Deals: "best deals discounts on sale",
  Electronics: "electronics",
  "Home & Office": "home office furniture",
  Audio: "headphones speakers earbuds",
  Cameras: "camera photography",
  Fitness: "fitness equipment workout gear",
  Gaming: "gaming accessories",
  Kitchen: "kitchen appliances",
  Outdoor: "outdoor gear camping hiking",
};

const DEPARTMENTS = [
  { label: "Electronics", query: "electronics" },
  { label: "Computers & Laptops", query: "laptop computer" },
  { label: "Phones & Tablets", query: "smartphone tablet" },
  { label: "Audio & Headphones", query: "headphones earbuds speakers" },
  { label: "Cameras & Photo", query: "camera photography equipment" },
  { label: "Gaming", query: "gaming console accessories" },
  { label: "Clothing, Shoes & Accessories", query: "clothing shoes accessories" },
  { label: "Home, Garden & Tools", query: "home garden tools" },
  { label: "Furniture & Office", query: "furniture office chair desk" },
  { label: "Kitchen & Dining", query: "kitchen appliances cookware" },
  { label: "Sports & Outdoors", query: "sports outdoor gear" },
  { label: "Baby & Kids", query: "baby products kids toys" },
  { label: "Beauty & Personal Care", query: "beauty skincare personal care" },
  { label: "Health & Wellness", query: "health wellness vitamins supplements" },
  { label: "Toys & Outdoor Play", query: "toys games outdoor play" },
  { label: "Pets", query: "pet supplies food toys" },
  { label: "Auto & Tires", query: "auto parts car accessories tires" },
  { label: "Books, Movies & Music", query: "books movies music" },
  { label: "Household Essentials", query: "household cleaning supplies essentials" },
  { label: "School & Office Supplies", query: "school supplies office stationery" },
];

// ── Component ────────────────────────────────────────────────────────
interface HeaderProps {
  onLogoClick?: () => void;
  onSearch: (query: string) => void;
  isSearching: boolean;
  initialQuery?: string;
  showTypewriter?: boolean;
  onCartClick?: () => void;
}

export function Header({
  onLogoClick,
  onSearch,
  isSearching,
  initialQuery = "",
  showTypewriter = false,
  onCartClick,
}: HeaderProps) {
  const { itemCount } = useCart();
  const [deptOpen, setDeptOpen] = useState(false);
  const deptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (deptRef.current && !deptRef.current.contains(e.target as Node)) {
        setDeptOpen(false);
      }
    }
    if (deptOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [deptOpen]);

  const handleTagClick = (q: string) => {
    setDeptOpen(false);
    onSearch(q);
  };

  return (
    <header className="w-full bg-white border-b border-border sticky top-0 z-50">
      {/* Row 1: Logo + Search bar */}
      <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center gap-5">
        <button
          onClick={onLogoClick}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
        >
          <ShoppingBag className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">
            Vetted
          </h1>
        </button>

        <SearchSection
          isSearching={isSearching}
          onSearch={onSearch}
          initialQuery={initialQuery}
          showTypewriter={showTypewriter}
        />

        <button
          onClick={onCartClick}
          className="relative flex items-center justify-center h-10 w-10 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
        >
          <ShoppingCart className="h-5 w-5 text-gray-700" />
          {itemCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-emerald-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
              {itemCount}
            </span>
          )}
        </button>
      </div>

      {/* Row 2: Category navigation */}
      <div className="border-t border-gray-100 bg-gray-50/60 relative">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar py-1">
            {/* Departments trigger */}
            <div ref={deptRef} className="shrink-0">
              <button
                onClick={() => setDeptOpen((p) => !p)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-200/60 rounded px-3 py-1.5 transition-colors whitespace-nowrap"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${deptOpen ? "rotate-180" : ""}`} />
                All Departments
              </button>
            </div>

            <div className="w-px h-4 bg-gray-300 shrink-0 mx-0.5" />

            {/* Quick tags */}
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(TAG_QUERIES[tag] || tag.toLowerCase())}
                className="text-[13px] text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded px-3 py-1.5 transition-colors whitespace-nowrap shrink-0"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Departments dropdown — rendered OUTSIDE the overflow container */}
        {deptOpen && (
          <div className="absolute top-full left-0 mt-0 ml-4 w-[260px] bg-white rounded-b-lg shadow-lg border border-gray-200 py-2 z-[60] max-h-[70vh] overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-100 mb-1">
              <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">All Departments</span>
            </div>
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.label}
                onClick={() => handleTagClick(dept.query)}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                {dept.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
