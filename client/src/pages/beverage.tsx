import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import {
  Calendar,
  Package,
  AlertTriangle,
  TrendingUp,
  Warehouse,
  BarChart3,
  ArrowLeft,
  MapPin,
  Wine,
  Users,
  Sparkles,
  Truck,
  Tag,
  ShoppingCart,
  ArrowRight,
  ChevronRight,
  RotateCcw,
  GlassWater,
} from "lucide-react";
import { motion } from "framer-motion";
import type { Event, Product, Station } from "@shared/schema";

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: string;
  gradient: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </motion.div>
  );
}

function QuickActionCard({
  title,
  icon: Icon,
  href,
  gradient,
  delay = 0,
}: {
  title: string;
  icon: React.ElementType;
  href: string;
  gradient: string;
  delay?: number;
}) {
  return (
    <Link href={href}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, delay }}
        className="glass-card p-4 flex items-center gap-3 group hover:border-primary/30 transition-all cursor-pointer"
      >
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="font-medium flex-1">{title}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </motion.div>
    </Link>
  );
}

export default function Beverage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isBartender = user?.role === 'bartender';
  const isWarehouse = user?.role === 'warehouse';
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [resetWarehouseDialogOpen, setResetWarehouseDialogOpen] = useState(false);

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

  const { data: allStations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
    enabled: isBartender && !!selectedEventId,
  });

  const ongoingEvents = events?.filter(e => e.status === 'ongoing') || [];
  const lowStockProducts = generalStocks?.filter(s => Number(s.quantity) < 10) || [];

  const myStations = allStations?.filter(s => 
    s.bartenderIds?.includes(user?.id || '') && 
    (s.eventId === selectedEventId || !s.eventId)
  ) || [];

  const selectedEvent = events?.find(e => e.id === selectedEventId);

  const resetWarehouseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stock/reset-warehouse');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock'] });
      setResetWarehouseDialogOpen(false);
      toast({
        title: "Successo",
        description: "Quantità magazzino azzerate con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile azzerare il magazzino",
        variant: "destructive",
      });
    },
  });

  // Bartender View - Station Selection
  if (isBartender) {
    if (selectedEventId && selectedEvent) {
      return (
        <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
          >
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedEventId(null)}
              className="rounded-xl"
              data-testid="button-back-events"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">{selectedEvent.name}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Seleziona la tua postazione</p>
            </div>
          </motion.div>

          {stationsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : myStations.length > 0 ? (
            <div className="space-y-6">
              {myStations.map((station, index) => (
                <motion.div
                  key={station.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-card p-5"
                  data-testid={`station-card-${station.id}`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{station.name}</h3>
                      <p className="text-sm text-muted-foreground">Postazione assegnata</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center gap-1"
                      onClick={() => setLocation(`/consumption-tracking?eventId=${selectedEventId}&stationId=${station.id}`)}
                      data-testid={`button-consumption-${station.id}`}
                    >
                      <Wine className="h-5 w-5 text-teal" />
                      <span className="text-xs">Tracking Consumi</span>
                    </Button>
                    <Link href={`/bartender/events/${selectedEventId}/direct-stock?stationId=${station.id}`}>
                      <Button
                        variant="outline"
                        className="h-auto py-3 w-full flex flex-col items-center gap-1"
                        data-testid={`button-direct-stock-${station.id}`}
                      >
                        <GlassWater className="h-5 w-5 text-amber-500" />
                        <span className="text-xs">Consumi Diretti</span>
                      </Button>
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-12 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">Non sei assegnato a nessuna postazione</p>
              <p className="text-sm text-muted-foreground">Contatta il gestore per essere assegnato</p>
            </motion.div>
          )}
        </div>
      );
    }

    // Bartender Event Selection
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-6 md:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
              <Wine className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Ciao, {user?.firstName || 'Barista'}</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Seleziona un evento attivo</p>
            </div>
          </div>
        </motion.div>

        {eventsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        ) : ongoingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ongoingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => setSelectedEventId(event.id)}
                className="glass-card p-5 cursor-pointer hover:border-primary/30 transition-all group"
                data-testid={`event-card-${event.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform glow-golden">
                    <Wine className="h-7 w-7 text-black" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                      <span className="text-xs text-teal font-medium">In Corso</span>
                    </div>
                    <h3 className="text-lg font-semibold">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startDatetime).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nessun evento attivo al momento</p>
          </motion.div>
        )}
      </div>
    );
  }

  // Warehouse View
  if (isWarehouse) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
        >
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Ciao, {user?.firstName || 'Magazziniere'}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Gestisci il magazzino e le scorte</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <StatsCard
            title="Prodotti in Magazzino"
            value={products?.length || 0}
            icon={Package}
            gradient="from-blue-500 to-indigo-600"
            testId="stat-products"
            delay={0.1}
          />
          <StatsCard
            title="Scorte Basse"
            value={lowStockProducts.length}
            icon={AlertTriangle}
            gradient="from-amber-500 to-orange-600"
            testId="stat-low-stock"
            delay={0.2}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionCard title="Magazzino" icon={Warehouse} href="/warehouse" gradient="from-blue-500 to-indigo-600" delay={0.3} />
          <QuickActionCard title="Prodotti" icon={Wine} href="/products" gradient="from-emerald-500 to-teal-600" delay={0.4} />
        </div>
      </div>
    );
  }

  // Admin/Gestore View
  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
      >
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center glow-golden flex-shrink-0">
            <Wine className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Beverage</h1>
            <p className="text-muted-foreground text-xs sm:text-sm hidden sm:block">Gestione magazzino e consumi</p>
          </div>
        </div>
        {user && (user.role === 'admin' || user.role === 'super_admin') && (
          <Button 
            variant="outline"
            onClick={() => setResetWarehouseDialogOpen(true)}
            data-testid="button-reset-warehouse"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Magazzino
          </Button>
        )}
      </motion.div>

      <AlertDialog open={resetWarehouseDialogOpen} onOpenChange={setResetWarehouseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Magazzino</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione azzererà tutte le quantità del magazzino generale. I record non verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetWarehouseMutation.mutate()}
              disabled={resetWarehouseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {resetWarehouseMutation.isPending ? "Azzeramento..." : "Azzera Quantità"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
        {productsLoading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <StatsCard
              title="Prodotti Totali"
              value={products?.length || 0}
              icon={Package}
              gradient="from-blue-500 to-indigo-600"
              testId="stat-products"
              delay={0.1}
            />
            <StatsCard
              title="Scorte Basse"
              value={lowStockProducts.length}
              icon={AlertTriangle}
              gradient="from-amber-500 to-orange-600"
              testId="stat-low-stock"
              delay={0.2}
            />
            <StatsCard
              title="In Magazzino"
              value={generalStocks?.reduce((sum, s) => sum + Number(s.quantity), 0) || 0}
              icon={Warehouse}
              gradient="from-emerald-500 to-teal-600"
              testId="stat-total-stock"
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Azioni Rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickActionCard title="Magazzino" icon={Warehouse} href="/warehouse" gradient="from-blue-500 to-indigo-600" delay={0.3} />
          <QuickActionCard title="Prodotti" icon={Package} href="/products" gradient="from-emerald-500 to-teal-600" delay={0.35} />
          <QuickActionCard title="Postazioni" icon={MapPin} href="/stations" gradient="from-violet-500 to-purple-600" delay={0.4} />
          <QuickActionCard title="Fornitori" icon={Truck} href="/suppliers" gradient="from-rose-500 to-pink-600" delay={0.45} />
          <QuickActionCard title="Ordini" icon={ShoppingCart} href="/purchase-orders" gradient="from-cyan-500 to-blue-600" delay={0.5} />
          <QuickActionCard title="Listini" icon={Tag} href="/price-lists" gradient="from-amber-500 to-orange-600" delay={0.55} />
          <QuickActionCard title="Report" icon={BarChart3} href="/reports" gradient="from-indigo-500 to-violet-600" delay={0.6} />
          <QuickActionCard title="Analisi AI" icon={Sparkles} href="/ai-analysis" gradient="from-primary to-amber-600" delay={0.65} />
        </div>
      </motion.div>

      {/* Low Stock Alert */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card overflow-hidden"
      >
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
            <h2 className="font-semibold">Scorte Basse</h2>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/warehouse">
              Vedi tutto
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="p-4">
          {productsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((stock, index) => (
                <motion.div
                  key={stock.productId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  data-testid={`low-stock-${stock.productId}`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-amber-500" />
                    <p className="font-medium">{stock.productName}</p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {Number(stock.quantity).toFixed(0)} unità
                  </Badge>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-teal" />
              </div>
              <p className="text-muted-foreground">Tutte le scorte sono ok</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
