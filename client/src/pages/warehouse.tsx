import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Warehouse as WarehouseIcon, TrendingUp, TrendingDown, Package, AlertTriangle, X, ListPlus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Product, StockMovement, Supplier } from "@shared/schema";

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
  const { toast } = useToast();

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

    // Check if all items have valid quantities
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/beverage">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold mb-1">Magazzino Generale</h1>
          <p className="text-muted-foreground">
            Gestisci carico e scarico dell'inventario
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={multiUnloadDialogOpen} onOpenChange={setMultiUnloadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" data-testid="button-multi-unload">
                <ListPlus className="h-4 w-4 mr-2" />
                Scarico Multiplo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Scarico Multiprodotto</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prodotto</TableHead>
                        <TableHead>Quantità</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {multiUnloadItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nessun prodotto aggiunto. Clicca "+ Aggiungi Prodotto" per iniziare.
                          </TableCell>
                        </TableRow>
                      ) : (
                        multiUnloadItems.map((item) => (
                          <TableRow key={item.id}>
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddMultiUnloadItem}
                  data-testid="button-add-multi-unload-product"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Prodotto
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
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
                  data-testid="button-submit-multi-unload"
                >
                  {bulkUnloadMutation.isPending ? 'Scaricando...' : `Scarica ${multiUnloadItems.length > 0 ? `(${multiUnloadItems.length})` : ''}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={unloadDialogOpen} onOpenChange={setUnloadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-unload-stock">
                <TrendingDown className="h-4 w-4 mr-2" />
                Scarico
              </Button>
            </DialogTrigger>
            <DialogContent>
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

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setUnloadDialogOpen(false)}
                      data-testid="button-cancel-unload"
                    >
                      Annulla
                    </Button>
                    <Button type="submit" disabled={unloadMutation.isPending} data-testid="button-submit-unload">
                      Scarica
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-load-stock">
                <TrendingUp className="h-4 w-4 mr-2" />
                Carico
              </Button>
            </DialogTrigger>
            <DialogContent>
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

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLoadDialogOpen(false)}
                      data-testid="button-cancel-load"
                    >
                      Annulla
                    </Button>
                    <Button type="submit" disabled={loadMutation.isPending} data-testid="button-submit-load">
                      Carica
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={multiLoadDialogOpen} onOpenChange={setMultiLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-multi-load">
                <ListPlus className="h-4 w-4 mr-2" />
                Carico Multiplo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Carico Multiprodotto</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prodotto</TableHead>
                        <TableHead>Quantità</TableHead>
                        <TableHead>Fornitore</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {multiLoadItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nessun prodotto aggiunto. Clicca "+ Aggiungi Prodotto" per iniziare.
                          </TableCell>
                        </TableRow>
                      ) : (
                        multiLoadItems.map((item) => (
                          <TableRow key={item.id}>
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddMultiLoadItem}
                  data-testid="button-add-multi-product"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi Prodotto
                </Button>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
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
                  data-testid="button-submit-multi-load"
                >
                  {bulkLoadMutation.isPending ? 'Caricamento...' : `Carica ${multiLoadItems.length > 0 ? `(${multiLoadItems.length})` : ''}`}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="stocks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stocks" data-testid="tab-stocks">Giacenze</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">Movimenti</TabsTrigger>
        </TabsList>

        <TabsContent value="stocks" className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Cerca prodotto per nome o codice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-products"
              className="max-w-md"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              {stocksLoading ? (
                <div className="p-6">
                  <Skeleton className="h-96" />
                </div>
              ) : stocks && stocks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Codice</TableHead>
                      <TableHead>Prodotto</TableHead>
                      <TableHead className="text-right">Quantità</TableHead>
                      <TableHead>Unità</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stocks
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
                          <TableRow key={stock.productId} data-testid={`stock-row-${stock.productId}`}>
                            <TableCell className="font-mono">{stock.productCode}</TableCell>
                            <TableCell className="font-medium">{stock.productName}</TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">
                              {parseFloat(stock.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell>{stock.unitOfMeasure}</TableCell>
                            <TableCell>
                              {isLowStock && (
                                <Badge variant="destructive" data-testid={`badge-low-stock-${stock.productId}`}>
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Stock Basso
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nessuna giacenza presente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <div className="flex gap-2">
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

          <Card>
            <CardContent className="p-0">
              {movementsLoading ? (
                <div className="p-6">
                  <Skeleton className="h-96" />
                </div>
              ) : movements && movements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        // Filter by type
                        if (movementTypeFilter !== 'all' && movement.type !== movementTypeFilter) {
                          return false;
                        }
                        // Filter by search query
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
                          <TableRow key={movement.id} data-testid={`movement-row-${movement.id}`}>
                            <TableCell>
                              {new Date(movement.createdAt).toLocaleString('it-IT')}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{product?.name || 'Sconosciuto'}</div>
                              <div className="text-xs text-muted-foreground font-mono">{product?.code || '-'}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={movement.type === 'LOAD' ? 'secondary' : 'outline'}>
                                {movement.type === 'LOAD' ? 'Carico' : 'Scarico'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-semibold tabular-nums">
                              {movement.type === 'LOAD' ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-sm">
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
              ) : (
                <div className="p-12 text-center">
                  <WarehouseIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Nessun movimento registrato</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
