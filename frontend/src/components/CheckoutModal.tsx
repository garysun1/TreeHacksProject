"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CreditCard } from "lucide-react";
import { useCart } from "@/lib/cart-context";

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
  onContinueShopping: () => void;
}

export function CheckoutModal({ open, onClose, onContinueShopping }: CheckoutModalProps) {
  const { items, subtotal, totalSavings, clearCart } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);

  const handlePlaceOrder = () => {
    setOrderPlaced(true);
  };

  const handleContinue = () => {
    clearCart();
    setOrderPlaced(false);
    onContinueShopping();
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      if (orderPlaced) {
        handleContinue();
      } else {
        onClose();
      }
    }
  };

  if (orderPlaced) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[440px]">
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Order Placed!</h2>
            <p className="text-sm text-gray-500 mb-1">
              Your order of {items.length} item{items.length !== 1 ? "s" : ""} has been confirmed.
            </p>
            {totalSavings > 0 && (
              <p className="text-sm font-medium text-emerald-600 mb-6">
                You saved ${totalSavings.toFixed(2)} with ShopAgent
              </p>
            )}
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
              onClick={handleContinue}
            >
              Continue Shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Checkout
          </DialogTitle>
        </DialogHeader>

        {/* Order summary */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Order Summary</h3>
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.product.id} className="flex justify-between items-center px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900 truncate">{item.product.name}</p>
                  <p className="text-[11px] text-gray-400">{item.product.platform} &middot; Qty {item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-gray-900 shrink-0 ml-3">${item.effectivePrice.toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm pt-1">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-semibold">${subtotal.toFixed(2)}</span>
          </div>
          {totalSavings > 0 && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-sm text-emerald-700 font-medium text-center">
              You&apos;re saving ${totalSavings.toFixed(2)} with ShopAgent
            </div>
          )}
        </div>

        {/* Payment form (mock) */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Details</h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Card Number</label>
            <input
              type="text"
              defaultValue="4242 4242 4242 4242"
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 box-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Expiry</label>
              <input
                type="text"
                defaultValue="12/28"
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 box-border"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CVV</label>
              <input
                type="text"
                defaultValue="123"
                readOnly
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 box-border"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cardholder Name</label>
            <input
              type="text"
              defaultValue="Jane Doe"
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50 box-border"
            />
          </div>
        </div>

        <Button
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 mt-1"
          onClick={handlePlaceOrder}
        >
          Place Order &middot; ${subtotal.toFixed(2)}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
