import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, AlertTriangle, Package, ArrowLeft, Upload, Download, Warehouse, History, Check, Send } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import type { Event, Station, Product, Stock, StockMovement } from "@shared/schema";

const springConfig = { stiffness: 400, damping: 30 };

type TabValue = 'carico' | 'scarico' | 'storico';

export default function ConsumptionTracking() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadQuantities, setLoadQuantities] = useState<Record<string, string>>({});
  const [remainingQuantities, setRemainingQuantities] = useState<Record<string, string>>({});
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('scarico');
  const { toast } = useToast();

  const urlParams = new URLSearchParams(window.location.search);
  const urlEventId = urlParams.get('eventId');
  const urlStationId = urlParams.get('stationId');

  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId || "");
  const [selectedStationId, setSelectedStationId] = useState<string>(urlStationId || "");

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: generalStocks } = useQuery<Stock[]>({
    queryKey: ['/api/stock/general'],
  });

  const { data: stockMovements } = useQuery<StockMovement[]>({
    queryKey: ['/api/stock/movements'],
  });

  const activeEvents = events?.filter(e => e.status === 'ongoing') || [];

  useEffect(() => {
    if (urlEventId) {
      setSelectedEventId(urlEventId);
    } else if (activeEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(activeEvents[0].id);
    }
  }, [activeEvents, selectedEventId, urlEventId]);

  useEffect(() => {
    if (urlStationId) {
      setSelectedStationId(urlStationId);
    }
  }, [urlStationId]);

  const selectedEvent = events?.find(e => e.id === selectedEventId);

  const { data: allStations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const stations = allStations?.filter(s => 
    s.eventId === selectedEventId || !s.eventId
  ) || [];

  const { data: eventStocks } = useQuery<Array<{
    id: string;
    productId: string;
    stationId: string | null;
    quantity: string;
  }>>({
    queryKey: ['/api/events', selectedEventId, 'stocks'],
    enabled: !!selectedEventId,
  });

  useEffect(() => {
    if (urlStationId) {
      setSelectedStationId(urlStationId);
    } else if (stations && stations.length > 0 && !selectedStationId) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId, urlStationId]);

  const selectedStation = stations?.find(s => s.id === selectedStationId);

  const getProductStock = (productId: string): number => {
    if (!selectedStationId) return 0;
    
    if (selectedStationId === 'general') {
      const stock = eventStocks?.find(s => 
        s.productId === productId && !s.stationId
      );
      if (!stock) return 0;
      const quantity = parseFloat(stock.quantity);
      return isNaN(quantity) ? 0 : quantity;
    }
    
    const stock = eventStocks?.find(s => 
      s.productId === productId && s.stationId === selectedStationId
    );
    if (!stock) return 0;
    const quantity = parseFloat(stock.quantity);
    return isNaN(quantity) ? 0 : quantity;
  };

  const getGeneralStock = (productId: string): number => {
    const stock = generalStocks?.find(s => s.productId === productId);
    if (!stock) return 0;
    const quantity = parseFloat(stock.quantity);
    return isNaN(quantity) ? 0 : quantity;
  };

  const eventConsumptions = stockMovements?.filter(m => 
    m.type === 'CONSUME' && 
    (m.fromEventId === selectedEventId || m.toEventId === selectedEventId) &&
    (!selectedStationId || m.fromStationId === selectedStationId)
  ).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) || [];

  const consumeMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string | null; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/consume', data);
    },
    onSuccess: (_, variables) => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/reports') });
      queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis' });
      setRemainingQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      toast({
        title: "Consumo registrato",
        description: "Stock aggiornato",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
        description: error.message || "Impossibile registrare il consumo",
        variant: "destructive",
      });
    },
  });

  const returnMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string | null; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/return-to-warehouse', data);
    },
    onSuccess: (_, variables) => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/reports') });
      queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis' });
      setRemainingQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      toast({
        title: "Reso al magazzino",
        description: "Prodotto restituito",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile restituire al magazzino",
        variant: "destructive",
      });
    },
  });

  const loadMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string | null; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/event-transfer', data);
    },
    onSuccess: (_, variables) => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/reports') });
      queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis' });
      setLoadQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      toast({
        title: "Prodotto caricato",
        description: "Trasferimento completato",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
        description: error.message || "Impossibile caricare il prodotto",
        variant: "destructive",
      });
    },
  });

  const handleCloseProduct = (productId: string) => {
    if (!selectedEventId || !selectedStationId) return;
    
    const stockValue = getProductStock(productId);
    const remaining = parseFloat(remainingQuantities[productId] || "0");
    
    if (remaining < 0 || remaining > stockValue) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Quantità rimasta non valida",
        variant: "destructive",
      });
      return;
    }
    
    const consumed = stockValue - remaining;
    const stationIdForApi = selectedStationId === 'general' ? null : selectedStationId;
    
    if (consumed > 0) {
      consumeMutation.mutate({
        eventId: selectedEventId,
        stationId: stationIdForApi,
        productId,
        quantity: consumed,
      });
    }
    
    if (remaining > 0) {
      returnMutation.mutate({
        eventId: selectedEventId,
        stationId: stationIdForApi,
        productId,
        quantity: remaining,
      });
    }
    
    if (consumed === 0 && remaining === 0) {
      toast({
        title: "Nessuna modifica",
        description: "La giacenza è già zero",
      });
    }
  };

  const handleConsumeAll = (productId: string) => {
    if (!selectedEventId) return;
    const stockValue = getProductStock(productId);
    
    if (stockValue <= 0) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Nessuna giacenza da scaricare",
        variant: "destructive",
      });
      return;
    }
    
    const stationIdForApi = selectedStationId === 'general' ? null : selectedStationId;
    consumeMutation.mutate({
      eventId: selectedEventId,
      stationId: stationIdForApi,
      productId,
      quantity: stockValue,
    });
  };

  const handleLoad = (productId: string) => {
    if (!selectedEventId || !selectedStationId) return;
    const qty = parseFloat(loadQuantities[productId] || "0");
    if (qty <= 0) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    
    const stationIdForApi = selectedStationId === 'general' ? null : selectedStationId;
    loadMutation.mutate({
      eventId: selectedEventId,
      stationId: stationIdForApi,
      productId,
      quantity: qty,
    });
  };

  const handleSubmitAllConsume = async () => {
    if (!selectedEventId || !selectedStationId) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Seleziona evento e postazione",
        variant: "destructive",
      });
      return;
    }

    const itemsToSubmit = productsWithStock
      .filter(product => {
        const remaining = remainingQuantities[product.id];
        return remaining !== undefined && remaining !== "";
      })
      .map(product => ({
        productId: product.id,
        remaining: parseFloat(remainingQuantities[product.id]),
        stockValue: getProductStock(product.id),
      }))
      .filter(item => !isNaN(item.remaining) && item.remaining >= 0 && item.remaining <= item.stockValue);
    
    if (itemsToSubmit.length === 0) {
      triggerHaptic('error');
      toast({
        title: "Nessun prodotto da inviare",
        description: "Compila la quantità rimasta per almeno un prodotto",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingAll(true);
    let successCount = 0;
    let errorCount = 0;
    const stationIdForApi = selectedStationId === 'general' ? null : selectedStationId;

    for (const item of itemsToSubmit) {
      const consumed = item.stockValue - item.remaining;
      
      try {
        if (consumed > 0) {
          await apiRequest('POST', '/api/stock/consume', {
            eventId: selectedEventId,
            stationId: stationIdForApi,
            productId: item.productId,
            quantity: consumed,
          });
        }
        
        if (item.remaining > 0) {
          await apiRequest('POST', '/api/stock/return-to-warehouse', {
            eventId: selectedEventId,
            stationId: stationIdForApi,
            productId: item.productId,
            quantity: item.remaining,
          });
        }
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
    queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
    queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/reports') });
    queryClient.invalidateQueries({ predicate: (query) => !!query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis' });
    
    setRemainingQuantities({});
    setIsSubmittingAll(false);
    
    if (successCount > 0) {
      triggerHaptic('success');
      toast({
        title: "Chiusura completata",
        description: `${successCount} prodotti aggiornati${errorCount > 0 ? `, ${errorCount} errori` : ''}`,
      });
    } else {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Nessun prodotto aggiornato",
        variant: "destructive",
      });
    }
  };

  const getFilledCount = () => {
    return productsWithStock.filter(product => {
      const remaining = remainingQuantities[product.id];
      return remaining !== undefined && remaining !== "";
    }).length;
  };

  const filteredProducts = products?.filter(p => 
    p.active && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const productsWithStock = filteredProducts.filter(p => getProductStock(p.id) > 0);
  const productsInGeneral = filteredProducts.filter(p => getGeneralStock(p.id) > 0);

  const handleTabChange = (tab: TabValue) => {
    triggerHaptic('light');
    setActiveTab(tab);
  };

  if (eventsLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Consumi"
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/beverage')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-4 pb-24">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </MobileAppLayout>
    );
  }

  if (!selectedEvent) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Consumi"
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/beverage')}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="flex flex-col items-center justify-center py-16 pb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springConfig}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground mb-2">Nessun evento in corso</p>
            <p className="text-muted-foreground">Non ci sono eventi attivi al momento</p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  const header = (
    <div className="bg-background border-b border-border">
      <MobileHeader
        title={selectedEvent?.name || "Consumi"}
        subtitle={selectedStationId === 'general' ? "Inventario Generale" : selectedStation?.name}
        leftAction={
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/beverage')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </HapticButton>
        }
      />

      {!urlEventId && !urlStationId && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Evento</Label>
            <Select value={selectedEventId} onValueChange={(v) => { triggerHaptic('light'); setSelectedEventId(v); }}>
              <SelectTrigger data-testid="select-event" className="h-12 rounded-xl">
                <SelectValue placeholder="Evento" />
              </SelectTrigger>
              <SelectContent>
                {activeEvents.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Postazione</Label>
            <Select 
              value={selectedStationId} 
              onValueChange={(v) => { triggerHaptic('light'); setSelectedStationId(v); }}
            >
              <SelectTrigger data-testid="select-station" className="h-12 rounded-xl">
                <SelectValue placeholder="Postazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">Inventario Generale</SelectItem>
                {stations && stations.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                      Postazioni
                    </div>
                    {stations.map(station => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl bg-muted/30 border-0"
            data-testid="input-search-product"
          />
        </div>
      </div>

      <div className="px-4 pb-3">
        <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
          {[
            { value: 'carico' as TabValue, icon: Upload, label: 'Carico' },
            { value: 'scarico' as TabValue, icon: Download, label: 'Scarico' },
            { value: 'storico' as TabValue, icon: History, label: 'Storico' },
          ].map(({ value, icon: Icon, label }) => (
            <button
              key={value}
              onClick={() => handleTabChange(value)}
              data-testid={`tab-${value}`}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all min-h-[44px] ${
                activeTab === value 
                  ? 'bg-background shadow-sm text-foreground font-medium' 
                  : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (!selectedStationId) {
    return (
      <MobileAppLayout header={header}>
        <div className="flex flex-col items-center justify-center py-16 pb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springConfig}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground mb-2">Seleziona una postazione</p>
            <p className="text-muted-foreground">Scegli evento e postazione sopra</p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout header={header} noPadding>
      <div className="px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'carico' && (
            <motion.div
              key="carico"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springConfig}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <Warehouse className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Carica dal Magazzino</h2>
                  <p className="text-muted-foreground text-sm">Trasferisci prodotti alla postazione</p>
                </div>
              </div>

              {filteredProducts.filter(p => getGeneralStock(p.id) > 0).length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun prodotto disponibile</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.filter(p => getGeneralStock(p.id) > 0).map((product, index) => {
                    const generalStock = getGeneralStock(product.id);
                    const stationStock = getProductStock(product.id);
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springConfig, delay: index * 0.05 }}
                      >
                        <Card className="rounded-2xl overflow-hidden" data-testid={`load-row-${product.id}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3 mb-4">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base truncate">{product.name}</div>
                                <div className="text-sm text-muted-foreground">{product.code}</div>
                              </div>
                              
                              <div className="flex gap-4 shrink-0">
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Magazzino</div>
                                  <div className="text-xl font-bold text-green-500">
                                    {generalStock.toFixed(0)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <div className="text-xs text-muted-foreground">Postazione</div>
                                  <div className="text-xl font-bold">{stationStock.toFixed(0)}</div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                inputMode="numeric"
                                placeholder="Quantità"
                                value={loadQuantities[product.id] || ""}
                                onChange={(e) => setLoadQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                className="flex-1 h-14 text-center text-xl rounded-xl"
                                data-testid={`input-load-${product.id}`}
                              />
                              <HapticButton
                                onClick={() => handleLoad(product.id)}
                                disabled={loadMutation.isPending}
                                className="h-14 px-6 rounded-xl bg-green-600"
                                hapticType="medium"
                                aria-label={`Carica ${product.name}`}
                                data-testid={`button-load-${product.id}`}
                              >
                                <Plus className="h-6 w-6" />
                              </HapticButton>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'scarico' && (
            <motion.div
              key="scarico"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springConfig}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Chiudi Prodotti</h2>
                  <p className="text-muted-foreground text-sm">Inserisci quantità rimasta</p>
                </div>
              </div>

              {productsWithStock.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-1">Nessun prodotto caricato</p>
                    <p className="text-sm text-muted-foreground">
                      Vai in Carico per trasferire prodotti
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="space-y-3">
                    {productsWithStock.map((product, index) => {
                      const stockValue = getProductStock(product.id);
                      const remaining = parseFloat(remainingQuantities[product.id] || "");
                      const consumed = !isNaN(remaining) ? stockValue - remaining : 0;
                      const isLowStock = stockValue <= 5;
                      
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springConfig, delay: index * 0.05 }}
                        >
                          <Card className="rounded-2xl overflow-hidden" data-testid={`consume-row-${product.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-base truncate">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">{product.code}</div>
                                </div>
                                
                                <div className="bg-muted/50 rounded-xl px-4 py-2 text-center shrink-0">
                                  <div className="text-xs text-muted-foreground">Caricato</div>
                                  <div className={`text-2xl font-bold ${isLowStock ? 'text-orange-500' : ''}`}>
                                    {stockValue.toFixed(0)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-2 block">Rimasta</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={stockValue}
                                    step="1"
                                    inputMode="numeric"
                                    placeholder="0"
                                    value={remainingQuantities[product.id] || ""}
                                    onChange={(e) => setRemainingQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                    className="h-14 text-center text-xl rounded-xl"
                                    data-testid={`input-remaining-${product.id}`}
                                  />
                                </div>
                                
                                {!isNaN(remaining) && remaining >= 0 && (
                                  <motion.div 
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={springConfig}
                                    className="text-center bg-orange-500/10 rounded-xl px-4 py-2 h-14 flex flex-col justify-center"
                                  >
                                    <div className="text-xs text-muted-foreground">Consumato</div>
                                    <div className="text-xl font-bold text-orange-500">
                                      {consumed.toFixed(0)}
                                    </div>
                                  </motion.div>
                                )}
                                
                                <HapticButton
                                  variant="outline"
                                  onClick={() => handleConsumeAll(product.id)}
                                  disabled={consumeMutation.isPending}
                                  className="h-14 px-4 rounded-xl"
                                  hapticType="medium"
                                  data-testid={`button-finish-${product.id}`}
                                >
                                  <Check className="h-5 w-5" />
                                </HapticButton>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  <motion.div 
                    className="mt-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...springConfig, delay: 0.2 }}
                  >
                    <HapticButton
                      onClick={handleSubmitAllConsume}
                      disabled={isSubmittingAll || getFilledCount() === 0}
                      className="w-full h-16 text-lg rounded-2xl bg-green-600"
                      hapticType="heavy"
                      data-testid="button-submit-all-consume"
                    >
                      <Send className="h-6 w-6 mr-3" />
                      {isSubmittingAll ? "Invio..." : `Invia Tutto (${getFilledCount()})`}
                    </HapticButton>
                    {getFilledCount() > 0 && (
                      <p className="text-sm text-center text-muted-foreground mt-3">
                        Compila tutte le quantità, poi invia
                      </p>
                    )}
                  </motion.div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'storico' && (
            <motion.div
              key="storico"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={springConfig}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <History className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-lg">Riepilogo Consumi</h2>
                  <p className="text-muted-foreground text-sm">Totale consumato per prodotto</p>
                </div>
              </div>

              {eventConsumptions.length === 0 ? (
                <Card className="rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Nessun consumo registrato</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(() => {
                    const productTotals = new Map<string, number>();
                    eventConsumptions.forEach(m => {
                      const current = productTotals.get(m.productId) || 0;
                      productTotals.set(m.productId, current + parseFloat(m.quantity));
                    });
                    
                    return Array.from(productTotals.entries()).map(([productId, total], index) => {
                      const product = products?.find(p => p.id === productId);
                      return (
                        <motion.div
                          key={productId}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springConfig, delay: index * 0.05 }}
                        >
                          <Card className="rounded-2xl" data-testid={`summary-row-${productId}`}>
                            <CardContent className="p-4 flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center shrink-0">
                                <Package className="h-7 w-7 text-orange-500" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-base truncate">{product?.name || productId}</div>
                                <div className="text-sm text-muted-foreground">{product?.code}</div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <div className="text-3xl font-bold text-orange-500">
                                  {total.toFixed(0)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {product?.unitOfMeasure || 'pz'}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    });
                  })()}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileAppLayout>
  );
}
