import { AirVent, CreditCard, Gift, Refrigerator, ShoppingBag, Tv, UtensilsCrossed, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RewardCategory } from "@/types";

const ICONS: Record<RewardCategory, typeof Gift> = {
  "Shopping Voucher": ShoppingBag,
  "Gift Card": CreditCard,
  "Air Conditioner": AirVent,
  Refrigerator: Refrigerator,
  Television: Tv,
  "Home Appliance": UtensilsCrossed,
  "Tools & Equipment": Wrench,
  Other: Gift,
};

export function RewardIcon({ category, className }: { category: RewardCategory; className?: string }) {
  const Icon = ICONS[category] ?? Gift;
  return (
    <div className={cn("flex items-center justify-center rounded-lg bg-gradient-to-br from-[#f6efe2] to-[#e9dcc0] text-[#8a6a2f]", className)}>
      <Icon className="size-1/2 max-h-6 max-w-6" aria-hidden />
    </div>
  );
}
