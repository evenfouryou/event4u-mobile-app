import { useState, useMemo } from "react";
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
  DialogFooter,
  DialogDescription,
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
  Eye,
  Download,
  FileSpreadsheet,
  ArrowLeft,
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

// Form schema with string dates for HTML inputs
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

export default function PurchaseOrders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suggestionsDialogOpen, setSuggestionsDialogOpen] = useState(false);
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
      setSuggestionsDialogOpen(true);
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
      // Convert string dates to Date objects
      const orderData: InsertPurchaseOrder = {
        ...data,
        orderDate: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      };
      await apiRequest('POST', '/api/purchase-orders', orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Ordine creato con successo",
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
        description: "Impossibile creare l'ordine",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PurchaseOrderFormData }) => {
      // Convert string dates to Date objects
      const orderData: Partial<PurchaseOrder> = {
        ...data,
        orderDate: new Date(data.orderDate),
        expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : undefined,
      };
      await apiRequest('PATCH', `/api/purchase-orders/${id}`, orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      setDialogOpen(false);
      setEditingOrder(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Ordine aggiornato con successo",
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
      toast({
        title: "Successo",
        description: "Ordine eliminato con successo",
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
        description: "Impossibile eliminare l'ordine",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (order?: PurchaseOrder) => {
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
    setDialogOpen(true);
  };

  const handleGenerateSuggestions = async () => {
    await fetchSuggestions();
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

  const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
    draft: 'secondary',
    submitted: 'default',
    received: 'default',
    cancelled: 'destructive',
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    return supplier?.name || 'Sconosciuto';
  };

  const exportToPDF = async (order: PurchaseOrder) => {
    const doc = new jsPDF();
    const supplier = suppliers?.find(s => s.id === order.supplierId);
    
    // Header
    doc.setFontSize(20);
    doc.text('Ordine d\'Acquisto', 20, 20);
    
    // Order details
    doc.setFontSize(12);
    doc.text(`Numero Ordine: ${order.orderNumber || 'N/A'}`, 20, 40);
    doc.text(`Data: ${format(new Date(order.orderDate as any), 'dd/MM/yyyy')}`, 20, 50);
    doc.text(`Fornitore: ${supplier?.name || 'N/A'}`, 20, 60);
    if (order.expectedDeliveryDate) {
      doc.text(`Consegna Prevista: ${format(new Date(order.expectedDeliveryDate as any), 'dd/MM/yyyy')}`, 20, 70);
    }
    doc.text(`Stato: ${statusLabels[order.status]}`, 20, 80);
    
    // Supplier details
    if (supplier) {
      doc.text('Dettagli Fornitore:', 20, 100);
      doc.setFontSize(10);
      if (supplier.vatNumber) doc.text(`P.IVA: ${supplier.vatNumber}`, 20, 108);
      if (supplier.email) doc.text(`Email: ${supplier.email}`, 20, 116);
      if (supplier.phone) doc.text(`Tel: ${supplier.phone}`, 20, 124);
      if (supplier.address) doc.text(`Indirizzo: ${supplier.address}`, 20, 132);
    }
    
    // Total
    doc.setFontSize(14);
    doc.text(`Totale: € ${parseFloat(order.totalAmount || '0').toFixed(2)}`, 20, 160);
    
    if (order.notes) {
      doc.setFontSize(10);
      doc.text(`Note: ${order.notes}`, 20, 175);
    }
    
    // Save PDF
    doc.save(`ordine_${order.orderNumber || order.id}.pdf`);
    
    toast({
      title: "Successo",
      description: "PDF esportato con successo",
    });
  };

  const exportToCSV = async (order: PurchaseOrder) => {
    const supplier = suppliers?.find(s => s.id === order.supplierId);
    
    // Create CSV data
    const csvData = [
      ['Ordine d\'Acquisto'],
      [''],
      ['Numero Ordine', order.orderNumber || 'N/A'],
      ['Data', format(new Date(order.orderDate as any), 'dd/MM/yyyy')],
      ['Fornitore', supplier?.name || 'N/A'],
      ['P.IVA Fornitore', supplier?.vatNumber || ''],
      ['Email Fornitore', supplier?.email || ''],
      ['Telefono Fornitore', supplier?.phone || ''],
      ['Indirizzo Fornitore', supplier?.address || ''],
      ['Consegna Prevista', order.expectedDeliveryDate ? format(new Date(order.expectedDeliveryDate as any), 'dd/MM/yyyy') : ''],
      ['Stato', statusLabels[order.status]],
      ['Totale (€)', parseFloat(order.totalAmount).toFixed(2)],
      ['Note', order.notes || ''],
    ];
    
    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(csvData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Ordine');
    
    // Save file
    XLSX.writeFile(wb, `ordine_${order.orderNumber || order.id}.xlsx`);
    
    toast({
      title: "Successo",
      description: "Excel esportato con successo",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/beverage">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Ordini d'Acquisto</h1>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleGenerateSuggestions}
            data-testid="button-generate-suggestions"
            disabled={suggestionsLoading}
          >
            <Sparkles className="h-4 w-4" />
            Ordini Suggeriti
          </Button>
          <Button onClick={() => handleOpenDialog()} data-testid="button-create-order">
            <Plus className="h-4 w-4" />
            Nuovo Ordine
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
          data-testid="filter-all"
        >
          Tutti
        </Button>
        <Button
          variant={statusFilter === 'draft' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('draft')}
          data-testid="filter-draft"
        >
          Bozze
        </Button>
        <Button
          variant={statusFilter === 'submitted' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('submitted')}
          data-testid="filter-submitted"
        >
          Inviati
        </Button>
        <Button
          variant={statusFilter === 'received' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('received')}
          data-testid="filter-received"
        >
          Ricevuti
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          {ordersLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {statusFilter === 'all' ? "Nessun ordine creato" : `Nessun ordine ${statusLabels[statusFilter]?.toLowerCase()}`}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Numero Ordine</TableHead>
                  <TableHead>Fornitore</TableHead>
                  <TableHead>Data Ordine</TableHead>
                  <TableHead>Consegna Prevista</TableHead>
                  <TableHead>Totale</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                    <TableCell className="font-medium">
                      {order.orderNumber || 'N/A'}
                    </TableCell>
                    <TableCell>{getSupplierName(order.supplierId)}</TableCell>
                    <TableCell>
                      {format(new Date(order.orderDate as any), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>
                      {order.expectedDeliveryDate && order.expectedDeliveryDate !== null
                        ? format(new Date(order.expectedDeliveryDate as any), 'dd MMM yyyy', { locale: it })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>€ {parseFloat(order.totalAmount || '0').toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[order.status]}>
                        {statusLabels[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => exportToPDF(order)}
                          data-testid={`button-export-pdf-${order.id}`}
                          title="Esporta PDF"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => exportToCSV(order)}
                          data-testid={`button-export-csv-${order.id}`}
                          title="Esporta Excel"
                        >
                          <FileSpreadsheet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(order)}
                          data-testid={`button-edit-order-${order.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingOrder(order)}
                          data-testid={`button-delete-order-${order.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Suggestions Dialog */}
      <Dialog open={suggestionsDialogOpen} onOpenChange={setSuggestionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ordini Suggeriti
            </DialogTitle>
            <DialogDescription>
              Ordini generati automaticamente in base a scorte minime e consumi medi
            </DialogDescription>
          </DialogHeader>

          {suggestionsLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : !suggestions || suggestions.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                Nessun prodotto necessita di riordino al momento
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tutte le scorte sono sopra la soglia minima
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <Card key={suggestion.productId} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {suggestion.reason.includes('sotto soglia') ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-primary" />
                          )}
                          <h4 className="font-semibold">{suggestion.productName}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.productCode}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {suggestion.reason}
                        </p>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Scorta Attuale</div>
                            <div className="font-medium">{suggestion.currentStock}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Soglia Minima</div>
                            <div className="font-medium">{suggestion.minThreshold}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Consumo Medio</div>
                            <div className="font-medium">{suggestion.avgConsumption.toFixed(1)}/giorno</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Quantità Suggerita</div>
                            <div className="font-semibold text-primary">{suggestion.suggestedQuantity}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSuggestionsDialogOpen(false)}
              data-testid="button-close-suggestions"
            >
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? 'Modifica Ordine' : 'Nuovo Ordine'}
            </DialogTitle>
            <DialogDescription>
              {editingOrder ? "Modifica i dettagli dell'ordine" : "Crea un nuovo ordine d'acquisto"}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Ordine</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} placeholder="ORD-001" data-testid="input-order-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornitore *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-supplier">
                            <SelectValue placeholder="Seleziona fornitore" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers?.filter(s => s.active).map((supplier) => (
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="orderDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Ordine *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-order-date" />
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
                      <FormLabel>Consegna Prevista</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} type="date" data-testid="input-delivery-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stato *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Seleziona stato" />
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
                        <Input {...field} value={field.value ?? ''} type="number" step="0.01" placeholder="0.00" data-testid="input-total-amount" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="Note aggiuntive..." data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-order"
                >
                  Annulla
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-order"
                >
                  {editingOrder ? 'Aggiorna' : 'Crea'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingOrder} onOpenChange={() => setDeletingOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare l'ordine <strong>{deletingOrder?.orderNumber}</strong>?
              Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-order">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingOrder && deleteMutation.mutate(deletingOrder.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-order"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
