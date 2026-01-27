import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PackageOpen, ArrowLeft, Loader2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";

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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [returns, setReturns] = useState<Record<string, string>>({});
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [isReturnSheetOpen, setIsReturnSheetOpen] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);

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
      queryClient.invalidateQueries({ queryKey: ['/api/stocks/event', selectedEventId] });
      queryClient.invalidateQueries({ queryKey: ['/api/stocks/station', selectedStationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0]?.toString().includes('/api/reports') || false });
      queryClient.invalidateQueries({ predicate: (query) => (query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis') || false });
      setReturns({});
      setIsReturnSheetOpen(false);
      setIsReturnDialogOpen(false);
      setSelectedStock(null);
      if (isMobile) triggerHaptic('success');
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile ritornare il prodotto",
        variant: "destructive",
      });
      if (isMobile) triggerHaptic('error');
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

  const openReturnSheet = (stock: Stock) => {
    setSelectedStock(stock);
    setIsReturnSheetOpen(true);
    triggerHaptic('light');
  };

  const openReturnDialog = (stock: Stock) => {
    setSelectedStock(stock);
    setIsReturnDialogOpen(true);
  };

  if (eventsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-return-to-warehouse">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Rientro a Magazzino</h1>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>
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
                    <TableHead className="text-right">Qtà Ritorno</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stocks
                    .filter((stock) => parseFloat(stock.quantity) > 0)
                    .map((stock) => (
                      <TableRow key={stock.id} data-testid={`row-product-${stock.productId}`}>
                        <TableCell className="font-mono">{stock.product.code}</TableCell>
                        <TableCell className="font-medium">{stock.product.name}</TableCell>
                        <TableCell>{stock.product.unitOfMeasure}</TableCell>
                        <TableCell className="text-right font-mono">
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
                            className="w-28 text-right"
                            data-testid={`input-quantity-${stock.productId}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog open={isReturnDialogOpen && selectedStock?.id === stock.id} onOpenChange={(open) => {
                            if (!open) {
                              setIsReturnDialogOpen(false);
                              setSelectedStock(null);
                            }
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReturnDialog(stock)}
                                disabled={
                                  !returns[stock.productId] ||
                                  parseFloat(returns[stock.productId]) <= 0 ||
                                  parseFloat(returns[stock.productId]) > parseFloat(stock.quantity)
                                }
                                data-testid={`button-return-${stock.productId}`}
                              >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Rientro
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Conferma Rientro</DialogTitle>
                                <DialogDescription>
                                  Stai per ritornare {returns[stock.productId] || 0} {stock.product.unitOfMeasure} di "{stock.product.name}" al magazzino generale.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setIsReturnDialogOpen(false)}>
                                  Annulla
                                </Button>
                                <Button 
                                  onClick={() => handleReturnProduct(stock.productId)}
                                  disabled={returnMutation.isPending}
                                >
                                  {returnMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Conferma
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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

  // Mobile version
  return (
    <MobileAppLayout data-testid="page-return-to-warehouse-mobile">
      <MobileHeader title="Rientro Magazzino" />
      
      <div className="flex-1 overflow-auto p-4 pb-24 space-y-4">
        <Card className="border-0 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Evento</Label>
              <Select 
                value={selectedEventId} 
                onValueChange={(value) => {
                  setSelectedEventId(value);
                  setSelectedStationId(null);
                  setReturns({});
                  triggerHaptic('light');
                }}
              >
                <SelectTrigger data-testid="select-event-mobile" className="h-12">
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
                <Label className="text-sm text-muted-foreground">Postazione</Label>
                <Select 
                  value={selectedStationId || "general"} 
                  onValueChange={(value) => {
                    setSelectedStationId(value === 'general' ? null : value);
                    setReturns({});
                    triggerHaptic('light');
                  }}
                >
                  <SelectTrigger data-testid="select-station-mobile" className="h-12">
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
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground px-1">
              Prodotti Disponibili ({stocks.filter(s => parseFloat(s.quantity) > 0).length})
            </h3>
            {stocks
              .filter((stock) => parseFloat(stock.quantity) > 0)
              .map((stock) => (
                <HapticButton
                  key={stock.id}
                  variant="ghost"
                  className="w-full p-0 h-auto"
                  onClick={() => openReturnSheet(stock)}
                  data-testid={`card-product-${stock.productId}`}
                >
                  <Card className="w-full border-0 bg-card/50 backdrop-blur-sm hover-elevate">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <div className="font-medium">{stock.product.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {stock.product.code} • {stock.product.unitOfMeasure}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="font-mono font-semibold">
                            {parseFloat(stock.quantity).toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">disponibile</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </HapticButton>
              ))}
          </div>
        )}

        {selectedEventId && stocks.length === 0 && (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <PackageOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nessun inventario disponibile
              </p>
            </CardContent>
          </Card>
        )}

        {!selectedEventId && (
          <Card className="border-0 bg-card/50 backdrop-blur-sm">
            <CardContent className="py-12 text-center">
              <PackageOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Seleziona un evento
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomSheet
        open={isReturnSheetOpen}
        onClose={() => {
          setIsReturnSheetOpen(false);
          setSelectedStock(null);
        }}
        title="Rientro Prodotto"
      >
        {selectedStock && (
          <div className="space-y-6 p-4">
            <div className="space-y-2">
              <div className="text-lg font-semibold">{selectedStock.product.name}</div>
              <div className="text-sm text-muted-foreground">
                {selectedStock.product.code} • {selectedStock.product.unitOfMeasure}
              </div>
              <div className="text-sm">
                Disponibile: <span className="font-mono font-semibold">{parseFloat(selectedStock.quantity).toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Quantità da Ritornare</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedStock.quantity}
                placeholder="0.00"
                value={returns[selectedStock.productId] || ""}
                onChange={(e) => handleQuantityChange(selectedStock.productId, e.target.value)}
                className="h-14 text-xl text-center font-mono"
                data-testid={`input-quantity-mobile-${selectedStock.productId}`}
              />
            </div>

            <HapticButton
              className="w-full h-14"
              onClick={() => handleReturnProduct(selectedStock.productId)}
              disabled={
                !returns[selectedStock.productId] ||
                parseFloat(returns[selectedStock.productId]) <= 0 ||
                parseFloat(returns[selectedStock.productId]) > parseFloat(selectedStock.quantity) ||
                returnMutation.isPending
              }
              data-testid={`button-confirm-return-mobile`}
            >
              {returnMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <ArrowLeft className="w-5 h-5 mr-2" />
              )}
              Conferma Rientro
            </HapticButton>
          </div>
        )}
      </BottomSheet>
    </MobileAppLayout>
  );
}
