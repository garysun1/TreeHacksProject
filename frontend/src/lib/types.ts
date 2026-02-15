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

// ── On-demand API response types ──────────────────────────────────

export interface NegotiateResponse {
  candidate_id: string;
  strategy_used: string;
  original_price: number;
  negotiated_price: number | null;
  savings: number | null;
  success: boolean;
  reasoning: string;
  conversation_log: { role: string; content: string }[];
  next_steps: string[];
}

export interface SavingsCoupon {
  code: string;
  description: string;
  discount: number | null;
  verified: boolean;
}

export interface SavingsCashback {
  provider: string;
  percent: number;
  url: string;
}

export interface SavingsCompetitor {
  platform: string;
  price: number;
  url: string;
  in_stock: boolean;
}

export interface SavingsResponse {
  candidate_id: string;
  current_price: number;
  effective_price: number;
  total_savings: number;
  coupons: SavingsCoupon[];
  cashback: SavingsCashback[];
  competitor_prices: SavingsCompetitor[];
  price_match_eligible: boolean;
  cheapest_competitor: SavingsCompetitor | null;
  price_history: {
    lowest: number | null;
    average: number | null;
    trend: "rising" | "falling" | "stable" | "volatile" | null;
  };
  price_prediction: string | null;
  deal_quality_score: number;
}

// ── Filter / App types ────────────────────────────────────────────

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
