"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";

// ── Cycling placeholder config ───────────────────────────────────────
const PLACEHOLDER_PHRASES = [
  "lightweight camera for travel...",
  "noise cancelling headphones under $200...",
  "ergonomic office chair...",
  "wireless earbuds with long battery life...",
  "4K monitor for photo editing...",
  "running shoes for flat feet...",
];

const TYPE_MS = 50;
const ERASE_MS = 30;
const PAUSE_TYPED_MS = 2500;
const PAUSE_ERASED_MS = 400;

// ── Typewriter hook ──────────────────────────────────────────────────
function useTypewriter(phrases: string[]) {
  const [text, setText] = useState("");
  const idx = useRef(0);
  const charPos = useRef(0);
  const erasing = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = phrases[idx.current];

      if (!erasing.current) {
        if (charPos.current < phrase.length) {
          charPos.current++;
          setText(phrase.slice(0, charPos.current));
          timer = setTimeout(tick, TYPE_MS);
        } else {
          timer = setTimeout(() => {
            erasing.current = true;
            tick();
          }, PAUSE_TYPED_MS);
        }
      } else {
        if (charPos.current > 0) {
          charPos.current--;
          setText(phrase.slice(0, charPos.current));
          timer = setTimeout(tick, ERASE_MS);
        } else {
          erasing.current = false;
          idx.current = (idx.current + 1) % phrases.length;
          timer = setTimeout(tick, PAUSE_ERASED_MS);
        }
      }
    };

    timer = setTimeout(tick, PAUSE_ERASED_MS);
    return () => clearTimeout(timer);
  }, [phrases]);

  return text;
}

// ── Auto-suggestion data ─────────────────────────────────────────────
const SUGGESTIONS = [
  "wireless noise cancelling headphones",
  "bluetooth earbuds",
  "4K monitor",
  "ultrawide monitor for coding",
  "mechanical keyboard",
  "wireless mouse",
  "USB-C hub",
  "portable charger power bank",
  "smart home speaker",
  "streaming device",
  "mirrorless camera",
  "camera for beginners",
  "action camera",
  "drone with camera",
  "camera tripod",
  "camera lens 50mm",
  "laptop for students",
  "gaming laptop",
  "laptop under $500",
  "desktop computer",
  "tablet for drawing",
  "iPad accessories",
  "ergonomic office chair",
  "standing desk",
  "desk lamp LED",
  "office desk organizer",
  "bookshelf",
  "air purifier",
  "robot vacuum",
  "running shoes",
  "yoga mat",
  "dumbbells set",
  "fitness tracker",
  "resistance bands",
  "gaming headset",
  "gaming mouse",
  "PS5 controller",
  "Nintendo Switch games",
  "gaming chair",
  "air fryer",
  "instant pot",
  "coffee maker",
  "blender",
  "knife set",
  "winter jacket",
  "running shoes for flat feet",
  "sneakers",
  "backpack for travel",
  "sunglasses",
  "camping tent",
  "hiking boots",
  "portable grill",
  "sleeping bag",
];

function useSuggestions(query: string) {
  if (query.length < 2) return [];
  const lower = query.toLowerCase();
  return SUGGESTIONS.filter((s) => s.includes(lower)).slice(0, 8);
}

// ── Component ────────────────────────────────────────────────────────
interface SearchSectionProps {
  isSearching: boolean;
  onSearch: (query: string) => void;
  initialQuery?: string;
  showTypewriter?: boolean;
}

export function SearchSection({
  isSearching,
  onSearch,
  initialQuery = "",
  showTypewriter: enableTypewriter = false,
}: SearchSectionProps) {
  const [query, setQuery] = useState(initialQuery);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const animatedPlaceholder = useTypewriter(PLACEHOLDER_PHRASES);
  const suggestions = useSuggestions(query);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current !== e.target
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault();
      if (query.trim()) {
        setShowSuggestions(false);
        onSearch(query.trim());
      }
    },
    [query, onSearch]
  );

  const handleSuggestionClick = useCallback(
    (s: string) => {
      setQuery(s);
      setShowSuggestions(false);
      onSearch(s);
    },
    [onSearch]
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
    setHighlightIdx(-1);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
      } else if (e.key === "Enter" && highlightIdx >= 0) {
        e.preventDefault();
        handleSuggestionClick(suggestions[highlightIdx]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, highlightIdx, handleSuggestionClick]
  );

  const highlightMatch = (text: string) => {
    const lower = query.toLowerCase();
    const start = text.toLowerCase().indexOf(lower);
    if (start === -1 || query.length < 2) return <>{text}</>;
    return (
      <>
        {text.slice(0, start)}
        <span className="font-semibold text-gray-900">{text.slice(start, start + query.length)}</span>
        {text.slice(start + query.length)}
      </>
    );
  };

  const showTypewriterOverlay = enableTypewriter && query.length === 0;

  return (
    <form onSubmit={handleSubmit} className="flex-1 relative z-30 max-w-2xl">
      <div className="flex items-stretch rounded-lg border border-gray-300 bg-white shadow-sm hover:shadow transition-shadow">
        <div className="relative flex-1 flex items-center">
          {showTypewriterOverlay && (
            <div className="absolute inset-0 flex items-center pl-3.5 z-20 pointer-events-none">
              <span className="text-sm text-gray-400 truncate">
                {animatedPlaceholder}
                <span className="inline-block w-[2px] h-[1em] bg-gray-300 align-middle ml-[1px] animate-blink" />
              </span>
            </div>
          )}
          <input
            type="text"
            ref={inputRef}
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder={showTypewriterOverlay ? "" : "Search products..."}
            className="w-full bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400 px-3.5 py-2.5 relative"
            style={showTypewriterOverlay ? { background: "transparent" } : undefined}
          />
        </div>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 flex items-center justify-center transition-colors disabled:opacity-50 rounded-r-lg"
        >
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 overflow-hidden"
        >
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSuggestionClick(s);
              }}
              onMouseEnter={() => setHighlightIdx(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                i === highlightIdx ? "bg-gray-50" : ""
              }`}
            >
              <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              <span className="text-gray-600 truncate">{highlightMatch(s)}</span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
