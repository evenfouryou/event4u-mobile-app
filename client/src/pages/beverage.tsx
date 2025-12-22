import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
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
  ChevronRight,
  RotateCcw,
  GlassWater,
  Coffee,
  Beer,
  Martini,
  CupSoda,
  Grape,
  Milk,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { HapticButton, MobileAppLayout, MobileHeader, triggerHaptic } from "@/components/mobile-primitives";
import type { Event, Product, Station } from "@shared/schema";

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const CATEGORIES = [
  { id: "all", label: "Tutti", icon: Package },
  { id: "spirits", label: "Spirits", icon: Wine },
  { id: "beer", label: "Birre", icon: Beer },
  { id: "wine", label: "Vini", icon: Grape },
  { id: "cocktails", label: "Cocktail", icon: Martini },
  { id: "soft", label: "Soft Drink", icon: CupSoda },
  { id: "coffee", label: "Caffè", icon: Coffee },
  { id: "other", label: "Altro", icon: Milk },
];

function CategoryPills({ 
  selected, 
  onSelect 
}: { 
  selected: string; 
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-4 -mx-4 scrollbar-hide">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => {
              triggerHaptic('light');
              onSelect(cat.id);
            }}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap min-h-[44px]
              transition-colors flex-shrink-0
              ${isActive 
                ? "bg-primary text-primary-foreground font-semibold" 
                : "bg-card border border-border text-muted-foreground"
              }
            `}
            data-testid={`filter-${cat.id}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm">{cat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function ProductCard({
  product,
  stock,
  delay = 0,
}: {
  product: Product;
  stock?: number;
  delay?: number;
}) {
  const stockLevel = stock ?? 0;
  const stockPercent = Math.min((stockLevel / 100) * 100, 100);
  const stockColor = stockLevel < 10 
    ? "bg-red-500" 
    : stockLevel < 30 
      ? "bg-amber-500" 
      : "bg-teal";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      className="glass-card overflow-hidden"
      data-testid={`product-card-${product.id}`}
    >
      <div className="aspect-square bg-gradient-to-br from-card to-muted/30 flex items-center justify-center relative">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Wine className="h-10 w-10 text-primary/50" />
        </div>
        {stockLevel < 10 && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-red-500/90 text-white border-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Low
            </Badge>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
          {product.category || "Beverage"}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Stock</span>
            <span className="font-medium">{stockLevel} unità</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stockPercent}%` }}
              transition={{ ...springTransition, delay: delay + 0.2 }}
              className={`h-full ${stockColor} rounded-full`}
            />
          </div>
        </div>
      </div>
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
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
        style={{ transitionDelay: `${delay}s` }}
        className="glass-card p-4 flex items-center gap-3 min-h-[64px] active:bg-card/80"
        data-testid={`action-${title.toLowerCase().replace(/\s/g, '-')}`}
      >
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="font-medium flex-1">{title}</span>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </motion.div>
    </Link>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      className="glass-card p-4"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-2xl font-bold" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{title}</p>
    </motion.div>
  );
}

export default function Beverage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isBartender = user?.role === 'bartender';
  const isWarehouse = user?.role === 'warehouse';
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
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

  const stockMap = useMemo(() => {
    const map: Record<string, number> = {};
    generalStocks?.forEach(s => {
      map[s.productId] = Number(s.quantity);
    });
    return map;
  }, [generalStocks]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (selectedCategory === "all") return products;
    return products.filter(p => 
      p.category?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [products, selectedCategory]);

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

  if (isBartender) {
    if (selectedEventId && selectedEvent) {
      return (
        <MobileAppLayout
          header={
            <MobileHeader
              title={selectedEvent.name}
              subtitle="Seleziona postazione"
              leftAction={
                <HapticButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEventId(null)}
                  data-testid="button-back-events"
                >
                  <ArrowLeft className="h-5 w-5" />
                </HapticButton>
              }
            />
          }
          contentClassName="pb-24"
        >
          <div className="p-4 space-y-4">
            <AnimatePresence mode="popLayout">
              {stationsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 rounded-2xl" />
                  <Skeleton className="h-40 rounded-2xl" />
                </div>
              ) : myStations.length > 0 ? (
                myStations.map((station, index) => (
                  <motion.div
                    key={station.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springTransition, delay: index * 0.1 }}
                    className="glass-card p-5"
                    data-testid={`station-card-${station.id}`}
                  >
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                        <MapPin className="h-7 w-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{station.name}</h3>
                        <p className="text-sm text-muted-foreground">Postazione assegnata</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <HapticButton
                        variant="outline"
                        className="h-auto py-4 flex flex-col items-center gap-2 min-h-[72px]"
                        onClick={() => setLocation(`/consumption-tracking?eventId=${selectedEventId}&stationId=${station.id}`)}
                        data-testid={`button-consumption-${station.id}`}
                      >
                        <Wine className="h-6 w-6 text-teal" />
                        <span className="text-sm font-medium">Tracking Consumi</span>
                      </HapticButton>
                      <Link href={`/bartender/events/${selectedEventId}/direct-stock?stationId=${station.id}`}>
                        <HapticButton
                          variant="outline"
                          className="h-auto py-4 w-full flex flex-col items-center gap-2 min-h-[72px]"
                          data-testid={`button-direct-stock-${station.id}`}
                        >
                          <GlassWater className="h-6 w-6 text-amber-500" />
                          <span className="text-sm font-medium">Consumi Diretti</span>
                        </HapticButton>
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card p-8 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mb-2">Non sei assegnato a nessuna postazione</p>
                  <p className="text-sm text-muted-foreground">Contatta il gestore per essere assegnato</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </MobileAppLayout>
      );
    }

    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Beverage"
            subtitle={`Ciao, ${user?.firstName || 'Barista'}`}
          />
        }
        contentClassName="pb-24"
      >
        <div className="p-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTransition}
            className="flex items-center gap-3 mb-6"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Wine className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Seleziona evento</p>
              <p className="font-medium">{ongoingEvents.length} eventi attivi</p>
            </div>
          </motion.div>

          {eventsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
          ) : ongoingEvents.length > 0 ? (
            <div className="space-y-3">
              {ongoingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ ...springTransition, delay: index * 0.1 }}
                  onClick={() => {
                    triggerHaptic('medium');
                    setSelectedEventId(event.id);
                  }}
                  className="glass-card p-5 active:bg-card/80"
                  data-testid={`event-card-${event.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-amber-600 flex items-center justify-center glow-golden">
                      <Wine className="h-8 w-8 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                        <span className="text-xs text-teal font-medium">In Corso</span>
                      </div>
                      <h3 className="text-lg font-semibold">{event.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </p>
                    </div>
                    <ChevronRight className="h-6 w-6 text-muted-foreground" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Nessun evento attivo</p>
            </motion.div>
          )}
        </div>
      </MobileAppLayout>
    );
  }

  if (isWarehouse) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Beverage"
            subtitle={`Ciao, ${user?.firstName || 'Magazziniere'}`}
            showBackButton showMenuButton
          />
        }
        contentClassName="pb-24"
      >
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatsCard
              title="Prodotti"
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

          <div className="space-y-3">
            <QuickActionCard title="Magazzino" icon={Warehouse} href="/warehouse" gradient="from-blue-500 to-indigo-600" delay={0.3} />
            <QuickActionCard title="Prodotti" icon={Wine} href="/products" gradient="from-emerald-500 to-teal-600" delay={0.4} />
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Beverage"
          showBackButton showMenuButton
          rightAction={
            user && (user.role === 'admin' || user.role === 'super_admin') && (
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setResetWarehouseDialogOpen(true)}
                data-testid="button-reset-warehouse"
              >
                <RotateCcw className="h-5 w-5" />
              </HapticButton>
            )
          }
        />
      }
      contentClassName="pb-24"
    >
      <AlertDialog open={resetWarehouseDialogOpen} onOpenChange={setResetWarehouseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Magazzino</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione azzererà tutte le quantità del magazzino generale.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resetWarehouseMutation.mutate()}
              disabled={resetWarehouseMutation.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {resetWarehouseMutation.isPending ? "Azzeramento..." : "Azzera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="p-4 space-y-6">
        <div className="grid grid-cols-3 gap-2">
          {productsLoading ? (
            <>
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </>
          ) : (
            <>
              <StatsCard
                title="Prodotti"
                value={products?.length || 0}
                icon={Package}
                gradient="from-blue-500 to-indigo-600"
                testId="stat-products"
                delay={0.1}
              />
              <StatsCard
                title="Low Stock"
                value={lowStockProducts.length}
                icon={AlertTriangle}
                gradient="from-amber-500 to-orange-600"
                testId="stat-low-stock"
                delay={0.15}
              />
              <StatsCard
                title="Totale"
                value={generalStocks?.reduce((sum, s) => sum + Number(s.quantity), 0) || 0}
                icon={Warehouse}
                gradient="from-emerald-500 to-teal-600"
                testId="stat-total-stock"
                delay={0.2}
              />
            </>
          )}
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider px-1">
            Azioni Rapide
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickActionCard title="Magazzino" icon={Warehouse} href="/warehouse" gradient="from-blue-500 to-indigo-600" delay={0.25} />
            <QuickActionCard title="Prodotti" icon={Package} href="/products" gradient="from-emerald-500 to-teal-600" delay={0.3} />
            <QuickActionCard title="Postazioni" icon={MapPin} href="/stations" gradient="from-violet-500 to-purple-600" delay={0.35} />
            <QuickActionCard title="Fornitori" icon={Truck} href="/suppliers" gradient="from-rose-500 to-pink-600" delay={0.4} />
            <QuickActionCard title="Ordini" icon={ShoppingCart} href="/purchase-orders" gradient="from-cyan-500 to-blue-600" delay={0.45} />
            <QuickActionCard title="Listini" icon={Tag} href="/price-lists" gradient="from-amber-500 to-orange-600" delay={0.5} />
            <QuickActionCard title="Report" icon={BarChart3} href="/reports" gradient="from-indigo-500 to-violet-600" delay={0.55} />
            <QuickActionCard title="AI" icon={Sparkles} href="/ai-analysis" gradient="from-primary to-amber-600" delay={0.6} />
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider px-1">
            Catalogo Prodotti
          </h2>
          <CategoryPills selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                stock={stockMap[product.id]}
                delay={0.1 + index * 0.05}
              />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Nessun prodotto trovato</p>
          </motion.div>
        )}

        {lowStockProducts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.3 }}
            className="glass-card overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">Scorte Basse</h2>
                <p className="text-xs text-muted-foreground">{lowStockProducts.length} prodotti</p>
              </div>
              <Link href="/warehouse">
                <HapticButton variant="ghost" size="sm">
                  Vedi
                  <ChevronRight className="h-4 w-4 ml-1" />
                </HapticButton>
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {lowStockProducts.slice(0, 3).map((stock, index) => (
                <motion.div
                  key={stock.productId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...springTransition, delay: 0.4 + index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"
                  data-testid={`low-stock-${stock.productId}`}
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-amber-500" />
                    <p className="font-medium text-sm">{stock.productName}</p>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {Number(stock.quantity).toFixed(0)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </MobileAppLayout>
  );
}
