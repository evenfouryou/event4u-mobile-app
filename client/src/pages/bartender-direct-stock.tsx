import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Minus, Plus, Package, Search, MapPin, History } from "lucide-react";
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

  const urlParams = new URLSearchParams(searchString);
  const urlStationId = urlParams.get('stationId') || '';

  const [selectedStationId, setSelectedStationId] = useState<string>(urlStationId);
  const [activeTab, setActiveTab] = useState<string>("scarica");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"load" | "unload">("load");
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; unit: string; available?: number } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

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

  const { data: summary } = useQuery<DirectStockSummary>({
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

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.code?.toLowerCase().includes(query)
    );
  }, [products, searchQuery]);

  const filteredStock = useMemo(() => {
    if (!directStock) return [];
    if (!searchQuery.trim()) return directStock.filter(s => s.available > 0);
    const query = searchQuery.toLowerCase();
    return directStock.filter(s => 
      s.available > 0 && (
        s.productName.toLowerCase().includes(query) || 
        s.productCode?.toLowerCase().includes(query)
      )
    );
  }, [directStock, searchQuery]);

  const loadMutation = useMutation({
    mutationFn: async (data: { productId: string; quantity: number; stationId?: string; reason?: string }) => {
      await apiRequest('POST', `/api/events/${id}/direct-stock/load`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'direct-stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'direct-stock', 'summary'] });
      closeDialog();
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
      closeDialog();
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

  const openLoadDialog = (product: Product) => {
    setSelectedProduct({ id: product.id, name: product.name, unit: product.unitOfMeasure });
    setActionType("load");
    setQuantity("");
    setReason("");
    setActionDialogOpen(true);
  };

  const openUnloadDialog = (stock: DirectStock) => {
    setSelectedProduct({ id: stock.productId, name: stock.productName, unit: stock.unitOfMeasure, available: stock.available });
    setActionType("unload");
    setQuantity("");
    setReason("");
    setActionDialogOpen(true);
  };

  const closeDialog = () => {
    setActionDialogOpen(false);
    setSelectedProduct(null);
    setQuantity("");
    setReason("");
  };

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    if (!selectedProduct || isNaN(qty) || qty <= 0) {
      toast({
        title: "Quantità non valida",
        description: "Inserisci una quantità maggiore di zero",
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

    const data = {
      productId: selectedProduct.id,
      quantity: qty,
      stationId: activeStationId,
      reason: reason || undefined,
    };

    if (actionType === "load") {
      loadMutation.mutate(data);
    } else {
      consumeMutation.mutate(data);
    }
  };

  const quickQuantities = [1, 2, 5, 10];

  const currentStation = stations?.find(s => s.id === activeStationId);

  if (eventLoading || authLoading || stationsLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <Skeleton className="h-12 w-48 mb-6 rounded-xl" />
        <Skeleton className="h-12 w-full mb-4 rounded-xl" />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
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
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="p-4 max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="shrink-0"
              data-testid="button-back"
            >
              <Link href={`/events/${id}`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate" data-testid="text-page-title">
                Carico/Scarico Diretto
              </h1>
              <p className="text-xs text-muted-foreground truncate">{event.name}</p>
            </div>
            {summary && (
              <Badge variant="outline" className="shrink-0">
                <History className="h-3 w-3 mr-1" />
                {summary.totalConsumed.toFixed(0)}
              </Badge>
            )}
          </div>

          {myStations.length > 1 ? (
            <Select value={selectedStationId} onValueChange={setSelectedStationId}>
              <SelectTrigger className="w-full" data-testid="trigger-station-select">
                <MapPin className="h-4 w-4 mr-2 text-primary" />
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
          ) : currentStation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{currentStation.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {!activeStationId && myStations.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 text-center"
          >
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Non sei assegnato a nessuna stazione</p>
            <p className="text-sm text-muted-foreground mt-1">Contatta l'organizzatore</p>
          </motion.div>
        ) : (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="scarica" className="gap-2" data-testid="tab-scarica">
                  <Minus className="h-4 w-4" />
                  Scarica
                </TabsTrigger>
                <TabsTrigger value="carica" className="gap-2" data-testid="tab-carica">
                  <Plus className="h-4 w-4" />
                  Carica
                </TabsTrigger>
              </TabsList>

              <div className="relative mt-4 mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca prodotto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-product"
                />
              </div>

              <TabsContent value="scarica" className="mt-0">
                {stockLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                  </div>
                ) : filteredStock.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredStock.map((stock) => (
                      <motion.div
                        key={stock.productId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <Card 
                          className="glass-card cursor-pointer hover-elevate active-elevate-2 overflow-visible"
                          onClick={() => openUnloadDialog(stock)}
                          data-testid={`card-stock-${stock.productId}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <Badge variant="secondary" className="text-xs">
                                {stock.productCode}
                              </Badge>
                              <Badge variant="default" className="text-xs">
                                {stock.available.toFixed(1)}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm leading-tight line-clamp-2">
                              {stock.productName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {stock.unitOfMeasure}
                            </p>
                            <Button 
                              size="sm" 
                              variant="destructive" 
                              className="w-full mt-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                openUnloadDialog(stock);
                              }}
                              data-testid={`button-unload-${stock.productId}`}
                            >
                              <Minus className="h-4 w-4 mr-1" />
                              Scarica
                            </Button>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "Nessun prodotto trovato" : "Nessun prodotto da scaricare"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery ? "Prova con un'altra ricerca" : "Carica prima dei prodotti"}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="carica" className="mt-0">
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map((product) => {
                      const stockInfo = directStock?.find(s => s.productId === product.id);
                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <Card 
                            className="glass-card cursor-pointer hover-elevate active-elevate-2 overflow-visible"
                            onClick={() => openLoadDialog(product)}
                            data-testid={`card-product-${product.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="secondary" className="text-xs">
                                  {product.code}
                                </Badge>
                                {stockInfo && (
                                  <Badge variant="outline" className="text-xs">
                                    {stockInfo.available.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                              <p className="font-medium text-sm leading-tight line-clamp-2">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {product.unitOfMeasure}
                              </p>
                              <Button 
                                size="sm" 
                                className="w-full mt-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLoadDialog(product);
                                }}
                                data-testid={`button-load-${product.id}`}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Carica
                              </Button>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <p className="text-muted-foreground">
                      {searchQuery ? "Nessun prodotto trovato" : "Nessun prodotto disponibile"}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "load" ? (
                <>
                  <Plus className="h-5 w-5 text-primary" />
                  Carica Prodotto
                </>
              ) : (
                <>
                  <Minus className="h-5 w-5 text-destructive" />
                  Scarica Prodotto
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">{selectedProduct.unit}</p>
                {actionType === "unload" && selectedProduct.available !== undefined && (
                  <p className="text-sm text-primary mt-1">
                    Disponibile: {selectedProduct.available.toFixed(2)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Quantità rapida</p>
                <div className="flex gap-2">
                  {quickQuantities.map((q) => (
                    <Button
                      key={q}
                      variant={quantity === String(q) ? "default" : "outline"}
                      size="sm"
                      onClick={() => setQuantity(String(q))}
                      className="flex-1"
                      data-testid={`button-qty-${q}`}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Quantità personalizzata</p>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-lg text-center"
                  data-testid="input-quantity"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Note (opzionale)</p>
                <Input
                  placeholder={actionType === "load" ? "Es: Acquisto fornitore" : "Es: Tavolo 5"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  data-testid="input-reason"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel">
              Annulla
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={loadMutation.isPending || consumeMutation.isPending || !quantity}
              variant={actionType === "load" ? "default" : "destructive"}
              data-testid="button-confirm"
            >
              {loadMutation.isPending || consumeMutation.isPending ? "..." : "Conferma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
