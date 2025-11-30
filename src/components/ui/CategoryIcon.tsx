import { LucideIcon } from 'lucide-react';
import {
  Briefcase, Laptop, TrendingUp, PiggyBank, Plus,
  UtensilsCrossed, Car, Gamepad2, Heart, FileText,
  GraduationCap, Home, ShoppingBag, CreditCard, MoreHorizontal,
  Circle, Wallet, Target, Settings, ArrowUpDown
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Briefcase, Laptop, TrendingUp, PiggyBank, Plus,
  UtensilsCrossed, Car, Gamepad2, Heart, FileText,
  GraduationCap, Home, ShoppingBag, CreditCard, MoreHorizontal,
  Circle, Wallet, Target, Settings, ArrowUpDown
};

interface CategoryIconProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function CategoryIcon({ name, color, size = 20, className }: CategoryIconProps) {
  const IconComponent = iconMap[name] || Circle;
  
  return (
    <IconComponent 
      size={size} 
      className={className}
      style={{ color: color || 'currentColor' }}
    />
  );
}
