import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, AlertTriangle, Package, ArrowLeft, Upload, Download, Warehouse, History, Check, RotateCcw, Send } from "lucide-react";
import { useLocation } from "wouter";
import type { Event, Station, Product, Stock, StockMovement } from "@shared/schema";

export default function ConsumptionTracking() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadQuantities, setLoadQuantities] = useState<Record<string, string>>({});
  const [remainingQuantities, setRemainingQuantities] = useState<Record<string, string>>({});
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
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
    
    // Handle "general" event inventory (stocks without station)
    if (selectedStationId === 'general') {
      const stock = eventStocks?.find(s => 
        s.productId === productId && !s.stationId
      );
      if (!stock) return 0;
      const quantity = parseFloat(stock.quantity);
      return isNaN(quantity) ? 0 : quantity;
    }
    
    // Handle specific station
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
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setRemainingQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      toast({
        title: "Consumo registrato",
        description: "Stock aggiornato",
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
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setRemainingQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      toast({
        title: "Reso al magazzino",
        description: "Prodotto restituito",
      });
    },
    onError: (error: Error) => {
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
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setLoadQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      toast({
        title: "Prodotto caricato",
        description: "Trasferimento completato",
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
    
    setRemainingQuantities({});
    setIsSubmittingAll(false);
    
    if (successCount > 0) {
      toast({
        title: "Chiusura completata",
        description: `${successCount} prodotti aggiornati${errorCount > 0 ? `, ${errorCount} errori` : ''}`,
      });
    } else {
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

  const getProductName = (productId: string) => {
    return products?.find(p => p.id === productId)?.name || productId;
  };

  if (eventsLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">Nessun evento in corso</p>
            <p className="text-sm text-muted-foreground">Non ci sono eventi attivi al momento</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="p-3 sm:p-4 md:p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/beverage')}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-semibold">{selectedEvent?.name}</h1>
              {selectedStationId === 'general' ? (
                <p className="text-sm text-muted-foreground">Inventario Generale Evento</p>
              ) : selectedStation ? (
                <p className="text-sm text-muted-foreground">{selectedStation.name}</p>
              ) : null}
            </div>
          </div>
          
          {!urlEventId && !urlStationId && (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Evento</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger data-testid="select-event" className="h-11 sm:h-10">
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
                <Label className="text-xs sm:text-sm">Postazione</Label>
                <Select 
                  value={selectedStationId} 
                  onValueChange={setSelectedStationId}
                >
                  <SelectTrigger data-testid="select-station" className="h-11 sm:h-10">
                    <SelectValue placeholder="Postazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      Inventario Generale Evento
                    </SelectItem>
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca prodotto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 sm:h-10"
              data-testid="input-search-product"
            />
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-4 md:p-6">
        {!selectedStationId ? (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-2">Seleziona una postazione</p>
              <p className="text-sm text-muted-foreground">
                Scegli evento e postazione sopra per visualizzare i prodotti
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="scarico" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="carico" className="flex items-center gap-2" data-testid="tab-carico">
                <Upload className="h-4 w-4" />
                Carico
              </TabsTrigger>
              <TabsTrigger value="scarico" className="flex items-center gap-2" data-testid="tab-scarico">
                <Download className="h-4 w-4" />
                Scarico
              </TabsTrigger>
              <TabsTrigger value="storico" className="flex items-center gap-2" data-testid="tab-storico">
                <History className="h-4 w-4" />
                Storico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="carico">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Warehouse className="h-5 w-5 text-green-600" />
                    Carica dal Magazzino
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Trasferisci prodotti dal magazzino alla postazione
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {productsInGeneral.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Nessun prodotto disponibile</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {productsInGeneral.map((product) => {
                        const generalStock = getGeneralStock(product.id);
                        const stationStock = getProductStock(product.id);
                        return (
                          <div 
                            key={product.id} 
                            className="flex items-center gap-3 p-4 hover:bg-muted/50"
                            data-testid={`load-row-${product.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.code}</div>
                            </div>
                            
                            <div className="text-right text-sm shrink-0">
                              <div className="text-muted-foreground">Magazzino</div>
                              <div className="font-semibold text-green-600">{generalStock.toFixed(1)}</div>
                            </div>
                            
                            <div className="text-right text-sm shrink-0">
                              <div className="text-muted-foreground">Postazione</div>
                              <div className="font-semibold">{stationStock.toFixed(1)}</div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="Qtà"
                                value={loadQuantities[product.id] || ""}
                                onChange={(e) => setLoadQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                className="w-20 h-9 text-center"
                                data-testid={`input-load-${product.id}`}
                              />
                              <Button
                                size="sm"
                                onClick={() => handleLoad(product.id)}
                                disabled={loadMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 h-9"
                                data-testid={`button-load-${product.id}`}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scarico">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    Chiudi Prodotti
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Inserisci la quantità <strong>rimasta</strong>: il consumato viene calcolato e il resto torna al magazzino
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {productsWithStock.length === 0 ? (
                    <div className="p-8 text-center">
                      <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground mb-1">Nessun prodotto caricato</p>
                      <p className="text-xs text-muted-foreground">
                        Vai nella sezione Carico per trasferire prodotti
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="divide-y">
                        {productsWithStock.map((product) => {
                          const stockValue = getProductStock(product.id);
                          const remaining = parseFloat(remainingQuantities[product.id] || "");
                          const consumed = !isNaN(remaining) ? stockValue - remaining : 0;
                          const isLowStock = stockValue <= 5;
                          
                          return (
                            <div 
                              key={product.id} 
                              className="p-4 hover:bg-muted/50"
                              data-testid={`consume-row-${product.id}`}
                            >
                              <div className="flex items-center gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">{product.code}</div>
                                </div>
                                
                                <div className="text-center shrink-0">
                                  <div className="text-xs text-muted-foreground">Caricato</div>
                                  <div className={`text-xl font-bold ${isLowStock ? 'text-orange-500' : ''}`}>
                                    {stockValue.toFixed(1)}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <Label className="text-xs text-muted-foreground mb-1 block">Rimasto</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={stockValue}
                                    step="1"
                                    placeholder="0"
                                    value={remainingQuantities[product.id] || ""}
                                    onChange={(e) => setRemainingQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                    className="h-10 text-center text-lg"
                                    data-testid={`input-remaining-${product.id}`}
                                  />
                                </div>
                                
                                {!isNaN(remaining) && remaining >= 0 && (
                                  <div className="text-center shrink-0 min-w-16">
                                    <div className="text-xs text-muted-foreground">Consumato</div>
                                    <div className="text-lg font-bold text-orange-500">
                                      {consumed.toFixed(1)}
                                    </div>
                                  </div>
                                )}
                                
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleConsumeAll(product.id)}
                                  disabled={consumeMutation.isPending}
                                  className="h-10 text-xs shrink-0"
                                  data-testid={`button-finish-${product.id}`}
                                >
                                  Finito tutto
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="p-4 border-t bg-muted/30">
                        <Button
                          onClick={handleSubmitAllConsume}
                          disabled={isSubmittingAll || getFilledCount() === 0}
                          className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                          data-testid="button-submit-all-consume"
                        >
                          <Send className="h-5 w-5 mr-2" />
                          {isSubmittingAll ? "Invio in corso..." : `Invia Tutto (${getFilledCount()} prodotti)`}
                        </Button>
                        {getFilledCount() > 0 && (
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            Compila la quantità rimasta per ogni prodotto, poi clicca per inviare tutto insieme
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="storico">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-500" />
                    Riepilogo Consumi
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Totale consumato per ogni prodotto in questo evento
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {eventConsumptions.length === 0 ? (
                    <div className="p-8 text-center">
                      <History className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">Nessun consumo registrato</p>
                    </div>
                  ) : (
                    <div className="divide-y">
                      {(() => {
                        const productTotals = new Map<string, number>();
                        eventConsumptions.forEach(m => {
                          const current = productTotals.get(m.productId) || 0;
                          productTotals.set(m.productId, current + parseFloat(m.quantity));
                        });
                        
                        return Array.from(productTotals.entries()).map(([productId, total]) => {
                          const product = products?.find(p => p.id === productId);
                          return (
                            <div 
                              key={productId} 
                              className="flex items-center gap-3 p-4"
                              data-testid={`summary-row-${productId}`}
                            >
                              <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                <Package className="h-6 w-6 text-orange-500" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{product?.name || productId}</div>
                                <div className="text-xs text-muted-foreground">{product?.code}</div>
                              </div>
                              
                              <div className="text-right shrink-0">
                                <div className="text-2xl font-bold text-orange-500">
                                  {total.toFixed(1)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {product?.unitOfMeasure || 'pz'}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
