"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

const platformColors: Record<string, string> = {
  Amazon: "bg-amber-100 text-amber-800",
  eBay: "bg-blue-100 text-blue-800",
  Walmart: "bg-blue-100 text-blue-700",
  "Best Buy": "bg-yellow-100 text-yellow-800",
  "Facebook Marketplace": "bg-sky-100 text-sky-800",
  Craigslist: "bg-violet-100 text-violet-800",
};

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CartPanel({ open, onClose }: CartPanelProps) {
  const { items, removeFromCart, subtotal, totalSavings } = useCart();
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-white border-gray-200 flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Cart ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Your cart is empty</p>
              <p className="text-xs text-gray-400 mt-1">Add products to get started</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 mt-4">
              {items.map((item) => (
                <div key={item.product.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-white shrink-0">
                    <Image
                      src={item.product.image}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                      {item.product.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[item.product.platform] || "bg-gray-100 text-gray-700"}`}>
                        {item.product.platform}
                      </span>
                      <span className="text-xs text-gray-400">Qty: {item.quantity}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-sm font-bold text-gray-900">${item.effectivePrice.toFixed(2)}</span>
                      {item.product.price.savings > 0 && (
                        <span className="text-[11px] text-emerald-600">-${item.product.price.savings.toFixed(2)}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="self-start text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-600 font-medium">You&apos;re saving</span>
                  <span className="font-semibold text-emerald-600">${totalSavings.toFixed(2)}</span>
                </div>
              )}
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-3 h-11"
                onClick={() => { onClose(); router.push("/checkout"); }}
              >
                Proceed to Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
