"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ShoppingBag,
  ChevronLeft,
  Lock,
  CreditCard,
  Truck,
  ShieldCheck,
  CheckCircle2,
  X,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";

// ── Platform badge colors ────────────────────────────────────────────
const platformColors: Record<string, string> = {
  Amazon: "bg-amber-100 text-amber-800",
  eBay: "bg-blue-100 text-blue-800",
  Walmart: "bg-blue-100 text-blue-700",
  "Best Buy": "bg-yellow-100 text-yellow-800",
  "Facebook Marketplace": "bg-sky-100 text-sky-800",
  Craigslist: "bg-violet-100 text-violet-800",
};

export default function CheckoutPage() {
  const { items, removeFromCart, subtotal, totalSavings, clearCart } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);

  const shippingCost = 0; // free shipping
  const taxRate = 0.0875;
  const tax = subtotal * taxRate;
  const total = subtotal + shippingCost + tax;

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                Shop<span className="text-emerald-600">Agent</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 ml-auto text-xs text-gray-400">
              <Lock className="h-3 w-3" />
              Secure Checkout
            </div>
          </div>
        </header>

        <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-500 mb-1">
            Your order of {items.length} item{items.length !== 1 ? "s" : ""} has been placed.
          </p>
          <p className="text-sm text-gray-400 mb-2">Order #SA-{Math.random().toString(36).slice(2, 8).toUpperCase()}</p>
          {totalSavings > 0 && (
            <p className="text-sm font-semibold text-emerald-600 mb-8">
              You saved ${totalSavings.toFixed(2)} with ShopAgent!
            </p>
          )}
          <Link href="/" onClick={() => clearCart()}>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                Shop<span className="text-emerald-600">Agent</span>
              </span>
            </Link>
          </div>
        </header>

        <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-sm text-gray-500 mb-6">Add some products before checking out.</p>
          <Link href="/">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
              Back to Shopping
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Checkout header ──────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1100px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <ShoppingBag className="h-5 w-5 text-emerald-600" />
              <span className="text-lg font-semibold tracking-tight text-gray-900">
                Shop<span className="text-emerald-600">Agent</span>
              </span>
            </Link>
            <span className="text-gray-300">|</span>
            <h1 className="text-sm font-medium text-gray-700">Checkout</h1>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Lock className="h-3 w-3" />
            Secure Checkout
          </div>
        </div>
      </header>

      {/* ── Back link ────────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 pt-5 pb-2">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Back to results
        </Link>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-[1100px] mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left column: Shipping + Payment ───────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Shipping */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</div>
                <h2 className="text-base font-semibold text-gray-900">Shipping Address</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">First Name</label>
                  <input
                    type="text"
                    defaultValue="Jane"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Last Name</label>
                  <input
                    type="text"
                    defaultValue="Doe"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Street Address</label>
                  <input
                    type="text"
                    defaultValue="123 Main Street"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">City</label>
                  <input
                    type="text"
                    defaultValue="Palo Alto"
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">State</label>
                    <input
                      type="text"
                      defaultValue="CA"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">ZIP</label>
                    <input
                      type="text"
                      defaultValue="94301"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <Truck className="h-3.5 w-3.5" />
                Free standard shipping (5-7 business days)
              </div>
            </section>

            {/* Payment */}
            <section className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</div>
                <h2 className="text-base font-semibold text-gray-900">Payment Method</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Card Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      defaultValue="4242 4242 4242 4242"
                      className="w-full border border-gray-200 rounded-lg pl-10 pr-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Expiry</label>
                    <input
                      type="text"
                      defaultValue="12/28"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">CVV</label>
                    <input
                      type="text"
                      defaultValue="123"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1.5 block">Name on Card</label>
                    <input
                      type="text"
                      defaultValue="Jane Doe"
                      className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Your payment info is encrypted and secure
              </div>
            </section>
          </div>

          {/* ── Right column: Order Summary ────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-20">
              <h2 className="text-base font-semibold text-gray-900 mb-4">
                Order Summary ({items.length} item{items.length !== 1 ? "s" : ""})
              </h2>

              {/* Cart items */}
              <div className="space-y-3 mb-5 max-h-[320px] overflow-y-auto">
                {items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                      <Image
                        src={item.product.image}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 line-clamp-2 leading-snug">{item.product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[item.product.platform] || "bg-gray-100 text-gray-700"}`}>
                          {item.product.platform}
                        </span>
                        <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">${item.effectivePrice.toFixed(2)}</p>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors mt-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-gray-100 pt-4 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span className="text-emerald-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Estimated Tax</span>
                  <span className="text-gray-900">${tax.toFixed(2)}</span>
                </div>
                {totalSavings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <Tag className="h-3 w-3" />
                      ShopAgent Savings
                    </span>
                    <span className="text-emerald-600 font-medium">-${totalSavings.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3 mt-3 flex justify-between">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-base font-bold text-gray-900">${total.toFixed(2)}</span>
                </div>
              </div>

              {/* Place order button */}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-sm font-semibold mt-5"
                onClick={() => setOrderPlaced(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Place Order &middot; ${total.toFixed(2)}
              </Button>

              <p className="text-[10px] text-gray-400 text-center mt-3 leading-relaxed">
                By placing your order, you agree to ShopAgent&apos;s Terms of Service.
                This is a demo — no real charges will be made.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
