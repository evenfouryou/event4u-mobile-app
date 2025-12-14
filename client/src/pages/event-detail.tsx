import { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Package, 
  Warehouse, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Clock, 
  FilePenLine, 
  CalendarCheck,
  MapPin,
  Pencil,
  Trash2
} from "lucide-react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertStationSchema, updateEventSchema, type Event, type Station, type InsertStation, type User, type Product } from "@shared/schema";

type ProductTransfer = {
  productId: string;
  quantity: number;
};

type TransferResult = {
  successful: { productId: string; productName: string }[];
  failed: { productId: string; productName: string; error: string }[];
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Bozza', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: FilePenLine },
  scheduled: { label: 'Programmato', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: CalendarCheck },
  ongoing: { label: 'In Corso', color: 'text-teal', bgColor: 'bg-teal-500/20', icon: Clock },
  closed: { label: 'Chiuso', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2 },
};

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-5"
      data-testid={testId}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </motion.div>
  );
}

export default function EventDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [stationDialogOpen, setStationDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Map<string, string>>(new Map());
  const [destinationStationId, setDestinationStationId] = useState<string>('general');
  const [selectedBartenderIds, setSelectedBartenderIds] = useState<string[]>([]);
  const [editingBartenderIds, setEditingBartenderIds] = useState<Map<string, string[]>>(new Map());
  const [editingStationIds, setEditingStationIds] = useState<Set<string>>(new Set());
  const [editStockDialogOpen, setEditStockDialogOpen] = useState(false);
  const [editingStock, setEditingStock] = useState<{ stockId: string; productId: string; stationId: string | null; currentQuantity: string; productName: string } | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  // Redirect bartenders to their dedicated page
  const isBartender = user?.role === 'bartender';
  useEffect(() => {
    if (isBartender && id) {
      setLocation(`/bartender/events/${id}/direct-stock`);
    }
  }, [isBartender, id, setLocation]);

  if (isBartender) {
    return null;
  }

  const { data: event, isLoading: eventLoading } = useQuery<Event>({
    queryKey: ['/api/events', id],
  });

  const { data: eventStations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/events', id, 'stations'],
    enabled: !!id,
  });

  const { data: generalStations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
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
      bartenderIds: [],
      eventId: id,
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
      setSelectedBartenderIds([]);
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

  const updateBartendersMutation = useMutation({
    mutationFn: async ({ stationId, bartenderIds }: { stationId: string; bartenderIds: string[] }) => {
      await apiRequest('PATCH', `/api/stations/${stationId}/bartenders`, { bartenderIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stations'] });
      setEditingStationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(variables.stationId);
        return newSet;
      });
      setEditingBartenderIds(prev => {
        const newMap = new Map(prev);
        newMap.delete(variables.stationId);
        return newMap;
      });
      toast({
        title: "Successo",
        description: "Baristi aggiornati con successo",
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
        description: "Impossibile aggiornare i baristi",
        variant: "destructive",
      });
    },
  });

  const transferStockMutation = useMutation({
    mutationFn: async (transfers: ProductTransfer[]): Promise<TransferResult> => {
      const stationId = destinationStationId === 'general' ? null : destinationStationId;
      
      const results: TransferResult = {
        successful: [],
        failed: [],
      };
      
      for (const transfer of transfers) {
        try {
          await apiRequest('POST', '/api/stock/event-transfer', {
            eventId: id,
            stationId,
            productId: transfer.productId,
            quantity: transfer.quantity,
          });
          
          const product = products?.find(p => p.id === transfer.productId);
          results.successful.push({
            productId: transfer.productId,
            productName: product?.name || transfer.productId,
          });
        } catch (error: any) {
          const product = products?.find(p => p.id === transfer.productId);
          results.failed.push({
            productId: transfer.productId,
            productName: product?.name || transfer.productId,
            error: error.message || 'Errore sconosciuto',
          });
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis') });
      setTransferDialogOpen(false);
      setSelectedProducts(new Map());
      setDestinationStationId('general');
      
      const totalCount = results.successful.length + results.failed.length;
      
      if (results.failed.length === 0) {
        toast({
          title: "Successo",
          description: `${results.successful.length} ${results.successful.length === 1 ? 'prodotto trasferito' : 'prodotti trasferiti'} con successo`,
        });
      } else if (results.successful.length === 0) {
        toast({
          title: "Errore",
          description: `Impossibile trasferire i prodotti. Errori: ${results.failed.map(f => f.productName).join(', ')}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Trasferimento parziale",
          description: `${results.successful.length} di ${totalCount} prodotti trasferiti. Errori: ${results.failed.map(f => f.productName).join(', ')}`,
          variant: "destructive",
        });
      }
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

  const changeStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest('PATCH', `/api/events/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setStatusChangeDialogOpen(false);
      toast({
        title: "Successo",
        description: "Stato evento aggiornato con successo",
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
        description: error.message || "Impossibile cambiare lo stato dell'evento",
        variant: "destructive",
      });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, newQuantity, reason, stationId }: { productId: string; newQuantity: number; reason?: string; stationId: string | null }) => {
      await apiRequest('POST', '/api/stock/adjust', {
        productId,
        newQuantity,
        reason,
        eventId: id,
        stationId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      setEditStockDialogOpen(false);
      setEditingStock(null);
      setNewQuantity('');
      setAdjustReason('');
      toast({
        title: "Successo",
        description: "Quantità corretta con successo",
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
        description: error.message || "Impossibile correggere la quantità",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDeleteDialogOpen(false);
      toast({
        title: "Successo",
        description: "Evento eliminato con successo",
      });
      setLocation('/events');
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
        description: error.message || "Impossibile eliminare l'evento",
        variant: "destructive",
      });
    },
  });

  const handleEditStock = (stock: { id: string; productId: string; stationId: string | null; quantity: string }) => {
    const product = products?.find(p => p.id === stock.productId);
    setEditingStock({
      stockId: stock.id,
      productId: stock.productId,
      stationId: stock.stationId,
      currentQuantity: stock.quantity,
      productName: product?.name || 'Prodotto',
    });
    setNewQuantity(stock.quantity);
    setAdjustReason('');
    setEditStockDialogOpen(true);
  };

  const submitStockAdjustment = () => {
    if (!editingStock) return;
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    adjustStockMutation.mutate({
      productId: editingStock.productId,
      newQuantity: qty,
      reason: adjustReason || undefined,
      stationId: editingStock.stationId,
    });
  };

  const bartenders = users?.filter(u => u.role === 'bartender') || [];

  const handleProductToggle = (productId: string, checked: boolean) => {
    const newSelected = new Map(selectedProducts);
    if (checked) {
      newSelected.set(productId, '');
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: string) => {
    const newSelected = new Map(selectedProducts);
    newSelected.set(productId, quantity);
    setSelectedProducts(newSelected);
  };

  const validateAndSubmitTransfers = () => {
    const transfers: ProductTransfer[] = [];
    const errors: string[] = [];

    selectedProducts.forEach((quantity, productId) => {
      const stock = generalStocks?.find(s => s.productId === productId);
      if (!stock) {
        errors.push(`Prodotto non trovato: ${productId}`);
        return;
      }

      const quantityNum = parseFloat(quantity);
      const availableNum = parseFloat(stock.quantity);

      if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
        errors.push(`Quantità non valida per ${stock.productName}`);
        return;
      }

      if (quantityNum > availableNum) {
        errors.push(`Quantità per ${stock.productName} supera il disponibile (${availableNum.toFixed(2)})`);
        return;
      }

      transfers.push({ productId, quantity: quantityNum });
    });

    if (errors.length > 0) {
      toast({
        title: "Errori di validazione",
        description: errors.join(', '),
        variant: "destructive",
      });
      return;
    }

    if (transfers.length === 0) {
      toast({
        title: "Nessun prodotto selezionato",
        description: "Seleziona almeno un prodotto da trasferire",
        variant: "destructive",
      });
      return;
    }

    transferStockMutation.mutate(transfers);
  };

  const fixedStations = (generalStations || []).filter(s => !s.eventId && !s.deletedAt);
  
  const allStations = [
    ...fixedStations.map(s => ({ ...s, isGeneral: true })),
    ...(eventStations || []).map(s => ({ ...s, isGeneral: false })),
  ];

  if (eventLoading) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
        <Skeleton className="h-12 w-32 mb-8 rounded-xl" />
        <Skeleton className="h-48 rounded-2xl mb-6" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Evento non trovato</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => setLocation('/events')}
            data-testid="button-back-to-events"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna agli Eventi
          </Button>
        </motion.div>
      </div>
    );
  }

  const status = statusConfig[event.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  const totalStockItems = eventStocks?.length || 0;
  const totalStations = allStations.length;
  const assignedBartendersCount = new Set(allStations.flatMap(s => s.bartenderIds || [])).size;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation('/events')}
          className="rounded-xl"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">{event.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'gestore') && (
            <Button 
              variant="destructive" 
              size="icon"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="button-delete-event"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button asChild variant="outline" data-testid="button-direct-stock">
            <Link href={`/events/${id}/direct-stock`}>
              Carico Diretto
            </Link>
          </Button>
          <Button asChild variant="outline" data-testid="button-view-report">
            <Link href={`/reports?eventId=${id}`}>
              Report
            </Link>
          </Button>
        </div>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Evento</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione eliminerà l'evento e tutti i dati correlati (postazioni, scorte, prenotazioni, liste ospiti, ecc.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventMutation.mutate()}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEventMutation.isPending ? "Eliminazione..." : "Elimina"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          title="Prodotti in Evento"
          value={totalStockItems}
          icon={Package}
          gradient="from-blue-500 to-indigo-600"
          testId="stats-products"
          delay={0.1}
        />
        <StatsCard
          title="Postazioni"
          value={totalStations}
          icon={MapPin}
          gradient="from-violet-500 to-purple-600"
          testId="stats-stations"
          delay={0.15}
        />
        <StatsCard
          title="Baristi Assegnati"
          value={assignedBartendersCount}
          icon={Users}
          gradient="from-teal-500 to-cyan-600"
          testId="stats-bartenders"
          delay={0.2}
        />
        <StatsCard
          title="Orario"
          value={new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
          icon={Clock}
          gradient="from-amber-500 to-orange-600"
          testId="stats-time"
          delay={0.25}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 mb-6"
      >
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Stato Evento</span>
          </div>
          <div className="flex items-center gap-2">
            {[
              { key: 'draft', label: 'Bozza' },
              { key: 'scheduled', label: 'Programmato' },
              { key: 'ongoing', label: 'In Corso' },
              { key: 'closed', label: 'Chiuso' }
            ].map((statusItem, index) => {
              const isActive = event.status === statusItem.key;
              const isPassed = ['draft', 'scheduled', 'ongoing', 'closed'].indexOf(event.status) > index;
              const isCompleted = isPassed || isActive;

              return (
                <div key={statusItem.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center gap-1 flex-1">
                    <div 
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                        isActive 
                          ? 'border-primary bg-primary text-primary-foreground glow-golden' 
                          : isPassed 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-muted bg-background text-muted-foreground'
                      }`}
                      data-testid={`status-step-${statusItem.key}`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    <span className={`text-xs text-center ${isActive ? 'font-medium text-primary' : 'text-muted-foreground'}`}>
                      {statusItem.label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div 
                      className={`h-0.5 flex-1 mx-2 rounded-full ${
                        isPassed ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {(() => {
          const canChangeStatus = user && (user.role === 'super_admin' || user.role === 'gestore');
          const statusTransitions: Record<string, { next: string; label: string; description: string }> = {
            'draft': { 
              next: 'scheduled', 
              label: 'Imposta come Programmato',
              description: 'Confermi di voler impostare questo evento come Programmato?'
            },
            'scheduled': { 
              next: 'ongoing', 
              label: 'Inizia Evento',
              description: 'Confermi di voler iniziare questo evento?'
            },
            'ongoing': { 
              next: 'closed', 
              label: 'Chiudi Evento',
              description: 'Confermi di voler chiudere questo evento? Questa azione segna l\'evento come completato.'
            },
          };

          const transition = statusTransitions[event.status];

          if (!transition) {
            return (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-teal" />
                Evento completato
              </div>
            );
          }

          if (!canChangeStatus) {
            return (
              <div className="text-sm text-muted-foreground">
                Solo amministratori e gestori possono modificare lo stato dell'evento
              </div>
            );
          }

          return (
            <>
              <Button 
                onClick={() => setStatusChangeDialogOpen(true)}
                disabled={changeStatusMutation.isPending}
                className="gradient-golden text-black font-semibold"
                data-testid={`button-change-status-${transition.next}`}
              >
                {changeStatusMutation.isPending ? 'Aggiornamento...' : transition.label}
              </Button>

              <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
                <AlertDialogContent data-testid="dialog-confirm-status-change">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Conferma Cambio Stato</AlertDialogTitle>
                    <AlertDialogDescription>
                      {transition.description}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-status-change">
                      Annulla
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => changeStatusMutation.mutate(transition.next)}
                      disabled={changeStatusMutation.isPending}
                      className="gradient-golden text-black"
                      data-testid="button-confirm-status-change"
                    >
                      Conferma
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          );
        })()}
      </motion.div>

      {event.notes && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 mb-6"
        >
          <h3 className="text-sm font-semibold mb-2">Note</h3>
          <p className="text-sm text-muted-foreground">{event.notes}</p>
        </motion.div>
      )}

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Package className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold">Inventario Evento</h2>
          </div>
          <Dialog open={transferDialogOpen} onOpenChange={(open) => {
            setTransferDialogOpen(open);
            if (!open) {
              setSelectedProducts(new Map());
              setDestinationStationId('general');
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-golden text-black font-semibold" data-testid="button-transfer-stock">
                <Warehouse className="h-4 w-4 mr-2" />
                Trasferisci Stock
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <DialogTitle>Trasferisci Stock da Magazzino</DialogTitle>
                  {selectedProducts.size > 0 && (
                    <Badge variant="secondary" data-testid="badge-selected-products-count">
                      {selectedProducts.size} {selectedProducts.size === 1 ? 'prodotto selezionato' : 'prodotti selezionati'}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              {generalStocks && generalStocks.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Postazione Destinazione</label>
                    <Select value={destinationStationId} onValueChange={setDestinationStationId}>
                      <SelectTrigger data-testid="select-transfer-destination">
                        <SelectValue placeholder="Seleziona postazione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Evento (generale)</SelectItem>
                        {generalStations && generalStations.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Postazioni Generali
                            </div>
                            {generalStations.map((station) => (
                              <SelectItem key={station.id} value={station.id} data-testid={`select-item-general-station-${station.id}`}>
                                <span className="flex items-center gap-2">
                                  <MapPin className="h-3 w-3" />
                                  {station.name}
                                </span>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {eventStations && eventStations.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Postazioni Evento
                            </div>
                            {eventStations.map((station) => (
                              <SelectItem key={station.id} value={station.id} data-testid={`select-item-event-station-${station.id}`}>
                                {station.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="border rounded-xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>Prodotto</TableHead>
                          <TableHead className="text-right">Disponibile</TableHead>
                          <TableHead className="w-40">Quantità da Trasferire</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generalStocks.filter(s => parseFloat(s.quantity) > 0).map((stock) => {
                          const isSelected = selectedProducts.has(stock.productId);
                          const quantity = selectedProducts.get(stock.productId) || '';
                          const available = parseFloat(stock.quantity);
                          const quantityNum = parseFloat(quantity);
                          const hasError = isSelected && quantity && (!isNaN(quantityNum)) && quantityNum > available;

                          return (
                            <TableRow key={stock.productId} data-testid={`transfer-product-row-${stock.productId}`}>
                              <TableCell>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleProductToggle(stock.productId, checked as boolean)}
                                  data-testid={`checkbox-product-${stock.productId}`}
                                />
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{stock.productName}</div>
                                  <div className="text-sm text-muted-foreground">{stock.productCode}</div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {available.toFixed(2)} {stock.unitOfMeasure}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={available}
                                    placeholder="0.00"
                                    value={quantity}
                                    onChange={(e) => handleQuantityChange(stock.productId, e.target.value)}
                                    disabled={!isSelected}
                                    className={hasError ? "border-destructive" : ""}
                                    data-testid={`input-quantity-${stock.productId}`}
                                  />
                                </div>
                                {hasError && (
                                  <p className="text-xs text-destructive mt-1">
                                    Max: {available.toFixed(2)}
                                  </p>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTransferDialogOpen(false)}
                      data-testid="button-cancel-transfer"
                    >
                      Annulla
                    </Button>
                    <Button
                      onClick={validateAndSubmitTransfers}
                      disabled={transferStockMutation.isPending || selectedProducts.size === 0}
                      className="gradient-golden text-black font-semibold"
                      data-testid="button-submit-transfer"
                    >
                      {transferStockMutation.isPending ? 'Trasferimento in corso...' : 'Trasferisci Prodotti'}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">Nessun prodotto disponibile in magazzino</p>
                  <p className="text-sm text-muted-foreground">Carica prodotti nel magazzino generale prima di trasferirli</p>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setTransferDialogOpen(false)} data-testid="button-close-transfer">
                      Chiudi
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {eventStocksLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : eventStocks && eventStocks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventStocks.map((stock, index) => {
              const product = products?.find(p => p.id === stock.productId);
              const station = eventStations?.find(s => s.id === stock.stationId);
              const quantity = parseFloat(stock.quantity);
              const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
              
              return (
                <motion.div
                  key={stock.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="glass-card p-5"
                  data-testid={`event-stock-${stock.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{product?.name || 'Unknown'}</h4>
                      <p className="text-sm text-muted-foreground">
                        {station ? station.name : 'Magazzino Evento'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      {isLowStock && (
                        <Badge variant="destructive" data-testid={`badge-low-stock-event-${stock.id}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Basso
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditStock(stock)}
                        data-testid={`button-edit-stock-${stock.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <Package className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="font-bold text-lg tabular-nums">
                      {isNaN(quantity) ? '0.00' : quantity.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {product?.unitOfMeasure || ''}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8 text-center border-2 border-dashed border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-600/20 flex items-center justify-center mx-auto mb-4">
              <Package className="h-7 w-7 text-blue-400" />
            </div>
            <p className="text-muted-foreground mb-1">Nessun prodotto trasferito all'evento</p>
            <p className="text-sm text-muted-foreground">
              Usa il pulsante "Trasferisci Stock" per iniziare
            </p>
          </div>
        )}
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold">Postazioni</h2>
          </div>
          <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-golden text-black font-semibold" data-testid="button-create-station">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Postazione
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuova Postazione</DialogTitle>
              </DialogHeader>
              <Form {...stationForm}>
                <form onSubmit={stationForm.handleSubmit((data) => {
                  createStationMutation.mutate({ ...data, bartenderIds: selectedBartenderIds });
                })} className="space-y-4">
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

                  <FormItem>
                    <FormLabel>Baristi Assegnati (opzionale)</FormLabel>
                    <div className="border rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto" data-testid="bartenders-list">
                      {bartenders && bartenders.length > 0 ? (
                        bartenders.map((bartender) => (
                          <div key={bartender.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`bartender-${bartender.id}`}
                              checked={selectedBartenderIds.includes(bartender.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedBartenderIds([...selectedBartenderIds, bartender.id]);
                                } else {
                                  setSelectedBartenderIds(selectedBartenderIds.filter(id => id !== bartender.id));
                                }
                              }}
                              data-testid={`checkbox-bartender-${bartender.id}`}
                            />
                            <label
                              htmlFor={`bartender-${bartender.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {bartender.firstName && bartender.lastName 
                                ? `${bartender.firstName} ${bartender.lastName}` 
                                : bartender.email}
                            </label>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Nessun barista disponibile</p>
                      )}
                    </div>
                    {selectedBartenderIds.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedBartenderIds.length} barista/i selezionato/i
                      </p>
                    )}
                  </FormItem>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStationDialogOpen(false)}
                      data-testid="button-cancel-station"
                    >
                      Annulla
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createStationMutation.isPending}
                      className="gradient-golden text-black font-semibold"
                      data-testid="button-submit-station"
                    >
                      Crea Postazione
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {stationsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : allStations && allStations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allStations.map((station, index) => {
              const assignedBartenders = users?.filter(u => station.bartenderIds?.includes(u.id)) || [];
              const isEditing = editingStationIds.has(station.id);
              return (
                <motion.div
                  key={station.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                  className="glass-card p-5"
                  data-testid={`station-card-${station.id}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{station.name}</h4>
                        {station.isGeneral && (
                          <Badge variant="secondary" className="text-xs mt-0.5">Fissa</Badge>
                        )}
                      </div>
                    </div>
                    {!isEditing && (
                      <div className="flex items-center gap-1">
                        <Link href={`/events/${id}/stations/${station.id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-view-station-${station.id}`}
                          >
                            <Package className="h-4 w-4 mr-1" />
                            Stock
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingStationIds(prev => new Set(prev).add(station.id));
                            setEditingBartenderIds(prev => {
                              const newMap = new Map(prev);
                              if (!newMap.has(station.id)) {
                                newMap.set(station.id, station.bartenderIds || []);
                              }
                              return newMap;
                            });
                          }}
                          data-testid={`button-edit-bartenders-${station.id}`}
                        >
                          Modifica
                        </Button>
                      </div>
                    )}
                  </div>
                  {!isEditing ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Baristi:</span>
                      </div>
                      {assignedBartenders.length > 0 ? (
                        <div className="pl-6 space-y-1">
                          {assignedBartenders.map(bartender => (
                            <div key={bartender.id} className="text-sm flex items-center gap-2" data-testid={`bartender-${bartender.id}`}>
                              <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                              {bartender.firstName && bartender.lastName 
                                ? `${bartender.firstName} ${bartender.lastName}` 
                                : bartender.email}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground pl-6">Nessun barista assegnato</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border rounded-xl p-2 space-y-2 max-h-40 overflow-y-auto">
                        {bartenders.map((bartender) => {
                          const currentIds = editingBartenderIds.get(station.id) || [];
                          return (
                            <div key={bartender.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`edit-bartender-${station.id}-${bartender.id}`}
                                checked={currentIds.includes(bartender.id)}
                                onCheckedChange={(checked) => {
                                  setEditingBartenderIds(prev => {
                                    const newMap = new Map(prev);
                                    const currentIds = newMap.get(station.id) || [];
                                    if (checked) {
                                      newMap.set(station.id, [...currentIds, bartender.id]);
                                    } else {
                                      newMap.set(station.id, currentIds.filter(id => id !== bartender.id));
                                    }
                                    return newMap;
                                  });
                                }}
                                data-testid={`checkbox-edit-bartender-${bartender.id}`}
                              />
                              <label
                                htmlFor={`edit-bartender-${station.id}-${bartender.id}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {bartender.firstName && bartender.lastName 
                                  ? `${bartender.firstName} ${bartender.lastName}` 
                                  : bartender.email}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => {
                            const currentIds = editingBartenderIds.get(station.id) || [];
                            updateBartendersMutation.mutate({
                              stationId: station.id,
                              bartenderIds: currentIds
                            });
                          }}
                          disabled={updateBartendersMutation.isPending}
                          className="gradient-golden text-black font-semibold"
                          data-testid={`button-save-bartenders-${station.id}`}
                        >
                          {updateBartendersMutation.isPending ? "Salvataggio..." : "Salva"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingStationIds(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(station.id);
                              return newSet;
                            });
                            setEditingBartenderIds(prev => {
                              const newMap = new Map(prev);
                              newMap.delete(station.id);
                              return newMap;
                            });
                          }}
                          data-testid={`button-cancel-bartenders-${station.id}`}
                        >
                          Annulla
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card p-8 text-center border-2 border-dashed border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-4">
              <MapPin className="h-7 w-7 text-violet-400" />
            </div>
            <p className="text-muted-foreground mb-2">
              {fixedStations.length > 0 
                ? `Hai ${fixedStations.length} postazioni fisse disponibili`
                : "Nessuna postazione disponibile"
              }
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Puoi creare postazioni specifiche per questo evento
            </p>
            <Button 
              onClick={() => setStationDialogOpen(true)}
              className="gradient-golden text-black font-semibold"
              data-testid="button-create-first-station"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Postazione Evento
            </Button>
          </div>
        )}
      </motion.div>

      {/* Dialog per correzione quantità stock */}
      <Dialog open={editStockDialogOpen} onOpenChange={setEditStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correggi Quantità</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Prodotto</p>
              <p className="font-semibold">{editingStock?.productName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Quantità attuale</p>
              <p className="font-semibold">{editingStock?.currentQuantity}</p>
            </div>
            <div className="space-y-2">
              <label htmlFor="newQuantity" className="text-sm font-medium">
                Nuova Quantità
              </label>
              <Input
                id="newQuantity"
                type="number"
                step="0.01"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="Inserisci la nuova quantità"
                data-testid="input-new-quantity"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="adjustReason" className="text-sm font-medium">
                Motivo (opzionale)
              </label>
              <Input
                id="adjustReason"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Es. Correzione inventario, rottura, ecc."
                data-testid="input-adjust-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditStockDialogOpen(false);
                setEditingStock(null);
              }}
              data-testid="button-cancel-adjust"
            >
              Annulla
            </Button>
            <Button
              onClick={submitStockAdjustment}
              disabled={adjustStockMutation.isPending}
              className="gradient-golden text-black font-semibold"
              data-testid="button-submit-adjust"
            >
              {adjustStockMutation.isPending ? 'Salvataggio...' : 'Salva Correzione'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
