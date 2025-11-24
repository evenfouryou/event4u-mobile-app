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
import { Search, Minus, Plus, AlertTriangle, Package, ArrowLeft, Upload, Download, Warehouse } from "lucide-react";
import { useLocation } from "wouter";
import type { Event, Station, Product, Stock } from "@shared/schema";

export default function ConsumptionTracking() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadQuantities, setLoadQuantities] = useState<Record<string, string>>({});
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

  const consumeMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string | null; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/consume', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
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

  const loadMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/event-transfer', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setLoadQuantities({});
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

  const handleConsume = (productId: string, quantity: number) => {
    if (!selectedEventId) return;
    
    consumeMutation.mutate({
      eventId: selectedEventId,
      stationId: selectedStationId || null,
      productId,
      quantity,
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
    
    loadMutation.mutate({
      eventId: selectedEventId,
      stationId: selectedStationId,
      productId,
      quantity: qty,
    });
  };

  const filteredProducts = products?.filter(p => 
    p.active && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

  const productsWithStock = filteredProducts.filter(p => getProductStock(p.id) > 0);
  const productsInGeneral = filteredProducts.filter(p => getGeneralStock(p.id) > 0);

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
              {selectedStation && (
                <p className="text-sm text-muted-foreground">{selectedStation.name}</p>
              )}
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
                  disabled={!stations || stations.length === 0}
                >
                  <SelectTrigger data-testid="select-station" className="h-11 sm:h-10">
                    <SelectValue placeholder="Postazione" />
                  </SelectTrigger>
                  <SelectContent>
                    {stations?.map(station => (
                      <SelectItem key={station.id} value={station.id}>
                        {station.name}
                      </SelectItem>
                    ))}
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
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="carico" className="flex items-center gap-2" data-testid="tab-carico">
                <Upload className="h-4 w-4" />
                Carico
              </TabsTrigger>
              <TabsTrigger value="scarico" className="flex items-center gap-2" data-testid="tab-scarico">
                <Download className="h-4 w-4" />
                Scarico
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
                    Registra Consumi
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Tocca i pulsanti per scaricare le quantità vendute
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
                    <div className="divide-y">
                      {productsWithStock.map((product) => {
                        const stockValue = getProductStock(product.id);
                        const isLowStock = stockValue <= 5;
                        return (
                          <div 
                            key={product.id} 
                            className="flex items-center gap-3 p-4 hover:bg-muted/50"
                            data-testid={`consume-row-${product.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{product.name}</div>
                              <div className="text-xs text-muted-foreground">{product.code}</div>
                            </div>
                            
                            <div className="text-center shrink-0 min-w-16">
                              <div className="text-xs text-muted-foreground">Giacenza</div>
                              <div className={`text-lg font-bold ${isLowStock ? 'text-red-500' : ''}`}>
                                {stockValue.toFixed(1)}
                              </div>
                              {isLowStock && (
                                <Badge variant="destructive" className="text-xs px-1">Basso</Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConsume(product.id, 1)}
                                disabled={consumeMutation.isPending || stockValue < 1}
                                className="h-10 w-12 text-base font-bold"
                                data-testid={`button-minus-1-${product.id}`}
                              >
                                -1
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConsume(product.id, 2)}
                                disabled={consumeMutation.isPending || stockValue < 2}
                                className="h-10 w-12 text-base font-bold"
                                data-testid={`button-minus-2-${product.id}`}
                              >
                                -2
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleConsume(product.id, 5)}
                                disabled={consumeMutation.isPending || stockValue < 5}
                                className="h-10 w-12 text-base font-bold"
                                data-testid={`button-minus-5-${product.id}`}
                              >
                                -5
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
          </Tabs>
        )}
      </div>
    </div>
  );
}
