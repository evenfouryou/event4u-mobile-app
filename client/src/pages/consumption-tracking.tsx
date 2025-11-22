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
import { Search, Minus, AlertTriangle, Package } from "lucide-react";
import type { Event, Station, Product } from "@shared/schema";

export default function ConsumptionTracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedStationId, setSelectedStationId] = useState<string>("");
  const { toast } = useToast();

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const activeEvents = events?.filter(e => e.status === 'ongoing') || [];

  useEffect(() => {
    if (activeEvents.length > 0 && !selectedEventId) {
      setSelectedEventId(activeEvents[0].id);
    }
  }, [activeEvents, selectedEventId]);

  const selectedEvent = events?.find(e => e.id === selectedEventId);

  const { data: stations } = useQuery<Station[]>({
    queryKey: ['/api/events', selectedEventId, 'stations'],
    enabled: !!selectedEventId,
  });

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
    if (stations && stations.length > 0 && !selectedStationId) {
      setSelectedStationId(stations[0].id);
    }
  }, [stations, selectedStationId]);

  const getProductStock = (productId: string): number => {
    if (!selectedStationId) return 0;
    const stock = eventStocks?.find(s => 
      s.productId === productId && s.stationId === selectedStationId
    );
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
        title: "Successo",
        description: "Consumo registrato",
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

  const handleConsume = (productId: string, quantity: number) => {
    if (!selectedEventId) return;
    
    consumeMutation.mutate({
      eventId: selectedEventId,
      stationId: selectedStationId || null,
      productId,
      quantity,
    });
  };

  const filteredProducts = products?.filter(p => 
    p.active && (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
    )
  ) || [];

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
          <h1 className="text-xl sm:text-2xl font-semibold hidden md:block">Registra Consumi</h1>
          
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
                Scegli evento e postazione sopra per visualizzare i prodotti e registrare i consumi
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product) => {
            const stockValue = getProductStock(product.id);
            const isLowStock = stockValue <= 5;
            return (
              <Card key={product.id} data-testid={`product-card-${product.id}`} className="overflow-hidden">
                <CardHeader className="pb-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                      <Package className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{product.name}</CardTitle>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{product.code}</p>
                    </div>
                    {product.category && (
                      <Badge variant="secondary" className="flex-shrink-0 text-xs">{product.category}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-medium">
                      Stock: {stockValue.toFixed(2)} {product.unitOfMeasure}
                    </span>
                    {isLowStock && (
                      <Badge variant="destructive" className="ml-auto text-xs" data-testid={`badge-low-${product.id}`}>
                        Basso
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="xl"
                    variant="outline"
                    onClick={() => handleConsume(product.id, 0.5)}
                    disabled={consumeMutation.isPending}
                    data-testid={`button-consume-half-${product.id}`}
                    className="flex flex-col items-center justify-center gap-1"
                  >
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="font-semibold">0.5</span>
                  </Button>
                  <Button
                    size="xl"
                    variant="outline"
                    onClick={() => handleConsume(product.id, 1)}
                    disabled={consumeMutation.isPending}
                    data-testid={`button-consume-one-${product.id}`}
                    className="flex flex-col items-center justify-center gap-1"
                  >
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="font-semibold">1</span>
                  </Button>
                  <Button
                    size="xl"
                    variant="outline"
                    onClick={() => handleConsume(product.id, 2)}
                    disabled={consumeMutation.isPending}
                    data-testid={`button-consume-two-${product.id}`}
                    className="flex flex-col items-center justify-center gap-1"
                  >
                    <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="font-semibold">2</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
          </div>
        )}

        {selectedStationId && filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Nessun prodotto trovato</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
