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
import { Plus, Warehouse as WarehouseIcon, TrendingUp, TrendingDown, Package, AlertTriangle, X, ListPlus } from "lucide-react";
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

export default function Warehouse() {
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [unloadDialogOpen, setUnloadDialogOpen] = useState(false);
  const [multiLoadDialogOpen, setMultiLoadDialogOpen] = useState(false);
  const [multiLoadItems, setMultiLoadItems] = useState<MultiLoadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Magazzino Generale</h1>
          <p className="text-muted-foreground">
            Gestisci carico e scarico dell'inventario
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
      </div>

      <Tabs defaultValue="stocks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stocks" data-testid="tab-stocks">Giacenze</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">Movimenti</TabsTrigger>
        </TabsList>

        <TabsContent value="stocks">
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
                    {stocks.map((stock) => {
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

        <TabsContent value="movements">
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
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quantità</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.slice(0, 50).map((movement) => (
                      <TableRow key={movement.id} data-testid={`movement-row-${movement.id}`}>
                        <TableCell>
                          {new Date(movement.createdAt).toLocaleString('it-IT')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={movement.type === 'LOAD' ? 'secondary' : 'outline'}>
                            {movement.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold tabular-nums">
                          {movement.type === 'LOAD' ? '+' : '-'}{parseFloat(movement.quantity).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {movement.reason || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
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
