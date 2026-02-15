"use client";

import { Slider } from "@/components/ui/slider";
import { Filters } from "@/lib/types";

interface SmartFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function SmartFilters({ filters, onFiltersChange }: SmartFiltersProps) {
  const allPlatforms = ["Amazon", "eBay", "Walmart", "Best Buy"];
  const conditions: Array<Filters["condition"]> = ["Any", "New", "Refurbished", "Used"];
  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "price_asc", label: "Price: Low to High" },
    { value: "trust", label: "Trust Score" },
    { value: "deal", label: "Best Deals" },
    { value: "effective_price", label: "Effective Price" },
  ] as const;

  const togglePlatform = (platform: string) => {
    const newPlatforms = filters.platforms.includes(platform)
      ? filters.platforms.filter((p) => p !== platform)
      : [...filters.platforms, platform];
    onFiltersChange({ ...filters, platforms: newPlatforms });
  };

  return (
    <div className="w-[220px] shrink-0 space-y-5">
      {/* Sort */}
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Sort By</h4>
        <select
          value={filters.sort}
          onChange={(e) => onFiltersChange({ ...filters, sort: e.target.value as Filters["sort"] })}
          className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Budget */}
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Budget</h4>
        <Slider
          value={[filters.budgetRange[1]]}
          onValueChange={([v]) => onFiltersChange({ ...filters, budgetRange: [0, v] })}
          max={2000}
          step={50}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1.5">
          <span>$0</span>
          <span className="font-medium text-gray-900">${filters.budgetRange[1]}</span>
        </div>
      </div>

      {/* Condition */}
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Condition</h4>
        <div className="space-y-1">
          {conditions.map((c) => (
            <label key={c} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="condition"
                checked={filters.condition === c}
                onChange={() => onFiltersChange({ ...filters, condition: c })}
                className="accent-emerald-600 h-3.5 w-3.5"
              />
              <span className="text-sm text-gray-700">{c}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Platforms */}
      <div>
        <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Platform</h4>
        <div className="space-y-1">
          {allPlatforms.map((p) => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.platforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="accent-emerald-600 h-3.5 w-3.5 rounded"
              />
              <span className="text-sm text-gray-700">{p}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Brands */}
      {filters.brands.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-2">Brand</h4>
          <div className="space-y-1">
            {filters.brands.map((b) => (
              <label key={b} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked
                  onChange={() => {
                    const newBrands = filters.brands.filter((br) => br !== b);
                    onFiltersChange({ ...filters, brands: newBrands });
                  }}
                  className="accent-emerald-600 h-3.5 w-3.5 rounded"
                />
                <span className="text-sm text-gray-700">{b}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
