import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, Plus, Edit, Trash2, Package, ArrowLeft, Calendar, ChevronRight } from "lucide-react";
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
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isItemSheetOpen, setIsItemSheetOpen] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [priceListToDelete, setPriceListToDelete] = useState<string | null>(null);
  
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
                    className="h-28 rounded-2xl bg-muted/50 animate-pulse"
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
                className="space-y-3"
              >
                {priceLists.map((priceList) => {
                  const supplier = suppliers.find(s => s.id === priceList.supplierId);
                  return (
                    <motion.div
                      key={priceList.id}
                      variants={staggerItem}
                      whileTap={{ scale: 0.98 }}
                      data-testid={`card-price-list-${priceList.id}`}
                    >
                      <Card
                        className="overflow-hidden cursor-pointer active:bg-accent/50 transition-colors"
                        onClick={() => handleSelectPriceList(priceList)}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-center min-h-[88px]">
                            <div className="shrink-0 w-16 h-full flex items-center justify-center bg-primary/10">
                              <DollarSign className="h-7 w-7 text-primary" />
                            </div>
                            <div className="flex-1 py-4 px-4 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="font-semibold text-base truncate">{priceList.name}</p>
                                <Badge 
                                  variant={priceList.active ? "default" : "secondary"}
                                  className="shrink-0"
                                >
                                  {priceList.active ? "Attivo" : "Inattivo"}
                                </Badge>
                              </div>
                              {supplier && (
                                <p className="text-muted-foreground text-sm mb-1 truncate">
                                  {supplier.name}
                                </p>
                              )}
                              {priceList.validFrom && (
                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    {format(new Date(priceList.validFrom), 'dd MMM yyyy', { locale: it })}
                                    {priceList.validTo && ` - ${format(new Date(priceList.validTo), 'dd MMM yyyy', { locale: it })}`}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="shrink-0 pr-3">
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
                  className="flex gap-3"
                >
                  <HapticButton
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={() => setIsItemSheetOpen(true)}
                    data-testid="button-add-item"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Aggiungi Prodotto
                  </HapticButton>
                  <HapticButton
                    variant="destructive"
                    size="icon"
                    className="h-12 w-12"
                    onClick={() => {
                      setPriceListToDelete(selectedPriceList.id);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid="button-delete-price-list"
                  >
                    <Trash2 className="h-5 w-5" />
                  </HapticButton>
                </motion.div>

                {itemsLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="h-24 rounded-2xl bg-muted/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={springTransition}
                    className="flex flex-col items-center justify-center py-16"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ ...springTransition, delay: 0.1 }}
                      className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4"
                    >
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </motion.div>
                    <p className="text-muted-foreground text-center">
                      Nessun prodotto in questo listino
                    </p>
                    <HapticButton 
                      className="mt-4 h-12"
                      onClick={() => setIsItemSheetOpen(true)}
                      data-testid="button-add-first-item"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Aggiungi Primo Prodotto
                    </HapticButton>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="space-y-3"
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
                          data-testid={`row-item-${item.id}`}
                        >
                          <Card className="overflow-hidden">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-base truncate">{product.name}</p>
                                  <p className="text-muted-foreground text-xs font-mono">{product.code}</p>
                                </div>
                                <HapticButton
                                  variant="ghost"
                                  size="icon"
                                  className="h-11 w-11 shrink-0"
                                  onClick={() => deleteItemMutation.mutate(item.id)}
                                  disabled={deleteItemMutation.isPending}
                                  hapticType="medium"
                                  data-testid={`button-delete-item-${item.id}`}
                                >
                                  <Trash2 className="h-5 w-5 text-destructive" />
                                </HapticButton>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Costo</p>
                                  <p className="font-medium">€ {costPrice.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Vendita</p>
                                  <p className="font-bold text-primary">€ {salePrice.toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-0.5">Margine</p>
                                  <p className={`font-medium ${margin >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {marginPercent.toFixed(0)}%
                                  </p>
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
                      <Input {...field} placeholder="Listino Estate 2024" className="h-12" data-testid="input-name" />
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
                        className="w-full h-12 rounded-md border border-input bg-background px-3 text-base"
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

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={createForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Da</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-12" data-testid="input-valid-from" />
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
                        <Input {...field} type="date" className="h-12" data-testid="input-valid-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setIsCreateSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" className="flex-1 h-12" disabled={createMutation.isPending} data-testid="button-submit">
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
                      <Input {...field} placeholder="Listino Estate 2024" className="h-12" data-testid="input-edit-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={editForm.control}
                  name="validFrom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valido Da</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" className="h-12" data-testid="input-edit-valid-from" />
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
                        <Input {...field} type="date" className="h-12" data-testid="input-edit-valid-to" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setIsEditSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" className="flex-1 h-12" disabled={updateMutation.isPending} data-testid="button-submit-edit">
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
                        className="w-full h-12 rounded-md border border-input bg-background px-3 text-base"
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
                      <Input {...field} type="number" step="0.01" placeholder="10.00" className="h-12 text-lg" data-testid="input-sale-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => setIsItemSheetOpen(false)}
                >
                  Annulla
                </HapticButton>
                <HapticButton type="submit" className="flex-1 h-12" disabled={createItemMutation.isPending} data-testid="button-submit-item">
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
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (priceListToDelete) {
                  deleteMutation.mutate(priceListToDelete);
                }
              }}
              className="h-12 bg-destructive text-destructive-foreground"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
