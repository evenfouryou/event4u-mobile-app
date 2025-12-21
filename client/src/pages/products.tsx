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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Edit, Search, ArrowLeft, CheckCircle2, Tag, Euro } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertProductSchema, type Product, type InsertProduct } from "@shared/schema";
import { motion } from "framer-motion";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton, 
  FloatingActionButton,
  BottomSheet,
  triggerHaptic
} from "@/components/mobile-primitives";

const defaultCategories = ['drink', 'bottle', 'food', 'supplies', 'other'];
const units = ['bottle', 'can', 'liter', 'case', 'piece', 'kg'];

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

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
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...springTransition, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold" data-testid={testId}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground truncate">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function ProductCard({
  product,
  onEdit,
  canEdit,
  isBartender,
  index,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  canEdit: boolean;
  isBartender: boolean;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay: 0.1 + index * 0.05 }}
      className="glass-card p-4"
      data-testid={`product-card-${product.id}`}
    >
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
          <Package className="h-6 w-6 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate">{product.name}</h3>
              <p className="text-xs text-muted-foreground font-mono">{product.code}</p>
            </div>
            {product.active ? (
              <Badge className="bg-teal-500/20 text-teal border-teal-500/30 flex-shrink-0">
                Attivo
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/10 text-muted-foreground flex-shrink-0">
                Inattivo
              </Badge>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {product.category && (
              <Badge variant="outline" className="border-white/10 bg-white/5 text-xs">
                <Tag className="h-3 w-3 mr-1" />
                {product.category}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {product.unitOfMeasure}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!isBartender && (
                <div className="flex items-center gap-1">
                  <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{product.costPrice}</span>
                </div>
              )}
              {product.minThreshold && (
                <div className="text-xs text-muted-foreground">
                  Min: {product.minThreshold}
                </div>
              )}
            </div>
            
            {canEdit && (
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => onEdit(product)}
                className="h-11 w-11 rounded-xl"
                hapticType="light"
                data-testid={`button-edit-product-${product.id}`}
              >
                <Edit className="h-5 w-5" />
              </HapticButton>
            )}
          </div>
        </div>
      </div>
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
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Prodotto creato con successo",
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
      triggerHaptic('success');
      toast({
        title: "Successo",
        description: "Prodotto aggiornato con successo",
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

  const handleFabClick = () => {
    if (!canCreateProducts) {
      triggerHaptic('error');
      toast({
        title: "Accesso limitato",
        description: "Solo gli admin possono creare prodotti",
        variant: "destructive",
      });
      return;
    }
    setDialogOpen(true);
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

  const header = (
    <MobileHeader
      title="Catalogo Prodotti"
      leftAction={
        <Link href="/beverage">
          <HapticButton 
            variant="ghost" 
            size="icon" 
            className="h-11 w-11 rounded-xl"
            hapticType="light"
            data-testid="button-back-beverage"
          >
            <ArrowLeft className="h-5 w-5" />
          </HapticButton>
        </Link>
      }
      rightAction={
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Package className="h-5 w-5 text-white" />
        </div>
      }
    />
  );

  return (
    <MobileAppLayout header={header} contentClassName="pb-24">
      <div className="py-4 space-y-4">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Cerca prodotti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 bg-white/5 border-white/10 rounded-2xl text-base"
            data-testid="input-search-products"
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springTransition, delay: 0.05 }}
          className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
        >
          <HapticButton
            variant={categoryFilter === "all" ? "default" : "outline"}
            className={`h-11 rounded-full px-4 flex-shrink-0 ${
              categoryFilter === "all" 
                ? "gradient-golden text-black" 
                : "border-white/10 bg-white/5"
            }`}
            onClick={() => setCategoryFilter("all")}
            hapticType="light"
            data-testid="filter-all"
          >
            Tutti
          </HapticButton>
          {categories.map((cat) => (
            <HapticButton
              key={cat}
              variant={categoryFilter === cat ? "default" : "outline"}
              className={`h-11 rounded-full px-4 flex-shrink-0 ${
                categoryFilter === cat 
                  ? "gradient-golden text-black" 
                  : "border-white/10 bg-white/5"
              }`}
              onClick={() => setCategoryFilter(cat)}
              hapticType="light"
              data-testid={`filter-${cat}`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </HapticButton>
          ))}
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
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
                delay={0.15}
              />
              <StatsCard
                title="Categorie"
                value={totalCategories}
                icon={Tag}
                gradient="from-amber-500 to-orange-600"
                testId="stat-categories"
                delay={0.2}
              />
            </>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.25 }}
          className="flex items-center justify-between"
        >
          <h2 className="font-semibold text-lg">Prodotti</h2>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {filteredProducts.length}
          </Badge>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="space-y-3">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEdit}
                canEdit={canCreateProducts}
                isBartender={isBartender}
                index={index}
              />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="glass-card p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Nessun prodotto trovato</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || categoryFilter !== "all" 
                ? "Prova a modificare i filtri di ricerca" 
                : "Aggiungi il primo prodotto al catalogo"}
            </p>
          </motion.div>
        )}
      </div>

      {canCreateProducts && (
        <FloatingActionButton
          onClick={handleFabClick}
          className="gradient-golden"
          data-testid="fab-create-product"
        >
          <Plus className="h-6 w-6 text-black" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={dialogOpen}
        onClose={handleDialogClose}
        title={editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
      >
        <div className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Codice</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        className="h-12 rounded-xl" 
                        data-testid="input-product-code" 
                      />
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
                      <Input 
                        {...field} 
                        className="h-12 rounded-xl" 
                        data-testid="input-product-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger 
                          className="h-12 rounded-xl" 
                          data-testid="select-product-category"
                        >
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
                        <SelectTrigger 
                          className="h-12 rounded-xl" 
                          data-testid="select-product-unit"
                        >
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

              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prezzo di Costo (€)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        type="number" 
                        step="0.01" 
                        className="h-12 rounded-xl" 
                        data-testid="input-product-cost" 
                      />
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
                        className="h-12 rounded-xl"
                        data-testid="input-product-threshold"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 rounded-xl"
                  onClick={handleDialogClose}
                  hapticType="light"
                  data-testid="button-cancel-product"
                >
                  Annulla
                </HapticButton>
                <HapticButton
                  type="submit"
                  className="flex-1 h-14 rounded-xl gradient-golden text-black font-semibold"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  hapticType="medium"
                  data-testid="button-submit-product"
                >
                  {editingProduct ? 'Aggiorna' : 'Crea'}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
