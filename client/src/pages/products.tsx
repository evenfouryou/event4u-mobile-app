import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, Package, Edit, Search, ArrowLeft, TrendingUp, CheckCircle2, Tag } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product, type InsertProduct } from "@shared/schema";
import { motion } from "framer-motion";

const defaultCategories = ['drink', 'bottle', 'food', 'supplies', 'other'];
const units = ['bottle', 'can', 'liter', 'case', 'piece', 'kg'];

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  testId,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
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
      </div>
      <p className="text-2xl font-bold mb-1" data-testid={testId}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{title}</p>
    </motion.div>
  );
}

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  
  const canCreateProducts = user?.role === 'super_admin' || user?.role === 'gestore';
  const isBartender = user?.role === 'bartender';

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const categories = useMemo(() => {
    if (!products) return defaultCategories;
    const productCategories = products
      .map(p => p.category)
      .filter((cat): cat is string => !!cat && cat.trim() !== '');
    const uniqueCategories = Array.from(new Set(productCategories));
    return uniqueCategories.length > 0 ? uniqueCategories.sort() : defaultCategories;
  }, [products]);

  const activeProducts = useMemo(() => {
    return products?.filter(p => p.active).length || 0;
  }, [products]);

  const totalCategories = useMemo(() => {
    return categories.length;
  }, [categories]);

  const form = useForm<InsertProduct>({
    resolver: zodResolver(insertProductSchema),
    defaultValues: {
      code: '',
      name: '',
      category: '',
      unitOfMeasure: 'piece',
      costPrice: '0',
      active: true,
      minThreshold: '',
      companyId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertProduct) => {
      await apiRequest('POST', '/api/products', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Prodotto creato con successo",
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
        description: "Impossibile creare il prodotto",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      await apiRequest('PATCH', `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Prodotto aggiornato con successo",
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
        description: "Impossibile aggiornare il prodotto",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: InsertProduct) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      code: product.code,
      name: product.name,
      category: product.category || '',
      unitOfMeasure: product.unitOfMeasure,
      costPrice: product.costPrice,
      active: product.active,
      minThreshold: product.minThreshold || '',
      companyId: product.companyId,
    });
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    form.reset();
  };

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter((product) => {
      const matchesSearch = searchQuery === "" || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6"
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <Link href="/beverage">
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-xl"
              data-testid="button-back-beverage"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center glow-golden flex-shrink-0">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Catalogo Prodotti</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                {canCreateProducts ? 'Gestisci i prodotti e le scorte minime' : 'Visualizza i prodotti'}
              </p>
            </div>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (!canCreateProducts && open) {
            toast({
              title: "Accesso limitato",
              description: "Solo gli admin possono creare prodotti",
              variant: "destructive",
            });
            return;
          }
          setDialogOpen(open);
        }}>
          <DialogTrigger asChild>
            <Button 
              className="gradient-golden text-black font-semibold"
              data-testid="button-create-product"
              disabled={!canCreateProducts}
              title={!canCreateProducts ? "Solo gli admin possono creare prodotti" : ""}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Prodotto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Codice</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-product-code" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-product-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-product-category">
                              <SelectValue placeholder="Seleziona categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
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
                    name="unitOfMeasure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unità di Misura</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-product-unit">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit.charAt(0).toUpperCase() + unit.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="costPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prezzo di Costo (€)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" data-testid="input-product-cost" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minThreshold"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Soglia Minima (opzionale)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            value={field.value || ''}
                            data-testid="input-product-threshold"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-[48px]"
                    onClick={handleDialogClose}
                    data-testid="button-cancel-product"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    className="gradient-golden text-black font-semibold min-h-[48px]"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-product"
                  >
                    {editingProduct ? 'Aggiorna' : 'Crea'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <StatsCard
              title="Prodotti Totali"
              value={products?.length || 0}
              icon={Package}
              gradient="from-blue-500 to-indigo-600"
              testId="stat-total-products"
              delay={0.1}
            />
            <StatsCard
              title="Prodotti Attivi"
              value={activeProducts}
              icon={CheckCircle2}
              gradient="from-emerald-500 to-teal-600"
              testId="stat-active-products"
              delay={0.2}
            />
            <StatsCard
              title="Categorie"
              value={totalCategories}
              icon={Tag}
              gradient="from-amber-500 to-orange-600"
              testId="stat-categories"
              delay={0.3}
            />
          </>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 mb-6"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotti per nome o codice..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl"
            data-testid="input-search-products"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger 
            className="w-full sm:w-48 h-12 bg-white/5 border-white/10 rounded-xl" 
            data-testid="select-filter-category"
          >
            <SelectValue placeholder="Filtra per categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le categorie</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {isLoading ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-6">
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </motion.div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card overflow-hidden"
        >
          <div className="p-5 border-b border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Lista Prodotti</h2>
            <Badge className="ml-auto bg-primary/20 text-primary border-primary/30">
              {filteredProducts.length} prodotti
            </Badge>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-white/5">
                  <TableHead className="text-muted-foreground">Codice</TableHead>
                  <TableHead className="text-muted-foreground">Nome</TableHead>
                  <TableHead className="text-muted-foreground">Categoria</TableHead>
                  <TableHead className="text-muted-foreground">Unità</TableHead>
                  {!isBartender && <TableHead className="text-muted-foreground">Costo</TableHead>}
                  <TableHead className="text-muted-foreground">Soglia Min.</TableHead>
                  <TableHead className="text-muted-foreground">Stato</TableHead>
                  {!isBartender && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + index * 0.03 }}
                    className="border-white/5 hover:bg-white/5 transition-colors"
                    data-testid={`product-row-${product.id}`}
                  >
                    <TableCell className="font-mono text-sm">{product.code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-white/10 bg-white/5">
                        {product.category || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{product.unitOfMeasure}</TableCell>
                    {!isBartender && <TableCell className="text-muted-foreground">€ {product.costPrice}</TableCell>}
                    <TableCell className="text-muted-foreground">{product.minThreshold || '-'}</TableCell>
                    <TableCell>
                      {product.active ? (
                        <Badge className="bg-teal-500/20 text-teal border-teal-500/30">
                          Attivo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-white/10 text-muted-foreground">
                          Inattivo
                        </Badge>
                      )}
                    </TableCell>
                    {!isBartender && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="rounded-xl hover:bg-primary/10"
                        data-testid={`button-edit-product-${product.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    )}
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3 p-4">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + index * 0.03 }}
                className="glass-card p-4"
                data-testid={`product-card-${product.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{product.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{product.code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {product.active ? (
                      <Badge className="bg-teal-500/20 text-teal border-teal-500/30">
                        Attivo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-white/10 text-muted-foreground">
                        Inattivo
                      </Badge>
                    )}
                    {!isBartender && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(product)}
                        className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-primary/10"
                        data-testid={`button-edit-product-mobile-${product.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
                  <Badge variant="outline" className="border-white/10 bg-white/5">
                    {product.category || 'N/A'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{product.unitOfMeasure}</span>
                  {!isBartender && <span className="text-sm font-medium">€ {product.costPrice}</span>}
                  {product.minThreshold && (
                    <span className="text-xs text-muted-foreground">Min: {product.minThreshold}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 glow-golden">
            <Package className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground mb-4">
            {searchQuery || categoryFilter !== "all" 
              ? "Nessun prodotto trovato con i filtri selezionati"
              : "Nessun prodotto nel catalogo"
            }
          </p>
          {canCreateProducts && (
            <Button 
              onClick={() => setDialogOpen(true)} 
              className="gradient-golden text-black font-semibold"
              data-testid="button-create-first-product"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crea Primo Prodotto
            </Button>
          )}
        </motion.div>
      )}
    </div>
  );
}
