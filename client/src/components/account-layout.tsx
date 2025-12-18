import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  User,
  Ticket,
  Wallet,
  RefreshCw,
  LogOut,
  Menu,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const navItems = [
  { href: "/account/profile", label: "Profilo", icon: User },
  { href: "/account/tickets", label: "I Miei Biglietti", icon: Ticket },
  { href: "/account/wallet", label: "Wallet", icon: Wallet },
  { href: "/account/resales", label: "Rivendita", icon: RefreshCw },
];

function SidebarContent({ customer, onLogout }: { customer: Customer | null; onLogout: () => void }) {
  const [location] = useLocation();

  return (
    <div className="flex flex-col h-full bg-[#0d1117] border-r border-white/10">
      <div className="p-6 border-b border-white/10">
        <Link href="/acquista">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <span className="text-xl font-bold text-white">Event4U</span>
          </div>
        </Link>
      </div>

      {customer && (
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 bg-yellow-500/20 border-2 border-yellow-500/30">
              <AvatarFallback className="bg-transparent text-yellow-400 font-semibold">
                {customer.firstName?.[0]}{customer.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white" data-testid="text-user-greeting">
                Ciao, {customer.firstName}!
              </p>
              <p className="text-sm text-slate-400">{customer.email}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                  isActive
                    ? "bg-yellow-500/20 text-yellow-400 border-l-4 border-yellow-400"
                    : "text-slate-300 hover:bg-white/5"
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

      <div className="p-4 border-t border-white/10">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerData");
    navigate("/acquista");
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#0a0e17]">
        <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-[#0d1117] border-b border-white/10">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white" data-testid="button-mobile-menu">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-[#0d1117] border-white/10">
              <SidebarContent customer={customer || null} onLogout={handleLogout} />
            </SheetContent>
          </Sheet>
          <Link href="/acquista">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="text-lg font-bold text-white">Event4U</span>
            </div>
          </Link>
          <Link href="/acquista">
            <Button variant="ghost" size="icon" className="text-white" data-testid="button-back-events">
              <ChevronLeft className="w-6 h-6" />
            </Button>
          </Link>
        </header>
        <main className="p-4">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] flex">
      <aside className="fixed left-0 top-0 h-full w-72 z-40">
        <SidebarContent customer={customer || null} onLogout={handleLogout} />
      </aside>
      <main className="flex-1 ml-72 p-8">{children}</main>
    </div>
  );
}
