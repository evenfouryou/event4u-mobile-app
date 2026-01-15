import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { DollarSign, Plus, Edit, Trash2, Package, ArrowLeft, Calendar, ChevronRight, Eye } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  FloatingActionButton, 
  HapticButton, 
  BottomSheet,
  triggerHaptic 
} from "@/components/mobile-primitives";
import type { PriceList, PriceListItem, Product, Supplier } from "@shared/schema";

const priceListSchema = z.object({
  name: z.string().min(1, "Nome richiesto"),
  supplierId: z.string().min(1, "Fornitore richiesto"),
  validFrom: z.string().optional(),
  validTo: z.string().optional(),
  active: z.boolean().default(true),
});

type PriceListFormValues = z.infer<typeof priceListSchema>;

const priceListItemSchema = z.object({
  productId: z.string().min(1, "Prodotto richiesto"),
  salePrice: z.coerce.number().positive("Il prezzo deve essere maggiore di zero"),
});

type PriceListItemFormValues = z.infer<typeof priceListItemSchema>;

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springTransition,
  },
};

export default function PriceLists() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  
  const canCreatePriceLists = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: priceLists = [], isLoading: priceListsLoading } = useQuery<PriceList[]>({
    queryKey: ['/api/price-lists'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  const { data: items = [], isLoading: itemsLoading } = useQuery<PriceListItem[]>({
    queryKey: ['/api/price-lists', selectedPriceList?.id, 'items'],
    enabled: !!selectedPriceList,
  });

  const createForm = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      name: "",
      supplierId: "",
      validFrom: "",
      validTo: "",
      active: true,
    },
  });

  const editForm = useForm<PriceListFormValues>({
    resolver: zodResolver(priceListSchema),
    defaultValues: {
      name: "",
      supplierId: "",
      validFrom: "",
      validTo: "",
      active: true,
    },
  });

  const itemForm = useForm<PriceListItemFormValues>({
    resolver: zodResolver(priceListItemSchema),
    defaultValues: {
      productId: "",
      salePrice: 0,
    },
  });

  useEffect(() => {
    if (selectedPriceList && isEditSheetOpen) {
      editForm.reset({
        name: selectedPriceList.name,
        supplierId: selectedPriceList.supplierId,
        validFrom: selectedPriceList.validFrom ? format(new Date(selectedPriceList.validFrom), 'yyyy-MM-dd') : "",
        validTo: selectedPriceList.validTo ? format(new Date(selectedPriceList.validTo), 'yyyy-MM-dd') : "",
        active: selectedPriceList.active,
      });
    }
  }, [selectedPriceList, isEditSheetOpen]);

  const createMutation = useMutation({
    mutationFn: async (data: PriceListFormValues) => {
      return await apiRequest('POST', '/api/price-lists', {
        name: data.name,
        supplierId: data.supplierId,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        active: data.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setIsCreateSheetOpen(false);
      createForm.reset();
      triggerHaptic('success');
      toast({
        title: "Listino creato",
        description: "Il listino prezzi è stato creato con successo",
      });
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Impossibile creare il listino",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PriceListFormValues }) => {
      return await apiRequest('PATCH', `/api/price-lists/${id}`, {
        name: data.name,
        validFrom: data.validFrom || null,
        validTo: data.validTo || null,
        active: data.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setIsEditSheetOpen(false);
      triggerHaptic('success');
      toast({
        title: "Listino aggiornato",
        description: "Il listino prezzi è stato aggiornato con successo",
      });
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il listino",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest('DELETE', `/api/price-lists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setDeleteDialogOpen(false);
      setPriceListToDelete(null);
      if (selectedPriceList?.id === priceListToDelete) {
        setSelectedPriceList(null);
        setIsDetailView(false);
      }
      triggerHaptic('success');
      toast({
        title: "Listino eliminato",
        description: "Il listino prezzi è stato eliminato con successo",
      });
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Impossibile eliminare il listino",
        variant: "destructive",
      });
    },
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: PriceListItemFormValues) => {
      if (!selectedPriceList) throw new Error("No price list selected");
      return await apiRequest('POST', `/api/price-lists/${selectedPriceList.id}/items`, {
        productId: data.productId,
        salePrice: data.salePrice,
      });
    },
    onSuccess: () => {
      if (selectedPriceList) {
        queryClient.invalidateQueries({ queryKey: ['/api/price-lists', selectedPriceList.id, 'items'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      setIsItemSheetOpen(false);
      itemForm.reset();
      triggerHaptic('success');
      toast({
        title: "Prodotto aggiunto",
        description: "Il prodotto è stato aggiunto al listino",
      });
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Impossibile aggiungere il prodotto",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest('DELETE', `/api/price-list-items/${itemId}`);
    },
    onSuccess: () => {
      if (selectedPriceList) {
        queryClient.invalidateQueries({ queryKey: ['/api/price-lists', selectedPriceList.id, 'items'] });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      triggerHaptic('success');
      toast({
        title: "Prodotto rimosso",
        description: "Il prodotto è stato rimosso dal listino",
      });
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Impossibile rimuovere il prodotto",
        variant: "destructive",
      });
    },
  });

  const handleSelectPriceList = (priceList: PriceList) => {
    triggerHaptic('light');
    setSelectedPriceList(priceList);
    setIsDetailView(true);
  };

  const handleBackFromDetail = () => {
    triggerHaptic('light');
    setIsDetailView(false);
  };

  const handleOpenCreateSheet = () => {
    if (!canCreatePriceLists) {
      triggerHaptic('error');
      toast({
        title: "Accesso limitato",
        description: "Solo gli admin possono creare listini prezzi",
        variant: "destructive",
      });
      return;
    }
    triggerHaptic('medium');
    setIsCreateSheetOpen(true);
  };

  const handleOpenDetailDialog = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    setIsDetailDialogOpen(true);
  };

  const handleOpenEditDialog = (priceList: PriceList) => {
    setSelectedPriceList(priceList);
    editForm.reset({
      name: priceList.name,
      supplierId: priceList.supplierId,
      validFrom: priceList.validFrom ? format(new Date(priceList.validFrom), 'yyyy-MM-dd') : "",
      validTo: priceList.validTo ? format(new Date(priceList.validTo), 'yyyy-MM-dd') : "",
      active: priceList.active,
    });
    setIsEditDialogOpen(true);
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-price-lists">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Listini Prezzi</h1>
            <p className="text-muted-foreground">Gestione listini prezzi e tariffe prodotti</p>
          </div>
          {canCreatePriceLists && (
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-price-list">
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Listino
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{priceLists.length}</div>
              <p className="text-sm text-muted-foreground">Listini Totali</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{priceLists.filter(p => p.active).length}</div>
              <p className="text-sm text-muted-foreground">Attivi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{priceLists.filter(p => !p.active).length}</div>
              <p className="text-sm text-muted-foreground">Inattivi</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{suppliers.length}</div>
              <p className="text-sm text-muted-foreground">Fornitori</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Listini</CardTitle>
            <CardDescription>Elenco di tutti i listini prezzi</CardDescription>
          </CardHeader>
          <CardContent>
            {priceListsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded bg-muted/50 animate-pulse" />
                ))}
              </div>
            ) : priceLists.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">Nessun listino</p>
                <p className="text-muted-foreground mb-4">Crea il tuo primo listino prezzi</p>
                {canCreatePriceLists && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nuovo Listino
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fornitore</TableHead>
                    <TableHead>Validità</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLists.map((priceList) => {
                    const supplier = suppliers.find(s => s.id === priceList.supplierId);
                    return (
                      <TableRow key={priceList.id} data-testid={`row-price-list-${priceList.id}`}>
                        <TableCell className="font-medium">{priceList.name}</TableCell>
                        <TableCell>{supplier?.name || '-'}</TableCell>
                        <TableCell>
                          {priceList.validFrom ? (
                            <span>
                              {format(new Date(priceList.validFrom), 'dd/MM/yyyy', { locale: it })}
                              {priceList.validTo && ` - ${format(new Date(priceList.validTo), 'dd/MM/yyyy', { locale: it })}`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={priceList.active ? "default" : "secondary"}>
                            {priceList.active ? "Attivo" : "Inattivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDetailDialog(priceList)}
                              data-testid={`button-view-${priceList.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEditDialog(priceList)}
                              data-testid={`button-edit-${priceList.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setPriceListToDelete(priceList.id);
                                setDeleteDialogOpen(true);
                              }}
                              data-testid={`button-delete-${priceList.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuovo Listino</DialogTitle>
              <DialogDescription>Crea un nuovo listino prezzi</DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit((data) => {
                createMutation.mutate(data);
                setIsCreateDialogOpen(false);
              })} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Listino *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Listino Estate 2024" data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fornitore *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          data-testid="select-supplier"
                        >
                          <option value="">Seleziona fornitore</option>
                          {suppliers.filter(s => s.active).map((supplier) => (
                            <option key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valido Da</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-valid-from" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createForm.control}
                    name="validTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valido Fino</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-valid-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit">
                    {createMutation.isPending ? "Creazione..." : "Crea Listino"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Listino</DialogTitle>
              <DialogDescription>Modifica i dettagli del listino</DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit((data) => {
                if (selectedPriceList) {
                  updateMutation.mutate({ id: selectedPriceList.id, data });
                  setIsEditDialogOpen(false);
                }
              })} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Listino *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Listino Estate 2024" data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="validFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valido Da</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-edit-valid-from" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="validTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valido Fino</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-edit-valid-to" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                    {updateMutation.isPending ? "Salvataggio..." : "Salva"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedPriceList?.name}
                <Badge variant={selectedPriceList?.active ? "default" : "secondary"}>
                  {selectedPriceList?.active ? "Attivo" : "Inattivo"}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                {suppliers.find(s => s.id === selectedPriceList?.supplierId)?.name || 'Fornitore'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Prodotti nel listino</p>
                <Button size="sm" onClick={() => setIsItemDialogOpen(true)} data-testid="button-add-item">
                  <Plus className="w-4 h-4 mr-2" />
                  Aggiungi Prodotto
                </Button>
              </div>
              {itemsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 border rounded-lg">
                  <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Nessun prodotto in questo listino</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Prodotto</TableHead>
                      <TableHead>Codice</TableHead>
                      <TableHead className="text-right">Costo</TableHead>
                      <TableHead className="text-right">Vendita</TableHead>
                      <TableHead className="text-right">Margine</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;
                      const costPrice = parseFloat(product.costPrice);
                      const salePrice = parseFloat(item.salePrice);
                      const margin = salePrice - costPrice;
                      const marginPercent = costPrice > 0 ? (margin / costPrice) * 100 : 0;

                      return (
                        <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{product.code}</TableCell>
                          <TableCell className="text-right">€ {costPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-bold text-primary">€ {salePrice.toFixed(2)}</TableCell>
                          <TableCell className={`text-right font-bold ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {marginPercent.toFixed(0)}%
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              disabled={deleteItemMutation.isPending}
                              data-testid={`button-delete-item-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Aggiungi Prodotto</DialogTitle>
              <DialogDescription>Aggiungi un prodotto al listino</DialogDescription>
            </DialogHeader>
            <Form {...itemForm}>
              <form onSubmit={itemForm.handleSubmit((data) => {
                createItemMutation.mutate(data);
                setIsItemDialogOpen(false);
              })} className="space-y-4">
                <FormField
                  control={itemForm.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prodotto *</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                          data-testid="select-product"
                        >
                          <option value="">Seleziona prodotto</option>
                          {products.filter(p => !items.some(i => i.productId === p.id)).map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} ({product.code})
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={itemForm.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prezzo di Vendita *</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" placeholder="10.00" data-testid="input-sale-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createItemMutation.isPending} data-testid="button-submit-item">
                    {createItemMutation.isPending ? "Aggiunta..." : "Aggiungi"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler eliminare questo listino? Questa azione è irreversibile e eliminerà anche tutti i prezzi associati.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (priceListToDelete) {
                    deleteMutation.mutate(priceListToDelete);
                  }
                }}
                className="bg-destructive text-destructive-foreground"
              >
                Elimina
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const header = (
    <MobileHeader
      title={isDetailView && selectedPriceList ? selectedPriceList.name : "Listini Prezzi"}
      leftAction={
        <HapticButton
          variant="ghost"
          size="icon"
          asChild={!isDetailView}
          onClick={isDetailView ? handleBackFromDetail : undefined}
          className="h-11 w-11"
        >
          {isDetailView ? (
            <ArrowLeft className="h-5 w-5" />
          ) : (
            <Link href="/beverage">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
        </HapticButton>
      }
      rightAction={
        isDetailView && selectedPriceList ? (
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={() => setIsEditSheetOpen(true)}
            className="h-11 w-11"
            data-testid="button-edit-price-list"
          >
            <Edit className="h-5 w-5" />
          </HapticButton>
        ) : null
      }
    />
  );

  return (
    <MobileAppLayout header={header} contentClassName="pb-24">
      <AnimatePresence mode="wait">
        {!isDetailView ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={springTransition}
            className="py-4 space-y-4"
          >
            {priceListsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="h-[120px] rounded-2xl bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : priceLists.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springTransition}
                className="flex flex-col items-center justify-center py-20"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6"
                >
                  <DollarSign className="h-10 w-10 text-muted-foreground" />
                </motion.div>
                <p className="text-lg font-medium text-foreground mb-2">Nessun listino</p>
                <p className="text-muted-foreground text-center px-8">
                  Crea il tuo primo listino prezzi toccando il pulsante +
                </p>
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="space-y-4"
              >
                {priceLists.map((priceList) => {
                  const supplier = suppliers.find(s => s.id === priceList.supplierId);
                  return (
                    <motion.div
                      key={priceList.id}
                      variants={staggerItem}
                      whileTap={{ scale: 0.97 }}
                      data-testid={`card-price-list-${priceList.id}`}
                    >
                      <Card
                        className="overflow-hidden cursor-pointer active:bg-accent/50 transition-colors rounded-2xl"
                        onClick={() => handleSelectPriceList(priceList)}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-stretch min-h-[120px]">
                            <div className="shrink-0 w-20 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                              <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                                <DollarSign className="h-8 w-8 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1 py-5 px-4 min-w-0 flex flex-col justify-center">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <p className="font-bold text-lg leading-tight truncate">{priceList.name}</p>
                                <Badge 
                                  variant={priceList.active ? "default" : "secondary"}
                                  className="shrink-0 text-xs"
                                >
                                  {priceList.active ? "Attivo" : "Inattivo"}
                                </Badge>
                              </div>
                              {supplier && (
                                <p className="text-muted-foreground text-sm mb-2 truncate">
                                  {supplier.name}
                                </p>
                              )}
                              {priceList.validFrom && (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {format(new Date(priceList.validFrom), 'dd MMM', { locale: it })}
                                    {priceList.validTo && ` - ${format(new Date(priceList.validTo), 'dd MMM', { locale: it })}`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 flex items-center pr-4">
                              <div className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center">
                                <ChevronRight className="h-6 w-6 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="detail-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={springTransition}
            className="py-4 space-y-4"
          >
            {selectedPriceList && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                  className="flex gap-4"
                >
                  <HapticButton
                    variant="outline"
                    className="flex-1 h-14 text-base rounded-2xl"
                    onClick={() => setIsItemSheetOpen(true)}
                    data-testid="button-add-item"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Aggiungi Prodotto
                  </HapticButton>
                  <HapticButton
                    variant="destructive"
                    size="icon"
                    className="h-14 w-14 rounded-2xl"
                    onClick={() => {
                      setPriceListToDelete(selectedPriceList.id);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid="button-delete-price-list"
                  >
                    <Trash2 className="h-6 w-6" />
                  </HapticButton>
                </motion.div>

                {itemsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="h-[130px] rounded-2xl bg-muted/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springTransition}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...springTransition, delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6"
                    >
                      <Package className="h-10 w-10 text-muted-foreground" />
                    </motion.div>
                    <p className="text-lg font-medium text-foreground mb-2">Nessun prodotto</p>
                    <p className="text-muted-foreground text-center px-8 mb-6">
                      Aggiungi prodotti a questo listino
                    </p>
                    <HapticButton 
                      className="h-14 px-8 text-base"
                      onClick={() => setIsItemSheetOpen(true)}
                      data-testid="button-add-first-item"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Aggiungi Prodotto
                    </HapticButton>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-4"
                  >
                    {items.map((item) => {
                      const product = products.find(p => p.id === item.productId);
                      if (!product) return null;
                      
                      const costPrice = parseFloat(product.costPrice);
                      const salePrice = parseFloat(item.salePrice);
                      const margin = salePrice - costPrice;
                      const marginPercent = costPrice > 0 ? (margin / costPrice) * 100 : 0;

                      return (
                        <motion.div
                          key={item.id}
                          variants={staggerItem}
                          whileTap={{ scale: 0.98 }}
                          data-testid={`row-item-${item.id}`}
                        >
                          <Card className="overflow-hidden rounded-2xl">
                            <CardContent className="p-0">
                              <div className="flex items-stretch min-h-[110px]">
                                <div className="shrink-0 w-16 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20">
                                  <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                                    <Package className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                </div>
                                <div className="flex-1 py-4 px-4 min-w-0 flex flex-col justify-center">
                                  <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0">
                                      <p className="font-bold text-base truncate">{product.name}</p>
                                      <p className="text-muted-foreground text-xs font-mono">{product.code}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex-1">
                                      <p className="text-xs text-muted-foreground">Costo</p>
                                      <p className="font-medium text-sm">€ {costPrice.toFixed(2)}</p>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs text-muted-foreground">Vendita</p>
                                      <p className="font-bold text-base text-primary">€ {salePrice.toFixed(2)}</p>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs text-muted-foreground">Margine</p>
                                      <p className={`font-bold text-sm ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {marginPercent.toFixed(0)}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="shrink-0 flex items-center pr-3">
                                  <HapticButton
                                    variant="ghost"
                                    size="icon"
                                    className="h-12 w-12 rounded-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteItemMutation.mutate(item.id);
                                    }}
                                    disabled={deleteItemMutation.isPending}
                                    hapticType="medium"
                                    data-testid={`button-delete-item-${item.id}`}
                                  >
                                    <Trash2 className="h-5 w-5 text-destructive" />
                                  </HapticButton>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isDetailView && canCreatePriceLists && (
        <FloatingActionButton
          onClick={handleOpenCreateSheet}
          data-testid="button-create-price-list"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        title="Nuovo Listino"
      >
        <div className="p-4 pb-8">
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
              <FormField
                control={createForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Listino *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Listino Estate 2024" className="h-14 text-base rounded-xl" data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornitore *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-14 rounded-xl border border-input bg-background px-4 text-base"
                        data-testid="select-supplier"
                      >
                        <option value="">Seleziona fornitore</option>
                        {suppliers.filter(s => s.active).map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={createForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Da</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-14 text-base rounded-xl" data-testid="input-valid-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Fino</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-14 text-base rounded-xl" data-testid="input-valid-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 text-base rounded-2xl"
                  onClick={() => setIsCreateSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" className="flex-1 h-14 text-base rounded-2xl" disabled={createMutation.isPending} data-testid="button-submit">
                  {createMutation.isPending ? "Creazione..." : "Crea Listino"}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        title="Modifica Listino"
      >
        <div className="p-4 pb-8">
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => {
              if (selectedPriceList) {
                updateMutation.mutate({ id: selectedPriceList.id, data });
              }
            })} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Listino *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Listino Estate 2024" className="h-14 text-base rounded-xl" data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Da</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-14 text-base rounded-xl" data-testid="input-edit-valid-from" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="validTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Fino</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-14 text-base rounded-xl" data-testid="input-edit-valid-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 text-base rounded-2xl"
                  onClick={() => setIsEditSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" className="flex-1 h-14 text-base rounded-2xl" disabled={updateMutation.isPending} data-testid="button-submit-edit">
                  {updateMutation.isPending ? "Salvataggio..." : "Salva"}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isItemSheetOpen}
        onClose={() => setIsItemSheetOpen(false)}
        title="Aggiungi Prodotto"
      >
        <div className="p-4 pb-8">
          <Form {...itemForm}>
            <form onSubmit={itemForm.handleSubmit((data) => createItemMutation.mutate(data))} className="space-y-4">
              <FormField
                control={itemForm.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prodotto *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full h-14 rounded-xl border border-input bg-background px-4 text-base"
                        data-testid="select-product"
                      >
                        <option value="">Seleziona prodotto</option>
                        {products.filter(p => !items.some(i => i.productId === p.id)).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} ({product.code})
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={itemForm.control}
                name="salePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo di Vendita *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="10.00" className="h-14 text-lg rounded-xl" data-testid="input-sale-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-6">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 text-base rounded-2xl"
                  onClick={() => setIsItemSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" className="flex-1 h-14 text-base rounded-2xl" disabled={createItemMutation.isPending} data-testid="button-submit-item">
                  {createItemMutation.isPending ? "Aggiunta..." : "Aggiungi"}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo listino? Questa azione è irreversibile e eliminerà anche tutti i prezzi associati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3">
            <AlertDialogCancel className="h-14 text-base rounded-2xl flex-1">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                triggerHaptic('medium');
                if (priceListToDelete) {
                  deleteMutation.mutate(priceListToDelete);
                }
              }}
              className="h-14 text-base rounded-2xl flex-1 bg-destructive text-destructive-foreground"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
