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
  DollarSign,
  Upload,
  FileText,
  PackageOpen,
  Home,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isSuperAdmin = user.role === 'super_admin';
  const isAdmin = user.role === 'gestore';
  const isWarehouse = user.role === 'warehouse';
  const isBartender = user.role === 'bartender';

  const menuItems = [];

  if (isSuperAdmin) {
    menuItems.push(
      {
        title: "Analytics",
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
      }
    );
  }

  if (isAdmin) {
    menuItems.push(
      {
        title: "Dashboard",
        icon: BarChart3,
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
        title: "Location",
        icon: MapPin,
        url: "/locations",
        group: "Generale",
      },
      {
        title: "Postazioni",
        icon: MapPin,
        url: "/stations",
        group: "Generale",
      },
      {
        title: "Report",
        icon: FileText,
        url: "/reports",
        group: "Generale",
      },
      {
        title: "Utenti",
        icon: Users,
        url: "/users",
        group: "Generale",
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
      }
    );
  }

  if (isAdmin || isWarehouse) {
    menuItems.push(
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
        title: "Ordini",
        icon: ShoppingCart,
        url: "/purchase-orders",
        group: "Inventario",
      },
      {
        title: "Magazzino",
        icon: Warehouse,
        url: "/warehouse",
        group: "Inventario",
      },
      {
        title: "Import CSV",
        icon: Upload,
        url: "/import",
        group: "Inventario",
      },
      {
        title: "Rientro Magazzino",
        icon: PackageOpen,
        url: "/return-to-warehouse",
        group: "Inventario",
      }
    );
  }

  if (isAdmin) {
    menuItems.push(
      {
        title: "Listini Prezzi",
        icon: DollarSign,
        url: "/price-lists",
        group: "Inventario",
      },
      {
        title: "Analisi AI",
        icon: Sparkles,
        url: "/ai-analysis",
        group: "Analytics",
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
        title: "Impostazioni",
        icon: Settings,
        url: "/settings",
        group: "Configurazione",
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
  };

  return (
    <Sidebar>
      <SidebarContent className="p-4">
        <div className="mb-6 px-2">
          <h2 className="text-xl font-semibold tracking-tight">Event Four You</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gestione Eventi
          </p>
        </div>

        {Object.entries(groupedItems).map(([group, items]) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      data-active={location === item.url}
                      data-testid={`link-${item.url.slice(1) || 'home'}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.profileImageUrl || undefined} style={{ objectFit: 'cover' }} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{displayName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {roleLabels[user.role] || user.role}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={async () => {
            try {
              await fetch('/api/logout');
              window.location.href = '/login';
            } catch (error) {
              console.error("Logout error:", error);
              window.location.href = '/login';
            }
          }}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Esci
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
