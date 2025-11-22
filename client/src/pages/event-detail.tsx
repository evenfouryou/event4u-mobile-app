import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Users, Package, Warehouse } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStationSchema, type Event, type Station, type InsertStation, type User, type Product } from "@shared/schema";

const transferSchema = z.object({
  productId: z.string().min(1, "Seleziona un prodotto"),
  stationId: z.string().optional(),
  quantity: z.string().min(1, "Inserisci una quantità").refine((val) => parseFloat(val) > 0, "Quantità deve essere maggiore di zero"),
});

type TransferFormValues = z.infer<typeof transferSchema>;

export default function EventDetail() {
  const { id } = useParams();
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: generalStocks } = useQuery<Array<{
    id: string;
    productId: string;
    quantity: string;
    productName: string;
    productCode: string;
    unitOfMeasure: string;
  }>>({
    queryKey: ['/api/stock/general'],
  });

  const { data: eventStocks, isLoading: eventStocksLoading } = useQuery<Array<{
    id: string;
    productId: string;
    stationId: string | null;
    quantity: string;
  }>>({
    queryKey: ['/api/events', id, 'stocks'],
    enabled: !!id,
  });

  const stationForm = useForm<InsertStation>({
    resolver: zodResolver(insertStationSchema),
    defaultValues: {
      name: '',
      assignedUserId: '',
      eventId: id,
    },
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      productId: '',
      stationId: '',
      quantity: '',
    },
  });

  const createStationMutation = useMutation({
    mutationFn: async (data: InsertStation) => {
      await apiRequest('POST', `/api/events/${id}/stations`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stations'] });
      setStationDialogOpen(false);
      stationForm.reset();
      toast({
        title: "Successo",
        description: "Postazione creata con successo",
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
        description: "Impossibile creare la postazione",
        variant: "destructive",
      });
    },
  });

  const transferStockMutation = useMutation({
    mutationFn: async (data: TransferFormValues) => {
      await apiRequest('POST', '/api/stock/event-transfer', {
        eventId: id,
        stationId: data.stationId || null,
        productId: data.productId,
        quantity: data.quantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setTransferDialogOpen(false);
      transferForm.reset();
      toast({
        title: "Successo",
        description: "Stock trasferito con successo",
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
        description: error.message || "Impossibile trasferire lo stock",
        variant: "destructive",
      });
    },
  });

  const bartenders = users?.filter(u => u.role === 'bartender') || [];

  if (eventLoading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Evento non trovato</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    draft: { label: 'Bozza', variant: 'outline' },
    scheduled: { label: 'Programmato', variant: 'secondary' },
    ongoing: { label: 'In Corso', variant: 'default' },
    closed: { label: 'Chiuso', variant: 'destructive' },
  };
  const statusInfo = statusLabels[event.status] || statusLabels.draft;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <Button asChild variant="ghost" className="mb-6" data-testid="button-back">
        <Link href="/events">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna agli Eventi
        </Link>
      </Button>

      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold mb-2">{event.name}</h1>
            <div className="flex items-center gap-3">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              <span className="text-sm text-muted-foreground">
                {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" data-testid="button-view-report">
              <Link href={`/events/${id}/report`}>
                Report
              </Link>
            </Button>
          </div>
        </div>

        {event.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Note</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{event.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Inventario Evento</h2>
          <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-transfer-stock">
                <Warehouse className="h-4 w-4 mr-2" />
                Trasferisci Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Trasferisci Stock da Magazzino</DialogTitle>
              </DialogHeader>
              <Form {...transferForm}>
                <form onSubmit={transferForm.handleSubmit((data) => transferStockMutation.mutate(data))} className="space-y-4">
                  {generalStocks && generalStocks.length > 0 ? (
                    <>
                      <div className="text-sm text-muted-foreground mb-4">
                        Seleziona prodotto dal magazzino generale per trasferirlo all'evento
                      </div>
                      <FormField
                        control={transferForm.control}
                        name="productId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prodotto</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-transfer-product">
                                  <SelectValue placeholder="Seleziona prodotto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {generalStocks.filter(s => parseFloat(s.quantity) > 0).map((stock) => (
                                  <SelectItem key={stock.productId} value={stock.productId}>
                                    {stock.productName} - Disponibile: {parseFloat(stock.quantity).toFixed(2)} {stock.unitOfMeasure}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                  <FormField
                    control={transferForm.control}
                    name="stationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postazione Destinazione (opzionale)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-transfer-station">
                              <SelectValue placeholder="Seleziona postazione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Evento (generale)</SelectItem>
                            {stations?.map((station) => (
                              <SelectItem key={station.id} value={station.id}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                      <FormField
                        control={transferForm.control}
                        name="quantity"
                        render={({ field }) => {
                          const selectedStock = generalStocks.find(s => s.productId === transferForm.watch('productId'));
                          const maxQuantity = selectedStock ? parseFloat(selectedStock.quantity) : 0;
                          return (
                            <FormItem>
                              <FormLabel>Quantità {selectedStock && `(Max: ${maxQuantity.toFixed(2)})`}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  max={maxQuantity}
                                  placeholder="0.00"
                                  data-testid="input-transfer-quantity"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setTransferDialogOpen(false)}
                          data-testid="button-cancel-transfer"
                        >
                          Annulla
                        </Button>
                        <Button type="submit" disabled={transferStockMutation.isPending} data-testid="button-submit-transfer">
                          Trasferisci
                        </Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-2">Nessun prodotto disponibile in magazzino</p>
                      <p className="text-sm text-muted-foreground">Carica prodotti nel magazzino generale prima di trasferirli</p>
                      <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                          Chiudi
                        </Button>
                      </DialogFooter>
                    </div>
                  )}
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {eventStocksLoading ? (
          <Skeleton className="h-48" />
        ) : eventStocks && eventStocks.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Prodotti Presenti</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {eventStocks.map((stock) => {
                const product = products?.find(p => p.id === stock.productId);
                const station = stations?.find(s => s.id === stock.stationId);
                const quantity = parseFloat(stock.quantity);
                const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
                
                return (
                  <Card key={stock.id} data-testid={`event-stock-${stock.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{product?.name || 'Unknown'}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {station ? station.name : 'Magazzino Evento'}
                          </p>
                        </div>
                        {isLowStock && (
                          <Badge variant="destructive" data-testid={`badge-low-stock-event-${stock.id}`}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Stock Basso
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold tabular-nums">
                          {isNaN(quantity) ? '0.00' : quantity.toFixed(2)} {product?.unitOfMeasure || ''}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-6 text-center p-6 border-2 border-dashed rounded-lg">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nessun prodotto trasferito all'evento. Usa il pulsante "Trasferisci Stock" per iniziare.
            </p>
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Postazioni</h2>
          <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-station">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Postazione
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Postazione</DialogTitle>
              </DialogHeader>
              <Form {...stationForm}>
                <form onSubmit={stationForm.handleSubmit((data) => createStationMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={stationForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Postazione</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Es. Bar Centrale, Privé 1, ecc." data-testid="input-station-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={stationForm.control}
                    name="assignedUserId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Barista Assegnato (opzionale)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-station-bartender">
                              <SelectValue placeholder="Seleziona barista" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Nessuno</SelectItem>
                            {bartenders.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStationDialogOpen(false)}
                      data-testid="button-cancel-station"
                    >
                      Annulla
                    </Button>
                    <Button type="submit" disabled={createStationMutation.isPending} data-testid="button-submit-station">
                      Crea Postazione
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {stationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : stations && stations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stations.map((station) => {
              const assignedUser = users?.find(u => u.id === station.assignedUserId);
              return (
                <Card key={station.id} data-testid={`station-card-${station.id}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{station.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {assignedUser
                          ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.email
                          : 'Nessun barista assegnato'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">Nessuna postazione creata</p>
              <Button onClick={() => setStationDialogOpen(true)} data-testid="button-create-first-station">
                <Plus className="h-4 w-4 mr-2" />
                Crea Prima Postazione
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
