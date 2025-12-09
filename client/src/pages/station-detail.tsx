import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { motion } from "framer-motion";
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

const movementTypeConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  LOAD: { label: 'Carico', color: 'text-green-500', icon: ArrowDownLeft },
  UNLOAD: { label: 'Scarico', color: 'text-red-500', icon: ArrowUpRight },
  TRANSFER: { label: 'Trasferimento', color: 'text-blue-500', icon: RefreshCw },
  CONSUME: { label: 'Consumo', color: 'text-orange-500', icon: ArrowUpRight },
  RETURN: { label: 'Reso', color: 'text-purple-500', icon: ArrowDownLeft },
  ADJUSTMENT: { label: 'Correzione', color: 'text-yellow-500', icon: Pencil },
  ADJUST: { label: 'Correzione', color: 'text-yellow-500', icon: Pencil },
};

export default function StationDetail() {
  const { eventId, stationId } = useParams<{ eventId: string; stationId: string }>();
  const { toast } = useToast();
  const { user } = useAuth();
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<EnrichedStock | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

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
      setAdjustDialogOpen(false);
      setSelectedStock(null);
      setNewQuantity('');
      setAdjustReason('');
      toast({
        title: "Quantità corretta",
        description: "Lo stock è stato aggiornato",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile correggere la quantità",
        variant: "destructive",
      });
    },
  });

  const handleOpenAdjust = (stock: EnrichedStock) => {
    setSelectedStock(stock);
    setNewQuantity(parseFloat(stock.quantity).toFixed(2));
    setAdjustReason('');
    setAdjustDialogOpen(true);
  };

  const handleSubmitAdjust = () => {
    if (!selectedStock) return;
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
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

  if (eventLoading || stationLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!event || !station) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Postazione non trovata</h2>
          <p className="text-muted-foreground mb-4">
            La postazione richiesta non esiste o non hai i permessi per visualizzarla.
          </p>
          <Link href={`/events/${eventId}`}>
            <Button variant="outline" data-testid="button-back-to-event">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Torna all'Evento
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div className="flex items-center gap-4">
          <Link href={`/events/${eventId}`}>
            <Button variant="outline" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold" data-testid="text-station-name">{station.name}</h1>
              {(station as any).isGeneral && (
                <Badge variant="secondary">Fissa</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {event.name}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card data-testid="card-total-products">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prodotti</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stationStocks?.filter(s => parseFloat(s.quantity) > 0).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">prodotti in stock</p>
          </CardContent>
        </Card>

        <Card data-testid="card-movements-count">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Movimenti</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stationMovements.length}</div>
            <p className="text-xs text-muted-foreground">movimenti totali</p>
          </CardContent>
        </Card>

        <Card data-testid="card-bartenders">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baristi</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedBartenders.length}</div>
            <p className="text-xs text-muted-foreground">
              {assignedBartenders.length > 0 
                ? assignedBartenders.map(b => b.firstName || (b.email?.split('@')[0] ?? 'Utente')).join(', ')
                : 'Nessun barista assegnato'}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="grid w-full grid-cols-2" data-testid="tabs-station">
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
            {stocksLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : stationStocks && stationStocks.filter(s => parseFloat(s.quantity) > 0).length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Quantità</TableHead>
                      <TableHead className="text-right">Stato</TableHead>
                      {canAdjustStock && <TableHead className="w-20"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationStocks.filter(s => parseFloat(s.quantity) > 0).map((stock) => {
                      const product = getProductInfo(stock.productId);
                      const quantity = parseFloat(stock.quantity);
                      const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
                      const productName = stock.productName || product?.name || 'Sconosciuto';
                      const productCode = stock.productCode || product?.code || '-';
                      const unitOfMeasure = stock.unitOfMeasure || product?.unitOfMeasure || '';

                      return (
                        <TableRow key={stock.id} data-testid={`stock-row-${stock.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{productName}</div>
                              <div className="text-sm text-muted-foreground">{productCode}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {isNaN(quantity) ? '0.00' : quantity.toFixed(2)} {unitOfMeasure}
                          </TableCell>
                          <TableCell className="text-right">
                            {isLowStock ? (
                              <Badge variant="destructive" data-testid={`badge-low-stock-${stock.id}`}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Basso
                              </Badge>
                            ) : quantity > 0 ? (
                              <Badge variant="secondary">OK</Badge>
                            ) : (
                              <Badge variant="outline">Esaurito</Badge>
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
              </Card>
            ) : (
              <Card className="p-8 text-center border-2 border-dashed">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-1">Nessun prodotto in questa postazione</p>
                <p className="text-sm text-muted-foreground">
                  Trasferisci prodotti dal magazzino per iniziare
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="movements" className="mt-4">
            {stationMovements.length > 0 ? (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Ora</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Quantità</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Operatore</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stationMovements.map((movement) => {
                      const product = getProductInfo(movement.productId);
                      const config = movementTypeConfig[movement.type] || { 
                        label: movement.type, 
                        color: 'text-muted-foreground', 
                        icon: RefreshCw 
                      };
                      const Icon = config.icon;
                      const isIncoming = movement.toStationId === stationId;

                      return (
                        <TableRow key={movement.id} data-testid={`movement-row-${movement.id}`}>
                          <TableCell className="tabular-nums">
                            {movement.createdAt 
                              ? format(new Date(movement.createdAt), 'dd/MM/yyyy HH:mm', { locale: it })
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className={`flex items-center gap-2 ${config.color}`}>
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{config.label}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {movement.productName || product?.name || 'Sconosciuto'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {movement.productCode || product?.code || '-'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className={`text-right tabular-nums font-semibold ${isIncoming ? 'text-green-500' : 'text-red-500'}`}>
                            {isIncoming ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                          </TableCell>
                          <TableCell className="max-w-48 truncate" title={movement.reason || '-'}>
                            {movement.reason || '-'}
                          </TableCell>
                          <TableCell>
                            {getUserName(movement.performedBy)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>
            ) : (
              <Card className="p-8 text-center border-2 border-dashed">
                <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-1">Nessun movimento registrato</p>
                <p className="text-sm text-muted-foreground">
                  I movimenti appariranno qui quando saranno effettuati
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent data-testid="dialog-adjust-stock">
          <DialogHeader>
            <DialogTitle>Correggi Quantità</DialogTitle>
          </DialogHeader>
          {selectedStock && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-muted/50">
                <p className="font-medium">{selectedStock.productName || 'Prodotto'}</p>
                <p className="text-sm text-muted-foreground">
                  Quantità attuale: {parseFloat(selectedStock.quantity).toFixed(2)} {selectedStock.unitOfMeasure || ''}
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
            <Button
              variant="outline"
              onClick={() => setAdjustDialogOpen(false)}
              data-testid="button-cancel-adjust"
            >
              Annulla
            </Button>
            <Button
              onClick={handleSubmitAdjust}
              disabled={adjustMutation.isPending}
              className="gradient-golden text-black font-semibold"
              data-testid="button-confirm-adjust"
            >
              {adjustMutation.isPending ? 'Salvataggio...' : 'Salva Correzione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
