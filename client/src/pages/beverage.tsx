import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Package,
  AlertTriangle,
  TrendingUp,
  Plus,
  Warehouse,
  BarChart3,
  ArrowLeft,
  MapPin,
  Clock,
  Wine,
  Users,
  Sparkles,
} from "lucide-react";
import type { Event, Product, Station } from "@shared/schema";

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

export default function Beverage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isBartender = user?.role === 'bartender';
  const isWarehouse = user?.role === 'warehouse';
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: !isBartender,
  });

  const { data: generalStocks } = useQuery<Array<{
    productId: string;
    quantity: string;
    productName: string;
  }>>({
    queryKey: ['/api/stock/general'],
    enabled: !isBartender,
  });

  // Fetch all stations for bartender (both event-specific and general)
  const { data: allStations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
    enabled: isBartender && !!selectedEventId,
  });

  const ongoingEvents = events?.filter(e => e.status === 'ongoing') || [];
  const scheduledEvents = events?.filter(e => e.status === 'scheduled') || [];
  const lowStockProducts = generalStocks?.filter(s => Number(s.quantity) < 10) || [];

  // Filter stations where the bartender is assigned (both event-specific and general stations)
  const myStations = allStations?.filter(s => 
    s.bartenderIds?.includes(user?.id || '') && 
    (s.eventId === selectedEventId || !s.eventId) // Event stations or general stations
  ) || [];

  const selectedEvent = events?.find(e => e.id === selectedEventId);

  if (isBartender) {
    // Step 2: Show stations for selected event
    if (selectedEventId && selectedEvent) {
      return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedEventId(null)}
              data-testid="button-back-events"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold mb-1">{selectedEvent.name}</h1>
              <p className="text-muted-foreground">
                Seleziona la tua postazione
              </p>
            </div>
          </div>

          {stationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          ) : myStations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myStations.map((station) => (
                <Card 
                  key={station.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/consumption-tracking?eventId=${selectedEventId}&stationId=${station.id}`)}
                  data-testid={`station-card-${station.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-green-500/10 p-4">
                        <MapPin className="h-8 w-8 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">{station.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Postazione assegnata
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : allStations && allStations.length > 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-2">Non sei assegnato a nessuna postazione</p>
                <p className="text-sm text-muted-foreground">Contatta il gestore per essere assegnato</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nessuna postazione configurata per questo evento</p>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    // Step 1: Show events to select
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-1">Ciao, {user?.firstName || 'Barista'}</h1>
          <p className="text-muted-foreground">
            Seleziona un evento per registrare i consumi
          </p>
        </div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : ongoingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ongoingEvents.map((event) => (
              <Card 
                key={event.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedEventId(event.id)}
                data-testid={`event-card-${event.id}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="rounded-xl bg-primary/10 p-4">
                      <Wine className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{event.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDatetime).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nessun evento attivo al momento</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (isWarehouse) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold mb-1">Ciao, {user?.firstName || 'Magazziniere'}</h1>
            <p className="text-muted-foreground">
              Gestisci il magazzino e le scorte
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard
            title="Prodotti in Magazzino"
            value={products?.length || 0}
            icon={Package}
            testId="stat-products"
          />
          <StatsCard
            title="Scorte Basse"
            value={lowStockProducts.length}
            icon={AlertTriangle}
            testId="stat-low-stock"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/warehouse">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-blue-500 p-4">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Magazzino</h3>
                    <p className="text-muted-foreground text-sm">Gestisci le scorte</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/products">
            <Card className="hover-elevate cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-green-500 p-4">
                    <Wine className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Prodotti</h3>
                    <p className="text-muted-foreground text-sm">Catalogo prodotti</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-2">
            <Wine className="h-6 w-6 text-purple-500" />
            Beverage
          </h1>
          <p className="text-muted-foreground">
            Gestione magazzino, prodotti e consumi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {productsLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <StatsCard
              title="Prodotti"
              value={products?.length || 0}
              icon={Package}
              testId="stat-products"
            />
            <StatsCard
              title="Scorte Basse"
              value={lowStockProducts.length}
              icon={AlertTriangle}
              testId="stat-low-stock"
            />
            <StatsCard
              title="In Magazzino"
              value={generalStocks?.reduce((sum, s) => sum + Number(s.quantity), 0) || 0}
              icon={Warehouse}
              testId="stat-total-stock"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link href="/warehouse">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Warehouse className="h-5 w-5 text-primary" />
              <span className="font-medium">Magazzino</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/products">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-medium">Prodotti</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/stations">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <span className="font-medium">Postazioni</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/suppliers">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-medium">Fornitori</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/purchase-orders">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-medium">Ordini</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/price-lists">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <span className="font-medium">Listini</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/reports">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-medium">Report</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/ai-analysis">
          <Card className="hover-elevate cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium">Analisi AI</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Scorte Basse</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/warehouse">Magazzino</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : lowStockProducts.length > 0 ? (
              <div className="space-y-3">
                {lowStockProducts.slice(0, 5).map((stock) => (
                  <div
                    key={stock.productId}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20"
                    data-testid={`low-stock-${stock.productId}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-orange-100 dark:bg-orange-900/50 p-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      </div>
                      <p className="font-medium">{stock.productName}</p>
                    </div>
                    <Badge variant="outline" className="text-orange-600 border-orange-300">
                      {Number(stock.quantity).toFixed(0)} unità
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Tutte le scorte sono ok</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
