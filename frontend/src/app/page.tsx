"use client";

import { useReducer, useCallback, useState, useRef } from "react";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { HowItWorksModal } from "@/components/HowItWorksModal";
import { CartPanel } from "@/components/CartPanel";
import { PipelineTracker } from "@/components/PipelineTracker";
import { SmartFilters } from "@/components/SmartFilters";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductDetailPanel } from "@/components/ProductDetailPanel";
import { AgentActivityIndicator } from "@/components/AgentActivityIndicator";
import { AppState, Filters, PipelineStage, Product } from "@/lib/types";
import { defaultPipelineStages, defaultFilters } from "@/lib/mock-data";
import { createSession, sendMessage, triggerSearch, getSessionState, simulatePipeline } from "@/lib/api";

// ── Named constants ──────────────────────────────────────────────────
const STAGE_SEARCH_DELAY_MS = 5_000;
const STAGE_ANALYZE_DELAY_MS = 12_000;
const STAGE_NEGOTIATE_DELAY_MS = 20_000;
const POLL_INTERVAL_MS = 2_000;
const POLL_SAFETY_TIMEOUT_MS = 60_000;

type DataSource = "live" | "demo" | null;

type Action =
  | { type: "SEARCH_START"; query: string }
  | { type: "PIPELINE_UPDATE"; stages: PipelineStage[] }
  | { type: "FILTERS_READY"; filters: Filters }
  | { type: "FILTERS_CHANGE"; filters: Filters }
  | { type: "PRODUCTS_READY"; products: Product[] }
  | { type: "SEARCH_COMPLETE" }
  | { type: "SEARCH_ERROR"; message: string }
  | { type: "SELECT_PRODUCT"; product: Product }
  | { type: "CLOSE_DETAIL" }
  | { type: "DISMISS_ERROR" }
  | { type: "RESET" };

interface ExtendedState extends AppState {
  searchError: string | null;
}

const initialState: ExtendedState = {
  searchQuery: "",
  isSearching: false,
  searchSubmitted: false,
  pipelineStages: defaultPipelineStages,
  filters: defaultFilters,
  candidates: [],
  selectedProduct: null,
  isDetailOpen: false,
  totalSavings: 0,
  flaggedSellers: 0,
  bestDeal: null,
  searchError: null,
};

function computeSavingsInfo(products: Product[]) {
  const totalSavings = products.reduce((sum, p) => sum + p.price.savings, 0);
  const flaggedSellers = products.filter((p) => p.trust.overall < 75).length;
  const best = products.reduce<Product | null>(
    (best, p) => (!best || p.price.savings > best.price.savings ? p : best),
    null
  );
  const bestDeal = best
    ? {
        name: best.name.length > 40 ? best.name.slice(0, 40) + "..." : best.name,
        price: best.price.effectivePrice,
        discount: Math.round(((best.price.originalPrice - best.price.effectivePrice) / best.price.originalPrice) * 100),
      }
    : null;
  return { totalSavings, flaggedSellers, bestDeal };
}

function reducer(state: ExtendedState, action: Action): ExtendedState {
  switch (action.type) {
    case "SEARCH_START":
      return {
        ...initialState,
        searchQuery: action.query,
        isSearching: true,
        searchSubmitted: true,
        searchError: null,
        pipelineStages: defaultPipelineStages.map((s) => ({ ...s })),
      };
    case "PIPELINE_UPDATE":
      return { ...state, pipelineStages: action.stages };
    case "FILTERS_READY":
      return { ...state, filters: action.filters };
    case "FILTERS_CHANGE":
      return { ...state, filters: action.filters };
    case "PRODUCTS_READY": {
      const info = computeSavingsInfo(action.products);
      return { ...state, candidates: action.products, ...info };
    }
    case "SEARCH_COMPLETE":
      return { ...state, isSearching: false };
    case "SEARCH_ERROR":
      return { ...state, isSearching: false, searchError: action.message };
    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.product, isDetailOpen: true };
    case "CLOSE_DETAIL":
      return { ...state, isDetailOpen: false, selectedProduct: null };
    case "DISMISS_ERROR":
      return { ...state, searchError: null };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [dataSource, setDataSource] = useState<DataSource>(null);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    // Cancel any in-flight search
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    dispatch({ type: "SEARCH_START", query });
    setDataSource(null);

    const sessionId = await createSession(query);
    if (signal.aborted) return;

    if (sessionId) {
      setDataSource("live");

      // Show intent stage as active while session initializes
      const stagesRef = defaultPipelineStages.map((s) => ({ ...s }));
      stagesRef[0] = { ...stagesRef[0], status: "active", statusText: "Understanding your query..." };
      dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });

      // Send the user message to the intent agent
      await sendMessage(sessionId, query, signal);
      if (signal.aborted) return;
      stagesRef[0] = { ...stagesRef[0], status: "complete", statusText: `Query parsed: "${query.slice(0, 40)}"` };
      stagesRef[1] = { ...stagesRef[1], status: "active", statusText: "Searching platforms..." };
      dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });

      // triggerSearch blocks until the ENTIRE pipeline completes on the backend.
      // Show estimated intermediate progress while waiting.
      const searchTimer = setTimeout(() => {
        if (signal.aborted) return;
        stagesRef[1] = { ...stagesRef[1], status: "complete", statusText: "Products found" };
        stagesRef[2] = { ...stagesRef[2], status: "active", statusText: "Verifying sellers..." };
        dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });
      }, STAGE_SEARCH_DELAY_MS);
      const analyzeTimer = setTimeout(() => {
        if (signal.aborted) return;
        stagesRef[2] = { ...stagesRef[2], status: "complete", statusText: "Trust analysis complete" };
        stagesRef[3] = { ...stagesRef[3], status: "active", statusText: "Analyzing prices..." };
        dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });
      }, STAGE_ANALYZE_DELAY_MS);
      const negotiateTimer = setTimeout(() => {
        if (signal.aborted) return;
        stagesRef[3] = { ...stagesRef[3], status: "complete", statusText: "Price analysis complete" };
        stagesRef[4] = { ...stagesRef[4], status: "active", statusText: "Generating strategies..." };
        dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });
      }, STAGE_NEGOTIATE_DELAY_MS);

      const searchOk = await triggerSearch(sessionId, signal);
      clearTimeout(searchTimer);
      clearTimeout(analyzeTimer);
      clearTimeout(negotiateTimer);
      if (signal.aborted) return;

      if (searchOk) {
        // Pipeline completed — fetch final results
        const finalState = await getSessionState(sessionId, signal);
        if (signal.aborted) return;
        if (finalState) {
          dispatch({ type: "PIPELINE_UPDATE", stages: finalState.pipeline });
          if (finalState.candidates.length > 0) {
            dispatch({ type: "PRODUCTS_READY", products: finalState.candidates });
            dispatch({ type: "FILTERS_READY", filters: finalState.filters });
          }
        }
        dispatch({ type: "SEARCH_COMPLETE" });
      } else {
        if (signal.aborted) return;
        // triggerSearch failed — try polling in case partial results exist
        dispatch({ type: "SEARCH_ERROR", message: "Search pipeline encountered an issue. Retrying..." });

        const pollInterval = setInterval(async () => {
          if (signal.aborted) { clearInterval(pollInterval); return; }
          try {
            const pollState = await getSessionState(sessionId, signal);
            if (signal.aborted) { clearInterval(pollInterval); return; }
            if (pollState) {
              dispatch({ type: "PIPELINE_UPDATE", stages: pollState.pipeline });
              if (pollState.candidates.length > 0) {
                dispatch({ type: "PRODUCTS_READY", products: pollState.candidates });
                dispatch({ type: "FILTERS_READY", filters: pollState.filters });
                dispatch({ type: "DISMISS_ERROR" });
              }
              const allDone = pollState.pipeline.every(
                (s) => s.status === "complete" || s.status === "error"
              );
              if (allDone) {
                clearInterval(pollInterval);
                dispatch({ type: "SEARCH_COMPLETE" });
              }
            }
          } catch { /* keep polling */ }
        }, POLL_INTERVAL_MS);

        setTimeout(() => {
          clearInterval(pollInterval);
          if (!signal.aborted) dispatch({ type: "SEARCH_COMPLETE" });
        }, POLL_SAFETY_TIMEOUT_MS);
      }
    } else {
      if (signal.aborted) return;
      // Backend unavailable — use mock pipeline with demo data
      setDataSource("demo");
      simulatePipeline(
        query,
        (stages) => { if (!signal.aborted) dispatch({ type: "PIPELINE_UPDATE", stages }); },
        (filters) => { if (!signal.aborted) dispatch({ type: "FILTERS_READY", filters }); },
        (products) => { if (!signal.aborted) dispatch({ type: "PRODUCTS_READY", products }); },
        () => { if (!signal.aborted) dispatch({ type: "SEARCH_COMPLETE" }); }
      );
    }
  }, []);

  const handleFiltersChange = useCallback((filters: Filters) => {
    dispatch({ type: "FILTERS_CHANGE", filters });
  }, []);

  const handleViewDetails = useCallback((product: Product) => {
    dispatch({ type: "SELECT_PRODUCT", product });
  }, []);

  const handleCloseDetail = useCallback(() => {
    dispatch({ type: "CLOSE_DETAIL" });
  }, []);

  const handleReset = useCallback(() => {
    // Abort any in-flight API calls and timers
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch({ type: "RESET" });
    setDataSource(null);
  }, []);

  const filteredProducts = state.candidates.filter((p) => {
    if (p.price.effectivePrice > state.filters.budgetRange[1]) return false;
    if (state.filters.condition !== "Any" && p.condition !== state.filters.condition) return false;
    if (!state.filters.platforms.includes(p.platform)) return false;
    return true;
  }).sort((a, b) => {
    switch (state.filters.sort) {
      case "price_asc": return a.price.effectivePrice - b.price.effectivePrice;
      case "trust": return b.trust.overall - a.trust.overall;
      case "deal": return b.price.savings - a.price.savings;
      case "effective_price": return a.price.effectivePrice - b.price.effectivePrice;
      default: return 0;
    }
  });

  const showFilters = state.searchSubmitted && state.pipelineStages[0]?.status === "complete";
  const showProducts = state.candidates.length > 0 || state.isSearching;

  return (
    <div className="min-h-screen bg-white">
      <Header
        onLogoClick={handleReset}
        onSearch={handleSearch}
        isSearching={state.isSearching}
        initialQuery={state.searchSubmitted ? state.searchQuery : ""}
        showTypewriter={!state.searchSubmitted}
        onCartClick={() => setCartOpen(true)}
      />

      {/* Demo mode banner */}
      {dataSource === "demo" && state.searchSubmitted && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center gap-2">
            <WifiOff className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              <span className="font-medium">Demo mode</span> — Backend unavailable. Showing sample data.
            </p>
          </div>
        </div>
      )}

      {/* Live mode indicator */}
      {dataSource === "live" && state.searchSubmitted && !state.isSearching && state.candidates.length > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-200">
          <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center gap-2">
            <Wifi className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-700">
              <span className="font-medium">Live results</span> — Powered by real-time multi-agent analysis.
            </p>
          </div>
        </div>
      )}

      {/* Error toast */}
      {state.searchError && (
        <div className="bg-red-50 border-b border-red-200">
          <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">{state.searchError}</p>
            </div>
            <button
              onClick={() => dispatch({ type: "DISMISS_ERROR" })}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {state.searchSubmitted ? (
        <>
          {/* Subtle AI hint below header on results page */}
          <div className="bg-gray-50 border-b border-gray-100">
            <div className="max-w-[1400px] mx-auto px-4 py-1.5">
              <p className="text-[11px] text-gray-400 text-center">
                Searching 6 platforms &middot; Verifying sellers &middot; Finding savings
              </p>
            </div>
          </div>
          <PipelineTracker stages={state.pipelineStages} />
        </>
      ) : (
        <HeroSection
          onSearch={handleSearch}
          onOpenHowItWorks={() => setHowItWorksOpen(true)}
        />
      )}

      {showProducts && (
        <div className="max-w-[1400px] mx-auto px-4 py-5">
          {/* Results header */}
          {state.candidates.length > 0 && (
            <div className="flex items-baseline justify-between mb-4">
              <p className="text-sm text-gray-500">
                {filteredProducts.length} result{filteredProducts.length !== 1 ? "s" : ""}
                {state.searchQuery && <> for <span className="font-medium text-gray-700">&quot;{state.searchQuery}&quot;</span></>}
              </p>
            </div>
          )}

          <div className="flex gap-6">
            {/* Left sidebar */}
            {showFilters && (
              <SmartFilters filters={state.filters} onFiltersChange={handleFiltersChange} />
            )}

            {/* Product grid */}
            <div className="flex-1 min-w-0">
              <ProductGrid
                products={filteredProducts}
                isLoading={state.isSearching && state.candidates.length === 0}
                onViewDetails={handleViewDetails}
              />
            </div>
          </div>
        </div>
      )}

      <ProductDetailPanel
        product={state.selectedProduct}
        open={state.isDetailOpen}
        onClose={handleCloseDetail}
      />

      <AgentActivityIndicator stages={state.pipelineStages} />

      <HowItWorksModal
        open={howItWorksOpen}
        onClose={() => setHowItWorksOpen(false)}
      />

      <CartPanel
        open={cartOpen}
        onClose={() => setCartOpen(false)}
      />
    </div>
  );
}
