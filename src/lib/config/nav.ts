import { Home, BookOpen, Zap, Settings } from "lucide-react";
import type { NavItem } from "@/lib/types/dashboard";

/** App navigation (static UI configuration, not data). */
export const MOBILE_NAV: NavItem[] = [
  { label: "Home", href: "/dashboard", icon: Home },
  { label: "Learn", href: "/learn", icon: BookOpen },
  { label: "Play", href: "/play", icon: Zap },
  { label: "Settings", href: "/settings", icon: Settings },
];
