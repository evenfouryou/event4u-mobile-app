import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Warehouse as WarehouseIcon, TrendingUp, TrendingDown, Package, AlertTriangle, X, ListPlus, ArrowLeft, Pencil, BoxesIcon, Activity, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
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

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  trend?: string;
  testId: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {trend && (
          <span className="text-xs text-teal flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{title}</p>
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
  const { toast } = useToast();

  // Auto-open load dialog if URL contains ?action=load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'load') {
      setMultiLoadDialogOpen(true);
      // Clear the URL parameter after opening
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
    defaultValues: {
      productId: '',
      quantity: '',
      supplier: '',
      reason: '',
    },
  });

  const unloadForm = useForm<LoadStockData>({
    resolver: zodResolver(loadStockSchema),
    defaultValues: {
      productId: '',
      quantity: '',
      reason: '',
    },
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
      toast({
        title: "Successo",
        description: "Carico effettuato con successo",
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
        description: "Impossibile effettuare il carico",
        variant: "destructive",
      });
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
      toast({
        title: "Successo",
        description: "Scarico effettuato con successo",
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
        description: "Impossibile effettuare lo scarico",
        variant: "destructive",
      });
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
      toast({
        title: "Successo",
        description: `${variables.items.length} prodotti caricati`,
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
        description: "Impossibile effettuare il carico multiplo",
        variant: "destructive",
      });
    },
  });

  const handleAddMultiLoadItem = () => {
    setMultiLoadItems(prev => [...prev, {
      id: crypto.randomUUID(),
      productId: '',
      quantity: '',
      supplierId: undefined,
    }]);
  };

  const handleRemoveMultiLoadItem = (id: string) => {
    setMultiLoadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateMultiLoadItem = (id: string, field: keyof MultiLoadItem, value: string) => {
    setMultiLoadItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmitBulkLoad = () => {
    const validItems = multiLoadItems.filter(item => {
      if (!item.productId || !item.quantity) return false;
      const qty = parseFloat(item.quantity);
      return !isNaN(qty) && qty > 0;
    });
    
    if (validItems.length === 0) {
      toast({
        title: "Errore",
        description: "Aggiungi almeno un prodotto con quantità valida (maggiore di 0)",
        variant: "destructive",
      });
      return;
    }

    const invalidItems = multiLoadItems.filter(item => {
      if (!item.productId || !item.quantity) return false;
      const qty = parseFloat(item.quantity);
      return isNaN(qty) || qty <= 0;
    });

    if (invalidItems.length > 0) {
      toast({
        title: "Errore",
        description: "Alcune quantità non sono valide. Verifica i valori inseriti.",
        variant: "destructive",
      });
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
      toast({
        title: "Successo",
        description: "Scarico multiplo effettuato con successo",
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
        description: "Impossibile effettuare lo scarico multiplo",
        variant: "destructive",
      });
    },
  });

  const handleAddMultiUnloadItem = () => {
    setMultiUnloadItems(prev => [...prev, {
      id: crypto.randomUUID(),
      productId: '',
      quantity: '',
      reason: '',
    }]);
  };

  const handleRemoveMultiUnloadItem = (id: string) => {
    setMultiUnloadItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpdateMultiUnloadItem = (id: string, field: keyof MultiUnloadItem, value: string) => {
    setMultiUnloadItems(prev => prev.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmitBulkUnload = () => {
    const validItems = multiUnloadItems.filter(item => {
      if (!item.productId || !item.quantity) return false;
      const qty = parseFloat(item.quantity);
      return !isNaN(qty) && qty > 0;
    });
    
    if (validItems.length === 0) {
      toast({
        title: "Errore",
        description: "Aggiungi almeno un prodotto con quantità valida",
        variant: "destructive",
      });
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
      toast({
        title: "Trasferimento completato",
        description: "Prodotto trasferito all'evento",
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
        description: error.message || "Impossibile trasferire il prodotto",
        variant: "destructive",
      });
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
      toast({
        title: "Scarico registrato",
        description: "Consumo registrato correttamente",
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
        description: error.message || "Impossibile registrare lo scarico",
        variant: "destructive",
      });
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
      toast({
        title: "Correzione effettuata",
        description: "Quantità aggiornata correttamente",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Solo gestore e admin possono correggere le quantità",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile effettuare la correzione",
        variant: "destructive",
      });
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
      toast({
        title: "Magazzino svuotato",
        description: "Tutte le giacenze sono state azzerate",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Solo gestore e admin possono svuotare il magazzino",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Errore",
        description: error.message || "Impossibile svuotare il magazzino",
        variant: "destructive",
      });
    },
  });

  const handleAdjustStock = () => {
    if (!adjustingProduct) return;
    const qty = parseFloat(adjustQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida (maggiore o uguale a 0)",
        variant: "destructive",
      });
      return;
    }
    adjustStockMutation.mutate({
      productId: adjustingProduct.id,
      newQuantity: qty,
      reason: adjustReason || undefined,
    });
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
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    transferToEventMutation.mutate({
      eventId: selectedEventId,
      productId,
      quantity: qty,
    });
  };

  const handleConsumeFromEvent = (productId: string) => {
    if (!selectedEventId) return;
    const qty = parseFloat(consumeQuantities[productId] || "0");
    if (qty <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }
    consumeFromEventMutation.mutate({
      eventId: selectedEventId,
      productId,
      quantity: qty,
    });
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

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <Button 
          variant="ghost" 
          size="icon" 
          asChild
          className="rounded-xl"
          data-testid="button-back"
        >
          <Link href="/beverage">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">Magazzino Generale</h1>
          <p className="text-muted-foreground text-sm">
            Gestisci carico e scarico dell'inventario
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Prodotti"
          value={totalProducts}
          icon={BoxesIcon}
          gradient="from-blue-500 to-indigo-600"
          testId="stat-total-products"
          delay={0}
        />
        <StatsCard
          title="Quantità Totale"
          value={totalQuantity.toFixed(0)}
          icon={Package}
          gradient="from-emerald-500 to-teal-600"
          testId="stat-total-quantity"
          delay={0.1}
        />
        <StatsCard
          title="Stock Basso"
          value={lowStockCount}
          icon={AlertTriangle}
          gradient="from-amber-500 to-orange-600"
          testId="stat-low-stock"
          delay={0.2}
        />
        <StatsCard
          title="Movimenti Oggi"
          value={todayMovements}
          icon={Activity}
          gradient="from-violet-500 to-purple-600"
          testId="stat-today-movements"
          delay={0.3}
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap gap-2 mb-6"
      >
        <Dialog open={multiUnloadDialogOpen} onOpenChange={setMultiUnloadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" data-testid="button-multi-unload">
              <ListPlus className="h-4 w-4 mr-2" />
              Scarico Multiplo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scarico Multiprodotto</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block border border-white/5 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Quantità</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multiUnloadItems.length === 0 ? (
                      <TableRow className="border-white/5">
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nessun prodotto aggiunto. Clicca "+ Aggiungi Prodotto" per iniziare.
                        </TableCell>
                      </TableRow>
                    ) : (
                      multiUnloadItems.map((item) => (
                        <TableRow key={item.id} className="border-white/5">
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => handleUpdateMultiUnloadItem(item.id, 'productId', value)}
                            >
                              <SelectTrigger data-testid={`select-multi-unload-product-${item.id}`}>
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
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateMultiUnloadItem(item.id, 'quantity', e.target.value)}
                              data-testid={`input-multi-unload-quantity-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Motivo (opzionale)"
                              value={item.reason || ''}
                              onChange={(e) => handleUpdateMultiUnloadItem(item.id, 'reason', e.target.value)}
                              data-testid={`input-multi-unload-reason-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMultiUnloadItem(item.id)}
                              data-testid={`button-remove-multi-unload-${item.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {multiUnloadItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 glass-card">
                    Nessun prodotto aggiunto. Clicca "+ Aggiungi Prodotto" per iniziare.
                  </div>
                ) : (
                  multiUnloadItems.map((item) => (
                    <div key={item.id} className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={item.productId}
                          onValueChange={(value) => handleUpdateMultiUnloadItem(item.id, 'productId', value)}
                        >
                          <SelectTrigger className="flex-1 min-h-[48px]" data-testid={`select-multi-unload-product-mobile-${item.id}`}>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[48px] min-w-[48px]"
                          onClick={() => handleRemoveMultiUnloadItem(item.id)}
                          data-testid={`button-remove-multi-unload-mobile-${item.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Quantità"
                          value={item.quantity}
                          className="min-h-[48px]"
                          onChange={(e) => handleUpdateMultiUnloadItem(item.id, 'quantity', e.target.value)}
                          data-testid={`input-multi-unload-quantity-mobile-${item.id}`}
                        />
                        <Input
                          placeholder="Motivo"
                          value={item.reason || ''}
                          className="min-h-[48px]"
                          onChange={(e) => handleUpdateMultiUnloadItem(item.id, 'reason', e.target.value)}
                          data-testid={`input-multi-unload-reason-mobile-${item.id}`}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={handleAddMultiUnloadItem}
                className="min-h-[48px]"
                data-testid="button-add-multi-unload-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Prodotto
              </Button>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                onClick={() => {
                  setMultiUnloadDialogOpen(false);
                  setMultiUnloadItems([]);
                }}
                data-testid="button-cancel-multi-unload"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmitBulkUnload}
                disabled={bulkUnloadMutation.isPending || multiUnloadItems.length === 0}
                className="min-h-[48px]"
                data-testid="button-submit-multi-unload"
              >
                {bulkUnloadMutation.isPending ? 'Scaricando...' : `Scarica ${multiUnloadItems.length > 0 ? `(${multiUnloadItems.length})` : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={unloadDialogOpen} onOpenChange={setUnloadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="min-h-[48px]" data-testid="button-unload-stock">
              <TrendingDown className="h-4 w-4 mr-2" />
              Scarico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scarico Merce</DialogTitle>
            </DialogHeader>
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
                          <SelectTrigger data-testid="select-unload-product">
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
                        <Input {...field} type="number" step="0.01" data-testid="input-unload-quantity" />
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
                        <Textarea {...field} placeholder="Es. rottura, scarto, ecc." data-testid="input-unload-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[48px]"
                    onClick={() => setUnloadDialogOpen(false)}
                    data-testid="button-cancel-unload"
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={unloadMutation.isPending} className="min-h-[48px]" data-testid="button-submit-unload">
                    Scarica
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-golden text-black font-semibold glow-golden min-h-[48px]" data-testid="button-load-stock">
              <TrendingUp className="h-4 w-4 mr-2" />
              Carico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Carico Merce</DialogTitle>
            </DialogHeader>
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
                          <SelectTrigger data-testid="select-load-product">
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
                        <Input {...field} type="number" step="0.01" data-testid="input-load-quantity" />
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
                        <Input {...field} data-testid="input-load-supplier" />
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
                        <Textarea {...field} placeholder="Es. fattura, DDT, ecc." data-testid="input-load-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[48px]"
                    onClick={() => setLoadDialogOpen(false)}
                    data-testid="button-cancel-load"
                  >
                    Annulla
                  </Button>
                  <Button type="submit" disabled={loadMutation.isPending} className="gradient-golden text-black font-semibold min-h-[48px]" data-testid="button-submit-load">
                    Carica
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={multiLoadDialogOpen} onOpenChange={setMultiLoadDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="min-h-[48px]" data-testid="button-multi-load">
              <ListPlus className="h-4 w-4 mr-2" />
              Carico Multiplo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Carico Multiprodotto</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Desktop Table */}
              <div className="hidden md:block border border-white/5 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5">
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Quantità</TableHead>
                      <TableHead>Fornitore</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {multiLoadItems.length === 0 ? (
                      <TableRow className="border-white/5">
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nessun prodotto aggiunto. Clicca "+ Aggiungi Prodotto" per iniziare.
                        </TableCell>
                      </TableRow>
                    ) : (
                      multiLoadItems.map((item) => (
                        <TableRow key={item.id} className="border-white/5">
                          <TableCell>
                            <Select
                              value={item.productId}
                              onValueChange={(value) => handleUpdateMultiLoadItem(item.id, 'productId', value)}
                            >
                              <SelectTrigger data-testid={`select-multi-product-${item.id}`}>
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
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0"
                              value={item.quantity}
                              onChange={(e) => handleUpdateMultiLoadItem(item.id, 'quantity', e.target.value)}
                              data-testid={`input-multi-quantity-${item.id}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.supplierId || ''}
                              onValueChange={(value) => handleUpdateMultiLoadItem(item.id, 'supplierId', value)}
                            >
                              <SelectTrigger data-testid={`select-multi-supplier-${item.id}`}>
                                <SelectValue placeholder="Nessuno" />
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
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveMultiLoadItem(item.id)}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {multiLoadItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 glass-card">
                    Nessun prodotto aggiunto. Clicca "+ Aggiungi Prodotto" per iniziare.
                  </div>
                ) : (
                  multiLoadItems.map((item) => (
                    <div key={item.id} className="glass-card p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <Select
                          value={item.productId}
                          onValueChange={(value) => handleUpdateMultiLoadItem(item.id, 'productId', value)}
                        >
                          <SelectTrigger className="flex-1 min-h-[48px]" data-testid={`select-multi-product-mobile-${item.id}`}>
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="min-h-[48px] min-w-[48px]"
                          onClick={() => handleRemoveMultiLoadItem(item.id)}
                          data-testid={`button-remove-mobile-${item.id}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Quantità"
                          value={item.quantity}
                          className="min-h-[48px]"
                          onChange={(e) => handleUpdateMultiLoadItem(item.id, 'quantity', e.target.value)}
                          data-testid={`input-multi-quantity-mobile-${item.id}`}
                        />
                        <Select
                          value={item.supplierId || ''}
                          onValueChange={(value) => handleUpdateMultiLoadItem(item.id, 'supplierId', value)}
                        >
                          <SelectTrigger className="min-h-[48px]" data-testid={`select-multi-supplier-mobile-${item.id}`}>
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
                    </div>
                  ))
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                onClick={handleAddMultiLoadItem}
                data-testid="button-add-multi-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Prodotto
              </Button>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-[48px]"
                onClick={() => {
                  setMultiLoadDialogOpen(false);
                  setMultiLoadItems([]);
                }}
                data-testid="button-cancel-multi-load"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSubmitBulkLoad}
                disabled={bulkLoadMutation.isPending || multiLoadItems.length === 0}
                className="gradient-golden text-black font-semibold min-h-[48px]"
                data-testid="button-submit-multi-load"
              >
                {bulkLoadMutation.isPending ? 'Caricamento...' : `Carica ${multiLoadItems.length > 0 ? `(${multiLoadItems.length})` : ''}`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Tabs defaultValue="stocks" className="space-y-6">
          <TabsList className="glass-card p-1">
            <TabsTrigger value="stocks" data-testid="tab-stocks">Giacenze</TabsTrigger>
            <TabsTrigger value="event-transfer" data-testid="tab-event-transfer">Trasferimento Evento</TabsTrigger>
            <TabsTrigger value="movements" data-testid="tab-movements">Movimenti</TabsTrigger>
          </TabsList>

          <TabsContent value="stocks" className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                placeholder="Cerca prodotto per nome o codice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-products"
                className="flex-1 md:max-w-md"
              />
              {canAdjustStock && stocks && stocks.filter(s => parseFloat(s.quantity) > 0).length > 0 && (
                <Button
                  variant="destructive"
                  onClick={() => setClearWarehouseDialogOpen(true)}
                  data-testid="button-clear-warehouse"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Svuota Magazzino
                </Button>
              )}
            </div>

            <div className="glass-card overflow-hidden">
              {stocksLoading ? (
                <div className="p-6">
                  <Skeleton className="h-96" />
                </div>
              ) : stocks && stocks.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5">
                          <TableHead>Codice</TableHead>
                          <TableHead>Prodotto</TableHead>
                          <TableHead className="text-right">Quantità</TableHead>
                          <TableHead>Unità</TableHead>
                          <TableHead>Stato</TableHead>
                          {canAdjustStock && <TableHead className="w-16">Azioni</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {stocks
                          .filter(stock => parseFloat(stock.quantity) > 0)
                          .filter(stock => {
                            if (!searchQuery) return true;
                            const query = searchQuery.toLowerCase();
                            return stock.productName.toLowerCase().includes(query) ||
                                   stock.productCode.toLowerCase().includes(query);
                          })
                          .map((stock) => {
                            const product = products?.find(p => p.id === stock.productId);
                            const isLowStock = product?.minThreshold && parseFloat(stock.quantity) < parseFloat(product.minThreshold);
                            return (
                              <TableRow key={stock.productId} className="border-white/5" data-testid={`stock-row-${stock.productId}`}>
                                <TableCell className="font-mono text-muted-foreground">{stock.productCode}</TableCell>
                                <TableCell className="font-medium">{stock.productName}</TableCell>
                                <TableCell className="text-right font-semibold tabular-nums">
                                  {parseFloat(stock.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{stock.unitOfMeasure}</TableCell>
                                <TableCell>
                                  {isLowStock ? (
                                    <Badge variant="destructive" className="gap-1" data-testid={`badge-low-stock-${stock.productId}`}>
                                      <AlertTriangle className="h-3 w-3" />
                                      Stock Basso
                                    </Badge>
                                  ) : (
                                    <span className="text-teal text-sm font-medium">OK</span>
                                  )}
                                </TableCell>
                                {canAdjustStock && (
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openAdjustDialog(stock.productId, stock.productName, stock.quantity)}
                                      data-testid={`button-adjust-${stock.productId}`}
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
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3 p-4">
                    {stocks
                      .filter(stock => parseFloat(stock.quantity) > 0)
                      .filter(stock => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        return stock.productName.toLowerCase().includes(query) ||
                               stock.productCode.toLowerCase().includes(query);
                      })
                      .map((stock) => {
                        const product = products?.find(p => p.id === stock.productId);
                        const isLowStock = product?.minThreshold && parseFloat(stock.quantity) < parseFloat(product.minThreshold);
                        return (
                          <div 
                            key={stock.productId} 
                            className="glass-card p-4"
                            data-testid={`stock-card-${stock.productId}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{stock.productName}</div>
                                <div className="text-xs text-muted-foreground font-mono">{stock.productCode}</div>
                              </div>
                              {canAdjustStock && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="min-h-[48px] min-w-[48px]"
                                  onClick={() => openAdjustDialog(stock.productId, stock.productName, stock.quantity)}
                                  data-testid={`button-adjust-mobile-${stock.productId}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                              <div className="flex items-center gap-4">
                                <div>
                                  <div className="text-xs text-muted-foreground">Quantità</div>
                                  <div className="font-semibold tabular-nums">{parseFloat(stock.quantity).toFixed(2)} {stock.unitOfMeasure}</div>
                                </div>
                              </div>
                              {isLowStock ? (
                                <Badge variant="destructive" className="gap-1" data-testid={`badge-low-stock-mobile-${stock.productId}`}>
                                  <AlertTriangle className="h-3 w-3" />
                                  Stock Basso
                                </Badge>
                              ) : (
                                <span className="text-teal text-sm font-medium">OK</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-muted-foreground">Nessuna giacenza presente</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="event-transfer" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger className="w-[300px]" data-testid="select-event">
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
              </div>

              {!selectedEventId ? (
                <div className="glass-card p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-muted-foreground">Seleziona un evento per gestire i trasferimenti</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Trasferisci a Evento</h3>
                          <p className="text-sm text-muted-foreground">
                            Sposta prodotti dal magazzino generale all'evento
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-0">
                      {productsWithGeneralStock.length === 0 ? (
                        <div className="p-8 text-center">
                          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nessun prodotto disponibile in magazzino</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                          {productsWithGeneralStock.map((product) => {
                            const generalStock = getGeneralStock(product.id);
                            return (
                              <div 
                                key={product.id} 
                                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                                data-testid={`transfer-row-${product.id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">{product.code}</div>
                                </div>
                                
                                <div className="text-right text-sm shrink-0">
                                  <div className="text-muted-foreground">Disponibile</div>
                                  <div className="font-semibold text-teal">{generalStock.toFixed(1)}</div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="Qtà"
                                    value={transferQuantities[product.id] || ""}
                                    onChange={(e) => setTransferQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                    className="w-20 h-9 text-center"
                                    data-testid={`input-transfer-${product.id}`}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => handleTransferToEvent(product.id)}
                                    disabled={transferToEventMutation.isPending}
                                    className="gradient-golden text-black h-9"
                                    data-testid={`button-transfer-${product.id}`}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="glass-card overflow-hidden">
                    <div className="p-5 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                          <TrendingDown className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">Scarica da Evento</h3>
                          <p className="text-sm text-muted-foreground">
                            Registra il consumo dei prodotti nell'evento
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-0">
                      {productsWithEventStock.length === 0 ? (
                        <div className="p-8 text-center">
                          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground">Nessun prodotto trasferito all'evento</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                          {productsWithEventStock.map((product) => {
                            const eventStock = getEventStock(product.id);
                            return (
                              <div 
                                key={product.id} 
                                className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors"
                                data-testid={`consume-row-${product.id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">{product.code}</div>
                                </div>
                                
                                <div className="text-right text-sm shrink-0">
                                  <div className="text-muted-foreground">Nell'evento</div>
                                  <div className="font-semibold text-amber-500">{eventStock.toFixed(1)}</div>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    placeholder="Qtà"
                                    value={consumeQuantities[product.id] || ""}
                                    onChange={(e) => setConsumeQuantities(prev => ({ ...prev, [product.id]: e.target.value }))}
                                    className="w-20 h-9 text-center"
                                    data-testid={`input-consume-${product.id}`}
                                  />
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleConsumeFromEvent(product.id)}
                                    disabled={consumeFromEventMutation.isPending}
                                    className="h-9"
                                    data-testid={`button-consume-${product.id}`}
                                  >
                                    <TrendingDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="movements" className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                placeholder="Cerca prodotto, fornitore o motivo..."
                value={movementSearchQuery}
                onChange={(e) => setMovementSearchQuery(e.target.value)}
                data-testid="input-search-movements"
                className="max-w-md"
              />
              <Select value={movementTypeFilter} onValueChange={setMovementTypeFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-movement-type">
                  <SelectValue placeholder="Tipo movimento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="LOAD">Carico</SelectItem>
                  <SelectItem value="UNLOAD">Scarico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="glass-card overflow-hidden">
              {movementsLoading ? (
                <div className="p-6">
                  <Skeleton className="h-96" />
                </div>
              ) : movements && movements.length > 0 ? (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5">
                          <TableHead>Data</TableHead>
                          <TableHead>Prodotto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Quantità</TableHead>
                          <TableHead>Fornitore</TableHead>
                          <TableHead>Motivo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements
                          .filter(movement => {
                            if (movementTypeFilter !== 'all' && movement.type !== movementTypeFilter) {
                              return false;
                            }
                            if (movementSearchQuery) {
                              const query = movementSearchQuery.toLowerCase();
                              const product = products?.find(p => p.id === movement.productId);
                              const productName = product?.name?.toLowerCase() || '';
                              const productCode = product?.code?.toLowerCase() || '';
                              const supplier = movement.supplier?.toLowerCase() || '';
                              const reason = movement.reason?.toLowerCase() || '';
                              return productName.includes(query) || 
                                     productCode.includes(query) || 
                                     supplier.includes(query) || 
                                     reason.includes(query);
                            }
                            return true;
                          })
                          .slice(0, 50)
                          .map((movement) => {
                            const product = products?.find(p => p.id === movement.productId);
                            return (
                              <TableRow key={movement.id} className="border-white/5" data-testid={`movement-row-${movement.id}`}>
                                <TableCell className="text-muted-foreground">
                                  {movement.createdAt ? new Date(movement.createdAt).toLocaleString('it-IT') : '-'}
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{product?.name || 'Sconosciuto'}</div>
                                  <div className="text-xs text-muted-foreground font-mono">{product?.code || '-'}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    variant={movement.type === 'LOAD' ? 'secondary' : 'outline'}
                                    className={movement.type === 'LOAD' ? 'bg-teal-500/20 text-teal border-teal-500/30' : ''}
                                  >
                                    {movement.type === 'LOAD' ? 'Carico' : 'Scarico'}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`font-semibold tabular-nums ${movement.type === 'LOAD' ? 'text-teal' : 'text-amber-500'}`}>
                                  {movement.type === 'LOAD' ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {movement.supplier || '-'}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {movement.reason || '-'}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3 p-4">
                    {movements
                      .filter(movement => {
                        if (movementTypeFilter !== 'all' && movement.type !== movementTypeFilter) {
                          return false;
                        }
                        if (movementSearchQuery) {
                          const query = movementSearchQuery.toLowerCase();
                          const product = products?.find(p => p.id === movement.productId);
                          const productName = product?.name?.toLowerCase() || '';
                          const productCode = product?.code?.toLowerCase() || '';
                          const supplier = movement.supplier?.toLowerCase() || '';
                          const reason = movement.reason?.toLowerCase() || '';
                          return productName.includes(query) || 
                                 productCode.includes(query) || 
                                 supplier.includes(query) || 
                                 reason.includes(query);
                        }
                        return true;
                      })
                      .slice(0, 50)
                      .map((movement) => {
                        const product = products?.find(p => p.id === movement.productId);
                        return (
                          <div 
                            key={movement.id} 
                            className="glass-card p-4"
                            data-testid={`movement-card-${movement.id}`}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{product?.name || 'Sconosciuto'}</div>
                                <div className="text-xs text-muted-foreground font-mono">{product?.code || '-'}</div>
                              </div>
                              <Badge 
                                variant={movement.type === 'LOAD' ? 'secondary' : 'outline'}
                                className={movement.type === 'LOAD' ? 'bg-teal-500/20 text-teal border-teal-500/30' : ''}
                              >
                                {movement.type === 'LOAD' ? 'Carico' : 'Scarico'}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                              <div className="text-xs text-muted-foreground">
                                {movement.createdAt ? new Date(movement.createdAt).toLocaleString('it-IT') : '-'}
                              </div>
                              <div className={`font-semibold tabular-nums ${movement.type === 'LOAD' ? 'text-teal' : 'text-amber-500'}`}>
                                {movement.type === 'LOAD' ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                              </div>
                            </div>
                            {(movement.supplier || movement.reason) && (
                              <div className="mt-2 pt-2 border-t border-white/5 text-xs text-muted-foreground">
                                {movement.supplier && <div>Fornitore: {movement.supplier}</div>}
                                {movement.reason && <div>Motivo: {movement.reason}</div>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <WarehouseIcon className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-muted-foreground">Nessun movimento registrato</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Correggi Quantità</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Prodotto</p>
              <p className="font-medium">{adjustingProduct?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Quantità attuale</p>
              <p className="font-medium">{adjustingProduct ? parseFloat(adjustingProduct.quantity).toFixed(2) : '-'}</p>
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
                className="min-h-[48px]"
                data-testid="input-adjust-quantity"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opzionale)</label>
              <Textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="Es: Correzione inventario, errore conteggio..."
                data-testid="input-adjust-reason"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="min-h-[48px]"
              onClick={() => setAdjustDialogOpen(false)}
              data-testid="button-cancel-adjust"
            >
              Annulla
            </Button>
            <Button
              onClick={handleAdjustStock}
              disabled={adjustStockMutation.isPending}
              className="gradient-golden text-black font-semibold min-h-[48px]"
              data-testid="button-confirm-adjust"
            >
              {adjustStockMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Warehouse Confirmation Dialog */}
      <AlertDialog open={clearWarehouseDialogOpen} onOpenChange={setClearWarehouseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Svuota Magazzino</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler azzerare tutte le giacenze del magazzino? Questa operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear-warehouse">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clearWarehouseMutation.mutate()}
              disabled={clearWarehouseMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-clear-warehouse"
            >
              {clearWarehouseMutation.isPending ? "Svuotamento..." : "Svuota Magazzino"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
