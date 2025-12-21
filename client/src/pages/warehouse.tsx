import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { MobileAppLayout, HapticButton, BottomSheet, FloatingActionButton, triggerHaptic, MobileHeader } from "@/components/mobile-primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Warehouse as WarehouseIcon, TrendingUp, TrendingDown, Package, AlertTriangle, X, ArrowLeft, Pencil, BoxesIcon, Activity, Trash2, Search } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import type { Product, StockMovement, Supplier, Event, User } from "@shared/schema";

const loadStockSchema = z.object({
  productId: z.string().min(1, "Seleziona un prodotto"),
  quantity: z.string().min(1, "Inserisci quantità"),
  supplier: z.string().optional(),
  reason: z.string().optional(),
});

type LoadStockData = z.infer<typeof loadStockSchema>;

interface MultiLoadItem {
  id: string;
  productId: string;
  quantity: string;
  supplierId?: string;
}

interface MultiUnloadItem {
  id: string;
  productId: string;
  quantity: string;
  reason?: string;
}

const springTransition = { type: "spring", stiffness: 400, damping: 30 };
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 }
  }
};
const staggerItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: springTransition }
};

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  testId,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  testId: string;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="glass-card p-5"
      whileTap={{ scale: 0.96 }}
      transition={springTransition}
    >
      <div className="flex items-center gap-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold tabular-nums" data-testid={testId}>
            {value}
          </p>
          <p className="text-sm text-muted-foreground truncate">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function StockCard({
  stock,
  product,
  isLowStock,
  canAdjust,
  onAdjust,
}: {
  stock: { productId: string; productName: string; productCode: string; quantity: string; unitOfMeasure: string };
  product: Product | undefined;
  isLowStock: boolean;
  canAdjust: boolean;
  onAdjust: () => void;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="glass-card p-6"
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      data-testid={`stock-card-${stock.productId}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg truncate">{stock.productName}</div>
          <div className="text-sm text-muted-foreground font-mono mt-1">{stock.productCode}</div>
        </div>
        {canAdjust && (
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={onAdjust}
            className="shrink-0"
            data-testid={`button-adjust-${stock.productId}`}
          >
            <Pencil className="h-5 w-5" />
          </HapticButton>
        )}
      </div>
      <div className="flex items-end justify-between mt-5 pt-5 border-t border-white/10">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Quantità</div>
          <div className="text-3xl font-bold tabular-nums">
            {parseFloat(stock.quantity).toFixed(2)} 
            <span className="text-base text-muted-foreground font-normal ml-2">{stock.unitOfMeasure}</span>
          </div>
        </div>
        {isLowStock ? (
          <Badge variant="destructive" className="gap-1.5 h-10 px-4 text-sm" data-testid={`badge-low-stock-${stock.productId}`}>
            <AlertTriangle className="h-4 w-4" />
            Stock Basso
          </Badge>
        ) : (
          <Badge variant="secondary" className="bg-teal/20 text-teal border-teal/30 h-10 px-4 text-sm">OK</Badge>
        )}
      </div>
    </motion.div>
  );
}

function MovementCard({
  movement,
  product,
}: {
  movement: StockMovement;
  product: Product | undefined;
}) {
  return (
    <motion.div
      variants={staggerItem}
      className="glass-card p-6"
      whileTap={{ scale: 0.98 }}
      transition={springTransition}
      data-testid={`movement-card-${movement.id}`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg truncate">{product?.name || 'Sconosciuto'}</div>
          <div className="text-sm text-muted-foreground font-mono mt-1">{product?.code || '-'}</div>
        </div>
        <Badge 
          variant={movement.type === 'LOAD' ? 'secondary' : 'outline'}
          className={movement.type === 'LOAD' ? 'bg-teal/20 text-teal border-teal/30 h-10 px-4' : 'h-10 px-4'}
        >
          {movement.type === 'LOAD' ? 'Carico' : 'Scarico'}
        </Badge>
      </div>
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-sm text-muted-foreground">
          {movement.createdAt ? new Date(movement.createdAt).toLocaleString('it-IT') : '-'}
        </div>
        <div className={`text-2xl font-bold tabular-nums ${movement.type === 'LOAD' ? 'text-teal' : 'text-amber-500'}`}>
          {movement.type === 'LOAD' ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
        </div>
      </div>
      {(movement.supplier || movement.reason) && (
        <div className="mt-4 pt-4 border-t border-white/10 text-sm text-muted-foreground space-y-1">
          {movement.supplier && <div>Fornitore: {movement.supplier}</div>}
          {movement.reason && <div>Motivo: {movement.reason}</div>}
        </div>
      )}
    </motion.div>
  );
}

export default function Warehouse() {
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [unloadDialogOpen, setUnloadDialogOpen] = useState(false);
  const [multiLoadDialogOpen, setMultiLoadDialogOpen] = useState(false);
  const [multiUnloadDialogOpen, setMultiUnloadDialogOpen] = useState(false);
  const [multiLoadItems, setMultiLoadItems] = useState<MultiLoadItem[]>([]);
  const [multiUnloadItems, setMultiUnloadItems] = useState<MultiUnloadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState<string>("all");
  const [movementSearchQuery, setMovementSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [transferQuantities, setTransferQuantities] = useState<Record<string, string>>({});
  const [consumeQuantities, setConsumeQuantities] = useState<Record<string, string>>({});
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<{ id: string; name: string; quantity: string } | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [clearWarehouseDialogOpen, setClearWarehouseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("stocks");
  const [fabMenuOpen, setFabMenuOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'load') {
      setMultiLoadDialogOpen(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const canAdjustStock = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: stocks, isLoading: stocksLoading } = useQuery<Array<{
    productId: string;
    productName: string;
    productCode: string;
    quantity: string;
    unitOfMeasure: string;
  }>>({
    queryKey: ['/api/stock/general'],
  });

  const { data: movements, isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ['/api/stock/movements'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const activeEvents = events?.filter(e => e.status === 'scheduled' || e.status === 'ongoing') || [];

  const { data: eventStocks } = useQuery<Array<{
    id: string;
    productId: string;
    stationId: string | null;
    quantity: string;
  }>>({
    queryKey: ['/api/events', selectedEventId, 'stocks'],
    enabled: !!selectedEventId,
  });

  const loadForm = useForm<LoadStockData>({
    resolver: zodResolver(loadStockSchema),
    defaultValues: { productId: '', quantity: '', supplier: '', reason: '' },
  });

  const unloadForm = useForm<LoadStockData>({
    resolver: zodResolver(loadStockSchema),
    defaultValues: { productId: '', quantity: '', reason: '' },
  });

  const loadMutation = useMutation({
    mutationFn: async (data: LoadStockData) => {
      await apiRequest('POST', '/api/stock/load', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      setLoadDialogOpen(false);
      loadForm.reset();
      triggerHaptic('success');
      toast({ title: "Successo", description: "Carico effettuato con successo" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: "Impossibile effettuare il carico", variant: "destructive" });
    },
  });

  const unloadMutation = useMutation({
    mutationFn: async (data: LoadStockData) => {
      await apiRequest('POST', '/api/stock/unload', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      setUnloadDialogOpen(false);
      unloadForm.reset();
      triggerHaptic('success');
      toast({ title: "Successo", description: "Scarico effettuato con successo" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: "Impossibile effettuare lo scarico", variant: "destructive" });
    },
  });

  const bulkLoadMutation = useMutation({
    mutationFn: async (data: { items: MultiLoadItem[], reason?: string }) => {
      await apiRequest('POST', '/api/stock/bulk-load', data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      setMultiLoadDialogOpen(false);
      setMultiLoadItems([]);
      triggerHaptic('success');
      toast({ title: "Successo", description: `${variables.items.length} prodotti caricati` });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: "Impossibile effettuare il carico multiplo", variant: "destructive" });
    },
  });

  const handleAddMultiLoadItem = () => {
    triggerHaptic('light');
    setMultiLoadItems(prev => [...prev, { id: crypto.randomUUID(), productId: '', quantity: '', supplierId: undefined }]);
  };

  const handleRemoveMultiLoadItem = (id: string) => {
    triggerHaptic('light');
    setMultiLoadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateMultiLoadItem = (id: string, field: keyof MultiLoadItem, value: string) => {
    setMultiLoadItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmitBulkLoad = () => {
    const validItems = multiLoadItems.filter(item => {
      if (!item.productId || !item.quantity) return false;
      const qty = parseFloat(item.quantity);
      return !isNaN(qty) && qty > 0;
    });
    if (validItems.length === 0) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Aggiungi almeno un prodotto con quantità valida (maggiore di 0)", variant: "destructive" });
      return;
    }
    bulkLoadMutation.mutate({ items: validItems });
  };

  const bulkUnloadMutation = useMutation({
    mutationFn: async (data: { items: Array<{ productId: string; quantity: string; reason?: string }> }) => {
      await apiRequest('POST', '/api/stock/bulk-unload', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setMultiUnloadDialogOpen(false);
      setMultiUnloadItems([]);
      triggerHaptic('success');
      toast({ title: "Successo", description: "Scarico multiplo effettuato con successo" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: "Impossibile effettuare lo scarico multiplo", variant: "destructive" });
    },
  });

  const handleAddMultiUnloadItem = () => {
    triggerHaptic('light');
    setMultiUnloadItems(prev => [...prev, { id: crypto.randomUUID(), productId: '', quantity: '', reason: '' }]);
  };

  const handleRemoveMultiUnloadItem = (id: string) => {
    triggerHaptic('light');
    setMultiUnloadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateMultiUnloadItem = (id: string, field: keyof MultiUnloadItem, value: string) => {
    setMultiUnloadItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmitBulkUnload = () => {
    const validItems = multiUnloadItems.filter(item => {
      if (!item.productId || !item.quantity) return false;
      const qty = parseFloat(item.quantity);
      return !isNaN(qty) && qty > 0;
    });
    if (validItems.length === 0) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Aggiungi almeno un prodotto con quantità valida", variant: "destructive" });
      return;
    }
    bulkUnloadMutation.mutate({ items: validItems });
  };

  const transferToEventMutation = useMutation({
    mutationFn: async (data: { eventId: string; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/event-transfer', {
        eventId: data.eventId,
        stationId: null,
        productId: data.productId,
        quantity: data.quantity,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis') });
      setTransferQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      triggerHaptic('success');
      toast({ title: "Trasferimento completato", description: "Prodotto trasferito all'evento" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile trasferire il prodotto", variant: "destructive" });
    },
  });

  const consumeFromEventMutation = useMutation({
    mutationFn: async (data: { eventId: string; productId: string; quantity: number }) => {
      await apiRequest('POST', '/api/stock/consume', {
        eventId: data.eventId,
        stationId: null,
        productId: data.productId,
        quantity: data.quantity,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/events', selectedEventId, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis') });
      setConsumeQuantities(prev => ({ ...prev, [variables.productId]: "" }));
      triggerHaptic('success');
      toast({ title: "Scarico registrato", description: "Consumo registrato correttamente" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Effettua nuovamente il login...", variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile registrare lo scarico", variant: "destructive" });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async (data: { productId: string; newQuantity: number; reason?: string }) => {
      await apiRequest('POST', '/api/stock/adjust', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/events') && query.queryKey[2] === 'revenue-analysis') });
      setAdjustDialogOpen(false);
      setAdjustingProduct(null);
      setAdjustQuantity("");
      setAdjustReason("");
      triggerHaptic('success');
      toast({ title: "Correzione effettuata", description: "Quantità aggiornata correttamente" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Solo gestore e admin possono correggere le quantità", variant: "destructive" });
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile effettuare la correzione", variant: "destructive" });
    },
  });

  const clearWarehouseMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/stock/reset-warehouse');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      queryClient.invalidateQueries({ predicate: (query) => Boolean(query.queryKey[0]?.toString().includes('/api/reports')) });
      setClearWarehouseDialogOpen(false);
      triggerHaptic('success');
      toast({ title: "Magazzino svuotato", description: "Tutte le giacenze sono state azzerate" });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: "Non autorizzato", description: "Solo gestore e admin possono svuotare il magazzino", variant: "destructive" });
        return;
      }
      toast({ title: "Errore", description: error.message || "Impossibile svuotare il magazzino", variant: "destructive" });
    },
  });

  const handleAdjustStock = () => {
    if (!adjustingProduct) return;
    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty < 0) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Inserisci una quantità valida (maggiore o uguale a 0)", variant: "destructive" });
      return;
    }
    adjustStockMutation.mutate({ productId: adjustingProduct.id, newQuantity: qty, reason: adjustReason || undefined });
  };

  const openAdjustDialog = (productId: string, productName: string, currentQuantity: string) => {
    setAdjustingProduct({ id: productId, name: productName, quantity: currentQuantity });
    setAdjustQuantity(currentQuantity);
    setAdjustReason("");
    setAdjustDialogOpen(true);
  };

  const handleTransferToEvent = (productId: string) => {
    if (!selectedEventId) return;
    const qty = parseFloat(transferQuantities[productId] || "0");
    if (qty <= 0) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Inserisci una quantità valida", variant: "destructive" });
      return;
    }
    transferToEventMutation.mutate({ eventId: selectedEventId, productId, quantity: qty });
  };

  const handleConsumeFromEvent = (productId: string) => {
    if (!selectedEventId) return;
    const qty = parseFloat(consumeQuantities[productId] || "0");
    if (qty <= 0) {
      triggerHaptic('error');
      toast({ title: "Errore", description: "Inserisci una quantità valida", variant: "destructive" });
      return;
    }
    consumeFromEventMutation.mutate({ eventId: selectedEventId, productId, quantity: qty });
  };

  const getEventStock = (productId: string): number => {
    const stock = eventStocks?.find(s => s.productId === productId && !s.stationId);
    if (!stock) return 0;
    const quantity = parseFloat(stock.quantity);
    return isNaN(quantity) ? 0 : quantity;
  };

  const getGeneralStock = (productId: string): number => {
    const stock = stocks?.find(s => s.productId === productId);
    if (!stock) return 0;
    const quantity = parseFloat(stock.quantity);
    return isNaN(quantity) ? 0 : quantity;
  };

  const productsWithGeneralStock = products?.filter(p => p.active && getGeneralStock(p.id) > 0) || [];
  const productsWithEventStock = products?.filter(p => p.active && getEventStock(p.id) > 0) || [];

  const totalProducts = stocks?.length || 0;
  const totalQuantity = stocks?.reduce((sum, s) => sum + parseFloat(s.quantity || '0'), 0) || 0;
  const lowStockCount = stocks?.filter(s => {
    const product = products?.find(p => p.id === s.productId);
    return product?.minThreshold && parseFloat(s.quantity) < parseFloat(product.minThreshold);
  }).length || 0;
  const todayMovements = movements?.filter(m => {
    if (!m.createdAt) return false;
    const today = new Date();
    const movementDate = new Date(m.createdAt);
    return movementDate.toDateString() === today.toDateString();
  }).length || 0;

  const filteredStocks = stocks?.filter(stock => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return stock.productName.toLowerCase().includes(query) || stock.productCode.toLowerCase().includes(query);
  }) || [];

  const filteredMovements = movements?.filter(movement => {
    if (movementTypeFilter !== 'all' && movement.type !== movementTypeFilter) return false;
    if (movementSearchQuery) {
      const query = movementSearchQuery.toLowerCase();
      const product = products?.find(p => p.id === movement.productId);
      const productName = product?.name?.toLowerCase() || '';
      const productCode = product?.code?.toLowerCase() || '';
      const supplier = movement.supplier?.toLowerCase() || '';
      const reason = movement.reason?.toLowerCase() || '';
      return productName.includes(query) || productCode.includes(query) || supplier.includes(query) || reason.includes(query);
    }
    return true;
  }).slice(0, 50) || [];

  const header = (
    <MobileHeader
      title="Magazzino"
      subtitle="Gestione inventario"
      leftAction={
        <HapticButton variant="ghost" size="icon" asChild>
          <Link href="/beverage" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </HapticButton>
      }
    />
  );

  return (
    <MobileAppLayout header={header}>
      <div className="pb-24 space-y-6 py-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4"
        >
          <StatsCard title="Prodotti" value={totalProducts} icon={BoxesIcon} gradient="from-blue-500 to-indigo-600" testId="stat-total-products" />
          <StatsCard title="Quantità Totale" value={totalQuantity.toFixed(0)} icon={Package} gradient="from-emerald-500 to-teal-600" testId="stat-total-quantity" />
          <StatsCard title="Stock Basso" value={lowStockCount} icon={AlertTriangle} gradient="from-amber-500 to-orange-600" testId="stat-low-stock" />
          <StatsCard title="Movimenti Oggi" value={todayMovements} icon={Activity} gradient="from-violet-500 to-purple-600" testId="stat-today-movements" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, ...springTransition }}
        >
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); triggerHaptic('light'); }}>
            <TabsList className="w-full h-14 p-1 bg-card/50">
              <TabsTrigger value="stocks" className="flex-1 h-12 text-base font-medium" data-testid="tab-stocks">
                Giacenze
              </TabsTrigger>
              <TabsTrigger value="event-transfer" className="flex-1 h-12 text-base font-medium" data-testid="tab-event-transfer">
                Evento
              </TabsTrigger>
              <TabsTrigger value="movements" className="flex-1 h-12 text-base font-medium" data-testid="tab-movements">
                Movimenti
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stocks" className="mt-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Cerca prodotto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-base"
                  data-testid="input-search-products"
                />
              </div>
              
              {canAdjustStock && stocks && stocks.filter(s => parseFloat(s.quantity) > 0).length > 0 && (
                <HapticButton
                  variant="outline"
                  className="w-full h-14 border-destructive/50 text-destructive"
                  onClick={() => setClearWarehouseDialogOpen(true)}
                  data-testid="button-clear-warehouse"
                  hapticType="heavy"
                >
                  <Trash2 className="h-5 w-5 mr-2" />
                  Svuota Magazzino
                </HapticButton>
              )}

              {stocksLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
                </div>
              ) : filteredStocks.length > 0 ? (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                  {filteredStocks.map((stock) => {
                    const product = products?.find(p => p.id === stock.productId);
                    const isLowStock = product?.minThreshold && parseFloat(stock.quantity) < parseFloat(product.minThreshold);
                    return (
                      <StockCard
                        key={stock.productId}
                        stock={stock}
                        product={product}
                        isLowStock={!!isLowStock}
                        canAdjust={canAdjustStock}
                        onAdjust={() => openAdjustDialog(stock.productId, stock.productName, stock.quantity)}
                      />
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springTransition}
                  className="glass-card p-12 text-center"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-muted-foreground text-lg">Nessuna giacenza presente</p>
                </motion.div>
              )}
            </TabsContent>

            <TabsContent value="event-transfer" className="mt-6 space-y-4">
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="h-14 text-base" data-testid="select-event">
                  <SelectValue placeholder="Seleziona evento" />
                </SelectTrigger>
                <SelectContent>
                  {activeEvents.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <span className="flex items-center gap-2">
                        {event.name}
                        <span className={event.status === 'ongoing' ? 'text-teal' : 'text-muted-foreground'}>
                          ({event.status === 'ongoing' ? 'In corso' : 'Programmato'})
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!selectedEventId ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springTransition}
                  className="glass-card p-12 text-center"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-muted-foreground text-lg">Seleziona un evento</p>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={springTransition}
                    className="glass-card overflow-hidden"
                  >
                    <div className="p-5 border-b border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                          <TrendingUp className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Trasferisci a Evento</h3>
                          <p className="text-sm text-muted-foreground">Dal magazzino all'evento</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-white/10 max-h-[320px] overflow-y-auto">
                      {productsWithGeneralStock.length === 0 ? (
                        <div className="p-8 text-center">
                          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nessun prodotto disponibile</p>
                        </div>
                      ) : (
                        productsWithGeneralStock.map((product) => {
                          const generalStock = getGeneralStock(product.id);
                          return (
                            <div key={product.id} className="p-5 space-y-4" data-testid={`transfer-row-${product.id}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-base">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">Disponibile: <span className="text-teal font-semibold">{generalStock.toFixed(1)}</span></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Qtà"
                                  value={transferQuantities[product.id] || ""}
                                  onChange={(e) => setTransferQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                  className="flex-1 h-14 text-center text-lg"
                                  data-testid={`input-transfer-${product.id}`}
                                />
                                <HapticButton
                                  onClick={() => handleTransferToEvent(product.id)}
                                  disabled={transferToEventMutation.isPending}
                                  className="gradient-golden text-black h-14 px-6"
                                  data-testid={`button-transfer-${product.id}`}
                                >
                                  <Plus className="h-5 w-5" />
                                </HapticButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, ...springTransition }}
                    className="glass-card overflow-hidden"
                  >
                    <div className="p-5 border-b border-white/10">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shrink-0">
                          <TrendingDown className="h-7 w-7 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">Scarica da Evento</h3>
                          <p className="text-sm text-muted-foreground">Registra il consumo</p>
                        </div>
                      </div>
                    </div>
                    <div className="divide-y divide-white/10 max-h-[320px] overflow-y-auto">
                      {productsWithEventStock.length === 0 ? (
                        <div className="p-8 text-center">
                          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nessun prodotto nell'evento</p>
                        </div>
                      ) : (
                        productsWithEventStock.map((product) => {
                          const eventStock = getEventStock(product.id);
                          return (
                            <div key={product.id} className="p-5 space-y-4" data-testid={`consume-row-${product.id}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-base">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">Disponibile: <span className="text-amber-500 font-semibold">{eventStock.toFixed(1)}</span></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="Qtà"
                                  value={consumeQuantities[product.id] || ""}
                                  onChange={(e) => setConsumeQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                  className="flex-1 h-14 text-center text-lg"
                                  data-testid={`input-consume-${product.id}`}
                                />
                                <HapticButton
                                  variant="destructive"
                                  onClick={() => handleConsumeFromEvent(product.id)}
                                  disabled={consumeFromEventMutation.isPending}
                                  className="h-14 px-6"
                                  data-testid={`button-consume-${product.id}`}
                                >
                                  <TrendingDown className="h-5 w-5" />
                                </HapticButton>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="movements" className="mt-6 space-y-4">
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Cerca movimento..."
                    value={movementSearchQuery}
                    onChange={(e) => setMovementSearchQuery(e.target.value)}
                    className="pl-12 h-14 text-base"
                    data-testid="input-search-movements"
                  />
                </div>
                <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                  <SelectTrigger className="h-14 text-base" data-testid="select-movement-type">
                    <SelectValue placeholder="Tipo movimento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="LOAD">Carico</SelectItem>
                    <SelectItem value="UNLOAD">Scarico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {movementsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
                </div>
              ) : filteredMovements.length > 0 ? (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
                  {filteredMovements.map((movement) => {
                    const product = products?.find(p => p.id === movement.productId);
                    return <MovementCard key={movement.id} movement={movement} product={product} />;
                  })}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={springTransition}
                  className="glass-card p-12 text-center"
                >
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <WarehouseIcon className="h-10 w-10 text-white" />
                  </div>
                  <p className="text-muted-foreground text-lg">Nessun movimento registrato</p>
                </motion.div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      <AnimatePresence>
        {fabMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setFabMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {fabMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={springTransition}
              className="fixed z-50 right-4"
              style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
            >
              <HapticButton
                onClick={() => { setFabMenuOpen(false); setMultiLoadDialogOpen(true); }}
                className="gradient-golden text-black font-semibold glow-golden h-14 px-6 rounded-full shadow-lg"
                data-testid="button-fab-load"
                hapticType="medium"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Carico
              </HapticButton>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.8 }}
              transition={{ ...springTransition, delay: 0.05 }}
              className="fixed z-50 right-4"
              style={{ bottom: 'calc(9.5rem + env(safe-area-inset-bottom))' }}
            >
              <HapticButton
                variant="destructive"
                onClick={() => { setFabMenuOpen(false); setMultiUnloadDialogOpen(true); }}
                className="h-14 px-6 rounded-full shadow-lg font-semibold"
                data-testid="button-fab-unload"
                hapticType="medium"
              >
                <TrendingDown className="h-5 w-5 mr-2" />
                Scarico
              </HapticButton>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <FloatingActionButton
        onClick={() => { setFabMenuOpen(!fabMenuOpen); triggerHaptic('medium'); }}
        data-testid="button-fab-main"
      >
        <motion.div
          animate={{ rotate: fabMenuOpen ? 45 : 0 }}
          transition={springTransition}
        >
          <Plus className="h-6 w-6" />
        </motion.div>
      </FloatingActionButton>

      <BottomSheet
        open={multiLoadDialogOpen}
        onClose={() => { setMultiLoadDialogOpen(false); setMultiLoadItems([]); }}
        title="Carico Multiprodotto"
      >
        <div className="p-4 space-y-4 pb-8">
          <AnimatePresence>
            {multiLoadItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground py-8"
              >
                Clicca "+ Aggiungi Prodotto" per iniziare
              </motion.div>
            ) : (
              multiLoadItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={springTransition}
                  className="glass-card p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => handleUpdateMultiLoadItem(item.id, 'productId', value)}
                    >
                      <SelectTrigger className="flex-1 h-14" data-testid={`select-multi-product-${item.id}`}>
                        <SelectValue placeholder="Seleziona prodotto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <HapticButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMultiLoadItem(item.id)}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <X className="h-5 w-5" />
                    </HapticButton>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Quantità"
                      value={item.quantity}
                      className="h-14 text-lg text-center"
                      onChange={(e) => handleUpdateMultiLoadItem(item.id, 'quantity', e.target.value)}
                      data-testid={`input-multi-quantity-${item.id}`}
                    />
                    <Select
                      value={item.supplierId || ''}
                      onValueChange={(value) => handleUpdateMultiLoadItem(item.id, 'supplierId', value)}
                    >
                      <SelectTrigger className="h-14" data-testid={`select-multi-supplier-${item.id}`}>
                        <SelectValue placeholder="Fornitore" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nessuno</SelectItem>
                        {suppliers?.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          <HapticButton
            variant="outline"
            className="w-full h-14"
            onClick={handleAddMultiLoadItem}
            data-testid="button-add-multi-product"
          >
            <Plus className="h-5 w-5 mr-2" />
            Aggiungi Prodotto
          </HapticButton>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <HapticButton
              variant="outline"
              className="h-14"
              onClick={() => { setMultiLoadDialogOpen(false); setMultiLoadItems([]); }}
              data-testid="button-cancel-multi-load"
            >
              Annulla
            </HapticButton>
            <HapticButton
              onClick={handleSubmitBulkLoad}
              disabled={bulkLoadMutation.isPending || multiLoadItems.length === 0}
              className="gradient-golden text-black font-semibold h-14"
              data-testid="button-submit-multi-load"
              hapticType="success"
            >
              {bulkLoadMutation.isPending ? 'Caricamento...' : `Carica (${multiLoadItems.length})`}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={multiUnloadDialogOpen}
        onClose={() => { setMultiUnloadDialogOpen(false); setMultiUnloadItems([]); }}
        title="Scarico Multiprodotto"
      >
        <div className="p-4 space-y-4 pb-8">
          <AnimatePresence>
            {multiUnloadItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground py-8"
              >
                Clicca "+ Aggiungi Prodotto" per iniziare
              </motion.div>
            ) : (
              multiUnloadItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={springTransition}
                  className="glass-card p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => handleUpdateMultiUnloadItem(item.id, 'productId', value)}
                    >
                      <SelectTrigger className="flex-1 h-14" data-testid={`select-multi-unload-product-${item.id}`}>
                        <SelectValue placeholder="Seleziona prodotto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products?.filter(p => p.id).map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <HapticButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMultiUnloadItem(item.id)}
                      data-testid={`button-remove-multi-unload-${item.id}`}
                    >
                      <X className="h-5 w-5" />
                    </HapticButton>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Quantità"
                      value={item.quantity}
                      className="h-14 text-lg text-center"
                      onChange={(e) => handleUpdateMultiUnloadItem(item.id, 'quantity', e.target.value)}
                      data-testid={`input-multi-unload-quantity-${item.id}`}
                    />
                    <Input
                      placeholder="Motivo"
                      value={item.reason || ''}
                      className="h-14"
                      onChange={(e) => handleUpdateMultiUnloadItem(item.id, 'reason', e.target.value)}
                      data-testid={`input-multi-unload-reason-${item.id}`}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

          <HapticButton
            variant="outline"
            className="w-full h-14"
            onClick={handleAddMultiUnloadItem}
            data-testid="button-add-multi-unload-product"
          >
            <Plus className="h-5 w-5 mr-2" />
            Aggiungi Prodotto
          </HapticButton>

          <div className="grid grid-cols-2 gap-4 pt-4">
            <HapticButton
              variant="outline"
              className="h-14"
              onClick={() => { setMultiUnloadDialogOpen(false); setMultiUnloadItems([]); }}
              data-testid="button-cancel-multi-unload"
            >
              Annulla
            </HapticButton>
            <HapticButton
              variant="destructive"
              onClick={handleSubmitBulkUnload}
              disabled={bulkUnloadMutation.isPending || multiUnloadItems.length === 0}
              className="h-14 font-semibold"
              data-testid="button-submit-multi-unload"
              hapticType="success"
            >
              {bulkUnloadMutation.isPending ? 'Scaricando...' : `Scarica (${multiUnloadItems.length})`}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={loadDialogOpen}
        onClose={() => setLoadDialogOpen(false)}
        title="Carico Merce"
      >
        <div className="p-4 pb-8">
          <Form {...loadForm}>
            <form onSubmit={loadForm.handleSubmit((data) => loadMutation.mutate(data))} className="space-y-4">
              <FormField
                control={loadForm.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prodotto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14" data-testid="select-load-product">
                          <SelectValue placeholder="Seleziona prodotto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loadForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantità</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" className="h-14 text-lg" data-testid="input-load-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loadForm.control}
                name="supplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornitore (opzionale)</FormLabel>
                    <FormControl>
                      <Input {...field} className="h-14" data-testid="input-load-supplier" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loadForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Es. fattura, DDT, ecc." className="min-h-[100px]" data-testid="input-load-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4 pt-4">
                <HapticButton type="button" variant="outline" className="h-14" onClick={() => setLoadDialogOpen(false)} data-testid="button-cancel-load">
                  Annulla
                </HapticButton>
                <HapticButton type="submit" disabled={loadMutation.isPending} className="gradient-golden text-black font-semibold h-14" data-testid="button-submit-load" hapticType="success">
                  Carica
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={unloadDialogOpen}
        onClose={() => setUnloadDialogOpen(false)}
        title="Scarico Merce"
      >
        <div className="p-4 pb-8">
          <Form {...unloadForm}>
            <form onSubmit={unloadForm.handleSubmit((data) => unloadMutation.mutate(data))} className="space-y-4">
              <FormField
                control={unloadForm.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prodotto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-14" data-testid="select-unload-product">
                          <SelectValue placeholder="Seleziona prodotto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products?.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={unloadForm.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantità</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" className="h-14 text-lg" data-testid="input-unload-quantity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={unloadForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motivo</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Es. rottura, scarto, ecc." className="min-h-[100px]" data-testid="input-unload-reason" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4 pt-4">
                <HapticButton type="button" variant="outline" className="h-14" onClick={() => setUnloadDialogOpen(false)} data-testid="button-cancel-unload">
                  Annulla
                </HapticButton>
                <HapticButton type="submit" disabled={unloadMutation.isPending} className="h-14 font-semibold" variant="destructive" data-testid="button-submit-unload" hapticType="success">
                  Scarica
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={adjustDialogOpen}
        onClose={() => setAdjustDialogOpen(false)}
        title="Correggi Quantità"
      >
        <div className="p-4 space-y-4 pb-8">
          <div className="glass-card p-5">
            <p className="text-sm text-muted-foreground mb-1">Prodotto</p>
            <p className="font-semibold text-lg">{adjustingProduct?.name}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-sm text-muted-foreground mb-1">Quantità attuale</p>
            <p className="font-bold text-3xl tabular-nums">{adjustingProduct ? parseFloat(adjustingProduct.quantity).toFixed(2) : '-'}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nuova Quantità</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={adjustQuantity}
              onChange={(e) => setAdjustQuantity(e.target.value)}
              placeholder="Inserisci nuova quantità"
              className="h-14 text-xl text-center"
              data-testid="input-adjust-quantity"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (opzionale)</label>
            <Textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="Es: Correzione inventario..."
              className="min-h-[100px]"
              data-testid="input-adjust-reason"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            <HapticButton variant="outline" className="h-14" onClick={() => setAdjustDialogOpen(false)} data-testid="button-cancel-adjust">
              Annulla
            </HapticButton>
            <HapticButton
              onClick={handleAdjustStock}
              disabled={adjustStockMutation.isPending}
              className="gradient-golden text-black font-semibold h-14"
              data-testid="button-confirm-adjust"
              hapticType="success"
            >
              {adjustStockMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>

      <AlertDialog open={clearWarehouseDialogOpen} onOpenChange={setClearWarehouseDialogOpen}>
        <AlertDialogContent className="mx-4 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Svuota Magazzino</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler azzerare tutte le giacenze del magazzino? Questa operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3">
            <AlertDialogCancel asChild>
              <HapticButton variant="outline" className="h-14 w-full" data-testid="button-cancel-clear">
                Annulla
              </HapticButton>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <HapticButton
                variant="destructive"
                className="h-14 w-full"
                onClick={() => clearWarehouseMutation.mutate()}
                disabled={clearWarehouseMutation.isPending}
                data-testid="button-confirm-clear"
                hapticType="heavy"
              >
                {clearWarehouseMutation.isPending ? 'Svuotamento...' : 'Svuota Magazzino'}
              </HapticButton>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
