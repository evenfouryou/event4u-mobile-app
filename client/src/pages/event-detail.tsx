import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  ChevronRight,
  Sparkles
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

const statusConfig: Record<string, { labelKey: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { labelKey: 'events.draft', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: FilePenLine },
  scheduled: { labelKey: 'events.scheduled', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: CalendarCheck },
  ongoing: { labelKey: 'events.ongoing', color: 'text-teal', bgColor: 'bg-teal-500/20', icon: Clock },
  closed: { labelKey: 'events.closed', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2 },
};

type TabType = 'info' | 'tickets' | 'staff' | 'inventory';

const tabs: { id: TabType; labelKey: string; icon: React.ElementType }[] = [
  { id: 'info', labelKey: 'eventDetail.tabs.info', icon: Info },
  { id: 'tickets', labelKey: 'tickets.title', icon: Ticket },
  { id: 'staff', labelKey: 'eventDetail.tabs.staff', icon: Users },
  { id: 'inventory', labelKey: 'inventory.title', icon: Package },
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
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

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
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stations'] });
      setStationDialogOpen(false);
      stationForm.reset();
      setSelectedBartenderIds([]);
      toast({ title: t('common.success'), description: t('eventDetail.stationCreated') });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: t('common.unauthorized'), description: t('common.loginAgain'), variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: t('common.error'), description: t('eventDetail.stationCreateError'), variant: "destructive" });
    },
  });

  const updateBartendersMutation = useMutation({
    mutationFn: async ({ stationId, bartenderIds }: { stationId: string; bartenderIds: string[] }) => {
      await apiRequest('PATCH', `/api/stations/${stationId}/bartenders`, { bartenderIds });
    },
    onSuccess: (_, variables) => {
      triggerHaptic('success');
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
      toast({ title: t('common.success'), description: t('eventDetail.bartendersUpdated') });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: t('common.unauthorized'), description: t('common.loginAgain'), variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: t('common.error'), description: t('eventDetail.bartendersUpdateError'), variant: "destructive" });
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
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/stock/general'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stock/movements'] });
      setTransferDialogOpen(false);
      setSelectedProducts(new Map());
      setDestinationStationId('general');
      
      if (results.failed.length === 0) {
        toast({ title: t('common.success'), description: t('eventDetail.productsTransferred', { count: results.successful.length }) });
      } else {
        toast({ title: t('eventDetail.partialError'), description: `${t('common.error')}: ${results.failed.map(f => f.productName).join(', ')}`, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: t('common.unauthorized'), description: t('common.loginAgain'), variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: t('common.error'), description: error.message || t('eventDetail.transferError'), variant: "destructive" });
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      await apiRequest('PATCH', `/api/events/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setStatusChangeDialogOpen(false);
      toast({ title: t('common.success'), description: t('eventDetail.statusUpdated') });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: t('common.unauthorized'), description: t('common.loginAgain'), variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: t('common.error'), description: error.message || t('eventDetail.statusChangeError'), variant: "destructive" });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, newQuantity, reason, stationId }: { productId: string; newQuantity: number; reason?: string; stationId: string | null }) => {
      await apiRequest('POST', '/api/stock/adjust', { productId, newQuantity, reason, eventId: id, stationId });
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events', id, 'stocks'] });
      setEditStockDialogOpen(false);
      setEditingStock(null);
      setNewQuantity('');
      setAdjustReason('');
      toast({ title: t('common.success'), description: t('eventDetail.quantityAdjusted') });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: t('common.unauthorized'), description: t('common.loginAgain'), variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: t('common.error'), description: error.message || t('eventDetail.quantityAdjustError'), variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('DELETE', `/api/events/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      setDeleteDialogOpen(false);
      toast({ title: t('common.success'), description: t('eventDetail.eventDeleted') });
      setLocation('/events');
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({ title: t('common.unauthorized'), description: t('common.loginAgain'), variant: "destructive" });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({ title: t('common.error'), description: error.message || t('eventDetail.eventDeleteError'), variant: "destructive" });
    },
  });

  const handleEditStock = (stock: { id: string; productId: string; stationId: string | null; quantity: string }) => {
    triggerHaptic('light');
    const product = products?.find(p => p.id === stock.productId);
    setEditingStock({
      stockId: stock.id,
      productId: stock.productId,
      stationId: stock.stationId,
      currentQuantity: stock.quantity,
      productName: product?.name || t('inventory.product'),
    });
    setNewQuantity(stock.quantity);
    setAdjustReason('');
    setEditStockDialogOpen(true);
  };

  const submitStockAdjustment = () => {
    if (!editingStock) return;
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: t('eventDetail.enterValidQuantity'), variant: "destructive" });
      return;
    }
    adjustStockMutation.mutate({ productId: editingStock.productId, newQuantity: qty, reason: adjustReason || undefined, stationId: editingStock.stationId });
  };

  const bartenders = users?.filter(u => u.role === 'bartender') || [];

  const handleProductToggle = (productId: string, checked: boolean) => {
    triggerHaptic('light');
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
        errors.push(t('eventDetail.productNotFound', { productId }));
        return;
      }
      const quantityNum = parseFloat(quantity);
      const availableNum = parseFloat(stock.quantity);
      if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
        errors.push(t('eventDetail.invalidQuantityFor', { product: stock.productName }));
        return;
      }
      if (quantityNum > availableNum) {
        errors.push(t('eventDetail.quantityExceedsAvailable', { product: stock.productName }));
        return;
      }
      transfers.push({ productId, quantity: quantityNum });
    });

    if (errors.length > 0) {
      triggerHaptic('error');
      toast({ title: t('eventDetail.validationErrors'), description: errors.join(', '), variant: "destructive" });
      return;
    }
    if (transfers.length === 0) {
      triggerHaptic('error');
      toast({ title: t('eventDetail.noProductSelected'), description: t('eventDetail.selectAtLeastOne'), variant: "destructive" });
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
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springTransition}
          className="w-12 h-12 border-3 border-primary border-t-transparent rounded-full animate-spin" 
        />
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
                <ArrowLeft className="h-6 w-6" />
              </HapticButton>
            }
          />
        }
      >
        <div className="space-y-4 py-4 pb-24">
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      </MobileAppLayout>
    );
  }

  if (!event) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title={t('eventDetail.event')}
            leftAction={
              <HapticButton variant="ghost" size="icon" onClick={() => setLocation('/events')}>
                <ArrowLeft className="h-6 w-6" />
              </HapticButton>
            }
          />
        }
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="flex flex-col items-center justify-center py-20 px-6"
        >
          <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mb-6">
            <Package className="h-10 w-10 text-muted-foreground" />
          </div>
          <p className="text-lg text-muted-foreground text-center mb-6">{t('eventDetail.eventNotFound')}</p>
          <HapticButton 
            variant="outline" 
            onClick={() => setLocation('/events')} 
            className="h-14 px-8 rounded-2xl"
            data-testid="button-back-to-events"
          >
            {t('eventDetail.backToEvents')}
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
      <div className="flex items-center justify-between px-4 py-3 min-h-[60px]">
        <HapticButton 
          variant="ghost" 
          size="icon" 
          className="h-11 w-11"
          onClick={() => setLocation('/events')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-6 w-6" />
        </HapticButton>
        
        <div className="flex-1 mx-4 min-w-0">
          <h1 className="font-bold text-lg truncate">{event.name}</h1>
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springTransition}
            className="flex items-center gap-2 mt-1"
          >
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
              <StatusIcon className="h-3 w-3" />
              {t(status.labelKey)}
            </span>
          </motion.div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <HapticButton variant="ghost" size="icon" className="h-11 w-11" data-testid="button-menu">
              <MoreVertical className="h-6 w-6" />
            </HapticButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
            <DropdownMenuItem 
              onClick={() => {
                triggerHaptic('light');
                setStatusChangeDialogOpen(true);
              }}
              className="h-12 rounded-xl"
            >
              <Clock className="h-5 w-5 mr-3" />
              {t('eventDetail.changeStatus')}
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="h-12 rounded-xl">
              <Link href={`/events/${id}/direct-stock`} className="flex items-center">
                <Warehouse className="h-5 w-5 mr-3" />
                {t('eventDetail.directLoad')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="h-12 rounded-xl">
              <Link href={`/reports?eventId=${id}`} className="flex items-center">
                <Package className="h-5 w-5 mr-3" />
                {t('reports.title')}
              </Link>
            </DropdownMenuItem>
            {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'gestore') && (
              <DropdownMenuItem 
                onClick={() => {
                  triggerHaptic('medium');
                  setDeleteDialogOpen(true);
                }}
                className="h-12 rounded-xl text-destructive focus:text-destructive"
              >
                <Trash2 className="h-5 w-5 mr-3" />
                {t('eventDetail.deleteEvent')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex px-3 pb-3 gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                triggerHaptic('light');
                setActiveTab(tab.id);
              }}
              className={`flex-1 min-h-[52px] flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl transition-colors relative`}
              data-testid={`tab-${tab.id}`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute inset-0 bg-primary/15 rounded-2xl"
                  transition={springTransition}
                />
              )}
              <Icon className={`h-5 w-5 relative z-10 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-[11px] font-semibold relative z-10 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {t(tab.labelKey)}
              </span>
            </motion.button>
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
      className="space-y-5"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
      >
        <div className="flex items-center gap-4 mb-5">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center"
          >
            <Calendar className="h-7 w-7 text-primary" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{t('events.eventDate')}</p>
            <p className="font-bold text-lg">
              {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mb-5">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/30 to-teal-500/10 flex items-center justify-center"
          >
            <Clock className="h-7 w-7 text-teal-500" />
          </motion.div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground mb-1">{t('events.timeSlot')}</p>
            <p className="font-bold text-lg">
              {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              {event.endDatetime && ` - ${new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>

        {event.locationId && (
          <div className="flex items-center gap-4">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/30 to-violet-500/10 flex items-center justify-center"
            >
              <MapPin className="h-7 w-7 text-violet-500" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-muted-foreground mb-1">{t('events.location')}</p>
              <p className="font-bold text-lg">{t('eventDetail.eventVenue')}</p>
            </div>
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          whileTap={{ scale: 0.98 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
            <Package className="h-6 w-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{totalStockItems}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('products.title')}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          whileTap={{ scale: 0.98 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{totalStations}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('stations.title')}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
          whileTap={{ scale: 0.98 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-teal-500/20">
            <Users className="h-6 w-6 text-white" />
          </div>
          <p className="text-3xl font-bold">{assignedBartendersCount}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('eventDetail.tabs.staff')}</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.25 }}
          whileTap={{ scale: 0.98 }}
          className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/20">
            <StatusIcon className="h-6 w-6 text-white" />
          </div>
          <p className="text-xl font-bold">{t(status.labelKey)}</p>
          <p className="text-sm text-muted-foreground mt-1">{t('common.status')}</p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.3 }}
      >
        <HapticButton
          className="w-full h-14 rounded-2xl text-base font-semibold"
          onClick={() => setStatusChangeDialogOpen(true)}
          data-testid="button-change-status"
        >
          <Sparkles className="h-5 w-5 mr-2" />
          {t('eventDetail.changeEventStatus')}
        </HapticButton>
      </motion.div>
    </motion.div>
  );

  const renderTicketsTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-5"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 border border-border/50 text-center"
      >
        <motion.div 
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500/30 to-orange-600/20 flex items-center justify-center mx-auto mb-6"
        >
          <Ticket className="h-10 w-10 text-amber-500" />
        </motion.div>
        <h3 className="font-bold text-xl mb-3">{t('eventDetail.ticketManagement')}</h3>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {t('eventDetail.ticketManagementDesc')}
        </p>
        <HapticButton 
          variant="outline" 
          className="w-full h-14 rounded-2xl text-base font-semibold"
          onClick={() => setLocation(`/siae/ticketed-events/${id}`)}
          data-testid="button-manage-tickets"
        >
          {t('eventDetail.goToTicketManagement')}
          <ChevronRight className="h-5 w-5 ml-2" />
        </HapticButton>
      </motion.div>
    </motion.div>
  );

  const renderStaffTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{t('stations.title')}</h3>
        <HapticButton 
          className="h-11 px-4 rounded-xl"
          onClick={() => setStationDialogOpen(true)}
          data-testid="button-create-station"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('eventDetail.new')}
        </HapticButton>
      </div>

      {stationsLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-3xl" />
          <Skeleton className="h-28 rounded-3xl" />
        </div>
      ) : allStations.length > 0 ? (
        <div className="space-y-4">
          {allStations.map((station, index) => {
            const assignedBartenders = users?.filter(u => station.bartenderIds?.includes(u.id)) || [];
            const isEditing = editingStationIds.has(station.id);

            return (
              <motion.div
                key={station.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: index * 0.05 }}
                className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
                data-testid={`station-card-${station.id}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center">
                      <MapPin className="h-6 w-6 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-base">{station.name}</h4>
                      {station.isGeneral && (
                        <Badge variant="secondary" className="text-xs mt-1">{t('eventDetail.fixed')}</Badge>
                      )}
                    </div>
                  </div>
                  {!isEditing && (
                    <HapticButton
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl"
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
                      <Pencil className="h-5 w-5" />
                    </HapticButton>
                  )}
                </div>

                {!isEditing ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-3">{t('eventDetail.assignedStaff')}:</p>
                    {assignedBartenders.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {assignedBartenders.map(bartender => (
                          <Badge key={bartender.id} variant="secondary" className="text-sm py-1.5 px-3">
                            {bartender.firstName && bartender.lastName 
                              ? `${bartender.firstName} ${bartender.lastName}` 
                              : bartender.email}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('eventDetail.noBartenderAssigned')}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-40 overflow-y-auto space-y-2 bg-muted/30 rounded-2xl p-3">
                      {bartenders.map((bartender) => {
                        const currentIds = editingBartenderIds.get(station.id) || [];
                        return (
                          <label 
                            key={bartender.id} 
                            className="flex items-center gap-4 p-3 rounded-xl hover-elevate cursor-pointer min-h-[48px]"
                          >
                            <Checkbox
                              checked={currentIds.includes(bartender.id)}
                              onCheckedChange={(checked) => {
                                triggerHaptic('light');
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
                            <span className="text-sm font-medium">
                              {bartender.firstName && bartender.lastName 
                                ? `${bartender.firstName} ${bartender.lastName}` 
                                : bartender.email}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex gap-3">
                      <HapticButton
                        className="flex-1 h-12 rounded-xl"
                        onClick={() => {
                          const ids = editingBartenderIds.get(station.id) || [];
                          updateBartendersMutation.mutate({ stationId: station.id, bartenderIds: ids });
                        }}
                        disabled={updateBartendersMutation.isPending}
                      >
                        {t('common.save')}
                      </HapticButton>
                      <HapticButton
                        variant="outline"
                        className="flex-1 h-12 rounded-xl"
                        onClick={() => {
                          triggerHaptic('light');
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
                        {t('common.cancel')}
                      </HapticButton>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="bg-card/80 backdrop-blur-xl rounded-3xl p-10 text-center border-2 border-dashed border-white/10"
        >
          <div className="w-16 h-16 rounded-3xl bg-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <MapPin className="h-8 w-8 text-violet-400" />
          </div>
          <p className="text-muted-foreground text-lg mb-5">{t('eventDetail.noStations')}</p>
          <HapticButton 
            onClick={() => setStationDialogOpen(true)}
            className="h-12 px-6 rounded-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('stations.createStation')}
          </HapticButton>
        </motion.div>
      )}
    </motion.div>
  );

  const renderInventoryTab = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={springTransition}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{t('warehouse.eventStock')}</h3>
        <HapticButton 
          className="h-11 px-4 rounded-xl"
          onClick={() => setTransferDialogOpen(true)}
          data-testid="button-transfer-stock"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('warehouse.transfer')}
        </HapticButton>
      </div>

      {eventStocksLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : eventStocks && eventStocks.length > 0 ? (
        <div className="space-y-4">
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
                transition={{ ...springTransition, delay: index * 0.03 }}
                className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 border border-border/50"
                data-testid={`event-stock-${stock.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-blue-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-base truncate">{product?.name || t('inventory.product')}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {station ? station.name : t('eventDetail.eventWarehouse')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isLowStock && (
                      <Badge variant="destructive" className="shrink-0 py-1">
                        <AlertTriangle className="h-4 w-4" />
                      </Badge>
                    )}
                    <span className="font-bold text-lg tabular-nums min-w-[60px] text-right">
                      {isNaN(quantity) ? '0' : quantity.toFixed(2)}
                    </span>
                    <HapticButton
                      size="icon"
                      variant="ghost"
                      className="h-11 w-11 rounded-xl"
                      onClick={() => handleEditStock(stock)}
                      data-testid={`button-edit-stock-${stock.id}`}
                    >
                      <Pencil className="h-5 w-5" />
                    </HapticButton>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="bg-card/80 backdrop-blur-xl rounded-3xl p-10 text-center border-2 border-dashed border-white/10"
        >
          <div className="w-16 h-16 rounded-3xl bg-blue-500/20 flex items-center justify-center mx-auto mb-5">
            <Package className="h-8 w-8 text-blue-400" />
          </div>
          <p className="text-lg text-muted-foreground mb-2">{t('eventDetail.noProductsTransferred')}</p>
          <p className="text-sm text-muted-foreground mb-5">{t('eventDetail.transferFromWarehouse')}</p>
          <HapticButton 
            onClick={() => setTransferDialogOpen(true)}
            className="h-12 px-6 rounded-xl"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('warehouse.transferStock')}
          </HapticButton>
        </motion.div>
      )}
    </motion.div>
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-event-detail">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/events')} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{event.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {t(status.labelKey)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStatusChangeDialogOpen(true)} data-testid="button-change-status-desktop">
              <Clock className="w-4 h-4 mr-2" />
              {t('eventDetail.changeStatus')}
            </Button>
            <Link href={`/events/${id}/direct-stock`}>
              <Button variant="outline" data-testid="button-direct-stock">
                <Warehouse className="w-4 h-4 mr-2" />
                {t('eventDetail.directLoad')}
              </Button>
            </Link>
            <Link href={`/reports?eventId=${id}`}>
              <Button variant="outline" data-testid="button-reports">
                <Package className="w-4 h-4 mr-2" />
                {t('reports.title')}
              </Button>
            </Link>
            {user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'gestore') && (
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} data-testid="button-delete-event">
                <Trash2 className="w-4 h-4 mr-2" />
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('common.date')}</p>
                  <p className="font-semibold">
                    {new Date(event.startDatetime).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('products.title')}</p>
                  <p className="text-2xl font-bold">{totalStockItems}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-violet-500/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('stations.title')}</p>
                  <p className="text-2xl font-bold">{totalStations}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-teal-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-teal-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventDetail.tabs.staff')}</p>
                  <p className="text-2xl font-bold">{assignedBartendersCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="space-y-6">
          <TabsList>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} data-testid={`desktop-tab-${tab.id}`}>
                  <Icon className="h-4 w-4 mr-2" />
                  {t(tab.labelKey)}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('eventDetail.eventDetails')}</CardTitle>
                <CardDescription>{t('eventDetail.generalInfo')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('events.eventDate')}</p>
                      <p className="font-medium">
                        {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">{t('events.timeSlot')}</p>
                      <p className="font-medium">
                        {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        {event.endDatetime && ` - ${new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tickets Tab */}
          <TabsContent value="tickets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('eventDetail.ticketManagement')}</CardTitle>
                <CardDescription>{t('eventDetail.ticketManagementDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setLocation(`/siae/ticketed-events/${id}`)} data-testid="button-manage-tickets-desktop">
                  <Ticket className="h-4 w-4 mr-2" />
                  {t('eventDetail.goToTicketManagement')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>{t('stations.title')}</CardTitle>
                  <CardDescription>{t('eventDetail.manageStationsAndStaff')}</CardDescription>
                </div>
                <Button onClick={() => setStationDialogOpen(true)} data-testid="button-create-station-desktop">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('stations.newStation')}
                </Button>
              </CardHeader>
              <CardContent>
                {stationsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : allStations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('eventDetail.type')}</TableHead>
                        <TableHead>{t('eventDetail.assignedStaff')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allStations.map((station) => {
                        const assignedBartenders = users?.filter(u => station.bartenderIds?.includes(u.id)) || [];
                        const isEditing = editingStationIds.has(station.id);
                        return (
                          <TableRow key={station.id} data-testid={`station-row-${station.id}`}>
                            <TableCell className="font-medium">{station.name}</TableCell>
                            <TableCell>
                              {station.isGeneral ? (
                                <Badge variant="secondary">{t('eventDetail.fixed')}</Badge>
                              ) : (
                                <Badge>{t('eventDetail.event')}</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex flex-wrap gap-2">
                                  {bartenders.map((bartender) => {
                                    const currentIds = editingBartenderIds.get(station.id) || [];
                                    return (
                                      <label key={bartender.id} className="flex items-center gap-2 cursor-pointer">
                                        <Checkbox
                                          checked={currentIds.includes(bartender.id)}
                                          onCheckedChange={(checked) => {
                                            setEditingBartenderIds(prev => {
                                              const newMap = new Map(prev);
                                              const ids = newMap.get(station.id) || [];
                                              if (checked) {
                                                newMap.set(station.id, [...ids, bartender.id]);
                                              } else {
                                                newMap.set(station.id, ids.filter(i => i !== bartender.id));
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
                              ) : assignedBartenders.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {assignedBartenders.map(b => (
                                    <Badge key={b.id} variant="secondary">
                                      {b.firstName && b.lastName ? `${b.firstName} ${b.lastName}` : b.email}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">{t('eventDetail.noneAssigned')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const ids = editingBartenderIds.get(station.id) || [];
                                      updateBartendersMutation.mutate({ stationId: station.id, bartenderIds: ids });
                                    }}
                                    disabled={updateBartendersMutation.isPending}
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button
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
                                    {t('common.cancel')}
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="icon"
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
                                  data-testid={`button-edit-bartenders-desktop-${station.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('eventDetail.noStations')}</p>
                    <Button className="mt-4" onClick={() => setStationDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('stations.createStation')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>{t('warehouse.eventStock')}</CardTitle>
                  <CardDescription>{t('eventDetail.productsTransferredToEvent')}</CardDescription>
                </div>
                <Button onClick={() => setTransferDialogOpen(true)} data-testid="button-transfer-stock-desktop">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('warehouse.transferStock')}
                </Button>
              </CardHeader>
              <CardContent>
                {eventStocksLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : eventStocks && eventStocks.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('inventory.product')}</TableHead>
                        <TableHead>{t('stations.station')}</TableHead>
                        <TableHead className="text-right">{t('inventory.quantity')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventStocks.map((stock) => {
                        const product = products?.find(p => p.id === stock.productId);
                        const station = eventStations?.find(s => s.id === stock.stationId);
                        const quantity = parseFloat(stock.quantity);
                        const isLowStock = product?.minThreshold && !isNaN(quantity) && quantity < parseFloat(product.minThreshold);
                        return (
                          <TableRow key={stock.id} data-testid={`stock-row-${stock.id}`}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {product?.name || t('inventory.product')}
                                {isLowStock && (
                                  <Badge variant="destructive">
                                    <AlertTriangle className="h-3 w-3" />
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{station ? station.name : t('eventDetail.eventWarehouse')}</TableCell>
                            <TableCell className="text-right font-mono">
                              {isNaN(quantity) ? '0' : quantity.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleEditStock(stock)}
                                data-testid={`button-edit-stock-desktop-${stock.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-10">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('eventDetail.noProductsTransferred')}</p>
                    <Button className="mt-4" onClick={() => setTransferDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('warehouse.transferStock')}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('eventDetail.deleteEventConfirm')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('eventDetail.deleteEventWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteEventMutation.mutate()}
                disabled={deleteEventMutation.isPending}
                className="bg-destructive text-destructive-foreground"
              >
                {deleteEventMutation.isPending ? t('eventDetail.deleting') : t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('eventDetail.changeEventStatus')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {Object.entries(statusConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isCurrentStatus = event.status === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeStatusMutation.mutate(key)}
                    disabled={changeStatusMutation.isPending || isCurrentStatus}
                    className={`w-full flex items-center gap-4 p-4 rounded-md transition-colors ${
                      isCurrentStatus
                        ? 'bg-primary/15 border-2 border-primary'
                        : 'bg-muted/50 hover-elevate border-2 border-transparent'
                    }`}
                    data-testid={`status-option-desktop-${key}`}
                  >
                    <div className={`w-10 h-10 rounded-md ${config.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <span className="font-medium">{t(config.labelKey)}</span>
                    {isCurrentStatus && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                  </button>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={stationDialogOpen} onOpenChange={setStationDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('stations.newStation')}</DialogTitle>
            </DialogHeader>
            <Form {...stationForm}>
              <form
                onSubmit={stationForm.handleSubmit((data) => {
                  createStationMutation.mutate({ ...data, bartenderIds: selectedBartenderIds });
                })}
                className="space-y-4"
              >
                <FormField
                  control={stationForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('stations.stationName')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('stations.stationNamePlaceholder')} data-testid="input-station-name-desktop" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>{t('eventDetail.bartendersOptional')}</FormLabel>
                  <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                    {bartenders.length > 0 ? bartenders.map((bartender) => (
                      <label key={bartender.id} className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate">
                        <Checkbox
                          checked={selectedBartenderIds.includes(bartender.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedBartenderIds([...selectedBartenderIds, bartender.id]);
                            } else {
                              setSelectedBartenderIds(selectedBartenderIds.filter(i => i !== bartender.id));
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
                      <p className="text-sm text-muted-foreground p-2">{t('eventDetail.noBartendersAvailable')}</p>
                    )}
                  </div>
                </FormItem>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setStationDialogOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createStationMutation.isPending}>
                    {createStationMutation.isPending ? t('eventDetail.creating') : t('common.create')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('warehouse.transferStock')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('eventDetail.destination')}</label>
                <Select value={destinationStationId} onValueChange={setDestinationStationId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('eventDetail.selectDestination')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t('eventDetail.eventWarehouse')}</SelectItem>
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
                  <p className="text-sm font-medium">{t('eventDetail.availableProducts')}</p>
                  {generalStocks.map((stock) => {
                    const isSelected = selectedProducts.has(stock.productId);
                    const quantity = selectedProducts.get(stock.productId) || '';
                    const available = parseFloat(stock.quantity);
                    return (
                      <div key={stock.productId} className="p-3 rounded-md bg-muted/50 flex items-center gap-4">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => handleProductToggle(stock.productId, checked as boolean)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{stock.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {t('eventDetail.available')}: {available.toFixed(2)} {stock.unitOfMeasure}
                          </p>
                        </div>
                        {isSelected && (
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={available}
                            placeholder={t('eventDetail.qty')}
                            value={quantity}
                            onChange={(e) => handleQuantityChange(stock.productId, e.target.value)}
                            className="w-24"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">{t('eventDetail.noProductsAvailable')}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={validateAndSubmitTransfers}
                disabled={transferStockMutation.isPending || selectedProducts.size === 0}
              >
                {transferStockMutation.isPending ? t('eventDetail.transferring') : t('warehouse.transfer')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={editStockDialogOpen} onOpenChange={setEditStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('eventDetail.correctQuantity')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">{t('inventory.product')}</p>
                <p className="font-bold">{editingStock?.productName}</p>
              </div>
              <div className="p-4 rounded-md bg-muted/50">
                <p className="text-sm text-muted-foreground">{t('eventDetail.currentQuantity')}</p>
                <p className="text-2xl font-bold">{editingStock?.currentQuantity}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('eventDetail.newQuantity')}</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">{t('eventDetail.reasonOptional')}</label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={t('eventDetail.reasonPlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditStockDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={submitStockAdjustment} disabled={adjustStockMutation.isPending}>
                {adjustStockMutation.isPending ? t('eventDetail.saving') : t('common.save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={renderHeader()}
      noPadding
    >
      <div className="px-4 py-5 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'info' && <div key="info">{renderInfoTab()}</div>}
          {activeTab === 'tickets' && <div key="tickets">{renderTicketsTab()}</div>}
          {activeTab === 'staff' && <div key="staff">{renderStaffTab()}</div>}
          {activeTab === 'inventory' && <div key="inventory">{renderInventoryTab()}</div>}
        </AnimatePresence>
      </div>

      {activeTab === 'inventory' && (
        <FloatingActionButton
          onClick={() => {
            triggerHaptic('medium');
            setTransferDialogOpen(true);
          }}
          data-testid="fab-transfer"
        >
          <Plus className="h-7 w-7" />
        </FloatingActionButton>
      )}

      {activeTab === 'staff' && (
        <FloatingActionButton
          onClick={() => {
            triggerHaptic('medium');
            setStationDialogOpen(true);
          }}
          data-testid="fab-add-station"
        >
          <Plus className="h-7 w-7" />
        </FloatingActionButton>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{t('eventDetail.deleteEventConfirm')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t('eventDetail.deleteEventWarning')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-12 rounded-xl flex-1">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteEventMutation.mutate()}
              disabled={deleteEventMutation.isPending}
              className="bg-destructive text-destructive-foreground h-12 rounded-xl flex-1"
            >
              {deleteEventMutation.isPending ? t('eventDetail.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomSheet
        open={statusChangeDialogOpen}
        onClose={() => setStatusChangeDialogOpen(false)}
        title={t('eventDetail.changeEventStatus')}
      >
        <div className="space-y-3 p-4">
          {Object.entries(statusConfig).map(([key, config]) => {
            const Icon = config.icon;
            const isCurrentStatus = event.status === key;
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  triggerHaptic('medium');
                  changeStatusMutation.mutate(key);
                }}
                disabled={changeStatusMutation.isPending || isCurrentStatus}
                className={`w-full flex items-center gap-4 p-5 rounded-2xl transition-colors min-h-[64px] ${
                  isCurrentStatus 
                    ? 'bg-primary/15 border-2 border-primary' 
                    : 'bg-muted/50 hover-elevate border-2 border-transparent'
                }`}
                data-testid={`status-option-${key}`}
              >
                <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${config.color}`} />
                </div>
                <span className="font-semibold text-base">{t(config.labelKey)}</span>
                {isCurrentStatus && (
                  <CheckCircle2 className="h-6 w-6 text-primary ml-auto" />
                )}
              </motion.button>
            );
          })}
        </div>
      </BottomSheet>

      <BottomSheet
        open={stationDialogOpen}
        onClose={() => setStationDialogOpen(false)}
        title={t('stations.newStation')}
      >
        <Form {...stationForm}>
          <form 
            onSubmit={stationForm.handleSubmit((data) => {
              createStationMutation.mutate({ ...data, bartenderIds: selectedBartenderIds });
            })} 
            className="p-4 space-y-5"
          >
            <FormField
              control={stationForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">{t('stations.stationName')}</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder={t('stations.stationNamePlaceholder')} 
                      className="h-14 text-base rounded-xl" 
                      data-testid="input-station-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel className="text-base">{t('eventDetail.bartendersOptional')}</FormLabel>
              <div className="border rounded-2xl p-3 space-y-2 max-h-48 overflow-y-auto bg-muted/30">
                {bartenders.length > 0 ? bartenders.map((bartender) => (
                  <label 
                    key={bartender.id} 
                    className="flex items-center gap-4 p-3 rounded-xl cursor-pointer hover-elevate min-h-[48px]"
                  >
                    <Checkbox
                      checked={selectedBartenderIds.includes(bartender.id)}
                      onCheckedChange={(checked) => {
                        triggerHaptic('light');
                        if (checked) {
                          setSelectedBartenderIds([...selectedBartenderIds, bartender.id]);
                        } else {
                          setSelectedBartenderIds(selectedBartenderIds.filter(id => id !== bartender.id));
                        }
                      }}
                    />
                    <span className="text-sm font-medium">
                      {bartender.firstName && bartender.lastName 
                        ? `${bartender.firstName} ${bartender.lastName}` 
                        : bartender.email}
                    </span>
                  </label>
                )) : (
                  <p className="text-sm text-muted-foreground p-3">{t('eventDetail.noBartendersAvailable')}</p>
                )}
              </div>
            </FormItem>

            <div className="flex gap-3 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1 h-14 rounded-xl text-base" 
                onClick={() => setStationDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={createStationMutation.isPending} 
                className="flex-1 h-14 rounded-xl text-base"
              >
                {createStationMutation.isPending ? t('eventDetail.creating') : t('common.create')}
              </Button>
            </div>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        title={t('warehouse.transferStock')}
      >
        <div className="p-4 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-base font-medium mb-3 block">{t('eventDetail.destination')}</label>
            <Select value={destinationStationId} onValueChange={setDestinationStationId}>
              <SelectTrigger className="h-14 text-base rounded-xl">
                <SelectValue placeholder={t('eventDetail.selectDestination')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="general" className="h-12">{t('eventDetail.eventWarehouse')}</SelectItem>
                {allStations.map((station) => (
                  <SelectItem key={station.id} value={station.id} className="h-12">
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {generalStocks && generalStocks.length > 0 ? (
            <div className="space-y-3">
              <p className="text-base font-medium">{t('eventDetail.availableProducts')}</p>
              {generalStocks.map((stock) => {
                const isSelected = selectedProducts.has(stock.productId);
                const quantity = selectedProducts.get(stock.productId) || '';
                const available = parseFloat(stock.quantity);
                
                return (
                  <div key={stock.productId} className="p-4 rounded-2xl bg-muted/50">
                    <label className="flex items-center gap-4 cursor-pointer min-h-[48px]">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleProductToggle(stock.productId, checked as boolean)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{stock.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('eventDetail.available')}: {available.toFixed(2)} {stock.unitOfMeasure}
                        </p>
                      </div>
                    </label>
                    {isSelected && (
                      <div className="mt-3 pl-10">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={available}
                          placeholder={t('inventory.quantity')}
                          value={quantity}
                          onChange={(e) => handleQuantityChange(stock.productId, e.target.value)}
                          className="h-12 text-base rounded-xl"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10">
              <Package className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">{t('eventDetail.noProductsAvailable')}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-card pb-safe">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-xl text-base" 
              onClick={() => setTransferDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1 h-14 rounded-xl text-base"
              onClick={validateAndSubmitTransfers}
              disabled={transferStockMutation.isPending || selectedProducts.size === 0}
            >
              {transferStockMutation.isPending ? t('eventDetail.transferring') : t('warehouse.transfer')}
            </Button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={editStockDialogOpen}
        onClose={() => setEditStockDialogOpen(false)}
        title={t('eventDetail.correctQuantity')}
      >
        <div className="p-4 space-y-5">
          <div className="p-5 rounded-2xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">{t('inventory.product')}</p>
            <p className="font-bold text-lg">{editingStock?.productName}</p>
          </div>
          <div className="p-5 rounded-2xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">{t('eventDetail.currentQuantity')}</p>
            <p className="font-bold text-2xl">{editingStock?.currentQuantity}</p>
          </div>
          <div>
            <label className="text-base font-medium mb-3 block">{t('eventDetail.newQuantity')}</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="0.00"
              className="h-14 text-base rounded-xl"
            />
          </div>
          <div>
            <label className="text-base font-medium mb-3 block">{t('eventDetail.reasonOptional')}</label>
            <Input
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder={t('eventDetail.reasonPlaceholder')}
              className="h-14 text-base rounded-xl"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 h-14 rounded-xl text-base" 
              onClick={() => setEditStockDialogOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button 
              className="flex-1 h-14 rounded-xl text-base"
              onClick={submitStockAdjustment}
              disabled={adjustStockMutation.isPending}
            >
              {adjustStockMutation.isPending ? t('eventDetail.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
