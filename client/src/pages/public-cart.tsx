import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Ticket,
  ChevronLeft,
  Trash2,
  ShoppingCart,
  ArrowRight,
  AlertCircle,
  Calendar,
  MapPin,
  Minus,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

interface CartItem {
  id: string;
  ticketedEventId: string;
  sectorId: string;
  seatId: string | null;
  quantity: number;
  ticketType: string;
  unitPrice: string;
  participantFirstName: string | null;
  participantLastName: string | null;
  reservedUntil: Date;
  eventName: string;
  eventStart: Date;
  sectorName: string;
  locationName: string;
}

interface CartData {
  items: CartItem[];
  total: number;
  itemsCount: number;
}

const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

function TicketCard({
  item,
  onRemove,
  onUpdateQuantity,
  isUpdating,
}: {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (newQuantity: number) => void;
  isUpdating: boolean;
}) {
  const reservedUntil = new Date(item.reservedUntil);
  const isExpired = reservedUntil < new Date();
  const minutesLeft = Math.max(0, Math.floor((reservedUntil.getTime() - Date.now()) / 60000));

  const handleIncrement = () => {
    triggerHaptic('light');
    onUpdateQuantity(item.quantity + 1);
  };

  const handleDecrement = () => {
    triggerHaptic('light');
    if (item.quantity > 1) {
      onUpdateQuantity(item.quantity - 1);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -100, scale: 0.9 }}
      transition={springConfig}
    >
      <Card
        className={`bg-card border-border overflow-hidden ${isExpired ? "opacity-50" : ""}`}
        data-testid={`card-item-${item.id}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <motion.div 
              className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0"
              whileTap={{ scale: 0.95 }}
            >
              <Ticket className="w-8 h-8 text-primary" />
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 
                    className="font-semibold text-foreground text-base leading-tight line-clamp-2" 
                    data-testid={`text-event-${item.id}`}
                  >
                    {item.eventName}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{item.sectorName}</p>
                </div>
                
                <HapticButton
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  disabled={isUpdating}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 shrink-0 h-11 w-11"
                  hapticType="medium"
                  data-testid={`button-remove-${item.id}`}
                >
                  <Trash2 className="w-5 h-5" />
                </HapticButton>
              </div>
              
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(item.eventStart), "d MMM HH:mm", { locale: it })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[100px]">{item.locationName}</span>
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="border-border text-muted-foreground text-xs">
                  {item.ticketType === "intero" ? "Intero" : "Ridotto"}
                </Badge>
                {item.participantFirstName && (
                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs">
                    {item.participantFirstName} {item.participantLastName}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={springConfig}
                onClick={handleDecrement}
                disabled={item.quantity <= 1 || isUpdating}
                className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center disabled:opacity-40"
                data-testid={`button-decrement-${item.id}`}
              >
                <Minus className="w-5 h-5 text-foreground" />
              </motion.button>
              
              <motion.span 
                key={item.quantity}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={springConfig}
                className="text-xl font-bold text-foreground w-8 text-center tabular-nums"
              >
                {item.quantity}
              </motion.span>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                transition={springConfig}
                onClick={handleIncrement}
                disabled={isUpdating}
                className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center disabled:opacity-40"
                data-testid={`button-increment-${item.id}`}
              >
                <Plus className="w-5 h-5 text-primary-foreground" />
              </motion.button>
            </div>
            
            <motion.div 
              key={Number(item.unitPrice) * item.quantity}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={springConfig}
              className="text-right"
            >
              <p className="text-xl font-bold text-primary tabular-nums" data-testid={`text-price-${item.id}`}>
                €{(Number(item.unitPrice) * item.quantity).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                €{Number(item.unitPrice).toFixed(2)} cad.
              </p>
            </motion.div>
          </div>
          
          {!isExpired && minutesLeft <= 5 && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-amber-400 mt-3 flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Riserva scade tra {minutesLeft} minuti
            </motion.p>
          )}
          
          {isExpired && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-400 mt-3 flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Riserva scaduta - Rimuovi e riprova
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyCart() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={springConfig}
      className="flex-1 flex flex-col items-center justify-center px-6 py-12"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        transition={{ ...springConfig, delay: 0.1 }}
      >
        <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <ShoppingCart className="w-12 h-12 text-muted-foreground" />
        </div>
      </motion.div>
      
      <motion.h3 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springConfig, delay: 0.2 }}
        className="text-xl font-semibold text-foreground mb-2 text-center"
      >
        Carrello vuoto
      </motion.h3>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springConfig, delay: 0.3 }}
        className="text-muted-foreground text-center mb-8 max-w-xs"
      >
        Non hai ancora aggiunto biglietti al carrello. Scopri gli eventi disponibili!
      </motion.p>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springConfig, delay: 0.4 }}
      >
        <Link href="/acquista">
          <HapticButton hapticType="medium" data-testid="button-browse">
            <Ticket className="w-5 h-5 mr-2" />
            Sfoglia Eventi
          </HapticButton>
        </Link>
      </motion.div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 px-4 py-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="w-20 h-20 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-12 w-8" />
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PublicCartPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: cart, isLoading, error } = useQuery<CartData>({
    queryKey: ["/api/public/cart"],
    refetchInterval: 30000,
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/public/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
      triggerHaptic('success');
      toast({
        title: "Rimosso",
        description: "Articolo rimosso dal carrello.",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile rimuovere l'articolo.",
        variant: "destructive",
      });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiRequest("PATCH", `/api/public/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile aggiornare la quantità.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    triggerHaptic('medium');
    navigate("/checkout");
  };

  const hasItems = cart && cart.items.length > 0;

  const header = (
    <MobileHeader
      title="Carrello"
      leftAction={
        <Link href="/acquista">
          <HapticButton 
            variant="ghost" 
            size="icon" 
            hapticType="light"
            data-testid="button-back"
          >
            <ChevronLeft className="w-6 h-6" />
          </HapticButton>
        </Link>
      }
      rightAction={
        hasItems ? (
          <HapticButton
            variant="ghost"
            size="icon"
            onClick={() => {
              if (cart?.items.length) {
                cart.items.forEach(item => removeMutation.mutate(item.id));
              }
            }}
            disabled={removeMutation.isPending}
            className="text-red-400"
            hapticType="medium"
            data-testid="button-clear"
          >
            <Trash2 className="w-5 h-5" />
          </HapticButton>
        ) : undefined
      }
    />
  );

  const footer = hasItems ? (
    <div className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm text-muted-foreground">
            {cart.itemsCount} {cart.itemsCount === 1 ? "biglietto" : "biglietti"}
          </p>
          <p className="text-xs text-muted-foreground">Commissioni gratuite</p>
        </div>
        <motion.div
          key={cart.total}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={springConfig}
        >
          <p className="text-2xl font-bold text-primary tabular-nums" data-testid="text-total">
            €{cart.total.toFixed(2)}
          </p>
        </motion.div>
      </div>
      
      <HapticButton
        onClick={handleCheckout}
        className="w-full h-14 text-base font-semibold"
        hapticType="medium"
        data-testid="button-checkout"
      >
        Vai al Checkout
        <ArrowRight className="w-5 h-5 ml-2" />
      </HapticButton>
    </div>
  ) : null;

  return (
    <MobileAppLayout
      header={header}
      footer={footer}
      noPadding
    >
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <p className="text-red-400 text-center">Errore nel caricamento del carrello.</p>
          <HapticButton 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
            hapticType="light"
          >
            Riprova
          </HapticButton>
        </div>
      ) : hasItems ? (
        <div className="px-4 py-4 space-y-4 pb-8">
          <AnimatePresence mode="popLayout">
            {cart.items.map((item) => (
              <TicketCard
                key={item.id}
                item={item}
                onRemove={() => removeMutation.mutate(item.id)}
                onUpdateQuantity={(newQuantity) => 
                  updateQuantityMutation.mutate({ itemId: item.id, quantity: newQuantity })
                }
                isUpdating={removeMutation.isPending || updateQuantityMutation.isPending}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyCart />
      )}
    </MobileAppLayout>
  );
}
