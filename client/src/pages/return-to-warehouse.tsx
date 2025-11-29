import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageOpen, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Event = {
  id: number;
  name: string;
  eventDate: string;
  status: string;
};

type Station = {
  id: number;
  name: string;
  eventId: number;
};

type Stock = {
  id: string;
  productId: string;
  quantity: string;
  eventId?: string;
  stationId?: string;
  product: {
    id: string;
    name: string;
    code: string;
    unitOfMeasure: string;
  };
};

export default function ReturnToWarehouse() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [returns, setReturns] = useState<Record<string, string>>({});

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: stations = [] } = useQuery<Station[]>({
    queryKey: ['/api/events', selectedEventId, 'stations'],
    enabled: !!selectedEventId,
  });

  const { data: eventStocks = [] } = useQuery<Stock[]>({
    queryKey: ['/api/stocks/event', selectedEventId],
    enabled: !!selectedEventId && !selectedStationId,
  });

  const { data: stationStocks = [] } = useQuery<Stock[]>({
    queryKey: ['/api/stocks/station', selectedStationId],
    enabled: !!selectedStationId,
  });

  const stocks = selectedStationId ? stationStocks : eventStocks;

  const returnMutation = useMutation({
    mutationFn: async (data: { eventId: string; stationId: string | null; productId: string; quantity: string }) => {
      await apiRequest('POST', '/api/stock/return-to-warehouse', data);
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Prodotto ritornato al magazzino",
      });
      // Invalidate specific queries
      queryClient.invalidateQueries({ queryKey: ['/api/stocks/event', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['/api/stocks/station', selectedStationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0]?.toString().includes('/api/reports') });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis' });
      setReturns({});
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile ritornare il prodotto",
        variant: "destructive",
      });
    },
  });

  const handleReturnProduct = (productId: string) => {
    const quantity = returns[productId];
    if (!quantity || parseFloat(quantity) <= 0) {
      toast({
        title: "Errore",
        description: "Inserire una quantità valida",
        variant: "destructive",
      });
      return;
    }

    returnMutation.mutate({
      eventId: selectedEventId,
      stationId: selectedStationId,
      productId,
      quantity,
    });
  };

  const handleQuantityChange = (productId: string, value: string) => {
    setReturns((prev) => ({
      ...prev,
      [productId]: value,
    }));
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Rientro a Magazzino</h1>
          <p className="text-muted-foreground">
            Trasferisci inventario inutilizzato dagli eventi al magazzino generale
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seleziona Evento</CardTitle>
          <CardDescription>Scegli un evento per visualizzare l'inventario disponibile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-select">Evento</Label>
            <Select 
              value={selectedEventId} 
              onValueChange={(value) => {
                setSelectedEventId(value);
                setSelectedStationId(null);
                setReturns({});
              }}
            >
              <SelectTrigger id="event-select" data-testid="select-event">
                <SelectValue placeholder="Seleziona un evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id.toString()}>
                    {event.name} - {new Date(event.eventDate).toLocaleDateString('it-IT')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {stations.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="station-select">Postazione (opzionale)</Label>
              <Select 
                value={selectedStationId || "general"} 
                onValueChange={(value) => {
                  setSelectedStationId(value === 'general' ? null : value);
                  setReturns({});
                }}
              >
                <SelectTrigger id="station-select" data-testid="select-station">
                  <SelectValue placeholder="Inventario evento generale" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Inventario evento generale</SelectItem>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {stocks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Inventario Disponibile</CardTitle>
            <CardDescription>
              Prodotti disponibili per il rientro al magazzino generale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Prodotto</TableHead>
                  <TableHead>Unità</TableHead>
                  <TableHead className="text-right">Disponibile</TableHead>
                  <TableHead className="text-right">Quantità da Ritornare</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stocks
                  .filter((stock) => parseFloat(stock.quantity) > 0)
                  .map((stock) => (
                    <TableRow key={stock.id} data-testid={`row-product-${stock.productId}`}>
                      <TableCell>{stock.product.code}</TableCell>
                      <TableCell>{stock.product.name}</TableCell>
                      <TableCell>{stock.product.unitOfMeasure}</TableCell>
                      <TableCell className="text-right">
                        {parseFloat(stock.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={stock.quantity}
                          placeholder="0.00"
                          value={returns[stock.productId] || ""}
                          onChange={(e) => handleQuantityChange(stock.productId, e.target.value)}
                          className="w-24 text-right"
                          data-testid={`input-quantity-${stock.productId}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleReturnProduct(stock.productId)}
                          disabled={
                            !returns[stock.productId] ||
                            parseFloat(returns[stock.productId]) <= 0 ||
                            parseFloat(returns[stock.productId]) > parseFloat(stock.quantity) ||
                            returnMutation.isPending
                          }
                          data-testid={`button-return-${stock.productId}`}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Rientro
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {selectedEventId && stocks.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nessun inventario disponibile per il rientro
            </p>
          </CardContent>
        </Card>
      )}

      {!selectedEventId && (
        <Card>
          <CardContent className="py-12 text-center">
            <PackageOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Seleziona un evento per visualizzare l'inventario disponibile
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
