import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Minus, Package, Upload, Download, History, MapPin, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { Event, Product, Station } from "@shared/schema";

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

export default function EventDirectStock() {
  const { id } = useParams();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedStationId, setSelectedStationId] = useState<string>("_all");
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isConsumeDialogOpen, setIsConsumeDialogOpen] = useState(false);
  
  const [loadProductId, setLoadProductId] = useState<string>("");
  const [loadQuantity, setLoadQuantity] = useState<string>("");
  const [loadReason, setLoadReason] = useState<string>("");

  const [consumeProductId, setConsumeProductId] = useState<string>("");
  const [consumeQuantity, setConsumeQuantity] = useState<string>("");
  const [consumeReason, setConsumeReason] = useState<string>("");

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: stations } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const activeStationId = selectedStationId === "_all" ? undefined : selectedStationId;

  const { data: directStock, isLoading: stockLoading } = useQuery<DirectStock[]>({
    queryKey: ['/api/events', id, 'direct-stock', { stationId: activeStationId }],
    enabled: !!id,
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
    enabled: !!id,
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
      setIsLoadDialogOpen(false);
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
      setIsConsumeDialogOpen(false);
      toast({
        title: "Consumo registrato",
        description: "Prodotto consumato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile registrare il consumo",
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

  if (eventLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
        <Skeleton className="h-12 w-64 mb-8 rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
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

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-event-direct-stock">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              data-testid="button-back-desktop"
            >
              <Link href={`/events/${id}/hub`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold" data-testid="text-title-desktop">Carico/Scarico Diretto</h1>
              <p className="text-muted-foreground">{event.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-open-load-dialog">
                  <Upload className="w-4 h-4 mr-2" />
                  Carico Diretto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-teal" />
                    Carico Diretto
                  </DialogTitle>
                  <DialogDescription>
                    Aggiungi prodotti direttamente allo stock dell'evento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="load-product-desktop">Prodotto</Label>
                    <Select
                      value={loadProductId}
                      onValueChange={setLoadProductId}
                      data-testid="select-load-product-desktop"
                    >
                      <SelectTrigger id="load-product-desktop">
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
                  {stations && stations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="load-station-desktop">Stazione</Label>
                      <Select
                        value={selectedStationId}
                        onValueChange={setSelectedStationId}
                      >
                        <SelectTrigger id="load-station-desktop">
                          <SelectValue placeholder="Tutte le stazioni" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">Tutte le stazioni</SelectItem>
                          {stations.map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                              {station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="load-quantity-desktop">Quantità</Label>
                    <Input
                      id="load-quantity-desktop"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={loadQuantity}
                      onChange={(e) => setLoadQuantity(e.target.value)}
                      data-testid="input-load-quantity-desktop"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="load-reason-desktop">Note (opzionale)</Label>
                    <Input
                      id="load-reason-desktop"
                      placeholder="Es: Acquisto fornitore XYZ"
                      value={loadReason}
                      onChange={(e) => setLoadReason(e.target.value)}
                      data-testid="input-load-reason-desktop"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsLoadDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button
                    onClick={handleLoad}
                    disabled={loadMutation.isPending}
                    data-testid="button-confirm-load-desktop"
                  >
                    {loadMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Caricamento...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Carica Prodotto
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isConsumeDialogOpen} onOpenChange={setIsConsumeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-open-consume-dialog">
                  <Download className="w-4 h-4 mr-2" />
                  Scarico / Consumo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-amber-500" />
                    Scarico / Consumo
                  </DialogTitle>
                  <DialogDescription>
                    Registra il consumo di prodotti dall'evento
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="consume-product-desktop">Prodotto</Label>
                    <Select
                      value={consumeProductId}
                      onValueChange={setConsumeProductId}
                      data-testid="select-consume-product-desktop"
                    >
                      <SelectTrigger id="consume-product-desktop">
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
                  {stations && stations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="consume-station-desktop">Stazione</Label>
                      <Select
                        value={selectedStationId}
                        onValueChange={setSelectedStationId}
                      >
                        <SelectTrigger id="consume-station-desktop">
                          <SelectValue placeholder="Tutte le stazioni" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">Tutte le stazioni</SelectItem>
                          {stations.map((station) => (
                            <SelectItem key={station.id} value={station.id}>
                              {station.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="consume-quantity-desktop">Quantità</Label>
                    <Input
                      id="consume-quantity-desktop"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0"
                      value={consumeQuantity}
                      onChange={(e) => setConsumeQuantity(e.target.value)}
                      data-testid="input-consume-quantity-desktop"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consume-reason-desktop">Note (opzionale)</Label>
                    <Input
                      id="consume-reason-desktop"
                      placeholder="Es: Consumo serata"
                      value={consumeReason}
                      onChange={(e) => setConsumeReason(e.target.value)}
                      data-testid="input-consume-reason-desktop"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsConsumeDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button
                    onClick={handleConsume}
                    disabled={consumeMutation.isPending || !consumeProductId}
                    variant="secondary"
                    data-testid="button-confirm-consume-desktop"
                  >
                    {consumeMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Registrazione...
                      </>
                    ) : (
                      <>
                        <Minus className="h-4 w-4 mr-2" />
                        Registra Consumo
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {stations && stations.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="station-filter-desktop" className="text-sm text-muted-foreground">
                    Filtra per Stazione
                  </Label>
                  <Select
                    value={selectedStationId}
                    onValueChange={setSelectedStationId}
                    data-testid="select-station-desktop"
                  >
                    <SelectTrigger id="station-filter-desktop">
                      <SelectValue placeholder="Tutte le stazioni" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tutte le stazioni</SelectItem>
                      {stations.map((station) => (
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
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-teal">{summary?.totalLoaded?.toFixed(2) || '0.00'}</div>
              <p className="text-sm text-muted-foreground">Totale Caricato</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">{summary?.totalConsumed?.toFixed(2) || '0.00'}</div>
              <p className="text-sm text-muted-foreground">Totale Consumato</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{directStock?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Prodotti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{summary?.movements?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Movimenti</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Riepilogo Stock Diretto
            </CardTitle>
            <CardDescription>
              Visualizza lo stato attuale dello stock per questo evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stockLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : directStock && directStock.length > 0 ? (
              <Table data-testid="table-direct-stock-desktop">
                <TableHeader>
                  <TableRow>
                    <TableHead>Prodotto</TableHead>
                    <TableHead>Codice</TableHead>
                    <TableHead className="text-right">Caricato</TableHead>
                    <TableHead className="text-right">Consumato</TableHead>
                    <TableHead className="text-right">Disponibile</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {directStock.map((stock) => (
                    <TableRow key={stock.productId} data-testid={`row-stock-desktop-${stock.productId}`}>
                      <TableCell className="font-medium">{stock.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{stock.productCode}</TableCell>
                      <TableCell className="text-right text-teal">{stock.loaded.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-amber-500">{stock.consumed.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <Badge variant={stock.available > 0 ? "default" : "secondary"}>
                          {stock.available.toFixed(2)} {stock.unitOfMeasure}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun prodotto caricato direttamente</p>
                <p className="text-sm mt-1">Usa il pulsante "Carico Diretto" per aggiungere prodotti</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Ultimi Movimenti
            </CardTitle>
            <CardDescription>
              Storico delle operazioni di carico e scarico
            </CardDescription>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : summary?.movements && summary.movements.length > 0 ? (
              <Table data-testid="table-movements-desktop">
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Prodotto</TableHead>
                    <TableHead className="text-right">Quantità</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.movements.map((mov) => (
                    <TableRow key={mov.id} data-testid={`row-movement-desktop-${mov.id}`}>
                      <TableCell className="text-muted-foreground">
                        {mov.createdAt ? new Date(mov.createdAt).toLocaleString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={mov.type === 'DIRECT_LOAD' ? 'default' : 'secondary'}>
                          {mov.type === 'DIRECT_LOAD' ? 'Carico' : 'Consumo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{mov.productName}</TableCell>
                      <TableCell className={`text-right ${mov.type === 'DIRECT_LOAD' ? 'text-teal' : 'text-amber-500'}`}>
                        {mov.type === 'DIRECT_LOAD' ? '+' : '-'}{parseFloat(mov.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {mov.reason || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nessun movimento registrato</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8"
      >
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-xl"
          data-testid="button-back"
        >
          <Link href={`/events/${id}/hub`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate" data-testid="text-event-name">
            Carico/Scarico Diretto
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{event.name}</p>
        </div>
      </motion.div>

      {stations && stations.length > 0 && (
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
                  <Label htmlFor="station-filter" className="text-sm text-muted-foreground">
                    Filtra per Stazione
                  </Label>
                  <Select
                    value={selectedStationId}
                    onValueChange={setSelectedStationId}
                    data-testid="select-station"
                  >
                    <SelectTrigger id="station-filter" data-testid="trigger-station-filter">
                      <SelectValue placeholder="Tutte le stazioni" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Tutte le stazioni</SelectItem>
                      {stations.map((station) => (
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

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 mb-6 md:mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-teal" />
                Carico Diretto
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
                  placeholder="Es: Acquisto fornitore XYZ"
                  value={loadReason}
                  onChange={(e) => setLoadReason(e.target.value)}
                  data-testid="input-load-reason"
                />
              </div>
              <Button
                onClick={handleLoad}
                disabled={loadMutation.isPending}
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
          transition={{ delay: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5 text-amber-500" />
                Scarico / Consumo
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
                  placeholder="Es: Consumo serata"
                  value={consumeReason}
                  onChange={(e) => setConsumeReason(e.target.value)}
                  data-testid="input-consume-reason"
                />
              </div>
              <Button
                onClick={handleConsume}
                disabled={consumeMutation.isPending || !consumeProductId}
                variant="secondary"
                className="w-full"
                data-testid="button-consume"
              >
                <Minus className="h-4 w-4 mr-2" />
                {consumeMutation.isPending ? "Registrazione..." : "Registra Consumo"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card mb-8"
      >
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Package className="h-5 w-5" />
            Riepilogo Stock Diretto
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
                  <TableHead>Codice</TableHead>
                  <TableHead className="text-right">Caricato</TableHead>
                  <TableHead className="text-right">Consumato</TableHead>
                  <TableHead className="text-right">Disponibile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {directStock.map((stock) => (
                  <TableRow key={stock.productId} data-testid={`row-stock-${stock.productId}`}>
                    <TableCell className="font-medium">{stock.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{stock.productCode}</TableCell>
                    <TableCell className="text-right text-teal">{stock.loaded.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-amber-500">{stock.consumed.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      <Badge variant={stock.available > 0 ? "default" : "secondary"}>
                        {stock.available.toFixed(2)} {stock.unitOfMeasure}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun prodotto caricato direttamente</p>
              <p className="text-sm mt-1">Usa il form "Carico Diretto" per aggiungere prodotti</p>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card"
      >
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Ultimi Movimenti
            {summary && (
              <span className="text-sm font-normal text-muted-foreground ml-auto">
                Totale Caricato: {summary.totalLoaded.toFixed(2)} | Totale Consumato: {summary.totalConsumed.toFixed(2)}
              </span>
            )}
          </h2>
        </div>
        <div className="overflow-x-auto">
          {summaryLoading ? (
            <div className="p-6">
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : summary?.movements && summary.movements.length > 0 ? (
            <Table data-testid="table-movements">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prodotto</TableHead>
                  <TableHead className="text-right">Quantità</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.movements.map((mov) => (
                  <TableRow key={mov.id} data-testid={`row-movement-${mov.id}`}>
                    <TableCell className="text-muted-foreground">
                      {mov.createdAt ? new Date(mov.createdAt).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={mov.type === 'DIRECT_LOAD' ? 'default' : 'secondary'}>
                        {mov.type === 'DIRECT_LOAD' ? 'Carico' : 'Consumo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{mov.productName}</TableCell>
                    <TableCell className={`text-right ${mov.type === 'DIRECT_LOAD' ? 'text-teal' : 'text-amber-500'}`}>
                      {mov.type === 'DIRECT_LOAD' ? '+' : '-'}{parseFloat(mov.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {mov.reason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun movimento registrato</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
