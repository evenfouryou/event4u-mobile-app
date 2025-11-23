import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Calendar,
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  BarChart3,
  Building2,
} from "lucide-react";
import type { Event, Product, Company } from "@shared/schema";

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  testId,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">{title}</p>
            <p className="text-3xl font-semibold" data-testid={testId}>
              {value}
            </p>
            {trend && (
              <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {trend}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'gestore';
  const isBartender = user?.role === 'bartender';

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
    enabled: !isSuperAdmin,
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !isSuperAdmin && !isBartender,
  });

  const { data: generalStocks } = useQuery<Array<{
    productId: string;
    quantity: string;
    productName: string;
  }>>({
    queryKey: ['/api/stock/general'],
    enabled: !isSuperAdmin && !isBartender,
  });

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  if (isSuperAdmin) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold mb-1">Benvenuto, {user?.firstName}</h1>
            <p className="text-muted-foreground">
              Panoramica sistema Event Four You
            </p>
          </div>
          <Button asChild data-testid="button-create-company">
            <Link href="/companies">
              <Plus className="h-4 w-4 mr-2" />
              Nuova Azienda
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {companiesLoading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatsCard
                title="Aziende Totali"
                value={companies?.length || 0}
                icon={Building2}
                testId="stat-companies-total"
              />
              <StatsCard
                title="Aziende Attive"
                value={companies?.filter(c => c.active).length || 0}
                icon={Building2}
                testId="stat-companies-active"
              />
            </>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Aziende Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {companiesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : companies && companies.length > 0 ? (
              <div className="space-y-2">
                {companies.slice(0, 5).map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 rounded-lg hover-elevate"
                    data-testid={`company-item-${company.id}`}
                  >
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-sm text-muted-foreground">{company.taxId || 'N/A'}</p>
                    </div>
                    <div className="text-sm">
                      {company.active ? (
                        <span className="text-green-600">Attiva</span>
                      ) : (
                        <span className="text-muted-foreground">Inattiva</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nessuna azienda presente</p>
                <Button asChild className="mt-4" data-testid="button-create-first-company">
                  <Link href="/companies">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Prima Azienda
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isBartender) {
    const todayEvents = events?.filter(e => {
      const today = new Date();
      const eventDate = new Date(e.startDatetime);
      return eventDate.toDateString() === today.toDateString();
    }) || [];

    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">I Miei Eventi</h1>
          <p className="text-muted-foreground">
            Benvenuto, {user?.firstName} - Eventi assegnati per oggi
          </p>
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        ) : todayEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {todayEvents.map((event) => (
              <Card key={event.id} className="hover-elevate" data-testid={`event-card-${event.id}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {event.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Orario</p>
                      <p className="font-medium">
                        {new Date(event.startDatetime).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Button asChild className="w-full" data-testid={`button-view-event-${event.id}`}>
                      <Link href={`/events/${event.id}/consume`}>
                        Registra Consumi
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nessun evento assegnato per oggi</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  const upcomingEvents = events?.filter(e => 
    new Date(e.startDatetime) > new Date() && e.status !== 'closed'
  ).slice(0, 5) || [];

  const lowStockProducts = products?.filter(p => {
    if (!p.minThreshold) return false;
    const stock = generalStocks?.find(s => s.productId === p.id);
    if (!stock) return false;
    return parseFloat(stock.quantity) < parseFloat(p.minThreshold);
  }) || [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">
            Benvenuto, {user?.firstName}
          </h1>
          <p className="text-muted-foreground">
            Panoramica eventi e inventario
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" data-testid="button-view-warehouse">
            <Link href="/warehouse">
              <Package className="h-4 w-4 mr-2" />
              Magazzino
            </Link>
          </Button>
          <Button asChild data-testid="button-create-event">
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Evento
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {eventsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatsCard
              title="Eventi Totali"
              value={events?.length || 0}
              icon={Calendar}
              testId="stat-events-total"
            />
            <StatsCard
              title="Eventi Prossimi"
              value={upcomingEvents.length}
              icon={Calendar}
              testId="stat-events-upcoming"
            />
          </>
        )}
        
        {productsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatsCard
              title="Prodotti Catalogati"
              value={products?.length || 0}
              icon={Package}
              testId="stat-products-total"
            />
            <StatsCard
              title="Alert Scorte"
              value={lowStockProducts.length}
              icon={AlertTriangle}
              testId="stat-low-stock"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Prossimi Eventi</CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-all-events">
              <Link href="/events">Vedi tutti</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 rounded-lg hover-elevate"
                    data-testid={`upcoming-event-${event.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDatetime).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/events/${event.id}`}>Dettagli</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Nessun evento in programma</p>
                <Button asChild size="sm" data-testid="button-create-first-event">
                  <Link href="/events/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Crea Primo Evento
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Alert Inventario</CardTitle>
            <Button asChild variant="ghost" size="sm" data-testid="button-view-warehouse-alerts">
              <Link href="/warehouse">Vedi magazzino</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : lowStockProducts.length > 0 ? (
              <div className="space-y-2">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-destructive/10"
                    data-testid={`low-stock-product-${product.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.category}</p>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nessun alert inventario</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
