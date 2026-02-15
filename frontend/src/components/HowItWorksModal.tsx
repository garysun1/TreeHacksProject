"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Search, ShieldCheck, DollarSign, MessageSquare } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    label: "Find",
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "We search Amazon, eBay, Walmart, and Best Buy simultaneously",
  },
  {
    icon: ShieldCheck,
    label: "Verify",
    color: "text-amber-600",
    bg: "bg-amber-50",
    description: "Every seller is checked for reputation, fake reviews, and scam indicators",
  },
  {
    icon: DollarSign,
    label: "Analyze",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    description: "Price history, competitor prices, coupons, and cashback found automatically",
  },
  {
    icon: MessageSquare,
    label: "Negotiate",
    color: "text-purple-600",
    bg: "bg-purple-50",
    description: "Get ready-to-send messages for price matches and offers",
  },
];

const SPONSORS = [
  "Bright Data",
  "Perplexity",
  "OpenAI",
  "Anthropic",
];

interface HowItWorksModalProps {
  open: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ open, onClose }: HowItWorksModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900">
            How ShopAgent Works
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Four specialized agents work together to find you the best deal
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          {STEPS.map((step, i) => (
            <div key={step.label} className="text-center">
              <div className={`w-12 h-12 ${step.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <step.icon className={`h-6 w-6 ${step.color}`} />
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                Step {i + 1}
              </div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">{step.label}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-3 text-center">
            Powered by
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {SPONSORS.map((s) => (
              <span key={s} className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                {s}
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
