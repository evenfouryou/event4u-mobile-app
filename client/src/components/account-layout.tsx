import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileBottomBar, MobileNavItem } from "@/components/mobile-primitives";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import {
  User,
  Ticket,
  Wallet,
  RefreshCw,
  LogOut,
  Home,
  ArrowRightLeft,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string | null;
  city: string | null;
  province: string | null;
  hasPrProfile?: boolean;
  prCode?: string | null;
}

// Italian provinces list
const italianProvinces = [
  "AG", "AL", "AN", "AO", "AP", "AQ", "AR", "AT", "AV", "BA", "BG", "BI", "BL", "BN", "BO", "BR", "BS", "BT", "BZ",
  "CA", "CB", "CE", "CH", "CL", "CN", "CO", "CR", "CS", "CT", "CZ", "EN", "FC", "FE", "FG", "FI", "FM", "FR", "GE",
  "GO", "GR", "IM", "IS", "KR", "LC", "LE", "LI", "LO", "LT", "LU", "MB", "MC", "ME", "MI", "MN", "MO", "MS", "MT",
  "NA", "NO", "NU", "OR", "PA", "PC", "PD", "PE", "PG", "PI", "PN", "PO", "PR", "PT", "PU", "PV", "PZ", "RA", "RC",
  "RE", "RG", "RI", "RM", "RN", "RO", "SA", "SI", "SO", "SP", "SR", "SS", "SU", "SV", "TA", "TE", "TN", "TO", "TP",
  "TR", "TS", "TV", "UD", "VA", "VB", "VC", "VE", "VI", "VR", "VT", "VV"
];

const navItems = [
  { href: "/account/home", label: "Home", icon: Home },
  { href: "/account/tickets", label: "Biglietti", icon: Ticket },
  { href: "/account/wallet", label: "Wallet", icon: Wallet },
  { href: "/account/resales", label: "Rivendita", icon: RefreshCw },
  { href: "/account/profile", label: "Profilo", icon: User },
];

function SidebarContent({ customer, onLogout, hasPrProfile, onSwitchToPr, hasOriginalPrSession, onSwitchBackToPr }: { 
  customer: Customer | null; 
  onLogout: () => void; 
  hasPrProfile: boolean; 
  onSwitchToPr: () => void;
  hasOriginalPrSession?: boolean;
  onSwitchBackToPr?: () => void;
}) {
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
        {/* Show "Torna alla modalità PR" for users who switched from PR to Customer */}
        {hasOriginalPrSession && onSwitchBackToPr && (
          <Button
            variant="outline"
            className="w-full justify-start gap-3 border-primary/50 text-primary hover:bg-primary/10"
            onClick={onSwitchBackToPr}
            data-testid="button-switch-back-to-pr"
          >
            <ArrowRightLeft className="w-5 h-5" />
            Torna alla Dashboard PR
          </Button>
        )}
        {/* Show "Passa a Dashboard PR" for customers with linked PR profiles */}
        {hasPrProfile && !hasOriginalPrSession && (
          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={onSwitchToPr}
            data-testid="button-switch-to-pr"
          >
            <ArrowRightLeft className="w-5 h-5" />
            Passa a Dashboard PR
          </Button>
        )}
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
  const { toast } = useToast();
  
  // State for profile completion dialog
  const [showProfileComplete, setShowProfileComplete] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");

  const { data: customer } = useQuery<Customer>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  // hasPrProfile is now included directly in the customer response
  const hasPrProfile = customer?.hasPrProfile ?? false;

  // Check if user has an original PR session (switched from PR to customer)
  const { data: sessionInfo } = useQuery<{ hasOriginalPrSession: boolean }>({
    queryKey: ["/api/session/pr-switch-status"],
    queryFn: async () => {
      const res = await fetch('/api/session/pr-switch-status', { credentials: 'include' });
      if (!res.ok) return { hasOriginalPrSession: false };
      return res.json();
    },
    retry: false,
  });
  const hasOriginalPrSession = sessionInfo?.hasOriginalPrSession ?? false;

  const handleSwitchToPr = async () => {
    try {
      const token = localStorage.getItem("customerToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/customer/switch-to-pr', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      const data = await res.json();
      if (data.success && data.redirectTo) {
        queryClient.clear();
        window.location.href = data.redirectTo;
      } else if (data.error) {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error switching to PR mode:", error);
      toast({
        title: "Errore",
        description: "Impossibile passare alla modalità PR",
        variant: "destructive",
      });
    }
  };

  const handleSwitchBackToPr = async () => {
    try {
      const token = localStorage.getItem("customerToken");
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch('/api/customer/switch-back-to-pr', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      const data = await res.json();
      if (data.success && data.redirectTo) {
        queryClient.clear();
        window.location.href = data.redirectTo;
      } else if (data.error) {
        toast({
          title: "Errore",
          description: data.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error switching back to PR mode:", error);
      toast({
        title: "Errore",
        description: "Impossibile tornare alla modalità PR",
        variant: "destructive",
      });
    }
  };

  // Check if profile needs completion
  useEffect(() => {
    if (customer) {
      const needsCompletion = !customer.birthDate || !customer.city || !customer.province;
      if (needsCompletion) {
        setShowProfileComplete(true);
        // Pre-fill existing values if any
        if (customer.birthDate) setBirthDate(customer.birthDate.split('T')[0]);
        if (customer.city) setCity(customer.city);
        if (customer.province) setProvince(customer.province);
      }
    }
  }, [customer]);

  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: { birthDate: string; city: string; province: string }) => {
      const res = await apiRequest("PATCH", "/api/public/customers/me", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/customers/me"] });
      setShowProfileComplete(false);
      toast({ title: "Profilo aggiornato", description: "I tuoi dati sono stati salvati" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message || "Impossibile aggiornare il profilo", variant: "destructive" });
    }
  });

  const handleProfileSubmit = () => {
    if (!birthDate || !city || !province) {
      toast({ title: "Campi obbligatori", description: "Compila tutti i campi per continuare", variant: "destructive" });
      return;
    }
    updateProfileMutation.mutate({ birthDate, city, province });
  };

  const handleLogout = () => {
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerData");
    queryClient.clear();
    window.location.href = "/api/logout";
  };

  // Profile completion dialog component
  const ProfileCompleteDialog = () => (
    <Dialog open={showProfileComplete} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Completa il tuo profilo</DialogTitle>
          <DialogDescription>
            Per continuare, inserisci i dati mancanti
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data di nascita *</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              data-testid="input-birth-date"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Città *</Label>
            <Input
              id="city"
              placeholder="Es. Milano"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              data-testid="input-city"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">Provincia *</Label>
            <Select value={province} onValueChange={setProvince}>
              <SelectTrigger data-testid="select-province">
                <SelectValue placeholder="Seleziona provincia" />
              </SelectTrigger>
              <SelectContent>
                {italianProvinces.map((prov) => (
                  <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button 
          onClick={handleProfileSubmit} 
          disabled={updateProfileMutation.isPending}
          className="w-full"
          data-testid="button-save-profile"
        >
          {updateProfileMutation.isPending ? "Salvataggio..." : "Salva e continua"}
        </Button>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <div 
        className="fixed inset-0 flex flex-col bg-background"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <ProfileCompleteDialog />
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
      <ProfileCompleteDialog />
      <aside className="fixed left-0 top-0 h-full w-72 z-40">
        <SidebarContent customer={customer || null} onLogout={handleLogout} hasPrProfile={hasPrProfile} onSwitchToPr={handleSwitchToPr} hasOriginalPrSession={hasOriginalPrSession} onSwitchBackToPr={handleSwitchBackToPr} />
      </aside>
      <main className="flex-1 ml-72 p-8">{children}</main>
    </div>
  );
}
