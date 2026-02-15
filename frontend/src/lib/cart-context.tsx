"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Product } from "./types";

export interface CartItem {
  product: Product;
  quantity: number;
  effectivePrice: number;
}

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  isInCart: (productId: string) => boolean;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  totalSavings: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: Product) => {
    setItems((prev) => {
      if (prev.some((item) => item.product.id === product.id)) return prev;
      return [...prev, { product, quantity: 1, effectivePrice: product.price.effectivePrice }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.product.id !== productId));
  }, []);

  const isInCart = useCallback(
    (productId: string) => items.some((item) => item.product.id === productId),
    [items]
  );

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = items.length;
  const subtotal = items.reduce((sum, item) => sum + item.effectivePrice * item.quantity, 0);
  const totalSavings = items.reduce((sum, item) => sum + item.product.price.savings * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, isInCart, clearCart, itemCount, subtotal, totalSavings }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
