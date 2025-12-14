import { useState, useEffect } from "react";
import { useParams, Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Minus, Plus, Package, GlassWater, History, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import type { Event, Station, Product } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type DirectStock = {
  productId: string;
  productName: string;
  productCode: string;
  unitOfMeasure: string;
  loaded: number;
  consumed: number;
  available: number;
};

type DirectStockSummary = {
  totalLoaded: number;
  totalConsumed: number;
  movements: Array<{
    id: string;
    productId: string;
    productName: string;
    productCode: string;
    quantity: string;
    type: string;
    reason: string | null;
    createdAt: string;
  }>;
};

export default function BartenderDirectStock() {
  const { id } = useParams();
  const searchString = useSearch();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  // Parse stationId from URL query parameter
  const urlParams = new URLSearchParams(searchString);
  const urlStationId = urlParams.get('stationId') || '';

  const [selectedStationId, setSelectedStationId] = useState<string>(urlStationId);
  const [loadProductId, setLoadProductId] = useState<string>("");
  const [loadQuantity, setLoadQuantity] = useState<string>("");
  const [loadReason, setLoadReason] = useState<string>("");
  const [consumeProductId, setConsumeProductId] = useState<string>("");
  const [consumeQuantity, setConsumeQuantity] = useState<string>("");
  const [consumeReason, setConsumeReason] = useState<string>("");

  // Update selectedStationId when URL changes
  useEffect(() => {
    if (urlStationId) {
      setSelectedStationId(urlStationId);
    }
  }, [urlStationId]);

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const myStations = stations?.filter(s => 
    s.bartenderIds?.includes(user?.id || '')
  ) || [];

  const autoSelectedStationId = myStations.length === 1 ? myStations[0].id : '';
  const activeStationId = selectedStationId || autoSelectedStationId;

  const { data: directStock, isLoading: stockLoading } = useQuery<DirectStock[]>({
    queryKey: ['/api/events', id, 'direct-stock', { stationId: activeStationId }],
    enabled: !!id && !!activeStationId,
    queryFn: async () => {
      const url = activeStationId 
        ? `/api/events/${id}/direct-stock?stationId=${activeStationId}`
        : `/api/events/${id}/direct-stock`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stock');
      return res.json();
    },
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<DirectStockSummary>({
    queryKey: ['/api/events', id, 'direct-stock', 'summary', { stationId: activeStationId }],
    enabled: !!id && !!activeStationId,
    queryFn: async () => {
      const url = activeStationId 
        ? `/api/events/${id}/direct-stock/summary?stationId=${activeStationId}`
        : `/api/events/${id}/direct-stock/summary`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch summary');
      return res.json();
    },
  });

  const loadMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; stationId?: string; reason?: string }) => {
      await apiRequest('POST', `/api/events/${id}/direct-stock/load`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'direct-stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'direct-stock', 'summary'] });
      setLoadProductId("");
      setLoadQuantity("");
      setLoadReason("");
      toast({
        title: "Carico registrato",
        description: "Prodotto caricato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile registrare il carico",
        variant: "destructive",
      });
    },
  });

  const consumeMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; stationId?: string; reason?: string }) => {
      await apiRequest('POST', `/api/events/${id}/direct-stock/consume`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'direct-stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'direct-stock', 'summary'] });
      setConsumeProductId("");
      setConsumeQuantity("");
      setConsumeReason("");
      toast({
        title: "Scarico registrato",
        description: "Prodotto scaricato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile registrare lo scarico",
        variant: "destructive",
      });
    },
  });

  const handleLoad = () => {
    const qty = parseFloat(loadQuantity);
    if (!loadProductId || isNaN(qty) || qty <= 0) {
      toast({
        title: "Dati non validi",
        description: "Seleziona un prodotto e inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    if (!activeStationId) {
      toast({
        title: "Stazione non selezionata",
        description: "Seleziona la tua stazione di lavoro",
        variant: "destructive",
      });
      return;
    }
    loadMutation.mutate({
      productId: loadProductId,
      quantity: qty,
      stationId: activeStationId,
      reason: loadReason || undefined,
    });
  };

  const handleConsume = () => {
    const qty = parseFloat(consumeQuantity);
    if (!consumeProductId || isNaN(qty) || qty <= 0) {
      toast({
        title: "Dati non validi",
        description: "Seleziona un prodotto e inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    if (!activeStationId) {
      toast({
        title: "Stazione non selezionata",
        description: "Seleziona la tua stazione di lavoro",
        variant: "destructive",
      });
      return;
    }
    consumeMutation.mutate({
      productId: consumeProductId,
      quantity: qty,
      stationId: activeStationId,
      reason: consumeReason || undefined,
    });
  };

  const getAvailableForConsume = (productId: string): number => {
    const stock = directStock?.find(s => s.productId === productId);
    return stock?.available || 0;
  };

  const currentStation = stations?.find(s => s.id === activeStationId);

  // Wait for event, auth, and stations to load before showing content
  if (eventLoading || authLoading || stationsLoading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <Skeleton className="h-12 w-64 mb-8 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <div className="glass-card p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Evento non trovato</p>
          <Button asChild variant="outline" className="mt-4" data-testid="button-back-not-found">
            <Link href="/events">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna agli Eventi
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-xl"
          data-testid="button-back"
        >
          <Link href={`/events/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <GlassWater className="h-6 w-6 text-amber-500" />
            Consumi Diretti
          </h1>
          <p className="text-sm text-muted-foreground">{event.name}</p>
        </div>
      </motion.div>

      {myStations.length > 1 && !selectedStationId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <Label htmlFor="station-select" className="text-sm text-muted-foreground">
                    Seleziona la tua stazione
                  </Label>
                  <Select
                    value={selectedStationId}
                    onValueChange={setSelectedStationId}
                    data-testid="select-station"
                  >
                    <SelectTrigger id="station-select" data-testid="trigger-station-select">
                      <SelectValue placeholder="Seleziona stazione" />
                    </SelectTrigger>
                    <SelectContent>
                      {myStations.map((station) => (
                        <SelectItem key={station.id} value={station.id}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {myStations.length > 1 && selectedStationId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm py-1.5 px-3">
              <MapPin className="h-3.5 w-3.5 mr-1.5" />
              {myStations.find(s => s.id === selectedStationId)?.name}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedStationId("")}
              data-testid="button-change-station"
            >
              Cambia
            </Button>
          </div>
        </motion.div>
      )}

      {currentStation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Stazione: {currentStation.name}
          </Badge>
        </motion.div>
      )}

      {!activeStationId && myStations.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 text-center mb-6"
        >
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Non sei assegnato a nessuna stazione per questo evento</p>
          <p className="text-sm text-muted-foreground mt-1">Contatta l'organizzatore per essere assegnato</p>
        </motion.div>
      )}

      {activeStationId && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-teal" />
                  Carica Prodotto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="load-product">Prodotto</Label>
                  <Select
                    value={loadProductId}
                    onValueChange={setLoadProductId}
                    data-testid="select-load-product"
                  >
                    <SelectTrigger id="load-product" data-testid="trigger-load-product">
                      <SelectValue placeholder="Seleziona prodotto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.unitOfMeasure})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="load-quantity">Quantità</Label>
                  <Input
                    id="load-quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={loadQuantity}
                    onChange={(e) => setLoadQuantity(e.target.value)}
                    data-testid="input-load-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="load-reason">Note (opzionale)</Label>
                  <Input
                    id="load-reason"
                    placeholder="Es: Acquisto fornitore"
                    value={loadReason}
                    onChange={(e) => setLoadReason(e.target.value)}
                    data-testid="input-load-reason"
                  />
                </div>
                <Button
                  onClick={handleLoad}
                  disabled={loadMutation.isPending || !loadProductId}
                  className="w-full"
                  data-testid="button-load"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loadMutation.isPending ? "Caricamento..." : "Carica Prodotto"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-6"
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Minus className="h-5 w-5 text-amber-500" />
                  Scarica Prodotto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="consume-product">Prodotto</Label>
                  <Select
                    value={consumeProductId}
                    onValueChange={setConsumeProductId}
                    data-testid="select-consume-product"
                  >
                    <SelectTrigger id="consume-product" data-testid="trigger-consume-product">
                      <SelectValue placeholder="Seleziona prodotto" />
                    </SelectTrigger>
                    <SelectContent>
                      {directStock?.filter(s => s.available > 0).map((stock) => (
                        <SelectItem key={stock.productId} value={stock.productId}>
                          {stock.productName} (Disp: {stock.available.toFixed(2)})
                        </SelectItem>
                      ))}
                      {(!directStock || directStock.filter(s => s.available > 0).length === 0) && (
                        <SelectItem value="_empty" disabled>
                          Nessun prodotto disponibile
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {consumeProductId && (
                    <p className="text-xs text-muted-foreground">
                      Disponibile: {getAvailableForConsume(consumeProductId).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consume-quantity">Quantità</Label>
                  <Input
                    id="consume-quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={consumeQuantity}
                    onChange={(e) => setConsumeQuantity(e.target.value)}
                    data-testid="input-consume-quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consume-reason">Note (opzionale)</Label>
                  <Input
                    id="consume-reason"
                    placeholder="Es: Tavolo 5"
                    value={consumeReason}
                    onChange={(e) => setConsumeReason(e.target.value)}
                    data-testid="input-consume-reason"
                  />
                </div>
                <Button
                  onClick={handleConsume}
                  disabled={consumeMutation.isPending || !consumeProductId}
                  className="w-full"
                  data-testid="button-consume"
                >
                  <Minus className="h-4 w-4 mr-2" />
                  {consumeMutation.isPending ? "Scaricamento..." : "Scarica Prodotto"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card mb-6"
          >
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Stock Disponibile
              </h2>
            </div>
            <div className="overflow-x-auto">
              {stockLoading ? (
                <div className="p-6">
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              ) : directStock && directStock.length > 0 ? (
                <Table data-testid="table-direct-stock">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Disponibile</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {directStock.map((stock) => (
                      <TableRow key={stock.productId} data-testid={`row-stock-${stock.productId}`}>
                        <TableCell className="font-medium">{stock.productName}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={stock.available > 0 ? "default" : "secondary"}>
                            {stock.available.toFixed(2)} {stock.unitOfMeasure}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Nessun prodotto disponibile</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card"
          >
            <div className="p-4 border-b border-border">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <History className="h-5 w-5" />
                I Miei Consumi
                {summary && (
                  <span className="text-sm font-normal text-muted-foreground ml-auto">
                    Totale: {summary.totalConsumed.toFixed(2)}
                  </span>
                )}
              </h2>
            </div>
            <div className="overflow-x-auto">
              {summaryLoading ? (
                <div className="p-6">
                  <Skeleton className="h-32 w-full rounded-xl" />
                </div>
              ) : summary?.movements && summary.movements.filter(m => m.type === 'DIRECT_CONSUME').length > 0 ? (
                <Table data-testid="table-movements">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ora</TableHead>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.movements.filter(m => m.type === 'DIRECT_CONSUME').map((mov) => (
                      <TableRow key={mov.id} data-testid={`row-movement-${mov.id}`}>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {mov.createdAt ? new Date(mov.createdAt).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '-'}
                        </TableCell>
                        <TableCell className="font-medium">{mov.productName}</TableCell>
                        <TableCell className="text-right text-amber-500">
                          -{parseFloat(mov.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[120px] truncate">
                          {mov.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Nessun consumo registrato</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
