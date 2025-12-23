import {
  Building2,
  MapPin,
  Calendar,
  Package,
  Truck,
  Warehouse,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ShoppingCart,
  Home,
  Sparkles,
  Wine,
  Calculator,
  UserCheck,
  Receipt,
  FileText,
  ChevronRight,
  CreditCard,
  Table2,
  Ticket,
  UserCog,
  RefreshCcw,
  Store,
  Send,
  ClipboardList,
  Grid3X3,
  ListChecks,
  QrCode,
  Armchair,
  UserPlus,
  ScanLine,
  GraduationCap,
  Printer,
  Wallet,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/utils";
import type { UserFeatures } from "@shared/schema";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'gestore';
  const isGestoreCovisione = user?.role === 'gestore_covisione';
  const isCapoStaff = user?.role === 'capo_staff';
  const isPr = user?.role === 'pr';
  const isWarehouse = user?.role === 'warehouse';
  const isBartender = user?.role === 'bartender';
  const isCliente = user?.role === 'cliente';
  const isCassiere = user?.role === 'cassiere';
  
  // Combined role checks for menu access
  const canManageLists = isSuperAdmin || isAdmin || isGestoreCovisione || isCapoStaff || isPr;
  const canManageStaff = isSuperAdmin || isAdmin || isGestoreCovisione || isCapoStaff;
  const canManageTables = isSuperAdmin || isAdmin || isGestoreCovisione;

  // Fetch user features for menu filtering
  const { data: userFeatures } = useQuery<UserFeatures>({
    queryKey: ['/api/user-features/current/my'],
    enabled: !!user && isAdmin,
  });

  if (!user) return null;

  const menuItems = [];

  if (isSuperAdmin) {
    menuItems.push(
      {
        title: "Dashboard",
        icon: BarChart3,
        url: "/super-admin",
        group: "Sistema",
      },
      {
        title: "Aziende",
        icon: Building2,
        url: "/companies",
        group: "Sistema",
      },
      {
        title: "Utenti",
        icon: Users,
        url: "/users",
        group: "Sistema",
      },
      {
        title: "Impostazioni Sito",
        icon: Settings,
        url: "/admin/site-settings",
        group: "Sistema",
      },
      {
        title: "Tabelle SIAE",
        icon: Table2,
        url: "/siae/tables",
        group: "Biglietteria SIAE",
      },
      {
        title: "Lettore Carte SIAE",
        icon: CreditCard,
        url: "/siae/activation-cards",
        group: "Biglietteria SIAE",
      },
      {
        title: "Configurazione",
        icon: Settings,
        url: "/siae/system-config",
        group: "Biglietteria SIAE",
      },
      {
        title: "Clienti",
        icon: Users,
        url: "/siae/customers",
        group: "Biglietteria SIAE",
      },
      {
        title: "Eventi Biglietteria",
        icon: Ticket,
        url: "/siae/ticketed-events",
        group: "Biglietteria SIAE",
      },
      {
        title: "Biglietti",
        icon: Ticket,
        url: "/siae/tickets",
        group: "Biglietteria SIAE",
      },
      {
        title: "Transazioni",
        icon: Receipt,
        url: "/siae/transactions",
        group: "Biglietteria SIAE",
      },
      {
        title: "Cambio Nominativo",
        icon: UserCog,
        url: "/siae/name-changes",
        group: "Biglietteria SIAE",
      },
      {
        title: "Rivendite",
        icon: RefreshCcw,
        url: "/siae/resales",
        group: "Biglietteria SIAE",
      },
      {
        title: "Box Office",
        icon: Store,
        url: "/siae/box-office",
        group: "Biglietteria SIAE",
      },
      {
        title: "Abbonamenti",
        icon: CreditCard,
        url: "/siae/subscriptions",
        group: "Biglietteria SIAE",
      },
      {
        title: "Trasmissioni XML",
        icon: Send,
        url: "/siae/transmissions",
        group: "Biglietteria SIAE",
      },
      {
        title: "Log Audit",
        icon: ClipboardList,
        url: "/siae/audit-logs",
        group: "Biglietteria SIAE",
      },
      {
        title: "Posti Numerati",
        icon: Grid3X3,
        url: "/siae/numbered-seats",
        group: "Biglietteria SIAE",
      },
      {
        title: "Stampante",
        icon: Printer,
        url: "/printer-settings",
        group: "Sistema",
      },
      {
        title: "Template Digitali",
        icon: QrCode,
        url: "/digital-template-builder",
        group: "Sistema",
      },
      {
        title: "Pagamenti Stripe",
        icon: CreditCard,
        url: "/stripe-admin",
        group: "Sistema",
      },
      {
        title: "Piani Abbonamento",
        icon: Receipt,
        url: "/admin/billing/plans",
        group: "Fatturazione",
      },
      {
        title: "Organizzatori",
        icon: Building2,
        url: "/admin/billing/organizers",
        group: "Fatturazione",
      },
      {
        title: "Fatture",
        icon: FileText,
        url: "/admin/billing/invoices",
        group: "Fatturazione",
      },
      {
        title: "Report Vendite",
        icon: BarChart3,
        url: "/admin/billing/reports",
        group: "Fatturazione",
      }
    );
  }

  if (isAdmin) {
    menuItems.push(
      {
        title: "Home",
        icon: Home,
        url: "/",
        group: "Bacheca",
      }
    );

    // Add Eventi (always visible for admins)
    menuItems.push({
      title: "Eventi",
      icon: Calendar,
      url: "/events",
      group: "Moduli",
    });

    // Add Formati Evento
    menuItems.push({
      title: "Formati Evento",
      icon: ListChecks,
      url: "/event-formats",
      group: "Gestione",
    });

    // Only show modules that are enabled for this user
    if (userFeatures?.beverageEnabled !== false) {
      menuItems.push({
        title: "Beverage",
        icon: Wine,
        url: "/beverage",
        group: "Moduli",
        accent: true,
      });
    }

    if (userFeatures?.contabilitaEnabled === true) {
      menuItems.push({
        title: "Contabilità",
        icon: Calculator,
        url: "/accounting",
        group: "Moduli",
      });
    }

    if (userFeatures?.personaleEnabled === true) {
      menuItems.push({
        title: "Personale",
        icon: UserCheck,
        url: "/personnel",
        group: "Moduli",
      });
    }

    if (userFeatures?.cassaEnabled === true) {
      menuItems.push({
        title: "Cassa",
        icon: Receipt,
        url: "/cashier/dashboard",
        group: "Moduli",
      });
    }

    if (userFeatures?.nightFileEnabled === true) {
      menuItems.push({
        title: "File Serata",
        icon: FileText,
        url: "/night-file",
        group: "Moduli",
      });
    }

    menuItems.push(
      {
        title: "Cassa Biglietti",
        icon: Store,
        url: "/cassa-biglietti",
        group: "Gestione",
      },
      {
        title: "Gestione Cassieri",
        icon: UserPlus,
        url: "/cashier/management",
        group: "Gestione",
      },
      {
        title: "Location",
        icon: MapPin,
        url: "/locations",
        group: "Gestione",
      },
      {
        title: "Utenti",
        icon: Users,
        url: "/users",
        group: "Gestione",
      },
      {
        title: "Gestione Scanner",
        icon: ScanLine,
        url: "/scanner-management",
        group: "Gestione",
      },
      {
        title: "Scanner QR",
        icon: QrCode,
        url: "/scanner",
        group: "Operazioni",
      },
      {
        title: "Badge Scuola",
        icon: GraduationCap,
        url: "/school-badges",
        group: "Gestione",
      },
      {
        title: "Stampante",
        icon: Printer,
        url: "/printer-settings",
        group: "Gestione",
      },
      {
        title: "Template Digitali",
        icon: QrCode,
        url: "/digital-template-builder",
        group: "Gestione",
      }
    );

    // SIAE Ticketing Module for Gestore (only if enabled)
    if (userFeatures?.siaeEnabled === true) {
      menuItems.push(
          {
            title: "Configurazione",
            icon: Settings,
            url: "/siae/system-config",
            group: "Biglietteria SIAE",
          },
          {
            title: "Clienti",
            icon: Users,
            url: "/siae/customers",
            group: "Biglietteria SIAE",
          },
          {
            title: "Eventi Biglietteria",
            icon: Ticket,
            url: "/siae/ticketed-events",
            group: "Biglietteria SIAE",
          },
          {
            title: "Biglietti",
            icon: Ticket,
            url: "/siae/tickets",
            group: "Biglietteria SIAE",
          },
          {
            title: "Transazioni",
            icon: Receipt,
            url: "/siae/transactions",
            group: "Biglietteria SIAE",
          },
          {
            title: "Cambio Nominativo",
            icon: UserCog,
            url: "/siae/name-changes",
            group: "Biglietteria SIAE",
          },
          {
            title: "Rivendita",
            icon: RefreshCcw,
            url: "/siae/resales",
            group: "Biglietteria SIAE",
          },
          {
            title: "Box Office",
            icon: Store,
            url: "/siae/box-office",
            group: "Biglietteria SIAE",
          },
          {
            title: "Abbonamenti",
            icon: CreditCard,
            url: "/siae/subscriptions",
            group: "Biglietteria SIAE",
          },
          {
            title: "Trasmissioni XML",
            icon: Send,
            url: "/siae/transmissions",
            group: "Biglietteria SIAE",
          },
          {
            title: "Log Audit",
            icon: ClipboardList,
            url: "/siae/audit-logs",
            group: "Biglietteria SIAE",
          },
          {
            title: "Posti Numerati",
            icon: Grid3X3,
            url: "/siae/numbered-seats",
            group: "Biglietteria SIAE",
          }
      );
    }

  }

  // Gestore Covisione menu - accesso completo alla gestione PR
  if (isGestoreCovisione) {
    menuItems.push(
      {
        title: "Dashboard",
        icon: Home,
        url: "/",
        group: "Bacheca",
      },
      {
        title: "I Miei Eventi",
        icon: Calendar,
        url: "/pr/my-events",
        group: "Gestione",
      },
      {
        title: "Liste Ospiti",
        icon: ListChecks,
        url: "/pr/guest-lists",
        group: "Gestione PR",
      },
      {
        title: "Tavoli Evento",
        icon: Armchair,
        url: "/pr/tables",
        group: "Gestione PR",
      },
      {
        title: "Team PR",
        icon: Users,
        url: "/pr/staff",
        group: "Gestione PR",
      },
      {
        title: "Impostazioni",
        icon: Settings,
        url: "/settings",
        group: "Sistema",
      }
    );
  }

  // Capo Staff menu - pannello dedicato (senza scanner - assegnato solo se necessario)
  if (isCapoStaff) {
    menuItems.push(
      {
        title: "Dashboard",
        icon: Home,
        url: "/staff-pr-home",
        group: "Bacheca",
      },
      {
        title: "I Miei Eventi",
        icon: Calendar,
        url: "/staff-pr-home",
        group: "Gestione",
      },
      {
        title: "Liste Ospiti",
        icon: ListChecks,
        url: "/pr/guest-lists",
        group: "Gestione PR",
      },
      {
        title: "Tavoli Evento",
        icon: Armchair,
        url: "/pr/tables",
        group: "Gestione PR",
      },
      {
        title: "Team PR",
        icon: Users,
        url: "/pr/staff",
        group: "Gestione PR",
      },
      {
        title: "Impostazioni",
        icon: Settings,
        url: "/settings",
        group: "Sistema",
      }
    );
  }

  // PR menu - pannello dedicato
  if (isPr) {
    menuItems.push(
      {
        title: "Dashboard",
        icon: Home,
        url: "/staff-pr-home",
        group: "Bacheca",
      },
      {
        title: "I Miei Eventi",
        icon: Calendar,
        url: "/staff-pr-home",
        group: "Gestione",
      },
      {
        title: "Liste Ospiti",
        icon: ListChecks,
        url: "/pr/guest-lists",
        group: "Gestione PR",
      },
      {
        title: "Tavoli Evento",
        icon: Armchair,
        url: "/pr/tables",
        group: "Gestione PR",
      },
      {
        title: "Impostazioni",
        icon: Settings,
        url: "/settings",
        group: "Sistema",
      }
    );
  }

  if (isWarehouse) {
    menuItems.push(
      {
        title: "Home",
        icon: Home,
        url: "/",
        group: "Generale",
      },
      {
        title: "Eventi",
        icon: Calendar,
        url: "/events",
        group: "Generale",
      },
      {
        title: "Prodotti",
        icon: Package,
        url: "/products",
        group: "Inventario",
      },
      {
        title: "Fornitori",
        icon: Truck,
        url: "/suppliers",
        group: "Inventario",
      },
      {
        title: "Magazzino",
        icon: Warehouse,
        url: "/warehouse",
        group: "Inventario",
      }
    );
  }

  if (isBartender) {
    menuItems.push(
      {
        title: "I Miei Eventi",
        icon: Calendar,
        url: "/",
        group: "Operazioni",
      }
    );
  }

  if (isCassiere) {
    menuItems.push(
      {
        title: "I Miei Eventi",
        icon: Calendar,
        url: "/cashier/dashboard",
        group: "Bacheca",
      },
      {
        title: "Emetti Biglietti",
        icon: Ticket,
        url: "/cassa-biglietti",
        group: "Operazioni",
      }
    );
  }

  if (isCliente) {
    menuItems.push(
      {
        title: "Home",
        icon: Home,
        url: "/",
        group: "Bacheca",
      },
      {
        title: "Il Mio Wallet",
        icon: Wallet,
        url: "/wallet",
        group: "I Miei QR",
      }
    );
  }

  if (isWarehouse || isBartender) {
    menuItems.push(
      {
        title: "Registra Consumi",
        icon: ShoppingCart,
        url: "/consumption",
        group: "Operazioni",
      }
    );
  }

  if (isAdmin) {
    menuItems.push(
      {
        title: "Fatturazione",
        icon: Receipt,
        url: "/organizer/billing",
        group: "Account",
      },
      {
        title: "Impostazioni",
        icon: Settings,
        url: "/settings",
        group: "Sistema",
      }
    );
  }

  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.group]) {
      acc[item.group] = [];
    }
    acc[item.group].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const initials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email?.[0]?.toUpperCase() || 'U';

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.email || 'Utente';

  const roleLabels: Record<string, string> = {
    super_admin: 'Super Admin',
    gestore: 'Gestore',
    warehouse: 'Magazziniere',
    bartender: 'Barista',
    cassiere: 'Cassiere',
    cliente: 'Cliente',
    pr: 'PR',
    capo_staff: 'Capo Staff',
    gestore_covisione: 'Gestore Covisione',
  };

  return (
    <Sidebar className="border-r border-white/5">
      <SidebarContent className="p-4 bg-sidebar">
        {/* Logo */}
        <div className="mb-8 px-2">
          <Link href="/" className="block">
            <BrandLogo variant="horizontal" className="h-10 w-auto" />
          </Link>
        </div>

        {/* Menu Groups */}
        {Object.entries(groupedItems).map(([group, items]) => (
          <SidebarGroup key={group} className="mb-2">
            <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-medium mb-2 px-2">
              {group}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item: any) => {
                  const isActive = location === item.url || 
                    (item.url !== "/" && location.startsWith(item.url));
                  
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        data-active={isActive}
                        data-testid={`link-${item.url.slice(1) || 'home'}`}
                        className={cn(
                          "transition-all duration-200 rounded-xl mb-1",
                          isActive && "bg-primary/10 border-l-2 border-primary"
                        )}
                      >
                        <Link href={item.url} className="flex items-center gap-3">
                          <item.icon className={cn(
                            "h-5 w-5 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "flex-1",
                            isActive && "text-foreground font-medium"
                          )}>
                            {item.title}
                          </span>
                          {isActive && (
                            <ChevronRight className="h-4 w-4 text-primary" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-white/5">
        {/* User Profile Card */}
        <div className="glass rounded-xl p-3 mb-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={user.profileImageUrl || undefined} style={{ objectFit: 'cover' }} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {roleLabels[user.role] || user.role}
              </p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/10"
          onClick={async () => {
            try {
              await fetch('/api/logout', { credentials: 'include' });
            } catch (error) {
              console.error("Logout error:", error);
            }
            queryClient.clear();
            window.location.href = '/login';
          }}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Esci
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
