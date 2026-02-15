import { Product, PipelineStage, Filters } from "./types";
import { mockProducts, defaultPipelineStages, mockFiltersForCamera, defaultFilters } from "./mock-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SessionResponse {
  session_id: string;
  status: string;
  message: string;
}

interface AgentUpdate {
  agent: string;
  status: "active" | "complete" | "error";
  message: string;
  data?: Record<string, unknown>;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

// ── Data transformation: backend → frontend ──────────────────────────

/**
 * Convert a backend RankedCandidate (with nested candidate, trust_score,
 * price_analysis, negotiation_result) into the frontend Product shape.
 */
function transformRankedCandidate(
  rc: any,
  negotiationResults: Record<string, any> = {}
): Product {
  const c = rc.candidate ?? rc;
  const trust = rc.trust_score;
  const price = rc.price_analysis;
  const neg = rc.negotiation_result ?? negotiationResults[c.id];

  return {
    id: c.id,
    name: c.name ?? "Unknown Product",
    brand: c.brand ?? "Unknown",
    image: c.image_urls?.[0] ?? `https://picsum.photos/300/300?random=${c.id}`,
    rating: c.rating ?? 0,
    reviewCount: c.review_count ?? 0,
    platform: (c.platform ?? "").charAt(0).toUpperCase() + (c.platform ?? "").slice(1),
    url: c.url ?? "#",
    specs: c.specifications ?? {},
    features: [
      ...(c.matched_requirements ?? []),
      ...(c.review_snippets ?? []).slice(0, 3),
    ],
    condition: c.availability === "refurbished" ? "Refurbished"
             : c.availability === "used" ? "Used" : "New",

    trust: trust ? {
      overall: trust.overall_score ?? 50,
      sellerScore: trust.seller_score ?? 50,
      reviewAuthenticity: trust.review_authenticity_score ?? 50,
      productLegitimacy: trust.product_legitimacy_score ?? 50,
      flags: (trust.flags ?? []).map((f: any) => ({
        severity: f.severity ?? "info",
        text: f.description ?? f.category ?? "",
      })),
      sourcesChecked: (trust.sources_checked ?? []).map((s: string) => ({
        name: s,
        url: "#",
      })),
    } : {
      overall: 50, sellerScore: 50, reviewAuthenticity: 50, productLegitimacy: 50,
      flags: [], sourcesChecked: [],
    },

    price: price ? {
      originalPrice: price.current_price ?? c.price ?? 0,
      effectivePrice: price.effective_price ?? c.price ?? 0,
      savings: price.total_savings_potential ?? 0,
      savingsBreakdown: price.reasoning ?? "",
      priceHistory: price.price_history ? [{
        date: new Date().toISOString().split("T")[0],
        price: price.price_history.average_price ?? c.price ?? 0,
      }] : [],
      competitorPrices: (price.competitor_prices ?? []).map((cp: any) => ({
        platform: cp.platform ?? "",
        price: cp.price ?? 0,
        inStock: cp.in_stock ?? true,
        url: cp.url ?? "#",
      })),
      coupons: (price.available_coupons ?? []).map((coup: any) => ({
        code: coup.code ?? "",
        description: coup.description ?? "",
        discount: coup.discount_percent
          ? `${coup.discount_percent}%`
          : coup.discount_amount
          ? `$${coup.discount_amount}`
          : "",
      })),
      cashback: (price.cashback_options ?? []).map((cb: any) => ({
        provider: cb.provider ?? "",
        percentage: cb.cashback_percent ?? 0,
        url: cb.url ?? "#",
      })),
      dealQuality: price.deal_quality_score >= 75 ? "Great Deal"
                 : price.deal_quality_score >= 50 ? "Good Deal"
                 : price.deal_quality_score >= 25 ? "Fair Price"
                 : "Overpriced",
    } : {
      originalPrice: c.price ?? 0,
      effectivePrice: c.price ?? 0,
      savings: 0,
      savingsBreakdown: "",
      priceHistory: [],
      competitorPrices: [],
      coupons: [],
      cashback: [],
      dealQuality: "Fair Price" as const,
    },

    negotiation: neg ? {
      viable: neg.success ?? false,
      explanation: neg.reasoning ?? "",
      messages: {
        aggressive: neg.conversation_log?.find((m: any) => m.role === "buyer_aggressive")?.content ?? "",
        moderate: neg.conversation_log?.find((m: any) => m.role === "buyer_moderate")?.content ?? "",
        friendly: neg.conversation_log?.find((m: any) => m.role === "buyer_friendly")?.content ?? "",
      },
      nextSteps: neg.next_steps ?? [],
      expectedCounterRange: { low: 0, high: 0 },
      walkAwayPrice: neg.negotiated_price ?? 0,
    } : {
      viable: false, explanation: "Analysis pending",
      messages: { aggressive: "", moderate: "", friendly: "" },
      nextSteps: [], expectedCounterRange: { low: 0, high: 0 }, walkAwayPrice: 0,
    },

    rankingExplanation: {
      quality: Math.round(rc.composite_score ?? 50),
      price: Math.round((price?.deal_quality_score ?? 50)),
      brand: Math.round((trust?.overall_score ?? 50)),
      reviews: Math.round((trust?.review_authenticity_score ?? 50)),
    },
  };
}

/**
 * Transform a full backend session state into products + pipeline info.
 */
function transformSessionState(data: any): {
  products: Product[];
  pipeline: PipelineStage[];
  filters: Filters;
} {
  const negotiationResults = data.negotiation_results ?? {};

  const products: Product[] = (data.ranked_candidates ?? []).map((rc: any) =>
    transformRankedCandidate(rc, negotiationResults)
  );

  // Build pipeline from status
  const status = data.status ?? "intent";
  const statusOrder = ["intent", "searching", "analyzing", "negotiating", "complete"];
  const statusIdx = statusOrder.indexOf(status);

  const pipeline = defaultPipelineStages.map((stage, i) => {
    let stageStatus: "pending" | "active" | "complete" | "error" = "pending";
    if (status === "error") {
      stageStatus = i <= statusIdx ? "error" : "pending";
    } else if (i < statusIdx || status === "complete") {
      stageStatus = "complete";
    } else if (i === statusIdx) {
      stageStatus = "active";
    }
    return { ...stage, status: stageStatus, statusText: "" };
  });

  // Build dynamic filters from actual products
  const brands = Array.from(new Set(products.map((p) => p.brand)));
  const platforms = Array.from(new Set(products.map((p) => p.platform)));
  const maxPrice = Math.max(...products.map((p) => p.price.effectivePrice), 500);
  const filters: Filters = {
    ...defaultFilters,
    budgetRange: [0, Math.ceil(maxPrice / 100) * 100],
    brands,
    platforms: platforms.length > 0 ? platforms : defaultFilters.platforms,
  };

  return { products, pipeline, filters };
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// ── API calls ────────────────────────────────────────────────────────

export async function createSession(query: string): Promise<string | null> {
  try {
    const res = await fetch(`${API_URL}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(`Failed to create session: ${res.status}`);
    const data: SessionResponse = await res.json();
    return data.session_id;
  } catch (err) {
    console.warn("Backend unavailable, using mock mode:", err);
    return null;
  }
}

export async function sendMessage(sessionId: string, message: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerSearch(sessionId: string, signal?: AbortSignal): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/search`, {
      method: "POST",
      signal,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function getCandidates(sessionId: string, signal?: AbortSignal): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}/candidates`, { signal });
    if (!res.ok) throw new Error("Failed to get candidates");
    const data = await res.json();
    return (data.ranked_candidates ?? []).map((rc: any) =>   // eslint-disable-line @typescript-eslint/no-explicit-any
      transformRankedCandidate(rc, data.negotiation_results ?? {})
    );
  } catch {
    return [];
  }
}

export async function getSessionState(sessionId: string, signal?: AbortSignal): Promise<{
  pipeline: PipelineStage[];
  candidates: Product[];
  filters: Filters;
} | null> {
  try {
    const res = await fetch(`${API_URL}/api/sessions/${sessionId}`, { signal });
    if (!res.ok) throw new Error("Failed to get session");
    const data = await res.json();
    const { products, pipeline, filters } = transformSessionState(data);
    return { pipeline, candidates: products, filters };
  } catch {
    return null;
  }
}

export function connectWebSocket(
  sessionId: string,
  onUpdate: (update: AgentUpdate) => void,
  onError: () => void
): WebSocket | null {
  try {
    const wsUrl = API_URL.replace(/^http/, "ws");
    const ws = new WebSocket(`${wsUrl}/ws/${sessionId}`);

    ws.onmessage = (event) => {
      try {
        const update: AgentUpdate = JSON.parse(event.data);
        onUpdate(update);
      } catch {
        console.warn("Failed to parse WebSocket message");
      }
    };

    ws.onerror = () => {
      console.warn("WebSocket error, falling back to polling");
      onError();
    };

    ws.onclose = () => {
      console.info("WebSocket closed");
    };

    return ws;
  } catch {
    onError();
    return null;
  }
}

// Simulates the full pipeline with mock data for demo purposes.
// Now query-aware: the stage text reflects the actual user query,
// and the mock products are filtered to avoid confusion.
export function simulatePipeline(
  query: string,
  onStageUpdate: (stages: PipelineStage[]) => void,
  onFiltersReady: (filters: Filters) => void,
  onProductsReady: (products: Product[]) => void,
  onComplete: () => void
): () => void {
  const stages = defaultPipelineStages.map((s) => ({ ...s }));
  let cancelled = false;
  const short = query.length > 40 ? query.slice(0, 40) + "…" : query;

  const delays = [
    { index: 0, delay: 500, activeText: "Understanding your query...", completeText: `Query parsed: "${short}"` },
    { index: 1, delay: 2000, activeText: "Searching 4 platforms...", completeText: `Found ${mockProducts.length} demo results` },
    { index: 2, delay: 3500, activeText: "Verifying sellers...", completeText: "Trust analysis complete" },
    { index: 3, delay: 5000, activeText: "Analyzing prices & deals...", completeText: "Price analysis complete" },
    { index: 4, delay: 6500, activeText: "Generating strategies...", completeText: "Negotiation analysis complete" },
  ];

  delays.forEach(({ index, delay, activeText, completeText }) => {
    setTimeout(() => {
      if (cancelled) return;
      stages[index] = { ...stages[index], status: "active", statusText: activeText };
      onStageUpdate([...stages]);

      if (index === 0) {
        setTimeout(() => {
          if (cancelled) return;
          onFiltersReady(mockFiltersForCamera);
        }, 800);
      }
    }, delay);

    setTimeout(() => {
      if (cancelled) return;
      stages[index] = { ...stages[index], status: "complete", statusText: completeText };
      onStageUpdate([...stages]);

      if (index === 1) {
        onProductsReady(mockProducts);
      }

      if (index === delays.length - 1) {
        onComplete();
      }
    }, delay + 1200);
  });

  return () => {
    cancelled = true;
  };
}
