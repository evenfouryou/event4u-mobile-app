import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  ArrowLeft,
  Package,
  History,
  MapPin,
  AlertTriangle,
  Pencil,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Users,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Event, Station, Product, User, StockMovement } from "@shared/schema";

type EnrichedStock = {
  id: string;
  productId: string;
  stationId: string | null;
  quantity: string;
  productName?: string;
  productCode?: string;
  unitOfMeasure?: string;
};

type EnrichedMovement = StockMovement & {
  productName?: string;
  productCode?: string;
};

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

const movementTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  LOAD: { label: 'Carico', color: 'text-green-500', bgColor: 'bg-green-500/10', icon: ArrowDownLeft },
  UNLOAD: { label: 'Scarico', color: 'text-red-500', bgColor: 'bg-red-500/10', icon: ArrowUpRight },
  TRANSFER: { label: 'Trasferimento', color: 'text-blue-500', bgColor: 'bg-blue-500/10', icon: RefreshCw },
  CONSUME: { label: 'Consumo', color: 'text-orange-500', bgColor: 'bg-orange-500/10', icon: ArrowUpRight },
  RETURN: { label: 'Reso', color: 'text-purple-500', bgColor: 'bg-purple-500/10', icon: ArrowDownLeft },
  ADJUSTMENT: { label: 'Correzione', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: Pencil },
  ADJUST: { label: 'Correzione', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', icon: Pencil },
};

export default function StationDetail() {
  const { eventId, stationId } = useParams<{ eventId: string; stationId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [adjustSheetOpen, setAdjustSheetOpen] = useState(false);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<EnrichedStock | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [activeTab, setActiveTab] = useState('stock');

  const canAdjustStock = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', eventId],
    enabled: !!eventId,
  });

  const { data: station, isLoading: stationLoading } = useQuery<Station>({
    queryKey: ['/api/stations', stationId],
    enabled: !!stationId,
  });

  const { data: stationStocks, isLoading: stocksLoading } = useQuery<EnrichedStock[]>({
    queryKey: ['/api/stocks/station', stationId],
    enabled: !!stationId,
  });

  const { data: allMovements } = useQuery<EnrichedMovement[]>({
    queryKey: ['/api/stock/movements'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const stationMovements = allMovements?.filter(m => 
    m.fromStationId === stationId || m.toStationId === stationId
  ).sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  }) || [];

  const adjustMutation = useMutation({
    mutationFn: async (data: { productId: string; newQuantity: number; reason: string }) => {
      await apiRequest('POST', '/api/stock/adjust', {
        productId: data.productId,
        newQuantity: data.newQuantity,
        reason: data.reason,
        eventId: eventId,
        stationId: stationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stocks/station', stationId] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', eventId, 'stocks'] });
      setAdjustSheetOpen(false);
      setAdjustDialogOpen(false);
      setSelectedStock(null);
      setNewQuantity('');
      setAdjustReason('');
      triggerHaptic('success');
      toast({
        title: "Quantità corretta",
        description: "Lo stock è stato aggiornato",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile correggere la quantità",
        variant: "destructive",
      });
    },
  });

  const handleOpenAdjust = (stock: EnrichedStock, forMobile?: boolean) => {
    triggerHaptic('medium');
    setSelectedStock(stock);
    setNewQuantity(parseFloat(stock.quantity).toFixed(2));
    setAdjustReason('');
    if (forMobile || isMobile) {
      setAdjustSheetOpen(true);
    } else {
      setAdjustDialogOpen(true);
    }
  };

  const handleSubmitAdjust = () => {
    if (!selectedStock) return;
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida (>= 0)",
        variant: "destructive",
      });
      return;
    }
    adjustMutation.mutate({
      productId: selectedStock.productId,
      newQuantity: qty,
      reason: adjustReason || `Correzione manuale postazione`,
    });
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'Sistema';
    const foundUser = users?.find(u => u.id === userId);
    if (foundUser) {
      if (foundUser.firstName && foundUser.lastName) {
        return `${foundUser.firstName} ${foundUser.lastName}`;
      }
      return foundUser.email;
    }
    return 'Utente';
  };

  const getProductInfo = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    return product || null;
  };

  const assignedBartenders = users?.filter(u => station?.bartenderIds?.includes(u.id)) || [];
  const stockWithQuantity = stationStocks?.filter(s => parseFloat(s.quantity) > 0) || [];

  const handleBack = () => {
    triggerHaptic('light');
    navigate(`/events/${eventId}/hub`);
  };

  if (eventLoading || stationLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Caricamento..."
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-loading">
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-4 pb-24">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  if (!event || !station) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6" data-testid="page-station-detail-not-found">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <MapPin className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-center">Postazione non trovata</h2>
            <p className="text-muted-foreground text-center mb-6">
              La postazione richiesta non esiste o non hai i permessi per visualizzarla.
            </p>
            <Button variant="outline" onClick={handleBack} data-testid="button-back-to-event">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna all'Evento
            </Button>
          </div>
        </div>
      );
    }
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Postazione"
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={handleBack} data-testid="button-back-not-found">
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 pb-24">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springConfig}
            className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6"
          >
            <MapPin className="h-10 w-10 text-muted-foreground" />
          </motion.div>
          <h2 className="text-xl font-semibold mb-2 text-center">Postazione non trovata</h2>
          <p className="text-muted-foreground text-center mb-6">
            La postazione richiesta non esiste o non hai i permessi per visualizzarla.
          </p>
          <HapticButton
            variant="outline"
            onClick={handleBack}
            className="min-h-[48px] px-6"
            data-testid="button-back-to-event"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Torna all'Evento
          </HapticButton>
        </div>
      </MobileAppLayout>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-station-detail">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold" data-testid="text-station-name">{station.name}</h1>
                  {(station as any).isGeneral && (
                    <Badge variant="secondary">Fissa</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {event.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card data-testid="card-total-products">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums">{stockWithQuantity.length}</div>
                  <p className="text-sm text-muted-foreground">Prodotti in stock</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-movements-count">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <History className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums">{stationMovements.length}</div>
                  <p className="text-sm text-muted-foreground">Movimenti</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-bartenders">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <div className="text-3xl font-bold tabular-nums">{assignedBartenders.length}</div>
                  <p className="text-sm text-muted-foreground">Baristi assegnati</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="stock" data-testid="tab-stock">
              <Package className="h-4 w-4 mr-2" />
              Stock
            </TabsTrigger>
            <TabsTrigger value="movements" data-testid="tab-movements">
              <History className="h-4 w-4 mr-2" />
              Movimenti
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Prodotti in Postazione</CardTitle>
                <CardDescription>Lista dei prodotti con quantità disponibile</CardDescription>
              </CardHeader>
              <CardContent>
                {stocksLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : stockWithQuantity.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prodotto</TableHead>
                        <TableHead>Codice</TableHead>
                        <TableHead className="text-right">Quantità</TableHead>
                        <TableHead>Stato</TableHead>
                        {canAdjustStock && <TableHead className="w-[80px]">Azioni</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockWithQuantity.map((stock) => {
                        const product = getProductInfo(stock.productId);
                        const quantity = parseFloat(stock.quantity);
                        const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
                        const productName = stock.productName || product?.name || 'Sconosciuto';
                        const productCode = stock.productCode || product?.code || '-';
                        const unitOfMeasure = stock.unitOfMeasure || product?.unitOfMeasure || '';

                        return (
                          <TableRow key={stock.id} data-testid={`row-stock-${stock.id}`}>
                            <TableCell className="font-medium">{productName}</TableCell>
                            <TableCell className="text-muted-foreground">{productCode}</TableCell>
                            <TableCell className="text-right font-mono">
                              {isNaN(quantity) ? '0.00' : quantity.toFixed(2)} {unitOfMeasure}
                            </TableCell>
                            <TableCell>
                              {isLowStock ? (
                                <Badge variant="destructive" data-testid={`badge-low-stock-${stock.id}`}>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Stock Basso
                                </Badge>
                              ) : (
                                <Badge variant="secondary">OK</Badge>
                              )}
                            </TableCell>
                            {canAdjustStock && (
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => handleOpenAdjust(stock)}
                                  data-testid={`button-adjust-${stock.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium mb-1">Nessun prodotto</p>
                    <p className="text-sm text-muted-foreground">
                      Trasferisci prodotti dal magazzino per iniziare
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Storico Movimenti</CardTitle>
                <CardDescription>Tutti i movimenti di stock della postazione</CardDescription>
              </CardHeader>
              <CardContent>
                {stationMovements.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Prodotto</TableHead>
                        <TableHead className="text-right">Quantità</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Operatore</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stationMovements.map((movement) => {
                        const product = getProductInfo(movement.productId);
                        const config = movementTypeConfig[movement.type] || { 
                          label: movement.type, 
                          color: 'text-muted-foreground',
                          bgColor: 'bg-muted',
                          icon: RefreshCw 
                        };
                        const Icon = config.icon;
                        const isIncoming = movement.toStationId === stationId;

                        return (
                          <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                                  <Icon className={`h-4 w-4 ${config.color}`} />
                                </div>
                                <span className={`font-medium ${config.color}`}>{config.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {movement.productName || product?.name || 'Sconosciuto'}
                            </TableCell>
                            <TableCell className={`text-right font-mono ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
                              {isIncoming ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-[200px] truncate">
                              {movement.reason || '-'}
                            </TableCell>
                            <TableCell>{getUserName(movement.performedBy)}</TableCell>
                            <TableCell className="text-muted-foreground font-mono">
                              {movement.createdAt 
                                ? format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })
                                : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium mb-1">Nessun movimento</p>
                    <p className="text-sm text-muted-foreground">
                      I movimenti appariranno qui quando saranno effettuati
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Correggi Quantità</DialogTitle>
              <DialogDescription>
                Modifica la quantità del prodotto in questa postazione
              </DialogDescription>
            </DialogHeader>
            {selectedStock && (
              <div className="space-y-4" data-testid="dialog-adjust-stock">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="font-semibold text-lg">{selectedStock.productName || 'Prodotto'}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quantità attuale: <span className="font-medium tabular-nums">{parseFloat(selectedStock.quantity).toFixed(2)}</span> {selectedStock.unitOfMeasure || ''}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nuova Quantità</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    placeholder="0.00"
                    data-testid="input-new-quantity"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Motivo della correzione (opzionale)</label>
                  <Textarea
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Es. Inventario fisico, rottura, errore precedente..."
                    rows={3}
                    data-testid="input-adjust-reason"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} data-testid="button-cancel-adjust">
                Annulla
              </Button>
              <Button onClick={handleSubmitAdjust} disabled={adjustMutation.isPending} data-testid="button-confirm-adjust">
                {adjustMutation.isPending ? 'Salvataggio...' : 'Salva'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={station.name}
          subtitle={event.name}
          leftAction={
            <HapticButton variant="ghost" size="icon" onClick={handleBack} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
    >
      <div className="py-4 space-y-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="flex items-center gap-3 px-1"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold truncate" data-testid="text-station-name">{station.name}</h1>
              {(station as any).isGeneral && (
                <Badge variant="secondary" className="shrink-0">Fissa</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.name}</span>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        >
          <Card className="overflow-hidden" data-testid="card-total-products">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {stockWithQuantity.length}
              </div>
              <p className="text-xs text-muted-foreground">Prodotti</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden" data-testid="card-movements-count">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
                <History className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold tabular-nums">{stationMovements.length}</div>
              <p className="text-xs text-muted-foreground">Movimenti</p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden" data-testid="card-bartenders">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold tabular-nums">{assignedBartenders.length}</div>
              <p className="text-xs text-muted-foreground">Baristi</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => { triggerHaptic('light'); setActiveTab(v); }} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12" data-testid="tabs-station">
              <TabsTrigger value="stock" className="min-h-[44px] text-base" data-testid="tab-stock">
                <Package className="h-5 w-5 mr-2" />
                Stock
              </TabsTrigger>
              <TabsTrigger value="movements" className="min-h-[44px] text-base" data-testid="tab-movements">
                <History className="h-5 w-5 mr-2" />
                Movimenti
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stock" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
              <AnimatePresence mode="wait">
                {stocksLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                    <Skeleton className="h-28 w-full rounded-2xl" />
                  </motion.div>
                ) : stockWithQuantity.length > 0 ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {stockWithQuantity.map((stock, index) => {
                      const product = getProductInfo(stock.productId);
                      const quantity = parseFloat(stock.quantity);
                      const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
                      const productName = stock.productName || product?.name || 'Sconosciuto';
                      const productCode = stock.productCode || product?.code || '-';
                      const unitOfMeasure = stock.unitOfMeasure || product?.unitOfMeasure || '';

                      return (
                        <motion.div
                          key={stock.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springConfig, delay: index * 0.03 }}
                        >
                          <Card 
                            className="overflow-hidden hover-elevate active-elevate-2"
                            data-testid={`stock-card-${stock.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-base truncate">{productName}</h3>
                                    {isLowStock && (
                                      <Badge variant="destructive" className="shrink-0" data-testid={`badge-low-stock-${stock.id}`}>
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Basso
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-3">{productCode}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-2xl font-bold tabular-nums">
                                        {isNaN(quantity) ? '0.00' : quantity.toFixed(2)}
                                      </span>
                                      <span className="text-sm text-muted-foreground">{unitOfMeasure}</span>
                                    </div>
                                    {!isLowStock && quantity > 0 && (
                                      <Badge variant="secondary">OK</Badge>
                                    )}
                                  </div>
                                </div>
                                {canAdjustStock && (
                                  <HapticButton
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleOpenAdjust(stock)}
                                    className="shrink-0"
                                    data-testid={`button-adjust-${stock.id}`}
                                  >
                                    <Pencil className="h-5 w-5" />
                                  </HapticButton>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={springConfig}
                  >
                    <Card className="p-8 text-center border-2 border-dashed">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium mb-1">Nessun prodotto</p>
                      <p className="text-sm text-muted-foreground">
                        Trasferisci prodotti dal magazzino per iniziare
                      </p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="movements" className="mt-4 focus-visible:ring-0 focus-visible:ring-offset-0">
              <AnimatePresence mode="wait">
                {stationMovements.length > 0 ? (
                  <motion.div
                    key="content"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {stationMovements.map((movement, index) => {
                      const product = getProductInfo(movement.productId);
                      const config = movementTypeConfig[movement.type] || { 
                        label: movement.type, 
                        color: 'text-muted-foreground',
                        bgColor: 'bg-muted',
                        icon: RefreshCw 
                      };
                      const Icon = config.icon;
                      const isIncoming = movement.toStationId === stationId;

                      return (
                        <motion.div
                          key={movement.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ ...springConfig, delay: index * 0.03 }}
                        >
                          <Card className="overflow-hidden" data-testid={`movement-card-${movement.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`w-11 h-11 rounded-xl ${config.bgColor} flex items-center justify-center shrink-0`}>
                                  <Icon className={`h-5 w-5 ${config.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <div className="min-w-0">
                                      <p className={`font-semibold ${config.color}`}>{config.label}</p>
                                      <p className="text-sm font-medium truncate">
                                        {movement.productName || product?.name || 'Sconosciuto'}
                                      </p>
                                    </div>
                                    <span className={`text-lg font-bold tabular-nums shrink-0 ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
                                      {isIncoming ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                                    </span>
                                  </div>
                                  {movement.reason && (
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{movement.reason}</p>
                                  )}
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{getUserName(movement.performedBy)}</span>
                                    <span className="tabular-nums">
                                      {movement.createdAt 
                                        ? format(new Date(movement.createdAt), 'dd/MM HH:mm', { locale: it })
                                        : '-'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={springConfig}
                  >
                    <Card className="p-8 text-center border-2 border-dashed">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <History className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium mb-1">Nessun movimento</p>
                      <p className="text-sm text-muted-foreground">
                        I movimenti appariranno qui quando saranno effettuati
                      </p>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <BottomSheet
        open={adjustSheetOpen}
        onClose={() => setAdjustSheetOpen(false)}
        title="Correggi Quantità"
      >
        <div className="p-4 space-y-4" data-testid="sheet-adjust-stock">
          {selectedStock && (
            <>
              <div className="p-4 rounded-2xl bg-muted/50">
                <p className="font-semibold text-lg">{selectedStock.productName || 'Prodotto'}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Quantità attuale: <span className="font-medium tabular-nums">{parseFloat(selectedStock.quantity).toFixed(2)}</span> {selectedStock.unitOfMeasure || ''}
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Nuova Quantità</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="0.00"
                  className="h-12 text-lg"
                  data-testid="input-new-quantity"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo della correzione (opzionale)</label>
                <Textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Es. Inventario fisico, rottura, errore precedente..."
                  rows={3}
                  className="text-base"
                  data-testid="input-adjust-reason"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <HapticButton
                  variant="outline"
                  onClick={() => setAdjustSheetOpen(false)}
                  className="flex-1 h-12"
                  data-testid="button-cancel-adjust"
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  onClick={handleSubmitAdjust}
                  disabled={adjustMutation.isPending}
                  className="flex-1 h-12 gradient-golden text-black font-semibold"
                  hapticType="medium"
                  data-testid="button-confirm-adjust"
                >
                  {adjustMutation.isPending ? 'Salvataggio...' : 'Salva'}
                </HapticButton>
              </div>
            </>
          )}
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
