import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileBottomBar, MobileNavItem } from "@/components/mobile-primitives";
import {
  User,
  Ticket,
  Wallet,
  RefreshCw,
  LogOut,
  Home,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const navItems = [
  { href: "/account/home", label: "Home", icon: Home },
  { href: "/account/tickets", label: "Biglietti", icon: Ticket },
  { href: "/account/wallet", label: "Wallet", icon: Wallet },
  { href: "/account/resales", label: "Rivendita", icon: RefreshCw },
  { href: "/account/profile", label: "Profilo", icon: User },
];

function SidebarContent({ customer, onLogout }: { customer: Customer | null; onLogout: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border">
      <div className="p-6 border-b border-border">
        <Link href="/acquista">
          <BrandLogo variant="horizontal" className="h-10 w-auto" />
        </Link>
      </div>

      {customer && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-primary/20 border-2 border-primary/30">
              <AvatarFallback className="bg-transparent text-primary font-semibold">
                {customer.firstName?.[0]}{customer.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-foreground" data-testid="text-user-greeting">
                Ciao, {customer.firstName}!
              </p>
              <p className="text-sm text-muted-foreground">{customer.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/account/home" && location.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary/20 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                data-testid={`nav-${item.href.split("/").pop()}`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          Esci
        </Button>
      </div>
    </div>
  );
}

interface AccountLayoutProps {
  children: React.ReactNode;
}

export function AccountLayout({ children }: AccountLayoutProps) {
  const [location, navigate] = useLocation();
  const isMobile = useIsMobile();

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "GET", credentials: "include" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerData");
    queryClient.clear();
    window.location.href = "/acquista";
  };

  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 flex flex-col bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <header className="shrink-0 flex items-center justify-between px-4 py-3 bg-card/95 backdrop-blur-xl border-b border-border z-30">
          <Link href="/acquista" data-testid="link-logo">
            <BrandLogo variant="horizontal" className="h-9 w-auto" />
          </Link>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {customer && (
              <Link href="/account/profile">
                <Avatar className="w-9 h-9 bg-primary/20 border-2 border-primary/30 cursor-pointer" data-testid="button-avatar">
                  <AvatarFallback className="bg-transparent text-primary font-semibold text-sm">
                    {customer.firstName?.[0]}{customer.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </main>

        <MobileBottomBar className="shrink-0 z-30">
          {navItems.map((item) => {
            const isActive = location === item.href || 
              (item.href !== "/account/home" && location.startsWith(item.href));
            return (
              <MobileNavItem
                key={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive}
                onClick={() => navigate(item.href)}
              />
            );
          })}
        </MobileBottomBar>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="fixed left-0 top-0 h-full w-72 z-40">
        <SidebarContent customer={customer || null} onLogout={handleLogout} />
      </aside>
      <main className="flex-1 ml-72 p-8">{children}</main>
    </div>
  );
}
