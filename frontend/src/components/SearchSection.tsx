"use client";

import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exampleQueries } from "@/lib/mock-data";

interface SearchSectionProps {
  compact?: boolean;
  isSearching: boolean;
  onSearch: (query: string) => void;
}

export function SearchSection({ compact, isSearching, onSearch }: SearchSectionProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const handleChipClick = (q: string) => {
    setQuery(q);
    onSearch(q);
  };

  if (compact) {
    return (
      <div className="w-full bg-white border-b border-border py-2.5">
        <div className="max-w-[1400px] mx-auto px-4">
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
            <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm hover:shadow transition-shadow">
              <Search className="h-4 w-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
              />
            </div>
            <Button type="submit" size="sm" disabled={isSearching} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-16 px-4 bg-white">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
          Search smarter. Shop better.
        </h2>

        <form onSubmit={handleSubmit} className="w-full">
          <div className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3 shadow-sm hover:shadow-md transition-shadow">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe what you're looking for..."
              className="flex-1 bg-transparent outline-none text-base text-gray-900 placeholder:text-gray-400"
              autoFocus
            />
            <Button type="submit" disabled={isSearching || !query.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-6">
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 justify-center">
          {exampleQueries.map((q) => (
            <button
              key={q}
              onClick={() => handleChipClick(q)}
              className="text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-1.5 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 pt-2">
          <span>Searching across</span>
          <span className="font-medium text-gray-500">Amazon</span>
          <span>·</span>
          <span className="font-medium text-gray-500">eBay</span>
          <span>·</span>
          <span className="font-medium text-gray-500">Walmart</span>
          <span>·</span>
          <span className="font-medium text-gray-500">Best Buy</span>
          <span>& more</span>
        </div>
      </div>
    </div>
  );
}
