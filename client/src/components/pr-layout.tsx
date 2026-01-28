import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Calendar, 
  Users, 
  Wallet, 
  User,
  LogOut,
  ChevronLeft,
  Gift,
  ArrowRightLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePrAuth } from "@/hooks/usePrAuth";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
}

export function PrLayout({ children, showBackButton, onBack, title, hideNav }: PrLayoutProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { prProfile } = usePrAuth();

  const navItems: NavItem[] = [
    { 
      icon: Home, 
      label: "Dashboard", 
      href: "/pr/dashboard",
    },
    { 
      icon: Calendar, 
      label: "Eventi", 
      href: "/pr/events",
    },
    { 
      icon: Users, 
      label: "Liste Ospiti", 
      href: "/pr/guest-lists",
    },
    { 
      icon: Wallet, 
      label: "Wallet", 
      href: "/pr/wallet",
    },
    { 
      icon: Gift, 
      label: "Rewards", 
      href: "/pr/rewards",
    },
    { 
      icon: User, 
      label: "Profilo", 
      href: "/pr/profile",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/pr/dashboard") {
      return location === "/pr/dashboard" || location === "/pr";
    }
    if (href === "/pr/events") {
      return location === "/pr/events" || location.startsWith("/pr/events/");
    }
    if (href === "/pr/guest-lists") {
      return location === "/pr/guest-lists" || location === "/pr/lists";
    }
    return location === href;
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {!hideNav && (
          <Sidebar className="border-r">
            <SidebarHeader className="p-4 border-b">
              <div className="flex items-center gap-2">
                <BrandLogo variant="horizontal" className="h-8" />
              </div>
              {prProfile?.prCode && (
                <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/30 w-fit">
                  PR: {prProfile.prCode}
                </Badge>
              )}
            </SidebarHeader>
            
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navItems.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={item.label}
                          >
                            <Link href={item.href}>
                              <Icon className="h-5 w-5" />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="p-4 border-t space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => navigate("/account/home")}
                data-testid="button-switch-to-client"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Passa ad Account Cliente
              </Button>
              <div className="flex items-center gap-2">
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
              {(user?.firstName || prProfile?.firstName) && (
                <p className="text-xs text-muted-foreground mt-2">
                  {user?.firstName || prProfile?.firstName}
                </p>
              )}
            </SidebarFooter>
          </Sidebar>
        )}

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center gap-3 px-4 h-14">
              {!hideNav && <SidebarTrigger data-testid="button-sidebar-toggle" />}
              {showBackButton && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack || (() => window.history.back())}
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              {title && (
                <h1 className="text-lg font-semibold">{title}</h1>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export function PrPageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 md:px-6 lg:px-8 py-4 md:py-6 max-w-7xl mx-auto", className)}>
      {children}
    </div>
  );
}
