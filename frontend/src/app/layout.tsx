import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/lib/cart-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ShopAgent — Search smarter. Shop better.",
  description: "Search across Amazon, eBay, Walmart, Best Buy and more. AI-verified deals, trust scores, and negotiation strategies.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <CartProvider>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </CartProvider>
      </body>
    </html>
  );
}
