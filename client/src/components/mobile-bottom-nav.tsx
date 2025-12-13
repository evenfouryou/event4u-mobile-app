import { Link, useLocation } from "wouter";
import { Home, Calendar, Wine, Warehouse, User, Plus, Package, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import type { UserFeatures } from "@shared/schema";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isFab?: boolean;
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'gestore';
  const isWarehouse = user?.role === 'warehouse';
  const isBartender = user?.role === 'bartender';

  // Fetch user features for navigation filtering
  const { data: userFeatures } = useQuery<UserFeatures>({
    queryKey: ['/api/user-features/current/my'],
    enabled: !!user && isAdmin,
  });

  if (!user) return null;

  let navItems: NavItem[] = [];

  if (isSuperAdmin) {
    navItems = [
      { icon: Home, label: "Home", href: "/" },
      { icon: Calendar, label: "Aziende", href: "/companies" },
      { icon: Plus, label: "Utente", href: "/users", isFab: true },
      { icon: BarChart3, label: "Report", href: "/reports" },
      { icon: User, label: "Profilo", href: "/settings" },
    ];
  } else if (isAdmin) {
    // Build nav items based on enabled features
    navItems = [
      { icon: Home, label: "Home", href: "/" },
      { icon: Calendar, label: "Eventi", href: "/events" },
      { icon: Plus, label: "Evento", href: "/events/wizard", isFab: true },
    ];
    
    // Add Beverage if enabled (default true)
    if (userFeatures?.beverageEnabled !== false) {
      navItems.push({ icon: Wine, label: "Beverage", href: "/beverage" });
    }
    
    navItems.push({ icon: User, label: "Profilo", href: "/settings" });
  } else if (isWarehouse) {
    navItems = [
      { icon: Home, label: "Home", href: "/beverage" },
      { icon: Package, label: "Prodotti", href: "/products" },
      { icon: Plus, label: "Carico", href: "/warehouse?action=load", isFab: true },
      { icon: Warehouse, label: "Stock", href: "/warehouse" },
      { icon: User, label: "Profilo", href: "/settings" },
    ];
  } else if (isBartender) {
    navItems = [
      { icon: Home, label: "Eventi", href: "/beverage" },
      { icon: Calendar, label: "Attivi", href: "/beverage" },
      { icon: Plus, label: "Servizio", href: "/beverage", isFab: true },
      { icon: Wine, label: "Prodotti", href: "/products" },
      { icon: User, label: "Profilo", href: "/settings" },
    ];
  } else {
    // Default organizer view
    navItems = [
      { icon: Home, label: "Home", href: "/" },
      { icon: Calendar, label: "Eventi", href: "/events" },
      { icon: Plus, label: "Evento", href: "/events/wizard", isFab: true },
    ];
    
    if (userFeatures?.beverageEnabled !== false) {
      navItems.push({ icon: Wine, label: "Beverage", href: "/beverage" });
    }
    
    navItems.push({ icon: User, label: "Profilo", href: "/settings" });
  }

  return (
    <nav className="mobile-nav md:hidden">
      <div className="flex items-end justify-around h-20 px-2 pt-2">
        {navItems.map((item, index) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const Icon = item.icon;
          
          if (item.isFab) {
            return (
              <Link
                key={item.href + index}
                href={item.href}
                data-testid={`nav-fab-${item.label.toLowerCase()}`}
                className="relative -mt-6"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg glow-golden transition-transform active:scale-95">
                  <Icon className="h-6 w-6 text-black" />
                </div>
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary whitespace-nowrap">
                  {item.label}
                </span>
              </Link>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center min-w-[56px] py-2 transition-all duration-200",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-colors mb-1",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
