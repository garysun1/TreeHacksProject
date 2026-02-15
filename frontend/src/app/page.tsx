"use client";

import { useReducer, useCallback } from "react";
import { Header } from "@/components/Header";
import { SearchSection } from "@/components/SearchSection";
import { PipelineTracker } from "@/components/PipelineTracker";
import { SmartFilters } from "@/components/SmartFilters";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductDetailPanel } from "@/components/ProductDetailPanel";
import { AgentActivityIndicator } from "@/components/AgentActivityIndicator";
import { AppState, Filters, PipelineStage, Product } from "@/lib/types";
import { defaultPipelineStages, defaultFilters } from "@/lib/mock-data";
import { createSession, sendMessage, triggerSearch, getSessionState, simulatePipeline } from "@/lib/api";

type Action =
  | { type: "SEARCH_START"; query: string }
  | { type: "PIPELINE_UPDATE"; stages: PipelineStage[] }
  | { type: "FILTERS_READY"; filters: Filters }
  | { type: "FILTERS_CHANGE"; filters: Filters }
  | { type: "PRODUCTS_READY"; products: Product[] }
  | { type: "SEARCH_COMPLETE" }
  | { type: "SELECT_PRODUCT"; product: Product }
  | { type: "CLOSE_DETAIL" };

const initialState: AppState = {
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

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SEARCH_START":
      return {
        ...initialState,
        searchQuery: action.query,
        isSearching: true,
        searchSubmitted: true,
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
    case "SELECT_PRODUCT":
      return { ...state, selectedProduct: action.product, isDetailOpen: true };
    case "CLOSE_DETAIL":
      return { ...state, isDetailOpen: false, selectedProduct: null };
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleSearch = useCallback(async (query: string) => {
    dispatch({ type: "SEARCH_START", query });

    const sessionId = await createSession(query);

    if (sessionId) {
      // Show intent stage as active while session initializes
      const stagesRef = defaultPipelineStages.map((s) => ({ ...s }));
      stagesRef[0] = { ...stagesRef[0], status: "active", statusText: "Understanding your query..." };
      dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });

      // Send the user message to the intent agent
      await sendMessage(sessionId, query);
      stagesRef[0] = { ...stagesRef[0], status: "complete", statusText: `Query parsed: "${query.slice(0, 40)}"` };
      stagesRef[1] = { ...stagesRef[1], status: "active", statusText: "Searching platforms..." };
      dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });

      // triggerSearch blocks until the ENTIRE pipeline completes on the backend
      // (search → analyze → rank → negotiate). Show intermediate progress.
      const searchTimer = setTimeout(() => {
        stagesRef[1] = { ...stagesRef[1], status: "complete", statusText: "Products found" };
        stagesRef[2] = { ...stagesRef[2], status: "active", statusText: "Verifying sellers..." };
        dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });
      }, 5000);
      const analyzeTimer = setTimeout(() => {
        stagesRef[2] = { ...stagesRef[2], status: "complete", statusText: "Trust analysis complete" };
        stagesRef[3] = { ...stagesRef[3], status: "active", statusText: "Analyzing prices..." };
        dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });
      }, 12000);
      const negotiateTimer = setTimeout(() => {
        stagesRef[3] = { ...stagesRef[3], status: "complete", statusText: "Price analysis complete" };
        stagesRef[4] = { ...stagesRef[4], status: "active", statusText: "Generating strategies..." };
        dispatch({ type: "PIPELINE_UPDATE", stages: [...stagesRef] });
      }, 20000);

      const searchOk = await triggerSearch(sessionId);
      clearTimeout(searchTimer);
      clearTimeout(analyzeTimer);
      clearTimeout(negotiateTimer);

      if (searchOk) {
        // Pipeline completed — fetch final results
        const finalState = await getSessionState(sessionId);
        if (finalState) {
          dispatch({ type: "PIPELINE_UPDATE", stages: finalState.pipeline });
          if (finalState.candidates.length > 0) {
            dispatch({ type: "PRODUCTS_READY", products: finalState.candidates });
            dispatch({ type: "FILTERS_READY", filters: finalState.filters });
          }
        }
        dispatch({ type: "SEARCH_COMPLETE" });
      } else {
        // triggerSearch failed — try polling in case partial results exist
        const pollInterval = setInterval(async () => {
          try {
            const state = await getSessionState(sessionId);
            if (state) {
              dispatch({ type: "PIPELINE_UPDATE", stages: state.pipeline });
              if (state.candidates.length > 0) {
                dispatch({ type: "PRODUCTS_READY", products: state.candidates });
                dispatch({ type: "FILTERS_READY", filters: state.filters });
              }
              const allDone = state.pipeline.every(
                (s) => s.status === "complete" || s.status === "error"
              );
              if (allDone) {
                clearInterval(pollInterval);
                dispatch({ type: "SEARCH_COMPLETE" });
              }
            }
          } catch { /* keep polling */ }
        }, 2000);

        // Safety timeout
        setTimeout(() => {
          clearInterval(pollInterval);
          dispatch({ type: "SEARCH_COMPLETE" });
        }, 60000);
      }
    } else {
      // Backend unavailable — use mock pipeline
      simulatePipeline(
        query,
        (stages) => dispatch({ type: "PIPELINE_UPDATE", stages }),
        (filters) => dispatch({ type: "FILTERS_READY", filters }),
        (products) => dispatch({ type: "PRODUCTS_READY", products }),
        () => dispatch({ type: "SEARCH_COMPLETE" })
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
      <Header compact={state.searchSubmitted} />

      {state.searchSubmitted ? (
        <>
          <SearchSection compact isSearching={state.isSearching} onSearch={handleSearch} />
          <PipelineTracker stages={state.pipelineStages} />
        </>
      ) : (
        <SearchSection isSearching={state.isSearching} onSearch={handleSearch} />
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
    </div>
  );
}
