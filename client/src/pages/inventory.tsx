import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { user } = useAuth();

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

  const headerContent = (
    <MobileHeader
      title="Inventario"
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
            title="Prodotti Totali"
            value={stats.total}
            icon={Package}
            gradient="from-primary to-primary/70"
            delay={0}
          />
          <StatsCard
            title="Stock Critico"
            value={stats.critical}
            icon={AlertTriangle}
            gradient="from-red-500 to-red-600"
            delay={0.05}
          />
          <StatsCard
            title="Stock Basso"
            value={stats.lowStock}
            icon={TrendingDown}
            gradient="from-amber-500 to-amber-600"
            delay={0.1}
          />
          <StatsCard
            title="Stock OK"
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
            placeholder="Cerca prodotti..."
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
              <h3 className="font-semibold text-lg mb-2">Nessun prodotto trovato</h3>
              <p className="text-sm text-muted-foreground">
                Prova a modificare i filtri di ricerca
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
