export type AgentStatus = "pending" | "active" | "complete" | "error";

export interface PipelineStage {
  id: string;
  name: string;
  icon: string;
  status: AgentStatus;
  statusText: string;
}

export interface TrustAnalysis {
  overall: number;
  sellerScore: number;
  reviewAuthenticity: number;
  productLegitimacy: number;
  flags: { severity: "info" | "warning" | "critical"; text: string }[];
  sourcesChecked: { name: string; url: string }[];
}

export interface PricePoint {
  date: string;
  price: number;
}

export interface PlatformPrice {
  platform: string;
  price: number;
  inStock: boolean;
  url: string;
}

export interface Coupon {
  code: string;
  description: string;
  discount: string;
}

export interface CashbackOption {
  provider: string;
  percentage: number;
  url: string;
}

export interface PriceAnalysis {
  originalPrice: number;
  effectivePrice: number;
  savings: number;
  savingsBreakdown: string;
  priceHistory: PricePoint[];
  competitorPrices: PlatformPrice[];
  coupons: Coupon[];
  cashback: CashbackOption[];
  dealQuality: "Great Deal" | "Good Deal" | "Fair Price" | "Overpriced";
}

export interface NegotiationStrategy {
  viable: boolean;
  explanation: string;
  messages: {
    aggressive: string;
    moderate: string;
    friendly: string;
  };
  nextSteps: string[];
  expectedCounterRange: { low: number; high: number };
  walkAwayPrice: number;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  image: string;
  rating: number;
  reviewCount: number;
  platform: string;
  url: string;
  specs: Record<string, string>;
  features: string[];
  condition: "New" | "Refurbished" | "Used";
  trust: TrustAnalysis;
  price: PriceAnalysis;
  negotiation: NegotiationStrategy;
  rankingExplanation: {
    quality: number;
    price: number;
    brand: number;
    reviews: number;
  };
}

export interface Filters {
  budgetRange: [number, number];
  brands: string[];
  condition: "New" | "Refurbished" | "Used" | "Any";
  mustHaveFeatures: string[];
  niceToHaveFeatures: string[];
  platforms: string[];
  sort: "relevance" | "price_asc" | "trust" | "deal" | "effective_price";
}

export interface AppState {
  searchQuery: string;
  isSearching: boolean;
  searchSubmitted: boolean;
  pipelineStages: PipelineStage[];
  filters: Filters;
  candidates: Product[];
  selectedProduct: Product | null;
  isDetailOpen: boolean;
  totalSavings: number;
  flaggedSellers: number;
  bestDeal: { name: string; price: number; discount: number } | null;
}
