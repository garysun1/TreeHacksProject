"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  Star,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Camera,
  Headphones,
  Laptop,
  Home as HomeIcon,
  Gamepad2,
  Dumbbell,
  UtensilsCrossed,
} from "lucide-react";
import { Product } from "@/lib/types";

// ── Platform logos (inline SVG) ──────────────────────────────────────
function PlatformLogos() {
  return (
    <div className="flex items-center justify-center gap-7">
      {/* Amazon */}
      <div className="relative opacity-50 hover:opacity-80 transition-opacity cursor-default select-none">
        <span
          className="text-[14px] font-bold text-gray-800 tracking-tight leading-none"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          amazon
        </span>
        <svg className="absolute -bottom-[3px] left-0 w-full h-[6px]" viewBox="0 0 56 7" fill="none">
          <path d="M2 5C12 2.5 30 1 48 3.5" stroke="#FF9900" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M44 1L49 3.8L45.5 5" stroke="#FF9900" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {/* eBay */}
      <span
        className="text-[14px] font-bold tracking-tight opacity-50 hover:opacity-80 transition-opacity cursor-default select-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        <span className="text-[#E53238]">e</span>
        <span className="text-[#0064D2]">B</span>
        <span className="text-[#F5AF02]">a</span>
        <span className="text-[#86B817]">y</span>
      </span>

      {/* Walmart */}
      <div className="flex items-center gap-0.5 opacity-50 hover:opacity-80 transition-opacity cursor-default select-none">
        <span
          className="text-[14px] font-bold text-[#0071CE] tracking-tight"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          Walmart
        </span>
        <svg className="w-[12px] h-[12px] -mt-px" viewBox="0 0 24 24" fill="none">
          <g stroke="#FFC220" strokeWidth="3.2" strokeLinecap="round">
            <line x1="12" y1="1.5" x2="12" y2="8" />
            <line x1="12" y1="16" x2="12" y2="22.5" />
            <line x1="1.5" y1="12" x2="8" y2="12" />
            <line x1="16" y1="12" x2="22.5" y2="12" />
            <line x1="4.6" y1="4.6" x2="9" y2="9" />
            <line x1="15" y1="15" x2="19.4" y2="19.4" />
            <line x1="19.4" y1="4.6" x2="15" y2="9" />
            <line x1="9" y1="15" x2="4.6" y2="19.4" />
          </g>
        </svg>
      </div>

      {/* Best Buy */}
      <div className="flex items-center gap-1 opacity-50 hover:opacity-80 transition-opacity cursor-default select-none">
        <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="none">
          <path d="M20.5 3.5L12 0.5L3.5 3.5L0.5 12L3.5 20.5L12 23.5L20.5 20.5L23.5 12L20.5 3.5Z" fill="#0046BE" />
          <path d="M8 9.5H13.5C14.6 9.5 15.5 10.1 15.5 11C15.5 11.7 15 12.2 14.2 12.4C15.2 12.6 15.8 13.2 15.8 14C15.8 15 14.8 15.7 13.5 15.7H8V9.5Z" fill="#FFE000" />
        </svg>
        <span
          className="text-[14px] font-bold text-[#0046BE] tracking-tight"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          Best Buy
        </span>
      </div>

      {/* Facebook Marketplace */}
      <span
        className="text-[14px] font-bold text-[#1877F2] tracking-tight opacity-50 hover:opacity-80 transition-opacity cursor-default select-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        Marketplace
      </span>

      {/* Craigslist */}
      <span
        className="text-[14px] font-bold text-[#5C249C] tracking-tight opacity-50 hover:opacity-80 transition-opacity cursor-default select-none"
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        craigslist
      </span>
    </div>
  );
}

// ── Category data ────────────────────────────────────────────────────
const CATEGORIES = [
  { name: "Electronics", icon: Monitor, count: "12K+ products", query: "electronics" },
  { name: "Cameras & Photo", icon: Camera, count: "4K+ products", query: "cameras photography" },
  { name: "Audio & Headphones", icon: Headphones, count: "8K+ products", query: "headphones earbuds speakers" },
  { name: "Computers & Monitors", icon: Laptop, count: "6K+ products", query: "laptop computer monitor" },
  { name: "Home & Office", icon: HomeIcon, count: "15K+ products", query: "home office furniture" },
  { name: "Gaming", icon: Gamepad2, count: "5K+ products", query: "gaming console accessories" },
  { name: "Fitness & Outdoors", icon: Dumbbell, count: "7K+ products", query: "fitness outdoor gear" },
  { name: "Kitchen & Appliances", icon: UtensilsCrossed, count: "9K+ products", query: "kitchen appliances" },
];

// ── Trending searches ────────────────────────────────────────────────
const TRENDING_SEARCHES = [
  "Sony headphones",
  "Standing desk",
  "Mechanical keyboard",
  "4K webcam",
  "Running shoes",
  "Air purifier",
  "Tablet under $300",
  "Wireless earbuds",
  "Robot vacuum",
  "Portable monitor",
];

// ── Featured deals mock data ─────────────────────────────────────────
export const featuredDeals: Product[] = [
  {
    id: "feat-1",
    name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    brand: "Sony",
    image: "/deals/sony-wh1000xm5.webp",
    rating: 4.8,
    reviewCount: 12453,
    platform: "Amazon",
    url: "#",
    specs: {},
    features: ["Noise Cancelling", "30hr Battery", "Multipoint"],
    condition: "New",
    trust: {
      overall: 95,
      sellerScore: 97,
      reviewAuthenticity: 93,
      productLegitimacy: 96,
      flags: [{ severity: "info", text: "Authorized Sony dealer" }],
      sourcesChecked: [{ name: "Amazon Seller DB", url: "#" }],
    },
    price: {
      originalPrice: 349,
      effectivePrice: 278,
      savings: 71,
      savingsBreakdown: "Save $51 sale + $12 coupon + $8 cashback",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Great Deal",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 95, price: 88, brand: 96, reviews: 93 },
  },
  {
    id: "feat-2",
    name: "Canon EOS R100 Mirrorless Camera with RF-S 18-45mm Lens",
    brand: "Canon",
    image: "/deals/canon-eos-r100.webp",
    rating: 4.5,
    reviewCount: 3102,
    platform: "Best Buy",
    url: "#",
    specs: {},
    features: ["4K Video", "Eye AF", "Lightweight"],
    condition: "New",
    trust: {
      overall: 91,
      sellerScore: 95,
      reviewAuthenticity: 87,
      productLegitimacy: 92,
      flags: [{ severity: "info", text: "Official Best Buy listing" }],
      sourcesChecked: [{ name: "Best Buy Verified", url: "#" }],
    },
    price: {
      originalPrice: 599,
      effectivePrice: 449,
      savings: 150,
      savingsBreakdown: "Save $120 sale + $20 coupon + $10 cashback",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Great Deal",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 82, price: 92, brand: 88, reviews: 85 },
  },
  {
    id: "feat-3",
    name: "Apple AirPods Pro 2 with USB-C MagSafe Case",
    brand: "Apple",
    image: "/deals/airpods-pro-2.webp",
    rating: 4.7,
    reviewCount: 28910,
    platform: "Walmart",
    url: "#",
    specs: {},
    features: ["ANC", "Adaptive Audio", "USB-C"],
    condition: "New",
    trust: {
      overall: 98,
      sellerScore: 99,
      reviewAuthenticity: 96,
      productLegitimacy: 99,
      flags: [{ severity: "info", text: "Sold by Walmart" }],
      sourcesChecked: [{ name: "Walmart Verified", url: "#" }],
    },
    price: {
      originalPrice: 249,
      effectivePrice: 189,
      savings: 60,
      savingsBreakdown: "Save $50 sale + $10 Walmart+ perk",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Great Deal",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 96, price: 85, brand: 99, reviews: 95 },
  },
  {
    id: "feat-4",
    name: 'Samsung 32" ViewFinity S8 4K UHD Monitor',
    brand: "Samsung",
    image: "/deals/samsung-viewfinity-s8.webp",
    rating: 4.4,
    reviewCount: 5621,
    platform: "Amazon",
    url: "#",
    specs: {},
    features: ["4K UHD", "USB-C", "HDR10"],
    condition: "New",
    trust: {
      overall: 88,
      sellerScore: 92,
      reviewAuthenticity: 84,
      productLegitimacy: 89,
      flags: [{ severity: "info", text: "Ships from Amazon" }],
      sourcesChecked: [{ name: "Amazon Seller DB", url: "#" }],
    },
    price: {
      originalPrice: 349,
      effectivePrice: 279,
      savings: 70,
      savingsBreakdown: "Save $50 sale + $15 coupon + $5 cashback",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Good Deal",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 85, price: 82, brand: 90, reviews: 80 },
  },
  {
    id: "feat-5",
    name: "Herman Miller Aeron Ergonomic Office Chair - Size B",
    brand: "Herman Miller",
    image: "/deals/herman-miller-aeron.webp",
    rating: 4.6,
    reviewCount: 1876,
    platform: "eBay",
    url: "#",
    specs: {},
    features: ["Ergonomic", "Adjustable", "12-Year Warranty"],
    condition: "Refurbished",
    trust: {
      overall: 72,
      sellerScore: 68,
      reviewAuthenticity: 75,
      productLegitimacy: 74,
      flags: [
        { severity: "warning", text: "Refurbished — verify warranty terms" },
        { severity: "info", text: "eBay Money Back Guarantee applies" },
      ],
      sourcesChecked: [{ name: "eBay Seller History", url: "#" }],
    },
    price: {
      originalPrice: 1395,
      effectivePrice: 1049,
      savings: 346,
      savingsBreakdown: "Save $346 refurb discount",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Good Deal",
    },
    negotiation: {
      viable: true, explanation: "Make an Offer enabled",
      messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 950, high: 1050 }, walkAwayPrice: 1100,
    },
    rankingExplanation: { quality: 88, price: 78, brand: 95, reviews: 82 },
  },
  {
    id: "feat-6",
    name: "Logitech MX Master 3S Wireless Mouse",
    brand: "Logitech",
    image: "/deals/logitech-mx-master-3s.webp",
    rating: 4.8,
    reviewCount: 8932,
    platform: "Amazon",
    url: "#",
    specs: {},
    features: ["8K DPI", "Quiet Clicks", "USB-C", "Multi-device"],
    condition: "New",
    trust: {
      overall: 96,
      sellerScore: 98,
      reviewAuthenticity: 94,
      productLegitimacy: 97,
      flags: [{ severity: "info", text: "Ships from Amazon" }],
      sourcesChecked: [{ name: "Amazon Seller DB", url: "#" }],
    },
    price: {
      originalPrice: 99,
      effectivePrice: 89,
      savings: 10,
      savingsBreakdown: "Save $10 sale price",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Good Deal",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 94, price: 75, brand: 92, reviews: 96 },
  },
  {
    id: "feat-7",
    name: "Nintendo Switch 2 Console",
    brand: "Nintendo",
    image: "/deals/nintendo-switch-2.webp",
    rating: 4.9,
    reviewCount: 342,
    platform: "Best Buy",
    url: "#",
    specs: {},
    features: ["4K Docked", "Backwards Compatible", "8\" Screen"],
    condition: "New",
    trust: {
      overall: 99,
      sellerScore: 99,
      reviewAuthenticity: 98,
      productLegitimacy: 100,
      flags: [{ severity: "info", text: "Official Best Buy listing" }],
      sourcesChecked: [{ name: "Best Buy Verified", url: "#" }],
    },
    price: {
      originalPrice: 449,
      effectivePrice: 449,
      savings: 0,
      savingsBreakdown: "",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Fair Price",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 98, price: 60, brand: 99, reviews: 95 },
  },
  {
    id: "feat-8",
    name: "Dyson V15 Detect Cordless Vacuum Cleaner",
    brand: "Dyson",
    image: "/deals/dyson-v15.webp",
    rating: 4.6,
    reviewCount: 6543,
    platform: "Walmart",
    url: "#",
    specs: {},
    features: ["Laser Detect", "LCD Display", "60min Runtime"],
    condition: "New",
    trust: {
      overall: 94,
      sellerScore: 96,
      reviewAuthenticity: 91,
      productLegitimacy: 95,
      flags: [{ severity: "info", text: "Sold by Walmart" }],
      sourcesChecked: [{ name: "Walmart Verified", url: "#" }],
    },
    price: {
      originalPrice: 749,
      effectivePrice: 579,
      savings: 170,
      savingsBreakdown: "Save $140 sale + $20 coupon + $10 cashback",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Great Deal",
    },
    negotiation: {
      viable: false, explanation: "", messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },
    rankingExplanation: { quality: 92, price: 85, brand: 95, reviews: 88 },
  },
];

// ── Platform color map ───────────────────────────────────────────────
const platformColors: Record<string, string> = {
  Amazon: "bg-amber-100 text-amber-800",
  eBay: "bg-blue-100 text-blue-800",
  Walmart: "bg-blue-100 text-blue-700",
  "Best Buy": "bg-yellow-100 text-yellow-800",
  "Facebook Marketplace": "bg-sky-100 text-sky-800",
  Craigslist: "bg-violet-100 text-violet-800",
};

// ── Deal card (matches ProductCard style) ────────────────────────────
function DealCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const { trust, price } = product;

  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[220px] bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col text-left"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          unoptimized
        />
        <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${platformColors[product.platform] || "bg-gray-100 text-gray-700"}`}>
          {product.platform}
        </span>
      </div>

      <div className="p-3 flex flex-col flex-1 gap-1.5">
        <h3 className="text-xs font-medium text-gray-900 leading-snug line-clamp-2">
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-3 w-3 ${s <= Math.round(product.rating) ? "text-amber-400 fill-amber-400" : "text-gray-300"}`}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">{product.rating}</span>
        </div>

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-gray-900">${price.effectivePrice}</span>
            {price.savings > 0 && price.originalPrice > 0 && (
              <span className="text-xs text-gray-400 line-through">${price.originalPrice}</span>
            )}
          </div>
          {price.savings > 0 && (
            <span className="inline-block text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">
              Save ${price.savings}
            </span>
          )}
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-1 text-[10px] text-emerald-600">
          <ShieldCheck className="h-3 w-3" />
          <span>Verified Seller</span>
          <span className="text-gray-400 ml-auto">{trust.overall}/100</span>
        </div>
      </div>
    </button>
  );
}

// ── Main component ───────────────────────────────────────────────────
interface HeroSectionProps {
  onSearch: (query: string) => void;
  onOpenHowItWorks: () => void;
}

export function HeroSection({ onSearch, onOpenHowItWorks }: HeroSectionProps) {
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("deals-scroll");
    if (container) {
      const scrollAmount = direction === "left" ? -460 : 460;
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full">
      {/* Slim promo banner */}
      {!bannerDismissed && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-emerald-100">
          <div className="max-w-[1400px] mx-auto px-4 h-[50px] flex items-center justify-between">
            <p className="text-xs text-emerald-800 flex-1 text-center">
              Free price analysis on every product &middot; Seller verification included &middot; Save more with smart coupons
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-emerald-500 hover:text-emerald-700 transition-colors ml-3 shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4">
        {/* ── Category Tiles ──────────────────────────────────────── */}
        <section className="py-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Shop by Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.name}
                onClick={() => onSearch(cat.query)}
                className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 group-hover:border-emerald-300 transition-colors">
                  <cat.icon className="h-5 w-5 text-gray-600 group-hover:text-emerald-600 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{cat.name}</p>
                  <p className="text-[11px] text-gray-400">{cat.count}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Featured Deals ──────────────────────────────────────── */}
        <section className="py-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Verified Deals</h2>
            <div className="flex gap-1.5">
              <button
                onClick={() => scroll("left")}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={() => scroll("right")}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
          <div
            id="deals-scroll"
            className="flex gap-3 overflow-x-auto no-scrollbar pb-2"
          >
            {featuredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                product={deal}
                onClick={() => onSearch(deal.name.split(" ").slice(0, 3).join(" "))}
              />
            ))}
          </div>
        </section>

        {/* ── Trending Searches ───────────────────────────────────── */}
        <section className="py-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Searches</h2>
          <div className="flex flex-wrap gap-2">
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                onClick={() => onSearch(term)}
                className="px-4 py-2 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-full text-sm text-gray-700 hover:text-emerald-700 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </section>

        {/* ── Platform Logos ──────────────────────────────────────── */}
        <section className="py-8 border-t border-gray-100">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 font-medium mb-3 text-center">
            Searching across
          </p>
          <PlatformLogos />
        </section>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <footer className="py-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button onClick={() => {}} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">About</button>
              <button onClick={onOpenHowItWorks} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">How It Works</button>
              <button onClick={() => {}} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Privacy</button>
              <button onClick={() => {}} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Terms</button>
            </div>
            <p className="text-[11px] text-gray-300">Built at TreeHacks 2026</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
