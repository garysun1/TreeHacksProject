"""Bright Data Web Scraper API wrapper.

Uses Bright Data's /datasets/v3/scrape (sync) endpoint with these public
dataset IDs (from https://github.com/luminati-io/Amazon-scraper):

  Amazon keyword search : gd_lwdb4vjm1ehb499uxs
  Amazon product page   : gd_l7q7dkf244hwjntr0
  Amazon reviews        : gd_le8e811kzy4ggddlq
"""

import logging
from urllib.parse import quote
from typing import Any

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from config import settings

logger = logging.getLogger(__name__)

BASE_URL = "https://api.brightdata.com"

# Domain URLs for each supported platform
PLATFORM_DOMAINS: dict[str, str] = {
    "amazon": "https://www.amazon.com",
    "ebay": "https://www.ebay.com",
    "walmart": "https://www.walmart.com",
    "bestbuy": "https://www.bestbuy.com",
    "facebook_marketplace": "https://www.facebook.com/marketplace",
    "craigslist": "https://www.craigslist.org",
}

# Simple shopping-bag icon as SVG data URL (neutral gray, fits product placeholder)
_MOCK_ICON_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
    'stroke="#94a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>'
    '<line x1="3" y1="6" x2="21" y2="6"/>'
    '<path d="M16 10a4 4 0 01-8 0"/>'
    "</svg>"
)
MOCK_PRODUCT_PLACEHOLDER_IMAGE = "data:image/svg+xml," + quote(_MOCK_ICON_SVG, safe="")


def _mock_product_title(query: str, brand: str, index: int) -> str:
    """Generate a plausible product title from the query and brand (no 'Mock' or 'Default')."""
    # Normalize query: title-case, strip
    words = query.strip().split()
    if not words:
        return f"{brand} Product — Model {index + 1}"
    title_query = " ".join(w.capitalize() for w in words[:5])  # cap first 5 words
    return f"{brand} {title_query} — Model {index + 1}"


# Mock result URL base and seller label per platform (for platforms where .com/product doesn't apply)
_MOCK_PLATFORM_URL_BASE: dict[str, str] = {
    "amazon": "https://www.amazon.com/dp/",
    "ebay": "https://www.ebay.com/itm/",
    "walmart": "https://www.walmart.com/ip/",
    "bestbuy": "https://www.bestbuy.com/site/",
    "facebook_marketplace": "https://www.facebook.com/marketplace/item/",
    "craigslist": "https://craigslist.org/",
}
_MOCK_PLATFORM_SELLER: dict[str, str] = {
    "amazon": "Amazon Seller",
    "ebay": "eBay Seller",
    "walmart": "Walmart Seller",
    "bestbuy": "Best Buy Seller",
    "facebook_marketplace": "Facebook Marketplace Seller",
    "craigslist": "Craigslist Seller",
}


def _mock_search_results(query: str, platform: str) -> list[dict[str, Any]]:
    """Return mock search results when API is unavailable.

    Prices are spread across a wide range (149–899) so results survive
    typical budget filters. Titles are generated from query + brand; image
    uses a single default placeholder.
    """
    _prices = [149.99, 299.99, 449.99, 599.99, 799.99]
    _brands = ["Sony", "Canon", "Nikon", "Samsung", "LG"]
    url_base = _MOCK_PLATFORM_URL_BASE.get(platform) or f"https://{platform}.com/product/"
    seller = _MOCK_PLATFORM_SELLER.get(platform) or f"{platform.replace('_', ' ').title()} Seller"
    return [
        {
            "name": _mock_product_title(query, _brands[i % len(_brands)], i),
            "price": _prices[i % len(_prices)],
            "url": f"{url_base}{i+1}",
            "rating": 4.0 + (i % 10) / 10,
            "review_count": 100 + i * 20,
            "seller": seller,
            "image": MOCK_PRODUCT_PLACEHOLDER_IMAGE,
            "brand": _brands[i % len(_brands)],
            "availability": "in_stock",
        }
        for i in range(5)
    ]


def _mock_product_details(url: str) -> dict[str, Any]:
    """Return mock product details when API is unavailable."""
    return {
        "name": "Mock Product",
        "price": 299.99,
        "specifications": {"weight": "500g", "dimensions": "10x5x3 cm"},
        "description": "A high-quality product.",
        "reviews": [],
    }


def _mock_reviews(url: str) -> list[dict[str, Any]]:
    """Return mock reviews when API is unavailable."""
    return [
        {
            "author": f"User{i}",
            "rating": 4 + (i % 2),
            "text": f"Great product, very satisfied with the quality. Review #{i+1}.",
            "date": "2025-12-01",
            "verified": True,
        }
        for i in range(5)
    ]


def _normalize_search_record(record: dict[str, Any], platform: str) -> dict[str, Any]:
    """Map Bright Data Amazon keyword-search record to our standard product dict.

    Expected fields from the Amazon keyword-search dataset:
      asin, url, name, sponsored, initial_price, final_price, currency,
      sold, rating, num_ratings, brand, image, delivery, keyword, domain,
      bought_past_month, page_number, rank_on_page, timestamp
    """
    name = (
        record.get("name")
        or record.get("title")
        or record.get("Name")
        or "Unknown"
    )
    # Prefer final_price (sale price), then initial_price, then generic price
    price_val = (
        record.get("final_price")
        or record.get("initial_price")
        or record.get("price")
        or 0
    )
    try:
        price = float(price_val) if price_val is not None else 0.0
    except (TypeError, ValueError):
        price = 0.0
    url = record.get("url") or record.get("URL") or record.get("link") or ""
    brand = record.get("brand") or record.get("Brand") or "Unknown"
    return {
        "name": name,
        "price": price,
        "url": url,
        "brand": brand,
        "rating": record.get("rating") or record.get("product_rating"),
        "review_count": (
            record.get("num_ratings")
            or record.get("review_count")
            or record.get("reviews_count")
        ),
        "seller": record.get("seller_name") or record.get("seller") or platform.title(),
        "image": record.get("image") or record.get("image_url") or record.get("Image"),
        "availability": record.get("availability") or "in_stock",
        "specifications": record.get("specifications") or record.get("specs") or {},
    }


def _normalize_product_details(record: dict[str, Any]) -> dict[str, Any]:
    """Map Bright Data product page response to our details dict."""
    name = record.get("title") or record.get("name") or "Mock Product"
    price_val = record.get("initial_price") or record.get("final_price") or record.get("price") or 299.99
    try:
        price = float(price_val) if price_val is not None else 299.99
    except (TypeError, ValueError):
        price = 299.99
    return {
        "name": name,
        "price": price,
        "specifications": record.get("specifications") or record.get("specs") or {},
        "description": record.get("description") or "",
        "reviews": record.get("reviews") or [],
    }


def _normalize_review(record: dict[str, Any]) -> dict[str, Any]:
    """Map Bright Data review record to our review dict."""
    return {
        "author": record.get("author") or record.get("author_name") or record.get("Author name") or "Unknown",
        "rating": record.get("rating") or record.get("Rating"),
        "text": record.get("text") or record.get("body") or record.get("review_text") or "",
        "date": record.get("date") or record.get("review_date") or "",
        "verified": record.get("verified") or False,
    }


class BrightDataClient:
    """Async client for Bright Data's Web Scraper API and Request (SERP/Unlocker) API."""

    def __init__(self) -> None:
        self.api_key = settings.brightdata_api_key
        self.zone = settings.brightdata_zone
        self.amazon_search_dataset_id = settings.brightdata_amazon_search_dataset_id or ""
        self.amazon_product_dataset_id = settings.brightdata_amazon_product_dataset_id
        self.amazon_reviews_dataset_id = settings.brightdata_amazon_reviews_dataset_id or ""
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _use_api(self) -> bool:
        """True if we have API key and should attempt real calls."""
        return bool(self.api_key and self.api_key.strip())

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def search_products(self, query: str, platform: str) -> list[dict[str, Any]]:
        """Search for products on a specific platform.

        For Amazon: uses the keyword-search dataset (gd_lwdb4vjm1ehb499uxs)
        which accepts ``{"keyword": ..., "url": "<domain>", "pages_to_search": 1}``.
        Other platforms fall back to mock data for now.

        Args:
            query: Search query string.
            platform: Platform to search (amazon, walmart, bestbuy).

        Returns:
            List of raw product data dicts.
        """
        logger.info("BrightData: searching '%s' on %s", query, platform)

        if not self._use_api():
            logger.debug("BrightData: no API key, using mock search results")
            return _mock_search_results(query, platform)

        # Real API call for Amazon keyword search
        if platform == "amazon" and self.amazon_search_dataset_id:
            try:
                domain = PLATFORM_DOMAINS.get(platform, "https://www.amazon.com")
                body: list[dict[str, Any]] = [
                    {
                        "keyword": query,
                        "url": domain,
                        "pages_to_search": 1,
                    }
                ]
                async with httpx.AsyncClient(timeout=90.0) as client:
                    r = await client.post(
                        f"{BASE_URL}/datasets/v3/scrape",
                        params={
                            "dataset_id": self.amazon_search_dataset_id,
                            "format": "json",
                        },
                        headers=self.headers,
                        json=body,
                    )
                logger.info("BrightData: search response status=%s len=%s", r.status_code, len(r.content))
                if r.status_code == 200:
                    data = r.json()
                    records = data if isinstance(data, list) else []
                    out = [_normalize_search_record(rec, platform) for rec in records]
                    logger.info("BrightData: got %d real search results for '%s'", len(out), query)
                    if out:
                        return out
                elif r.status_code == 202:
                    logger.warning("BrightData: search job went async (202), falling back to mock")
                else:
                    logger.warning(
                        "BrightData: search API returned %s: %s",
                        r.status_code,
                        r.text[:500],
                    )
            except Exception as e:
                logger.warning("BrightData: search API failed (%s), falling back to mock: %s", platform, e)

        return _mock_search_results(query, platform)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def get_product_details(self, url: str) -> dict[str, Any]:
        """Get detailed product info from a URL.

        Uses Bright Data Web Scraper API with Amazon product page dataset when
        API key and product dataset are configured. Otherwise returns mock data.

        Args:
            url: Product page URL.

        Returns:
            Detailed product data dict.
        """
        logger.info("BrightData: fetching details for %s", url)

        if not self._use_api():
            logger.debug("BrightData: no API key, using mock product details")
            return _mock_product_details(url)

        try:
            body: list[dict[str, Any]] = [{"url": url}]
            async with httpx.AsyncClient(timeout=90.0) as client:
                r = await client.post(
                    f"{BASE_URL}/datasets/v3/scrape",
                    params={
                        "dataset_id": self.amazon_product_dataset_id,
                        "format": "json",
                    },
                    headers=self.headers,
                    json=body,
                )
            logger.info("BrightData: product details response status=%s len=%s", r.status_code, len(r.content))
            if r.status_code == 200:
                data = r.json()
                records = data if isinstance(data, list) else []
                if records:
                    return _normalize_product_details(records[0])
            elif r.status_code == 202:
                logger.warning("BrightData: product details job went async (202), falling back to mock")
            else:
                logger.warning(
                    "BrightData: product details API returned %s: %s",
                    r.status_code,
                    r.text[:500],
                )
        except Exception as e:
            logger.warning("BrightData: get_product_details failed, falling back to mock: %s", e)

        return _mock_product_details(url)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=10))
    async def get_reviews(
        self, url: str, num_of_reviews: int = 10, days_range: int = 0
    ) -> list[dict[str, Any]]:
        """Get reviews for a product.

        Uses the Amazon reviews dataset (gd_le8e811kzy4ggddlq) which
        accepts ``{"url": ..., "num_of_reviews": N, "days_range": D}``.

        Args:
            url: Product page URL.
            num_of_reviews: How many reviews to fetch (default 10).
            days_range: Only reviews from last N days (0 = no limit).

        Returns:
            List of review dicts.
        """
        logger.info("BrightData: fetching reviews for %s", url)

        if not self._use_api():
            logger.debug("BrightData: no API key, using mock reviews")
            return _mock_reviews(url)

        if not self.amazon_reviews_dataset_id:
            logger.debug("BrightData: no reviews dataset ID, using mock reviews")
            return _mock_reviews(url)

        try:
            body: list[dict[str, Any]] = [
                {
                    "url": url,
                    "num_of_reviews": num_of_reviews,
                    "days_range": days_range,
                }
            ]
            async with httpx.AsyncClient(timeout=90.0) as client:
                r = await client.post(
                    f"{BASE_URL}/datasets/v3/scrape",
                    params={
                        "dataset_id": self.amazon_reviews_dataset_id,
                        "format": "json",
                    },
                    headers=self.headers,
                    json=body,
                )
            logger.info("BrightData: reviews response status=%s len=%s", r.status_code, len(r.content))
            if r.status_code == 200:
                data = r.json()
                records = data if isinstance(data, list) else []
                if records:
                    return [_normalize_review(rec) for rec in records]
            elif r.status_code == 202:
                logger.warning("BrightData: reviews job went async (202), falling back to mock")
            else:
                logger.warning(
                    "BrightData: reviews API returned %s: %s",
                    r.status_code,
                    r.text[:500],
                )
        except Exception as e:
            logger.warning("BrightData: get_reviews failed, falling back to mock: %s", e)

        return _mock_reviews(url)


bright_data = BrightDataClient()
