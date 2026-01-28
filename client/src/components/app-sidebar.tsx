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
  CheckCircle,
  Megaphone,
  Gift,
  Share2,
  PackageOpen,
  ArrowLeftRight,
  User,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useTranslation } from "react-i18next";
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
import { useToast } from "@/hooks/use-toast";
import type { UserFeatures } from "@shared/schema";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();

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
        title: t('nav.dashboard'),
        icon: BarChart3,
        url: "/super-admin",
        group: t('nav.groups.system'),
      },
      {
        title: t('nav.users'),
        icon: Users,
        url: "/admin/gestori",
        group: t('nav.groups.system'),
      },
      {
        title: t('nav.settings'),
        icon: Settings,
        url: "/admin/site-settings",
        group: t('nav.groups.system'),
      },
      {
        title: t('nav.eventApprovals'),
        icon: CheckCircle,
        url: "/siae-approvals",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeTables'),
        icon: Table2,
        url: "/siae/tables",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeCardReader'),
        icon: CreditCard,
        url: "/siae/activation-cards",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeConfig'),
        icon: Settings,
        url: "/siae/system-config",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.customers'),
        icon: Users,
        url: "/siae/customers",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeConsole'),
        icon: Ticket,
        url: "/siae/ticketing-console",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.transactions'),
        icon: Receipt,
        url: "/siae/transactions",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeNameChanges'),
        icon: UserCog,
        url: "/siae/name-changes",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeResales'),
        icon: RefreshCcw,
        url: "/siae/resales",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeBoxOffice'),
        icon: Store,
        url: "/siae/box-office",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeSubscriptions'),
        icon: CreditCard,
        url: "/siae/subscriptions",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeTransmissions'),
        icon: Send,
        url: "/siae/transmissions",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeAuditLogs'),
        icon: ClipboardList,
        url: "/siae/audit-logs",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.siaeSeats'),
        icon: Grid3X3,
        url: "/siae/numbered-seats",
        group: t('nav.groups.siae'),
      },
      {
        title: t('nav.printer'),
        icon: Printer,
        url: "/printer-settings",
        group: t('nav.groups.system'),
      },
      {
        title: t('nav.digitalTemplates'),
        icon: QrCode,
        url: "/digital-template-builder",
        group: t('nav.groups.system'),
      },
      {
        title: t('nav.stripePayments'),
        icon: CreditCard,
        url: "/stripe-admin",
        group: t('nav.groups.system'),
      },
      {
        title: t('nav.subscriptionPlans'),
        icon: Receipt,
        url: "/admin/billing/plans",
        group: t('nav.groups.billing'),
      },
      {
        title: t('nav.organizers'),
        icon: Building2,
        url: "/admin/billing/organizers",
        group: t('nav.groups.billing'),
      },
      {
        title: t('nav.invoices'),
        icon: FileText,
        url: "/admin/billing/invoices",
        group: t('nav.groups.billing'),
      },
      {
        title: t('nav.salesReports'),
        icon: BarChart3,
        url: "/admin/billing/reports",
        group: t('nav.groups.billing'),
      }
    );
  }

  if (isAdmin) {
    menuItems.push(
      {
        title: t('nav.home'),
        icon: Home,
        url: "/",
        group: t('nav.groups.board'),
      }
    );

    // Add Eventi (always visible for admins)
    menuItems.push({
      title: t('nav.events'),
      icon: Calendar,
      url: "/events",
      group: t('nav.groups.modules'),
    });

    // Add Format Eventi
    menuItems.push({
      title: t('nav.eventFormats'),
      icon: ListChecks,
      url: "/event-formats",
      group: t('nav.groups.management'),
    });

    // Only show modules that are enabled for this user
    if (userFeatures?.beverageEnabled !== false) {
      menuItems.push({
        title: t('nav.inventory'),
        icon: Wine,
        url: "/beverage",
        group: t('nav.groups.modules'),
        accent: true,
      });
    }

    if (userFeatures?.contabilitaEnabled === true) {
      menuItems.push({
        title: t('nav.accounting'),
        icon: Calculator,
        url: "/accounting",
        group: t('nav.groups.modules'),
      });
    }

    if (userFeatures?.personaleEnabled === true) {
      menuItems.push({
        title: t('nav.staff'),
        icon: UserCheck,
        url: "/personnel",
        group: t('nav.groups.modules'),
      });
    }

    if (userFeatures?.cassaEnabled === true) {
      menuItems.push({
        title: t('nav.cashier'),
        icon: Receipt,
        url: "/cashier/dashboard",
        group: t('nav.groups.modules'),
      });
    }

    if (userFeatures?.nightFileEnabled === true) {
      menuItems.push({
        title: t('nav.nightFile'),
        icon: FileText,
        url: "/night-file",
        group: t('nav.groups.modules'),
      });
    }

    menuItems.push(
      {
        title: t('nav.companies'),
        icon: Building2,
        url: "/companies",
        group: t('nav.groups.management'),
      },
      {
        title: t('nav.locations'),
        icon: MapPin,
        url: "/locations",
        group: t('nav.groups.management'),
      },
      {
        title: t('nav.users'),
        icon: Users,
        url: "/users",
        group: t('nav.groups.management'),
      },
      {
        title: t('nav.printer'),
        icon: Printer,
        url: "/printer-settings",
        group: t('nav.groups.management'),
      }
    );

    // Marketing Module - only if enabled for gestore
    if (userFeatures?.marketingEnabled === true) {
      menuItems.push(
        {
          title: t('nav.marketingDashboard'),
          icon: Megaphone,
          url: "/marketing/dashboard",
          group: t('nav.groups.marketing'),
        },
        {
          title: t('nav.loyaltyProgram'),
          icon: Gift,
          url: "/loyalty/admin",
          group: t('nav.groups.marketing'),
        },
        {
          title: t('nav.referralProgram'),
          icon: Share2,
          url: "/referral/admin",
          group: t('nav.groups.marketing'),
        },
        {
          title: t('nav.productBundles'),
          icon: PackageOpen,
          url: "/bundles/admin",
          group: t('nav.groups.marketing'),
        }
      );
    }

    // Cassa Biglietti Module
    if (userFeatures?.cassaBigliettiEnabled === true) {
      menuItems.push({
        title: t('nav.ticketCashier'),
        icon: Store,
        url: "/cassa-biglietti",
        group: t('nav.groups.management'),
      });
    }

    // Scanner Module
    if (userFeatures?.scannerEnabled === true) {
      menuItems.push(
        {
          title: t('nav.scannerManagement'),
          icon: ScanLine,
          url: "/scanner-management",
          group: t('nav.groups.management'),
        },
        {
          title: t('nav.qrScanner'),
          icon: QrCode,
          url: "/scanner",
          group: t('nav.groups.management'),
        }
      );
    }

    // PR Module
    if (userFeatures?.prEnabled === true) {
      menuItems.push({
        title: t('nav.prManagement'),
        icon: UserPlus,
        url: "/pr-management",
        group: t('nav.groups.management'),
      });
    }

    // Badge Scuola Module
    if (userFeatures?.badgesEnabled === true) {
      menuItems.push({
        title: t('nav.schoolBadges'),
        icon: GraduationCap,
        url: "/school-badges",
        group: t('nav.groups.management'),
      });
    }

    // Template Digitali Module
    if (userFeatures?.templateEnabled === true) {
      menuItems.push({
        title: t('nav.digitalTemplates'),
        icon: QrCode,
        url: "/digital-template-builder",
        group: t('nav.groups.management'),
      });
    }

    // SIAE Ticketing Module for Gestore (only if enabled)
    if (userFeatures?.siaeEnabled === true) {
      menuItems.push(
          {
            title: t('nav.cashierManagement'),
            icon: UserPlus,
            url: "/cashier/management",
            group: t('nav.groups.management'),
          },
          {
            title: t('nav.siaeCustomers'),
            icon: Users,
            url: "/siae/customers",
            group: t('nav.groups.management'),
          }
      );
    }

  }

  // Gestore Covisione menu - accesso completo alla gestione PR
  if (isGestoreCovisione) {
    menuItems.push(
      {
        title: t('nav.dashboard'),
        icon: Home,
        url: "/",
        group: t('nav.groups.board'),
      },
      {
        title: t('nav.myEvents'),
        icon: Calendar,
        url: "/pr/my-events",
        group: t('nav.groups.management'),
      },
      {
        title: t('nav.lists'),
        icon: ListChecks,
        url: "/pr/guest-lists",
        group: t('nav.groups.prManagement'),
      },
      {
        title: t('nav.eventTables'),
        icon: Armchair,
        url: "/pr/tables",
        group: t('nav.groups.prManagement'),
      },
      {
        title: t('nav.prTeam'),
        icon: Users,
        url: "/pr/staff",
        group: t('nav.groups.prManagement'),
      },
      {
        title: t('nav.settings'),
        icon: Settings,
        url: "/settings",
        group: t('nav.groups.system'),
      }
    );
  }

  // Capo Staff menu - now uses PrLayout (legacy fallback)
  if (isCapoStaff) {
    menuItems.push(
      {
        title: t('nav.dashboard'),
        icon: Home,
        url: "/pr/dashboard",
        group: t('nav.groups.board'),
      },
      {
        title: t('nav.myEvents'),
        icon: Calendar,
        url: "/pr/events",
        group: t('nav.groups.management'),
      },
      {
        title: t('nav.lists'),
        icon: ListChecks,
        url: "/pr/lists",
        group: t('nav.groups.prManagement'),
      },
      {
        title: t('nav.wallet'),
        icon: Wallet,
        url: "/pr/wallet",
        group: t('nav.groups.earnings'),
      },
      {
        title: t('nav.profile'),
        icon: User,
        url: "/pr/profile",
        group: t('nav.groups.system'),
      }
    );
  }

  // PR menu - now uses PrLayout (legacy fallback)
  if (isPr) {
    menuItems.push(
      {
        title: t('nav.dashboard'),
        icon: Home,
        url: "/pr/dashboard",
        group: t('nav.groups.board'),
      },
      {
        title: t('nav.myEvents'),
        icon: Calendar,
        url: "/pr/events",
        group: t('nav.groups.management'),
      },
      {
        title: t('nav.lists'),
        icon: ListChecks,
        url: "/pr/lists",
        group: t('nav.groups.prManagement'),
      },
      {
        title: t('nav.wallet'),
        icon: Wallet,
        url: "/pr/wallet",
        group: t('nav.groups.earnings'),
      },
      {
        title: t('nav.profile'),
        icon: User,
        url: "/pr/profile",
        group: t('nav.groups.system'),
      }
    );
  }

  if (isWarehouse) {
    menuItems.push(
      {
        title: t('nav.home'),
        icon: Home,
        url: "/",
        group: t('nav.groups.general'),
      },
      {
        title: t('nav.events'),
        icon: Calendar,
        url: "/events",
        group: t('nav.groups.general'),
      },
      {
        title: t('nav.products'),
        icon: Package,
        url: "/products",
        group: t('nav.groups.inventory'),
      },
      {
        title: t('nav.suppliers'),
        icon: Truck,
        url: "/suppliers",
        group: t('nav.groups.inventory'),
      },
      {
        title: t('nav.warehouse'),
        icon: Warehouse,
        url: "/warehouse",
        group: t('nav.groups.inventory'),
      }
    );
  }

  if (isBartender) {
    menuItems.push(
      {
        title: t('nav.myEvents'),
        icon: Calendar,
        url: "/",
        group: t('nav.groups.operations'),
      }
    );
  }

  if (isCassiere) {
    menuItems.push(
      {
        title: t('nav.myEvents'),
        icon: Calendar,
        url: "/cashier/dashboard",
        group: t('nav.groups.board'),
      },
      {
        title: t('nav.issueTickets'),
        icon: Ticket,
        url: "/cassa-biglietti",
        group: t('nav.groups.operations'),
      }
    );
  }

  if (isCliente) {
    menuItems.push(
      {
        title: t('nav.home'),
        icon: Home,
        url: "/",
        group: t('nav.groups.board'),
      },
      {
        title: t('nav.myWallet'),
        icon: Wallet,
        url: "/wallet",
        group: t('nav.groups.myQr'),
      }
    );
  }

  if (isWarehouse || isBartender) {
    menuItems.push(
      {
        title: t('nav.recordConsumption'),
        icon: ShoppingCart,
        url: "/consumption",
        group: t('nav.groups.operations'),
      }
    );
  }

  if (isAdmin) {
    menuItems.push(
      {
        title: t('nav.reports'),
        icon: Receipt,
        url: "/organizer/billing",
        group: t('nav.groups.account'),
      },
      {
        title: t('nav.settings'),
        icon: Settings,
        url: "/settings",
        group: t('nav.groups.system'),
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

        {/* Role Switch Button - PR users can always switch to customer mode */}
        {isPr && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2 text-muted-foreground hover:text-foreground"
            onClick={async () => {
              try {
                const res = await fetch('/api/switch-role/customer', {
                  method: 'POST',
                  credentials: 'include',
                });
                const data = await res.json();
                if (data.success && data.redirectTo) {
                  queryClient.clear();
                  window.location.href = data.redirectTo;
                } else if (data.error) {
                  toast({
                    title: "Errore cambio modalità",
                    description: data.error,
                    variant: "destructive",
                  });
                }
              } catch (error) {
                console.error("Error switching to customer mode:", error);
                toast({
                  title: "Errore",
                  description: "Impossibile passare alla modalità cliente",
                  variant: "destructive",
                });
              }
            }}
            data-testid="button-switch-to-customer"
          >
            <ArrowLeftRight className="h-4 w-4 mr-3" />
            Passa a Modalità Cliente
          </Button>
        )}

        {/* Switch back to PR mode - for users in customer mode (PR who switched) */}
        {isCliente && (user as any).canSwitchToPr && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start mb-2 text-muted-foreground hover:text-foreground"
            onClick={async () => {
              try {
                const res = await fetch('/api/switch-role/pr', {
                  method: 'POST',
                  credentials: 'include',
                });
                const data = await res.json();
                if (data.success && data.redirectTo) {
                  queryClient.clear();
                  window.location.href = data.redirectTo;
                }
              } catch (error) {
                console.error("Error switching to PR mode:", error);
              }
            }}
            data-testid="button-switch-to-pr"
          >
            <ArrowLeftRight className="h-4 w-4 mr-3" />
            Torna a Modalità PR
          </Button>
        )}

        {/* Logout Button */}
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/10"
          onClick={() => {
            queryClient.clear();
            window.location.href = '/api/logout';
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
