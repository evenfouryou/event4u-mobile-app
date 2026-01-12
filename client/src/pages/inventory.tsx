import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Package,
  AlertTriangle,
  Search,
  ArrowLeft,
  Wine,
  Beer,
  Grape,
  Martini,
  CupSoda,
  Coffee,
  Milk,
  Box,
  TrendingDown,
  CheckCircle2,
  Eye,
} from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { HapticButton, MobileAppLayout, MobileHeader, triggerHaptic } from "@/components/mobile-primitives";
import type { Product } from "@shared/schema";

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const CATEGORIES = [
  { id: "all", label: "Tutti", icon: Package },
  { id: "spirits", label: "Spirits", icon: Wine },
  { id: "beer", label: "Birre", icon: Beer },
  { id: "wine", label: "Vini", icon: Grape },
  { id: "cocktails", label: "Cocktail", icon: Martini },
  { id: "soft", label: "Soft Drink", icon: CupSoda },
  { id: "coffee", label: "Caffè", icon: Coffee },
  { id: "other", label: "Altro", icon: Milk },
];

function CategoryPills({ 
  selected, 
  onSelect,
  categories,
}: { 
  selected: string; 
  onSelect: (id: string) => void;
  categories: typeof CATEGORIES;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <motion.button
            key={cat.id}
            whileTap={{ scale: 0.95 }}
            transition={springTransition}
            onClick={() => {
              triggerHaptic('light');
              onSelect(cat.id);
            }}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-full whitespace-nowrap min-h-[44px]
              transition-colors flex-shrink-0
              ${isActive 
                ? "bg-primary text-primary-foreground font-semibold" 
                : "bg-card border border-border text-muted-foreground"
              }
            `}
            data-testid={`filter-category-${cat.id}`}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm">{cat.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function StockLevelBar({ 
  level, 
  minThreshold = 10,
  delay = 0,
}: { 
  level: number;
  minThreshold?: number;
  delay?: number;
}) {
  const stockPercent = Math.min((level / 100) * 100, 100);
  const stockColor = level < minThreshold 
    ? "bg-red-500" 
    : level < minThreshold * 3 
      ? "bg-amber-500" 
      : "bg-teal";

  return (
    <div className="h-2 bg-muted rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${stockPercent}%` }}
        transition={{ ...springTransition, delay }}
        className={`h-full ${stockColor} rounded-full`}
      />
    </div>
  );
}

function ProductInventoryCard({
  product,
  stock = 0,
  delay = 0,
}: {
  product: Product;
  stock?: number;
  delay?: number;
}) {
  const minThreshold = Number(product.minThreshold) || 10;
  const isLowStock = stock < minThreshold;
  const isCritical = stock < minThreshold * 0.5;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      className="glass-card overflow-hidden"
      data-testid={`inventory-card-${product.id}`}
    >
      <div className="aspect-square bg-gradient-to-br from-card to-muted/30 flex items-center justify-center relative">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Box className="h-8 w-8 text-primary/50" />
        </div>
        {isCritical && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springTransition}
            className="absolute top-3 right-3"
          >
            <Badge className="bg-red-500/90 text-white border-0">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Critico
            </Badge>
          </motion.div>
        )}
        {isLowStock && !isCritical && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springTransition}
            className="absolute top-3 right-3"
          >
            <Badge className="bg-amber-500/90 text-white border-0">
              <TrendingDown className="h-3 w-3 mr-1" />
              Basso
            </Badge>
          </motion.div>
        )}
        {!isLowStock && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springTransition}
            className="absolute top-3 right-3"
          >
            <Badge className="bg-teal/90 text-white border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              OK
            </Badge>
          </motion.div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-base mb-1 line-clamp-1">{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
          {product.category || "Prodotto"} · {product.unitOfMeasure}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Disponibilità</span>
            <span className={`font-semibold ${isCritical ? 'text-red-500' : isLowStock ? 'text-amber-500' : 'text-teal'}`}>
              {stock} {product.unitOfMeasure}
            </span>
          </div>
          <StockLevelBar level={stock} minThreshold={minThreshold} delay={delay + 0.2} />
        </div>
      </div>
    </motion.div>
  );
}

function StatsCard({
  title,
  value,
  icon: Icon,
  gradient,
  delay = 0,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  delay?: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...springTransition, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 pb-24">
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-14 rounded-2xl" />
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-11 w-24 rounded-full flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function Inventory() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const categories = useMemo(() => {
    if (!products) return CATEGORIES;
    const productCategories = products
      .map(p => p.category?.toLowerCase())
      .filter((cat): cat is string => !!cat);
    const uniqueCategories = Array.from(new Set(productCategories));
    
    const dynamicCategories = CATEGORIES.filter(cat => 
      cat.id === 'all' || uniqueCategories.some(uc => uc.includes(cat.id) || cat.id.includes(uc))
    );
    
    return dynamicCategories.length > 1 ? dynamicCategories : CATEGORIES;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    return products.filter(product => {
      const matchesSearch = searchQuery === "" || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === "all" || 
        (product.category && product.category.toLowerCase().includes(categoryFilter.toLowerCase()));
      
      return matchesSearch && matchesCategory && product.active;
    });
  }, [products, searchQuery, categoryFilter]);

  const stats = useMemo(() => {
    if (!products) return { total: 0, lowStock: 0, critical: 0, healthy: 0 };
    
    const activeProducts = products.filter(p => p.active);
    const lowStock = activeProducts.filter(p => {
      const threshold = Number(p.minThreshold) || 10;
      return threshold > 5 && threshold <= 10;
    }).length;
    const critical = activeProducts.filter(p => {
      const threshold = Number(p.minThreshold) || 10;
      return threshold <= 5;
    }).length;
    
    return {
      total: activeProducts.length,
      lowStock,
      critical,
      healthy: activeProducts.length - lowStock - critical,
    };
  }, [products]);

  const getStockStatus = (stock: number, minThreshold: number) => {
    const isLowStock = stock < minThreshold;
    const isCritical = stock < minThreshold * 0.5;
    if (isCritical) return { label: t('inventory.critical'), color: "bg-red-500/20 text-red-400 border-red-500/30" };
    if (isLowStock) return { label: t('inventory.low'), color: "bg-amber-500/20 text-amber-400 border-amber-500/30" };
    return { label: t('inventory.ok'), color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    setIsDetailDialogOpen(true);
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-inventory">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
            <p className="text-muted-foreground">{t('inventory.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">{t('inventory.totalProducts')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">{stats.critical}</div>
                  <p className="text-sm text-muted-foreground">{t('inventory.criticalStock')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-500">{stats.lowStock}</div>
                  <p className="text-sm text-muted-foreground">{t('inventory.lowStock')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-emerald-500">{stats.healthy}</div>
                  <p className="text-sm text-muted-foreground">{t('inventory.stockOk')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>{t('inventory.productList')}</CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={t('inventory.searchProducts')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-[250px]"
                    data-testid="input-search-inventory"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                    <SelectValue placeholder={t('inventory.category')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">{t('inventory.noProductFound')}</h3>
                <p className="text-sm text-muted-foreground">{t('inventory.tryModifyFilters')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('inventory.code')}</TableHead>
                    <TableHead>{t('inventory.name')}</TableHead>
                    <TableHead>{t('inventory.category')}</TableHead>
                    <TableHead>{t('inventory.unit')}</TableHead>
                    <TableHead>{t('inventory.stock')}</TableHead>
                    <TableHead>{t('inventory.status')}</TableHead>
                    <TableHead className="text-right">{t('inventory.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const stock = Math.floor(Math.random() * 100);
                    const minThreshold = Number(product.minThreshold) || 10;
                    const stockStatus = getStockStatus(stock, minThreshold);
                    return (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                        <TableCell className="font-mono text-sm">{product.code}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category || "-"}</TableCell>
                        <TableCell>{product.unitOfMeasure}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  stockStatus.label === "Critico" ? "bg-red-500" :
                                  stockStatus.label === "Basso" ? "bg-amber-500" : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(stock, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm">{stock}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stockStatus.color}>{stockStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openProductDetail(product)}
                            data-testid={`button-view-${product.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedProduct?.name}</DialogTitle>
              <DialogDescription>{t('inventory.productDetails')}</DialogDescription>
            </DialogHeader>
            {selectedProduct && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inventory.code')}</p>
                    <p className="font-medium">{selectedProduct.code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inventory.category')}</p>
                    <p className="font-medium">{selectedProduct.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inventory.unitOfMeasure')}</p>
                    <p className="font-medium">{selectedProduct.unitOfMeasure}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inventory.minThreshold')}</p>
                    <p className="font-medium">{selectedProduct.minThreshold || 10}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inventory.costPrice')}</p>
                    <p className="font-medium">€{Number(selectedProduct.costPrice || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('inventory.status')}</p>
                    <Badge className={selectedProduct.active ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                      {selectedProduct.active ? t('inventory.active') : t('inventory.inactive')}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const headerContent = (
    <MobileHeader
      title={t('inventory.title')}
      showBackButton showMenuButton
    />
  );

  if (isLoading) {
    return (
      <MobileAppLayout header={headerContent} noPadding>
        <div className="px-4 pt-4">
          <LoadingSkeleton />
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout header={headerContent} noPadding>
      <div className="px-4 pt-4 pb-24 space-y-5">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="grid grid-cols-2 gap-3"
        >
          <StatsCard
            title={t('inventory.totalProducts')}
            value={stats.total}
            icon={Package}
            gradient="from-primary to-primary/70"
            delay={0}
          />
          <StatsCard
            title={t('inventory.criticalStock')}
            value={stats.critical}
            icon={AlertTriangle}
            gradient="from-red-500 to-red-600"
            delay={0.05}
          />
          <StatsCard
            title={t('inventory.lowStock')}
            value={stats.lowStock}
            icon={TrendingDown}
            gradient="from-amber-500 to-amber-600"
            delay={0.1}
          />
          <StatsCard
            title={t('inventory.stockOk')}
            value={stats.healthy}
            icon={CheckCircle2}
            gradient="from-teal to-teal/70"
            delay={0.15}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('inventory.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-14 pl-12 pr-4 rounded-2xl bg-card border-border text-base"
            data-testid="input-search-inventory"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springTransition, delay: 0.15 }}
        >
          <CategoryPills 
            selected={categoryFilter} 
            onSelect={setCategoryFilter}
            categories={categories}
          />
        </motion.div>

        <AnimatePresence mode="popLayout">
          {filteredProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={springTransition}
              className="glass-card p-8 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('inventory.noProductFound')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('inventory.tryModifyFilters')}
              </p>
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              className="grid grid-cols-2 gap-4"
            >
              {filteredProducts.map((product, index) => (
                <ProductInventoryCard
                  key={product.id}
                  product={product}
                  stock={Math.floor(Math.random() * 100)}
                  delay={0.05 * Math.min(index, 10)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MobileAppLayout>
  );
}
