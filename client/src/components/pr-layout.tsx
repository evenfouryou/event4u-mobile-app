import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { 
  Home, 
  Calendar, 
  Users, 
  Wallet, 
  User,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePrAuth } from "@/hooks/usePrAuth";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";

interface PrLayoutProps {
  children: ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  hideNav?: boolean;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  isActive: boolean;
}

export function PrLayout({ children, showBackButton, onBack, title, hideNav }: PrLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { prProfile } = usePrAuth();

  const navItems: NavItem[] = [
    { 
      icon: Home, 
      label: "Home", 
      href: "/pr/dashboard",
      isActive: location === "/pr/dashboard" || location === "/pr",
    },
    { 
      icon: Calendar, 
      label: "Eventi", 
      href: "/pr/events",
      isActive: location === "/pr/events" || location.startsWith("/pr/events/"),
    },
    { 
      icon: Users, 
      label: "Liste", 
      href: "/pr/lists",
      isActive: location === "/pr/lists",
    },
    { 
      icon: Wallet, 
      label: "Wallet", 
      href: "/pr/wallet",
      isActive: location === "/pr/wallet",
    },
    { 
      icon: User, 
      label: "Profilo", 
      href: "/pr/profile",
      isActive: location === "/pr/profile",
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-3">
            {showBackButton ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack || (() => window.history.back())}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            ) : (
              <BrandLogo variant="horizontal" className="h-8" />
            )}
            {title && (
              <h1 className="text-lg font-semibold">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            {prProfile?.prCode && (
              <Badge variant="outline" className="hidden sm:flex bg-primary/10 text-primary border-primary/30">
                {prProfile.prCode}
              </Badge>
            )}
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-area-bottom">
          <div className="flex items-center justify-around h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-colors min-w-[64px]",
                      item.isActive 
                        ? "text-primary" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    whileTap={{ scale: 0.95 }}
                    data-testid={`nav-${item.label.toLowerCase()}`}
                  >
                    <div className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      item.isActive && "bg-primary/10"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        item.isActive && "text-primary"
                      )} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium",
                      item.isActive && "text-primary"
                    )}>
                      {item.label}
                    </span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

export function PrPageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-4 max-w-4xl mx-auto", className)}>
      {children}
    </div>
  );
}
