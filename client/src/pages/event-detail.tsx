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
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, 
  Plus, 
  Users, 
  Package, 
  Warehouse, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  FilePenLine, 
  CalendarCheck,
  MapPin,
  Pencil,
  Trash2,
  Info,
  Ticket,
  MoreVertical,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStationSchema, type Event, type Station, type InsertStation, type User, type Product } from "@shared/schema";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  FloatingActionButton,
  BottomSheet,
  triggerHaptic 
} from "@/components/mobile-primitives";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

type TabType = 'info' | 'tickets' | 'staff' | 'inventory';

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: 'info', label: 'Info', icon: Info },
  { id: 'tickets', label: 'Biglietti', icon: Ticket },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'inventory', label: 'Inventario', icon: Package },
];

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export default function EventDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('info');
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
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const isBartender = user?.role === 'bartender';
  useEffect(() => {
    if (isBartender && id) {
      setLocation(`/bartender/events/${id}/direct-stock`);
    }
  }, [isBartender, id, setLocation]);

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
      toast({ title: "Successo", description: "Postazione creata con successo" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: "Impossibile creare la postazione", variant: "destructive" });
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
      toast({ title: "Successo", description: "Baristi aggiornati con successo" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: "Impossibile aggiornare i baristi", variant: "destructive" });
    },
  });

  const transferStockMutation = useMutation({
    mutationFn: async (transfers: ProductTransfer[]): Promise<TransferResult> => {
      const stationId = destinationStationId === 'general' ? null : destinationStationId;
      const results: TransferResult = { successful: [], failed: [] };
      
      for (const transfer of transfers) {
        try {
          await apiRequest('POST', '/api/stock/event-transfer', {
            eventId: id,
            stationId,
            productId: transfer.productId,
            quantity: transfer.quantity,
          });
          const product = products?.find(p => p.id === transfer.productId);
          results.successful.push({ productId: transfer.productId, productName: product?.name || transfer.productId });
        } catch (error: any) {
          const product = products?.find(p => p.id === transfer.productId);
          results.failed.push({ productId: transfer.productId, productName: product?.name || transfer.productId, error: error.message || 'Errore sconosciuto' });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setTransferDialogOpen(false);
      setSelectedProducts(new Map());
      setDestinationStationId('general');
      
      if (results.failed.length === 0) {
        toast({ title: "Successo", description: `${results.successful.length} prodotti trasferiti` });
      } else {
        toast({ title: "Errore parziale", description: `Errori: ${results.failed.map(f => f.productName).join(', ')}`, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile trasferire lo stock", variant: "destructive" });
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
      toast({ title: "Successo", description: "Stato evento aggiornato" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile cambiare lo stato", variant: "destructive" });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, newQuantity, reason, stationId }: { productId: string; newQuantity: number; reason?: string; stationId: string | null }) => {
      await apiRequest('POST', '/api/stock/adjust', { productId, newQuantity, reason, eventId: id, stationId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      setEditStockDialogOpen(false);
      setEditingStock(null);
      setNewQuantity('');
      setAdjustReason('');
      toast({ title: "Successo", description: "Quantità corretta" });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile correggere la quantità", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDeleteDialogOpen(false);
      toast({ title: "Successo", description: "Evento eliminato" });
      setLocation('/events');
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile eliminare l'evento", variant: "destructive" });
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
      toast({ title: "Errore", description: "Inserisci una quantità valida", variant: "destructive" });
      return;
    }
    adjustStockMutation.mutate({ productId: editingStock.productId, newQuantity: qty, reason: adjustReason || undefined, stationId: editingStock.stationId });
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
        errors.push(`Quantità per ${stock.productName} supera il disponibile`);
        return;
      }
      transfers.push({ productId, quantity: quantityNum });
    });

    if (errors.length > 0) {
      toast({ title: "Errori di validazione", description: errors.join(', '), variant: "destructive" });
      return;
    }
    if (transfers.length === 0) {
      toast({ title: "Nessun prodotto selezionato", description: "Seleziona almeno un prodotto", variant: "destructive" });
      return;
    }
    transferStockMutation.mutate(transfers);
  };

  const fixedStations = (generalStations || []).filter(s => !s.eventId && !s.deletedAt);
  const allStations = [
    ...fixedStations.map(s => ({ ...s, isGeneral: true })),
    ...(eventStations || []).map(s => ({ ...s, isGeneral: false })),
  ];

  if (authLoading || isBartender) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (eventLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={() => setLocation('/events')}>
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="space-y-4 py-4 pb-24">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </MobileAppLayout>
    );
  }

  if (!event) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Evento"
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={() => setLocation('/events')}>
                <ArrowLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="flex flex-col items-center justify-center py-16 px-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-center mb-4">Evento non trovato</p>
          <HapticButton variant="outline" onClick={() => setLocation('/events')} data-testid="button-back-to-events">
            Torna agli Eventi
          </HapticButton>
        </motion.div>
      </MobileAppLayout>
    );
  }

  const status = statusConfig[event.status] || statusConfig.draft;
  const StatusIcon = status.icon;
  const totalStockItems = eventStocks?.length || 0;
  const totalStations = allStations.length;
  const assignedBartendersCount = new Set(allStations.flatMap(s => s.bartenderIds || [])).size;

  const renderHeader = () => (
    <div className="bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="flex items-center justify-between px-4 py-3">
        <HapticButton 
          variant="ghost" 
          size="icon" 
          onClick={() => setLocation('/events')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </HapticButton>
        
        <div className="flex-1 mx-3 min-w-0">
          <h1 className="font-semibold truncate">{event.name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.bgColor} ${status.color}`}>
              <StatusIcon className="h-2.5 w-2.5" />
              {status.label}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <HapticButton variant="ghost" size="icon" data-testid="button-menu">
              <MoreVertical className="h-5 w-5" />
            </HapticButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setStatusChangeDialogOpen(true)}>
              <Clock className="h-4 w-4 mr-2" />
              Cambia Stato
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/events/${id}/direct-stock`} className="flex items-center">
                <Warehouse className="h-4 w-4 mr-2" />
                Carico Diretto
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/reports?eventId=${id}`} className="flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Report
              </Link>
            </DropdownMenuItem>
            {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'gestore') && (
              <DropdownMenuItem 
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Elimina Evento
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex px-2 pb-2 gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              className={`flex-1 min-w-[72px] flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-colors relative ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary/10 rounded-xl"
                  transition={springTransition}
                />
              )}
              <Icon className="h-5 w-5 relative z-10" />
              <span className="text-[10px] font-medium relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderInfoTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-4"
    >
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Data Evento</p>
            <p className="font-semibold">
              {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/10 flex items-center justify-center">
            <Clock className="h-6 w-6 text-teal-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Orario</p>
            <p className="font-semibold">
              {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              {event.endDatetime && ` - ${new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>

        {event.locationId && (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-semibold">Sede Evento</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="glass-card p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3">
            <Package className="h-5 w-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{totalStockItems}</p>
          <p className="text-xs text-muted-foreground">Prodotti</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="glass-card p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3">
            <MapPin className="h-5 w-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{totalStations}</p>
          <p className="text-xs text-muted-foreground">Postazioni</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
          className="glass-card p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-3">
            <Users className="h-5 w-5 text-white" />
          </div>
          <p className="text-2xl font-bold">{assignedBartendersCount}</p>
          <p className="text-xs text-muted-foreground">Staff</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.25 }}
          className="glass-card p-4"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-3">
            <StatusIcon className="h-5 w-5 text-white" />
          </div>
          <p className="text-lg font-bold">{status.label}</p>
          <p className="text-xs text-muted-foreground">Stato</p>
        </motion.div>
      </div>

      <HapticButton
        className="w-full h-14"
        onClick={() => setStatusChangeDialogOpen(true)}
        data-testid="button-change-status"
      >
        <Clock className="h-5 w-5 mr-2" />
        Cambia Stato Evento
      </HapticButton>
    </motion.div>
  );

  const renderTicketsTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-4"
    >
      <div className="glass-card p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center mx-auto mb-4">
          <Ticket className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="font-semibold mb-2">Gestione Biglietti</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Visualizza e gestisci i biglietti per questo evento
        </p>
        <HapticButton 
          variant="outline" 
          className="w-full h-12"
          onClick={() => setLocation(`/siae/ticketed-events/${id}`)}
          data-testid="button-manage-tickets"
        >
          Vai alla Gestione Biglietti
          <ChevronRight className="h-4 w-4 ml-2" />
        </HapticButton>
      </div>
    </motion.div>
  );

  const renderStaffTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Postazioni</h3>
        <HapticButton 
          size="sm" 
          onClick={() => setStationDialogOpen(true)}
          data-testid="button-create-station"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nuova
        </HapticButton>
      </div>

      {stationsLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : allStations.length > 0 ? (
        <div className="space-y-3">
          {allStations.map((station, index) => {
            const assignedBartenders = users?.filter(u => station.bartenderIds?.includes(u.id)) || [];
            const isEditing = editingStationIds.has(station.id);

            return (
              <motion.div
                key={station.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: index * 0.05 }}
                className="glass-card p-4"
                data-testid={`station-card-${station.id}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold">{station.name}</h4>
                      {station.isGeneral && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">Fissa</Badge>
                      )}
                    </div>
                  </div>
                  {!isEditing && (
                    <HapticButton
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
                      <Pencil className="h-4 w-4" />
                    </HapticButton>
                  )}
                </div>

                {!isEditing ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Staff assegnato:</p>
                    {assignedBartenders.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assignedBartenders.map(bartender => (
                          <Badge key={bartender.id} variant="secondary">
                            {bartender.firstName && bartender.lastName 
                              ? `${bartender.firstName} ${bartender.lastName}` 
                              : bartender.email}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nessun barista assegnato</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="max-h-32 overflow-y-auto space-y-2">
                      {bartenders.map((bartender) => {
                        const currentIds = editingBartenderIds.get(station.id) || [];
                        return (
                          <label key={bartender.id} className="flex items-center gap-3 p-2 rounded-lg hover-elevate cursor-pointer">
                            <Checkbox
                              checked={currentIds.includes(bartender.id)}
                              onCheckedChange={(checked) => {
                                setEditingBartenderIds(prev => {
                                  const newMap = new Map(prev);
                                  const ids = newMap.get(station.id) || [];
                                  if (checked) {
                                    newMap.set(station.id, [...ids, bartender.id]);
                                  } else {
                                    newMap.set(station.id, ids.filter(id => id !== bartender.id));
                                  }
                                  return newMap;
                                });
                              }}
                            />
                            <span className="text-sm">
                              {bartender.firstName && bartender.lastName 
                                ? `${bartender.firstName} ${bartender.lastName}` 
                                : bartender.email}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <HapticButton
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const ids = editingBartenderIds.get(station.id) || [];
                          updateBartendersMutation.mutate({ stationId: station.id, bartenderIds: ids });
                        }}
                        disabled={updateBartendersMutation.isPending}
                      >
                        Salva
                      </HapticButton>
                      <HapticButton
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingStationIds(prev => {
                            const s = new Set(prev);
                            s.delete(station.id);
                            return s;
                          });
                          setEditingBartenderIds(prev => {
                            const m = new Map(prev);
                            m.delete(station.id);
                            return m;
                          });
                        }}
                      >
                        Annulla
                      </HapticButton>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-8 text-center border-2 border-dashed border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <MapPin className="h-7 w-7 text-violet-400" />
          </div>
          <p className="text-muted-foreground mb-4">Nessuna postazione</p>
          <HapticButton onClick={() => setStationDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Crea Postazione
          </HapticButton>
        </div>
      )}
    </motion.div>
  );

  const renderInventoryTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Stock Evento</h3>
        <HapticButton 
          size="sm" 
          onClick={() => setTransferDialogOpen(true)}
          data-testid="button-transfer-stock"
        >
          <Plus className="h-4 w-4 mr-1" />
          Trasferisci
        </HapticButton>
      </div>

      {eventStocksLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : eventStocks && eventStocks.length > 0 ? (
        <div className="space-y-3">
          {eventStocks.map((stock, index) => {
            const product = products?.find(p => p.id === stock.productId);
            const station = eventStations?.find(s => s.id === stock.stationId);
            const quantity = parseFloat(stock.quantity);
            const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
            
            return (
              <motion.div
                key={stock.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: index * 0.03 }}
                className="glass-card p-4"
                data-testid={`event-stock-${stock.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold truncate">{product?.name || 'Prodotto'}</h4>
                      <p className="text-xs text-muted-foreground truncate">
                        {station ? station.name : 'Magazzino Evento'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLowStock && (
                      <Badge variant="destructive" className="shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                      </Badge>
                    )}
                    <span className="font-bold tabular-nums">
                      {isNaN(quantity) ? '0' : quantity.toFixed(2)}
                    </span>
                    <HapticButton
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditStock(stock)}
                      data-testid={`button-edit-stock-${stock.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </HapticButton>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card p-8 text-center border-2 border-dashed border-white/10">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto mb-4">
            <Package className="h-7 w-7 text-blue-400" />
          </div>
          <p className="text-muted-foreground mb-2">Nessun prodotto trasferito</p>
          <p className="text-sm text-muted-foreground mb-4">Trasferisci prodotti dal magazzino</p>
          <HapticButton onClick={() => setTransferDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Trasferisci Stock
          </HapticButton>
        </div>
      )}
    </motion.div>
  );

  return (
    <MobileAppLayout
      header={renderHeader()}
      noPadding
    >
      <div className="px-4 py-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'info' && <div key="info">{renderInfoTab()}</div>}
          {activeTab === 'tickets' && <div key="tickets">{renderTicketsTab()}</div>}
          {activeTab === 'staff' && <div key="staff">{renderStaffTab()}</div>}
          {activeTab === 'inventory' && <div key="inventory">{renderInventoryTab()}</div>}
        </AnimatePresence>
      </div>

      {activeTab === 'inventory' && (
        <FloatingActionButton
          onClick={() => setTransferDialogOpen(true)}
          data-testid="fab-transfer"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      {activeTab === 'staff' && (
        <FloatingActionButton
          onClick={() => setStationDialogOpen(true)}
          data-testid="fab-add-station"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare l'evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione è irreversibile. Tutti i dati dell'evento verranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventMutation.mutate()}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteEventMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambia Stato Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {Object.entries(statusConfig).map(([key, config]) => {
              const Icon = config.icon;
              const isCurrentStatus = event.status === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    triggerHaptic('medium');
                    changeStatusMutation.mutate(key);
                  }}
                  disabled={changeStatusMutation.isPending || isCurrentStatus}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${
                    isCurrentStatus 
                      ? 'bg-primary/10 border-2 border-primary' 
                      : 'bg-muted/50 hover-elevate'
                  }`}
                  data-testid={`status-option-${key}`}
                >
                  <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <span className="font-medium">{config.label}</span>
                  {isCurrentStatus && (
                    <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
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
                      <Input {...field} placeholder="Es. Bar Centrale" className="h-12" data-testid="input-station-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Baristi (opzionale)</FormLabel>
                <div className="border rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                  {bartenders.length > 0 ? bartenders.map((bartender) => (
                    <label key={bartender.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer">
                      <Checkbox
                        checked={selectedBartenderIds.includes(bartender.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedBartenderIds([...selectedBartenderIds, bartender.id]);
                          } else {
                            setSelectedBartenderIds(selectedBartenderIds.filter(id => id !== bartender.id));
                          }
                        }}
                      />
                      <span className="text-sm">
                        {bartender.firstName && bartender.lastName 
                          ? `${bartender.firstName} ${bartender.lastName}` 
                          : bartender.email}
                      </span>
                    </label>
                  )) : (
                    <p className="text-sm text-muted-foreground">Nessun barista disponibile</p>
                  )}
                </div>
              </FormItem>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" className="h-12" onClick={() => setStationDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createStationMutation.isPending} className="h-12">
                  {createStationMutation.isPending ? 'Creazione...' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Trasferisci Stock</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Destinazione</label>
              <Select value={destinationStationId} onValueChange={setDestinationStationId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Seleziona destinazione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Magazzino Evento</SelectItem>
                  {allStations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {generalStocks && generalStocks.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Prodotti disponibili</p>
                {generalStocks.map((stock) => {
                  const isSelected = selectedProducts.has(stock.productId);
                  const quantity = selectedProducts.get(stock.productId) || '';
                  const available = parseFloat(stock.quantity);
                  
                  return (
                    <div key={stock.productId} className="p-3 rounded-xl bg-muted/50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleProductToggle(stock.productId, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{stock.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Disponibili: {available.toFixed(2)} {stock.unitOfMeasure}
                          </p>
                        </div>
                      </label>
                      {isSelected && (
                        <div className="mt-2 pl-9">
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={available}
                            placeholder="Quantità"
                            value={quantity}
                            onChange={(e) => handleQuantityChange(stock.productId, e.target.value)}
                            className="h-10"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nessun prodotto disponibile</p>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4 border-t">
            <Button variant="outline" className="h-12" onClick={() => setTransferDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              className="h-12"
              onClick={validateAndSubmitTransfers}
              disabled={transferStockMutation.isPending || selectedProducts.size === 0}
            >
              {transferStockMutation.isPending ? 'Trasferimento...' : 'Trasferisci'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editStockDialogOpen} onOpenChange={setEditStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Correggi Quantità</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">Prodotto</p>
              <p className="font-semibold">{editingStock?.productName}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">Quantità attuale</p>
              <p className="font-semibold text-lg">{editingStock?.currentQuantity}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Nuova Quantità</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="0.00"
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Motivo (opzionale)</label>
              <Input
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Es. Correzione inventario"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="h-12" onClick={() => setEditStockDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              className="h-12"
              onClick={submitStockAdjustment}
              disabled={adjustStockMutation.isPending}
            >
              {adjustStockMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  );
}
