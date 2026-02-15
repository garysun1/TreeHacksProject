import { Product, PipelineStage, Filters, NegotiateResponse, SavingsResponse } from "./types";

export const defaultPipelineStages: PipelineStage[] = [
  { id: "intent", name: "Intent", icon: "brain", status: "pending", statusText: "" },
  { id: "search", name: "Search", icon: "search", status: "pending", statusText: "" },
  { id: "analyze", name: "Analyze", icon: "shield-dollar", status: "pending", statusText: "" },
  { id: "results", name: "Results", icon: "check", status: "pending", statusText: "" },
];

export const defaultFilters: Filters = {
  budgetRange: [0, 1200],
  brands: [],
  condition: "Any",
  mustHaveFeatures: [],
  niceToHaveFeatures: [],
  platforms: ["Amazon", "eBay", "Walmart", "Best Buy", "Facebook Marketplace", "Craigslist"],
  sort: "relevance",
};

const generatePriceHistory = (basePrice: number): { date: string; price: number }[] => {
  const history = [];
  for (let i = 90; i >= 0; i -= 7) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * basePrice * 0.15;
    history.push({
      date: date.toISOString().split("T")[0],
      price: Math.round((basePrice + variation) * 100) / 100,
    });
  }
  return history;
};

// GPT-generated mock products — run `python scripts/generate_frontend_mocks.py` to regenerate
const _rawProducts: Product[] = [
  {
    "id": "1",
    "name": "Sony Alpha a6400 Mirrorless Camera",
    "brand": "Sony",
    "image": "https://picsum.photos/300/300?random=1",
    "rating": 4.7,
    "reviewCount": 532,
    "platform": "Amazon",
    "url": "https://www.amazon.com/dp/B07MTXG8P9",
    "specs": {
      "Sensor": "APS-C",
      "ISO Range": "100-32000",
      "AF": "425 Phase Detection",
      "Video": "4K 30p",
      "Weight": "403g",
      "Screen": "3-inch LCD"
    },
    "features": [
      "Real-time Eye Autofocus",
      "Fast Continuous Shooting",
      "Compact Design",
      "4K Video Recording"
    ],
    "condition": "New",
    "trust": {
      "overall": 95,
      "sellerScore": 95,
      "reviewAuthenticity": 90,
      "productLegitimacy": 99,
      "flags": [],
      "sourcesChecked": [
        {
          "name": "TechRadar",
          "url": "https://www.techradar.com/reviews/sony-alpha-a6400"
        },
        {
          "name": "DPReview",
          "url": "https://www.dpreview.com/reviews/sony's-alpha-a6400"
        }
      ]
    },
    "price": {
      "originalPrice": 998,
      "effectivePrice": 998,
      "savings": 0,
      "savingsBreakdown": "",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Best Buy",
          "price": 999,
          "inStock": true,
          "url": "https://www.bestbuy.com/site/sony-alpha-a6400"
        },
        {
          "platform": "Walmart",
          "price": 995,
          "inStock": true,
          "url": "https://www.walmart.com/ip/Sony-Alpha-a6400"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Fair Price"
    },
    "negotiation": {
      "viable": false,
      "explanation": "Price is fixed on this platform.",
      "messages": {
        "aggressive": "",
        "moderate": "",
        "friendly": ""
      },
      "nextSteps": [],
      "expectedCounterRange": {
        "low": 0,
        "high": 0
      },
      "walkAwayPrice": 0
    },
    "rankingExplanation": {
      "quality": 90,
      "price": 70,
      "brand": 100,
      "reviews": 95
    }
  },
  {
    "id": "2",
    "name": "Canon EOS M50 Mark II",
    "brand": "Canon",
    "image": "https://picsum.photos/300/300?random=2",
    "rating": 4.3,
    "reviewCount": 278,
    "platform": "Walmart",
    "url": "https://www.walmart.com/ip/Canon-EOS-M50-Mark-II",
    "specs": {
      "Sensor": "APS-C",
      "ISO Range": "100-25600",
      "AF": "Dual Pixel AF",
      "Video": "4K 24p",
      "Weight": "387g",
      "Screen": "3-inch Vari-angle"
    },
    "features": [
      "Live Streaming",
      "Vari-Angle Touchscreen",
      "Built-in Wi-Fi",
      "Eye Detection AF"
    ],
    "condition": "New",
    "trust": {
      "overall": 88,
      "sellerScore": 85,
      "reviewAuthenticity": 80,
      "productLegitimacy": 95,
      "flags": [],
      "sourcesChecked": [
        {
          "name": "Canon USA",
          "url": "https://www.usa.canon.com/internet/portal/us/home/products/details/cameras/mirrorless/canon-eos-m50-mark-ii"
        },
        {
          "name": "CNET",
          "url": "https://www.cnet.com/reviews/canon-eos-m50-mark-ii-review"
        }
      ]
    },
    "price": {
      "originalPrice": 649,
      "effectivePrice": 629,
      "savings": 20,
      "savingsBreakdown": "Save $20 sale",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Amazon",
          "price": 599,
          "inStock": true,
          "url": "https://www.amazon.com/dp/B08PDNGJRS"
        },
        {
          "platform": "Best Buy",
          "price": 649,
          "inStock": true,
          "url": "https://www.bestbuy.com/site/canon-eos-m50-mark-ii"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Good Deal"
    },
    "negotiation": {
      "viable": false,
      "explanation": "Price is non-negotiable on this platform.",
      "messages": {
        "aggressive": "",
        "moderate": "",
        "friendly": ""
      },
      "nextSteps": [],
      "expectedCounterRange": {
        "low": 0,
        "high": 0
      },
      "walkAwayPrice": 0
    },
    "rankingExplanation": {
      "quality": 85,
      "price": 80,
      "brand": 90,
      "reviews": 70
    }
  },
  {
    "id": "3",
    "name": "Fujifilm X-T30 Mirrorless Digital Camera",
    "brand": "Fujifilm",
    "image": "https://picsum.photos/300/300?random=3",
    "rating": 4.5,
    "reviewCount": 450,
    "platform": "Best Buy",
    "url": "https://www.bestbuy.com/site/fujifilm-x-t30",
    "specs": {
      "Sensor": "APS-C",
      "ISO Range": "160-12800",
      "AF": "425 Point AF",
      "Video": "4K 30p",
      "Weight": "383g",
      "Screen": "3-inch Touchscreen"
    },
    "features": [
      "Film Simulation Modes",
      "Quick AF",
      "Compact Body",
      "4K Video"
    ],
    "condition": "New",
    "trust": {
      "overall": 92,
      "sellerScore": 90,
      "reviewAuthenticity": 85,
      "productLegitimacy": 98,
      "flags": [],
      "sourcesChecked": [
        {
          "name": "Fujifilm US",
          "url": "https://fujifilmusa.com"
        },
        {
          "name": "DPReview",
          "url": "https://www.dpreview.com/reviews/fujifilm-x-t30"
        }
      ]
    },
    "price": {
      "originalPrice": 899,
      "effectivePrice": 849,
      "savings": 50,
      "savingsBreakdown": "Save $50 sale",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Amazon",
          "price": 839,
          "inStock": true,
          "url": "https://www.amazon.com/dp/B07NFHVS1D"
        },
        {
          "platform": "Walmart",
          "price": 855,
          "inStock": true,
          "url": "https://www.walmart.com/ip/Fujifilm-X-T30"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Good Deal"
    },
    "negotiation": {
      "viable": false,
      "explanation": "Prices are fixed by the retailer.",
      "messages": {
        "aggressive": "",
        "moderate": "",
        "friendly": ""
      },
      "nextSteps": [],
      "expectedCounterRange": {
        "low": 0,
        "high": 0
      },
      "walkAwayPrice": 0
    },
    "rankingExplanation": {
      "quality": 90,
      "price": 85,
      "brand": 90,
      "reviews": 75
    }
  },
  {
    "id": "4",
    "name": "Nikon Z50 Mirrorless Camera",
    "brand": "Nikon",
    "image": "https://picsum.photos/300/300?random=4",
    "rating": 4.6,
    "reviewCount": 320,
    "platform": "eBay",
    "url": "https://www.ebay.com/itm/1234567890",
    "specs": {
      "Sensor": "APS-C",
      "ISO Range": "100-51200",
      "AF": "209 AF Points",
      "Video": "4K 30p",
      "Weight": "450g",
      "Screen": "3.2-inch Tilting LCD"
    },
    "features": [
      "Compact and Lightweight",
      "SnapBridge Connectivity",
      "4K UHD Video",
      "High ISO Performance"
    ],
    "condition": "Refurbished",
    "trust": {
      "overall": 75,
      "sellerScore": 70,
      "reviewAuthenticity": 50,
      "productLegitimacy": 80,
      "flags": [
        {
          "severity": "warning",
          "text": "Potential authenticity issues."
        }
      ],
      "sourcesChecked": [
        {
          "name": "Nikon Official Site",
          "url": "https://www.nikonusa.com/en/nikon-products/product/mirrorless-cameras/z50.html"
        },
        {
          "name": "CNET",
          "url": "https://www.cnet.com/reviews/nikon-z50-review"
        }
      ]
    },
    "price": {
      "originalPrice": 999,
      "effectivePrice": 720,
      "savings": 279,
      "savingsBreakdown": "Save $279 refurbished model",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Amazon",
          "price": 749,
          "inStock": true,
          "url": "https://www.amazon.com/dp/B07ZK3VPRM"
        },
        {
          "platform": "Craigslist",
          "price": 650,
          "inStock": true,
          "url": "https://www.craigslist.org/nikon-z50"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Great Deal"
    },
    "negotiation": {
      "viable": true,
      "explanation": "Negotiation is often accepted on eBay.",
      "messages": {
        "aggressive": "I can get a new one for $800.",
        "moderate": "Could you do $650?",
        "friendly": "Is there any room on the price?"
      },
      "nextSteps": [
        "Make an offer",
        "Check for similar listings",
        "Verify seller credibility"
      ],
      "expectedCounterRange": {
        "low": 600,
        "high": 700
      },
      "walkAwayPrice": 600
    },
    "rankingExplanation": {
      "quality": 85,
      "price": 90,
      "brand": 80,
      "reviews": 75
    }
  },
  {
    "id": "5",
    "name": "Panasonic Lumix G85",
    "brand": "Panasonic",
    "image": "https://picsum.photos/300/300?random=5",
    "rating": 4.4,
    "reviewCount": 400,
    "platform": "Facebook Marketplace",
    "url": "https://www.facebook.com/marketplace/item/1234567890",
    "specs": {
      "Sensor": "Micro Four Thirds",
      "ISO Range": "200-25600",
      "AF": "49 AF Points",
      "Video": "4K 30p",
      "Weight": "505g",
      "Screen": "3-inch Vari-angle"
    },
    "features": [
      "Dual Image Stabilization",
      "Weather-Sealed Body",
      "4K Video",
      "Live View"
    ],
    "condition": "Used",
    "trust": {
      "overall": 60,
      "sellerScore": 55,
      "reviewAuthenticity": 40,
      "productLegitimacy": 70,
      "flags": [
        {
          "severity": "warning",
          "text": "Seller has mixed reviews."
        }
      ],
      "sourcesChecked": [
        {
          "name": "Panasonic USA",
          "url": "https://www.panasonic.com/us/consumer/cameras/lumix-g85.html"
        },
        {
          "name": "TechRadar",
          "url": "https://www.techradar.com/reviews/panasonic-lumix-g85"
        }
      ]
    },
    "price": {
      "originalPrice": 799,
      "effectivePrice": 450,
      "savings": 349,
      "savingsBreakdown": "Save $349 used condition",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Craigslist",
          "price": 400,
          "inStock": true,
          "url": "https://www.craigslist.org/panasonic-g85"
        },
        {
          "platform": "eBay",
          "price": 475,
          "inStock": true,
          "url": "https://www.ebay.com/itm/1234567890"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Great Deal"
    },
    "negotiation": {
      "viable": true,
      "explanation": "Negotiation is common for Marketplace items.",
      "messages": {
        "aggressive": "I found similar ones for $400.",
        "moderate": "Can you do $425?",
        "friendly": "What\u2019s the lowest you\u2019ll take?"
      },
      "nextSteps": [
        "Send a message to the seller",
        "Research prices",
        "Arrange a meet-up"
      ],
      "expectedCounterRange": {
        "low": 400,
        "high": 425
      },
      "walkAwayPrice": 400
    },
    "rankingExplanation": {
      "quality": 70,
      "price": 90,
      "brand": 75,
      "reviews": 60
    }
  },
  {
    "id": "6",
    "name": "Olympus OM-D E-M10 Mark III",
    "brand": "Olympus",
    "image": "https://picsum.photos/300/300?random=6",
    "rating": 4.2,
    "reviewCount": 215,
    "platform": "eBay",
    "url": "https://www.ebay.com/itm/1234567890",
    "specs": {
      "Sensor": "Micro Four Thirds",
      "ISO Range": "200-25600",
      "AF": "121 AF Points",
      "Video": "4K 30p",
      "Weight": "410g",
      "Screen": "3-inch Tilting"
    },
    "features": [
      "In-body Image Stabilization",
      "Art Filters",
      "Compact Design",
      "Touchscreen"
    ],
    "condition": "Refurbished",
    "trust": {
      "overall": 65,
      "sellerScore": 60,
      "reviewAuthenticity": 50,
      "productLegitimacy": 70,
      "flags": [
        {
          "severity": "warning",
          "text": "Limited warranty."
        }
      ],
      "sourcesChecked": [
        {
          "name": "Olympus America",
          "url": "https://www.olympusamerica.com"
        },
        {
          "name": "DPReview",
          "url": "https://www.dpreview.com/reviews/olympus-om-d-e-m10-mark-iii"
        }
      ]
    },
    "price": {
      "originalPrice": 649,
      "effectivePrice": 400,
      "savings": 249,
      "savingsBreakdown": "Save $249 refurbished",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Amazon",
          "price": 499,
          "inStock": true,
          "url": "https://www.amazon.com/dp/B0922HXG4H"
        },
        {
          "platform": "Craigslist",
          "price": 350,
          "inStock": true,
          "url": "https://www.craigslist.org/olympus-om-d-e-m10-mark-iii"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Great Deal"
    },
    "negotiation": {
      "viable": true,
      "explanation": "Price negotiation is common on eBay.",
      "messages": {
        "aggressive": "I can find this new for $500.",
        "moderate": "What about $375?",
        "friendly": "Can we agree on a better price?"
      },
      "nextSteps": [
        "Submit a bid",
        "Research similar offerings",
        "Contact seller"
      ],
      "expectedCounterRange": {
        "low": 350,
        "high": 375
      },
      "walkAwayPrice": 350
    },
    "rankingExplanation": {
      "quality": 75,
      "price": 85,
      "brand": 70,
      "reviews": 65
    }
  },
  {
    "id": "7",
    "name": "Leica SL2-S Mirrorless Camera",
    "brand": "Leica",
    "image": "https://picsum.photos/300/300?random=7",
    "rating": 4.9,
    "reviewCount": 150,
    "platform": "Amazon",
    "url": "https://www.amazon.com/dp/B08FBLK2G4",
    "specs": {
      "Sensor": "Full Frame",
      "ISO Range": "100-50000",
      "AF": "225 AF Points",
      "Video": "4K 60p",
      "Weight": "835g",
      "Screen": "3.2-inch Touchscreen"
    },
    "features": [
      "Exceptional Image Quality",
      "Weather-Sealed Body",
      "High ISO Performance",
      "Fast Autofocus"
    ],
    "condition": "New",
    "trust": {
      "overall": 90,
      "sellerScore": 85,
      "reviewAuthenticity": 80,
      "productLegitimacy": 95,
      "flags": [],
      "sourcesChecked": [
        {
          "name": "Leica Official Site",
          "url": "https://www.leica-camera.com"
        },
        {
          "name": "DPReview",
          "url": "https://www.dpreview.com/reviews/leica-sl2-s"
        }
      ]
    },
    "price": {
      "originalPrice": 5995,
      "effectivePrice": 5995,
      "savings": 0,
      "savingsBreakdown": "",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Best Buy",
          "price": 5995,
          "inStock": false,
          "url": "https://www.bestbuy.com/site/leica-sl2-s"
        },
        {
          "platform": "Walmart",
          "price": 5995,
          "inStock": true,
          "url": "https://www.walmart.com/ip/Leica-SL2-S"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Overpriced"
    },
    "negotiation": {
      "viable": false,
      "explanation": "No negotiation available on new high-end products.",
      "messages": {
        "aggressive": "",
        "moderate": "",
        "friendly": ""
      },
      "nextSteps": [],
      "expectedCounterRange": {
        "low": 0,
        "high": 0
      },
      "walkAwayPrice": 0
    },
    "rankingExplanation": {
      "quality": 95,
      "price": 30,
      "brand": 90,
      "reviews": 95
    }
  },
  {
    "id": "8",
    "name": "Sigma fp L",
    "brand": "Sigma",
    "image": "https://picsum.photos/300/300?random=8",
    "rating": 4.8,
    "reviewCount": 200,
    "platform": "B&H",
    "url": "https://www.bhphotovideo.com/c/product/1636865-REG/sigma_fp_l_mirrorless_camera.html",
    "specs": {
      "Sensor": "Full Frame",
      "ISO Range": "100-102400",
      "AF": "Contrast AF",
      "Video": "8K 24p",
      "Weight": "427g",
      "Screen": "3.15-inch Touchscreen"
    },
    "features": [
      "Ultra Compact",
      "L-Mount Compatibility",
      "8K Video Recording",
      "High Dynamic Range"
    ],
    "condition": "New",
    "trust": {
      "overall": 85,
      "sellerScore": 80,
      "reviewAuthenticity": 75,
      "productLegitimacy": 90,
      "flags": [],
      "sourcesChecked": [
        {
          "name": "Sigma Official Site",
          "url": "https://www.sigma-global.com"
        },
        {
          "name": "B&H Photo",
          "url": "https://www.bhphotovideo.com"
        }
      ]
    },
    "price": {
      "originalPrice": 2499,
      "effectivePrice": 2499,
      "savings": 0,
      "savingsBreakdown": "",
      "priceHistory": [],
      "competitorPrices": [
        {
          "platform": "Amazon",
          "price": 2499,
          "inStock": true,
          "url": "https://www.amazon.com/dp/B092XZHTCQ"
        },
        {
          "platform": "Walmart",
          "price": 2549,
          "inStock": false,
          "url": "https://www.walmart.com/ip/Sigma-fp-L"
        }
      ],
      "coupons": [],
      "cashback": [],
      "dealQuality": "Fair Price"
    },
    "negotiation": {
      "viable": false,
      "explanation": "Fixed pricing on premium models.",
      "messages": {
        "aggressive": "",
        "moderate": "",
        "friendly": ""
      },
      "nextSteps": [],
      "expectedCounterRange": {
        "low": 0,
        "high": 0
      },
      "walkAwayPrice": 0
    },
    "rankingExplanation": {
      "quality": 90,
      "price": 50,
      "brand": 85,
      "reviews": 80
    }
  }
];

// Hydrate price history at runtime (GPT cannot predict dates)
export const mockProducts: Product[] = _rawProducts.map((p) => ({
  ...p,
  price: {
    ...p.price,
    priceHistory: generatePriceHistory(p.price.originalPrice),
  },
}));

export const exampleQueries = [
  "Mirrorless camera under $800",
  "Noise cancelling headphones",
  "4K monitor for coding",
  "Running shoes for flat feet",
];

export const mockFiltersForCamera: Filters = {
  budgetRange: [0, 800],
  brands: ["Sony", "Canon", "Fujifilm", "Nikon", "Panasonic", "Olympus"],
  condition: "Any",
  mustHaveFeatures: ["4K Video", "Lightweight"],
  niceToHaveFeatures: ["Weather Sealed", "In-Body Stabilization", "Tilting Screen"],
  platforms: ["Amazon", "eBay", "Walmart", "Best Buy", "Facebook Marketplace", "Craigslist"],
  sort: "relevance",
};

// ── Mock on-demand responses (used when backend is unavailable) ──────

export const mockNegotiateResponse: NegotiateResponse = {
  candidate_id: "mock-cl-001",
  strategy_used: "direct_negotiation",
  original_price: 450,
  negotiated_price: 375,
  savings: 75,
  success: true,
  reasoning:
    "This Craigslist listing has been up for 12 days with no buyer activity. The seller may be motivated. Amazon sells this camera new for $449, giving you strong leverage to negotiate on a used unit.",
  conversation_log: [
    {
      role: "buyer_aggressive",
      content:
        "Hi, I'm interested in the camera. I've seen this model go for around $350-380 used in similar condition. Amazon has it new for $449 right now. Would you consider $350? I can pick up today.",
    },
    {
      role: "buyer_moderate",
      content:
        "Hey, love the camera listing! I noticed Amazon has this new for $449. Since yours is used, would you be open to $375? I'm ready to pick up whenever works for you.",
    },
    {
      role: "buyer_friendly",
      content:
        "Hi there! Really interested in your camera. I've been shopping around and wanted to see if there's any flexibility on the price? I was thinking around $400 — happy to come pick it up at your convenience!",
    },
  ],
  next_steps: [
    "Send the moderate message first — it balances assertiveness with friendliness",
    "If the seller counters above $400, suggest meeting at $385",
    "Walk-away price: $420 — above this, buy new from Amazon for $449 with warranty",
    "Bring cash — sellers are more likely to accept lower offers for immediate cash payment",
  ],
};

export const mockSavingsResponse: SavingsResponse = {
  candidate_id: "mock-amz-001",
  current_price: 278,
  effective_price: 239.5,
  total_savings: 38.5,
  deal_quality_score: 82,
  coupons: [
    { code: "AUDIO15", description: "15% off select audio products", discount: 15, verified: true },
    { code: "SAVE10NOW", description: "$10 off orders over $200", discount: 10, verified: false },
  ],
  cashback: [
    { provider: "Rakuten", percent: 5, url: "https://www.rakuten.com/amazon.com" },
    { provider: "TopCashback", percent: 3.5, url: "https://www.topcashback.com/amazon" },
  ],
  competitor_prices: [
    { platform: "Amazon", price: 278, url: "https://amazon.com/...", in_stock: true },
    { platform: "Best Buy", price: 299, url: "https://bestbuy.com/...", in_stock: true },
    { platform: "B&H Photo", price: 268, url: "https://bhphoto.com/...", in_stock: true },
    { platform: "Walmart", price: 289, url: "https://walmart.com/...", in_stock: false },
  ],
  price_match_eligible: true,
  cheapest_competitor: { platform: "B&H Photo", price: 268, url: "https://bhphoto.com/...", in_stock: true },
  price_history: {
    lowest: 229,
    average: 305,
    trend: "falling",
  },
  price_prediction: "Price has been dropping since January. May reach $250 range by March sales events.",
};
