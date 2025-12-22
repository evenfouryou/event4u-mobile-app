import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  ShoppingCart, 
  Plus, 
  FileText, 
  Sparkles, 
  Package,
  AlertTriangle,
  TrendingUp,
  Edit,
  Trash2,
  FileSpreadsheet,
  ArrowLeft,
  Calendar,
  Truck,
  Building2,
  X,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  insertPurchaseOrderSchema, 
  type PurchaseOrder, 
  type InsertPurchaseOrder,
  type Supplier,
  type Product,
} from "@shared/schema";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  FloatingActionButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";

const purchaseOrderFormSchema = insertPurchaseOrderSchema.extend({
  orderDate: z.string(),
  expectedDeliveryDate: z.string().optional().nullable(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

type SuggestedOrder = {
  productId: string;
  productName: string;
  productCode: string;
  currentStock: number;
  minThreshold: number;
  avgConsumption: number;
  suggestedQuantity: number;
  reason: string;
};

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

export default function PurchaseOrders() {
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [suggestionsSheetOpen, setSuggestionsSheetOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const { data: orders, isLoading: ordersLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/purchase-orders'],
  });

  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const [suggestions, setSuggestions] = useState<SuggestedOrder[] | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  
  const fetchSuggestions = async () => {
    setSuggestionsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/purchase-orders/suggested', {});
      const data = await response.json();
      setSuggestions(data as SuggestedOrder[]);
      setSuggestionsSheetOpen(true);
    } catch (error: any) {
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
        description: "Impossibile generare ordini suggeriti",
        variant: "destructive",
      });
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      supplierId: '',
      orderNumber: '',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: '',
      status: 'draft',
      notes: '',
      totalAmount: '0',
      companyId: '',
      createdBy: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      const orderData: InsertPurchaseOrder = {
        ...data,
        orderDate: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      };
      await apiRequest('POST', '/api/purchase-orders', orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setFormSheetOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Ordine creato con successo",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
        description: "Impossibile creare l'ordine",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PurchaseOrderFormData }) => {
      const orderData: Partial<PurchaseOrder> = {
        ...data,
        orderDate: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      };
      await apiRequest('PATCH', `/api/purchase-orders/${id}`, orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setFormSheetOpen(false);
      setEditingOrder(null);
      form.reset();
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Ordine aggiornato con successo",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
        description: "Impossibile aggiornare l'ordine",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setDeletingOrder(null);
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Ordine eliminato con successo",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
        description: "Impossibile eliminare l'ordine",
        variant: "destructive",
      });
    },
  });

  const handleOpenForm = (order?: PurchaseOrder) => {
    if (order) {
      setEditingOrder(order);
      const orderDateValue = order.orderDate as any;
      const orderDate = typeof orderDateValue === 'string' 
        ? (orderDateValue as string).split('T')[0] 
        : new Date(orderDateValue as Date).toISOString().split('T')[0];
      
      let expectedDeliveryDate = '';
      if (order.expectedDeliveryDate) {
        const deliveryValue = order.expectedDeliveryDate as any;
        expectedDeliveryDate = typeof deliveryValue === 'string'
          ? (deliveryValue as string).split('T')[0]
          : new Date(deliveryValue as Date).toISOString().split('T')[0];
      }
      
      form.reset({
        supplierId: order.supplierId,
        orderNumber: order.orderNumber ?? '',
        orderDate,
        expectedDeliveryDate,
        status: order.status,
        notes: order.notes ?? '',
        totalAmount: order.totalAmount ?? '0',
        companyId: order.companyId,
        createdBy: order.createdBy,
      });
    } else {
      setEditingOrder(null);
      form.reset({
        supplierId: '',
        orderNumber: `ORD-${Date.now()}`,
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: '',
        status: 'draft',
        notes: '',
        totalAmount: '0',
        companyId: '',
        createdBy: '',
      });
    }
    setFormSheetOpen(true);
  };

  const onSubmit = (data: PurchaseOrderFormData) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    if (statusFilter === 'all') return orders;
    return orders.filter(order => order.status === statusFilter);
  }, [orders, statusFilter]);

  const statusLabels: Record<string, string> = {
    draft: 'Bozza',
    submitted: 'Inviato',
    received: 'Ricevuto',
    cancelled: 'Annullato',
  };

  const statusColors: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    submitted: 'bg-primary/20 text-primary',
    received: 'bg-green-500/20 text-green-500',
    cancelled: 'bg-destructive/20 text-destructive',
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.name || 'Sconosciuto';
  };

  const exportToPDF = async (order: PurchaseOrder) => {
    triggerHaptic('medium');
    const doc = new jsPDF();
    const supplier = suppliers?.find(s => s.id === order.supplierId);
    
    doc.setFontSize(20);
    doc.text('Ordine d\'Acquisto', 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Numero Ordine: ${order.orderNumber || 'N/A'}`, 20, 40);
    doc.text(`Data: ${format(new Date(order.orderDate as any), 'dd/MM/yyyy')}`, 20, 50);
    doc.text(`Fornitore: ${supplier?.name || 'N/A'}`, 20, 60);
    if (order.expectedDeliveryDate) {
      doc.text(`Consegna Prevista: ${format(new Date(order.expectedDeliveryDate as any), 'dd/MM/yyyy')}`, 20, 70);
    }
    doc.text(`Stato: ${statusLabels[order.status]}`, 20, 80);
    
    if (supplier) {
      doc.text('Dettagli Fornitore:', 20, 100);
      doc.setFontSize(10);
      if (supplier.vatNumber) doc.text(`P.IVA: ${supplier.vatNumber}`, 20, 108);
      if (supplier.email) doc.text(`Email: ${supplier.email}`, 20, 116);
      if (supplier.phone) doc.text(`Tel: ${supplier.phone}`, 20, 124);
      if (supplier.address) doc.text(`Indirizzo: ${supplier.address}`, 20, 132);
    }
    
    doc.setFontSize(14);
    doc.text(`Totale: € ${parseFloat(order.totalAmount || '0').toFixed(2)}`, 20, 160);
    
    if (order.notes) {
      doc.setFontSize(10);
      doc.text(`Note: ${order.notes}`, 20, 175);
    }
    
    doc.save(`ordine_${order.orderNumber || order.id}.pdf`);
    
    toast({
      title: "Successo",
      description: "PDF esportato",
    });
  };

  const exportToCSV = async (order: PurchaseOrder) => {
    triggerHaptic('medium');
    const supplier = suppliers?.find(s => s.id === order.supplierId);
    
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ordine');
    
    ws.addRow(['Ordine d\'Acquisto']);
    ws.addRow([]);
    ws.addRow(['Numero Ordine', order.orderNumber || 'N/A']);
    ws.addRow(['Data', format(new Date(order.orderDate as any), 'dd/MM/yyyy')]);
    ws.addRow(['Fornitore', supplier?.name || 'N/A']);
    ws.addRow(['P.IVA Fornitore', supplier?.vatNumber || '']);
    ws.addRow(['Email Fornitore', supplier?.email || '']);
    ws.addRow(['Telefono Fornitore', supplier?.phone || '']);
    ws.addRow(['Indirizzo Fornitore', supplier?.address || '']);
    ws.addRow(['Consegna Prevista', order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate as any), 'dd/MM/yyyy') : '']);
    ws.addRow(['Stato', statusLabels[order.status]]);
    ws.addRow(['Totale (€)', parseFloat(order.totalAmount || '0').toFixed(2)]);
    ws.addRow(['Note', order.notes || '']);
    
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordine_${order.orderNumber || order.id}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Successo",
      description: "Excel esportato",
    });
  };

  const filterButtons = [
    { value: 'all', label: 'Tutti' },
    { value: 'draft', label: 'Bozze' },
    { value: 'submitted', label: 'Inviati' },
    { value: 'received', label: 'Ricevuti' },
  ];

  const header = (
    <MobileHeader
      title="Ordini d'Acquisto"
      showBackButton showMenuButton
      rightAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={fetchSuggestions}
          disabled={suggestionsLoading}
          className="h-11 w-11"
          data-testid="button-generate-suggestions"
        >
          <Sparkles className="h-5 w-5" />
        </HapticButton>
      }
    />
  );

  return (
    <MobileAppLayout header={header}>
      <div className="flex flex-col gap-4 pb-24">
        <div className="flex gap-2 overflow-x-auto py-2 -mx-4 px-4 scrollbar-hide">
          {filterButtons.map((filter) => (
            <HapticButton
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              onClick={() => setStatusFilter(filter.value)}
              className="min-h-[44px] px-4 shrink-0 rounded-full"
              data-testid={`filter-${filter.value}`}
            >
              {filter.label}
            </HapticButton>
          ))}
        </div>

        {ordersLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Skeleton className="h-32 w-full rounded-2xl" />
              </motion.div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="flex flex-col items-center justify-center py-16"
          >
            <motion.div
              animate={{ 
                y: [0, -8, 0],
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ShoppingCart className="h-16 w-16 text-muted-foreground/50" />
            </motion.div>
            <p className="text-muted-foreground mt-4 text-center">
              {statusFilter === 'all' 
                ? "Nessun ordine creato" 
                : `Nessun ordine ${statusLabels[statusFilter]?.toLowerCase()}`}
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Tocca + per creare il primo ordine
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  variants={cardVariants}
                  layout
                  data-testid={`card-order-${order.id}`}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">
                              {order.orderNumber || 'N/A'}
                            </h3>
                            <div className="flex items-center gap-2 text-muted-foreground mt-1">
                              <Building2 className="h-4 w-4 shrink-0" />
                              <span className="text-sm truncate">
                                {getSupplierName(order.supplierId)}
                              </span>
                            </div>
                          </div>
                          <Badge className={`${statusColors[order.status]} shrink-0`}>
                            {statusLabels[order.status]}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span>
                              {format(new Date(order.orderDate as any), 'dd MMM yyyy', { locale: it })}
                            </span>
                          </div>
                          {order.expectedDeliveryDate && (
                            <div className="flex items-center gap-2 text-sm">
                              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span>
                                {format(new Date(order.expectedDeliveryDate as any), 'dd MMM', { locale: it })}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-xl font-bold text-primary">
                            € {parseFloat(order.totalAmount || '0').toFixed(2)}
                          </span>
                          <div className="flex gap-1">
                            <HapticButton
                              variant="ghost"
                              size="icon"
                              onClick={() => exportToPDF(order)}
                              className="h-11 w-11"
                              data-testid={`button-export-pdf-${order.id}`}
                            >
                              <FileText className="h-5 w-5" />
                            </HapticButton>
                            <HapticButton
                              variant="ghost"
                              size="icon"
                              onClick={() => exportToCSV(order)}
                              className="h-11 w-11"
                              data-testid={`button-export-csv-${order.id}`}
                            >
                              <FileSpreadsheet className="h-5 w-5" />
                            </HapticButton>
                            <HapticButton
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenForm(order)}
                              className="h-11 w-11"
                              data-testid={`button-edit-order-${order.id}`}
                            >
                              <Edit className="h-5 w-5" />
                            </HapticButton>
                            <HapticButton
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingOrder(order)}
                              className="h-11 w-11 text-destructive"
                              data-testid={`button-delete-order-${order.id}`}
                            >
                              <Trash2 className="h-5 w-5" />
                            </HapticButton>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => handleOpenForm()}
        data-testid="button-create-order"
      >
        <Plus className="h-6 w-6" />
      </FloatingActionButton>

      <BottomSheet
        open={formSheetOpen}
        onClose={() => {
          setFormSheetOpen(false);
          setEditingOrder(null);
        }}
        title={editingOrder ? 'Modifica Ordine' : 'Nuovo Ordine'}
      >
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 space-y-4">
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornitore</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-[48px]">
                        <SelectValue placeholder="Seleziona fornitore" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero Ordine</FormLabel>
                  <FormControl>
                    <Input {...field} className="min-h-[48px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Ordine</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} className="min-h-[48px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Consegna Prev.</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''} 
                        className="min-h-[48px]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stato</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="min-h-[48px]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="draft">Bozza</SelectItem>
                      <SelectItem value="submitted">Inviato</SelectItem>
                      <SelectItem value="received">Ricevuto</SelectItem>
                      <SelectItem value="cancelled">Annullato</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Totale (€)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field}
                      value={field.value || ''} 
                      className="min-h-[48px]" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''} 
                      className="min-h-[48px]" 
                      placeholder="Note aggiuntive..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 pb-2">
              <HapticButton
                type="submit"
                className="w-full min-h-[52px] text-base font-semibold"
                disabled={createMutation.isPending || updateMutation.isPending}
                hapticType="medium"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Salvataggio...'
                  : editingOrder ? 'Aggiorna Ordine' : 'Crea Ordine'}
              </HapticButton>
            </div>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={suggestionsSheetOpen}
        onClose={() => setSuggestionsSheetOpen(false)}
        title="Ordini Suggeriti"
      >
        <div className="p-4">
          {suggestionsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : !suggestions || suggestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-12"
            >
              <Package className="h-14 w-14 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-center">
                Nessun prodotto necessita di riordino
              </p>
              <p className="text-muted-foreground/70 text-sm mt-1 text-center">
                Tutte le scorte sono sopra la soglia minima
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {suggestions.map((suggestion) => (
                <motion.div key={suggestion.productId} variants={cardVariants}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          suggestion.reason.includes('sotto soglia')
                            ? 'bg-destructive/10'
                            : 'bg-primary/10'
                        }`}>
                          {suggestion.reason.includes('sotto soglia') ? (
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">
                            {suggestion.productName}
                          </h4>
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {suggestion.productCode}
                          </Badge>
                          <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Stock: </span>
                              <span className="font-medium">{suggestion.currentStock}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Min: </span>
                              <span className="font-medium">{suggestion.minThreshold}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Suggerito: </span>
                              <span className="font-bold text-primary">
                                +{suggestion.suggestedQuantity}
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </BottomSheet>

      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'ordine {deletingOrder?.orderNumber}? 
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingOrder && deleteMutation.mutate(deletingOrder.id)}
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
