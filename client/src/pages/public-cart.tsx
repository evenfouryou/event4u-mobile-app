import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  ShieldCheck,
  Lock,
  CreditCard,
  Undo2,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface CartItem {
  id: string;
  ticketedEventId: string;
  itemType: 'ticket' | 'subscription';
  sectorId: string | null;
  subscriptionTypeId: string | null;
  seatId: string | null;
  quantity: number;
  ticketType: string;
  unitPrice: string;
  participantFirstName: string | null;
  participantLastName: string | null;
  reservedUntil: Date;
  eventName: string;
  eventStart: Date;
  sectorName: string | null;
  subscriptionName: string | null;
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
  const { t } = useTranslation();
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
                  <p className="text-sm text-muted-foreground mt-0.5" data-testid={`text-item-type-${item.id}`}>
                    {item.itemType === 'subscription' 
                      ? item.subscriptionName || t('public.cart.subscription')
                      : item.sectorName || t('public.cart.sector')}
                  </p>
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
                {item.itemType === 'subscription' ? (
                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs" data-testid={`badge-subscription-${item.id}`}>
                    {t('public.cart.subscription')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-border text-muted-foreground text-xs" data-testid={`badge-ticket-type-${item.id}`}>
                    {item.ticketType === "intero" ? t('public.cart.full') : t('public.cart.reduced')}
                  </Badge>
                )}
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
                €{Number(item.unitPrice).toFixed(2)} {t('public.cart.each')}
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
              {t('public.cart.reserveExpires', { minutes: minutesLeft })}
            </motion.p>
          )}
          
          {isExpired && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-red-400 mt-3 flex items-center gap-1"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {t('public.cart.reserveExpired')}
            </motion.p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function EmptyCart() {
  const { t } = useTranslation();
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
        {t('public.cart.empty')}
      </motion.h3>
      
      <motion.p 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springConfig, delay: 0.3 }}
        className="text-muted-foreground text-center mb-8 max-w-xs"
      >
        {t('public.cart.emptyMessage')}
      </motion.p>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...springConfig, delay: 0.4 }}
      >
        <Link href="/acquista">
          <HapticButton hapticType="medium" data-testid="button-browse">
            <Ticket className="w-5 h-5 mr-2" />
            {t('public.cart.browseEvents')}
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
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [clearCartDialogOpen, setClearCartDialogOpen] = useState(false);

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
        title: t('public.cart.removed'),
        description: t('public.cart.removedMessage'),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: t('common.error'),
        description: error.message || t('public.cart.removeError'),
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
        title: t('common.error'),
        description: error.message || t('public.cart.updateError'),
        variant: "destructive",
      });
    },
  });

  // Auto-rimuovi elementi scaduti dal carrello
  const removingExpiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!cart?.items?.length) return;
    
    const now = new Date();
    const expiredItems = cart.items.filter(item => {
      const reservedUntil = new Date(item.reservedUntil);
      return reservedUntil < now && !removingExpiredRef.current.has(item.id);
    });
    
    if (expiredItems.length > 0) {
      expiredItems.forEach(item => {
        removingExpiredRef.current.add(item.id);
        removeMutation.mutate(item.id, {
          onSettled: () => {
            removingExpiredRef.current.delete(item.id);
          }
        });
      });
      
      toast({
        title: t('public.cart.expiredRemoved'),
        description: expiredItems.length > 1 
          ? t('public.cart.expiredRemovedPlural', { count: expiredItems.length })
          : t('public.cart.expiredRemovedSingle', { count: expiredItems.length }),
        variant: "destructive",
      });
    }
  }, [cart?.items]);

  const handleCheckout = () => {
    triggerHaptic('medium');
    navigate("/checkout");
  };

  const hasItems = cart && cart.items.length > 0;

  const header = (
    <MobileHeader
      title={t('public.cart.title')}
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
    <div className="bg-card/95 backdrop-blur-xl border-t border-border">
      <div className="px-4 py-2 border-b border-border/50 flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>{t('public.cart.secure')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 text-primary" />
          <span>{t('public.cart.encrypted')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CreditCard className="w-3.5 h-3.5 text-blue-500" />
          <span>{t('public.cart.multiPay')}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {cart.itemsCount} {cart.itemsCount === 1 ? t('public.cart.tickets') : t('public.cart.ticketsPlural')}
            </p>
            <p className="text-xs text-teal-500 font-medium">{t('public.cart.freeCommissions')}</p>
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
          {t('public.cart.proceedToCheckout')}
          <ArrowRight className="w-5 h-5 ml-2" />
        </HapticButton>
      </div>
    </div>
  ) : null;

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-public-cart">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/acquista">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">{t('public.cart.title')}</h1>
              <p className="text-muted-foreground">
                {hasItems ? `${cart?.itemsCount} ${cart?.itemsCount === 1 ? t('public.cart.tickets') : t('public.cart.ticketsPlural')}` : t('public.cart.noItems')}
              </p>
            </div>
          </div>
          {hasItems && (
            <Dialog open={clearCartDialogOpen} onOpenChange={setClearCartDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-red-400 border-red-400/30 hover:bg-red-400/10" data-testid="button-clear">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('public.cart.clearCart')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('public.cart.clearCart')}</DialogTitle>
                  <DialogDescription>
                    {t('public.cart.clearCartConfirm')}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setClearCartDialogOpen(false)}>
                    {t('public.cart.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (cart?.items.length) {
                        cart.items.forEach(item => removeMutation.mutate(item.id));
                      }
                      setClearCartDialogOpen(false);
                    }}
                    disabled={removeMutation.isPending}
                    data-testid="button-confirm-clear"
                  >
                    {t('public.cart.clear')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              ))}
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
              <p className="text-red-400 text-center mb-4">{t('public.cart.loadError')}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Riprova
              </Button>
            </CardContent>
          </Card>
        ) : hasItems ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ticket className="w-5 h-5 text-primary" />
                    {t('public.cart.yourTickets')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('public.cart.event')}</TableHead>
                        <TableHead>{t('public.cart.type')}</TableHead>
                        <TableHead>{t('public.cart.nominative')}</TableHead>
                        <TableHead className="text-center">{t('public.cart.quantity')}</TableHead>
                        <TableHead className="text-right">{t('public.cart.price')}</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cart.items.map((item) => {
                        const reservedUntil = new Date(item.reservedUntil);
                        const isExpired = reservedUntil < new Date();
                        const minutesLeft = Math.max(0, Math.floor((reservedUntil.getTime() - Date.now()) / 60000));
                        
                        return (
                          <TableRow key={item.id} className={isExpired ? "opacity-50" : ""} data-testid={`row-item-${item.id}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium" data-testid={`text-event-${item.id}`}>{item.eventName}</p>
                                <p className="text-sm text-muted-foreground">{item.sectorName}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(item.eventStart), "d MMM HH:mm", { locale: it })}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {item.locationName}
                                  </span>
                                </div>
                                {!isExpired && minutesLeft <= 5 && (
                                  <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Scade tra {minutesLeft} min
                                  </p>
                                )}
                                {isExpired && (
                                  <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Riserva scaduta
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.ticketType === "intero" ? "Intero" : "Ridotto"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.participantFirstName ? (
                                <span className="text-sm">{item.participantFirstName} {item.participantLastName}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => {
                                    if (item.quantity > 1) {
                                      updateQuantityMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                                    }
                                  }}
                                  disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                                  data-testid={`button-decrement-${item.id}`}
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center font-semibold tabular-nums">{item.quantity}</span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => updateQuantityMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                                  disabled={updateQuantityMutation.isPending}
                                  data-testid={`button-increment-${item.id}`}
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <p className="font-semibold tabular-nums" data-testid={`text-price-${item.id}`}>
                                €{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                €{Number(item.unitPrice).toFixed(2)} cad.
                              </p>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeMutation.mutate(item.id)}
                                disabled={removeMutation.isPending}
                                className="text-muted-foreground hover:text-red-400"
                                data-testid={`button-remove-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border">
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Riepilogo Ordine
                    </CardTitle>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">
                          {cart.itemsCount} {cart.itemsCount === 1 ? "biglietto" : "biglietti"}
                        </span>
                        <span className="font-medium tabular-nums">€{cart.total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Commissioni</span>
                        <span className="text-teal-500 font-medium">Gratuite</span>
                      </div>
                    </div>
                    
                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Totale</span>
                        <span className="text-2xl font-bold text-primary tabular-nums" data-testid="text-total">
                          €{cart.total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      onClick={handleCheckout}
                      className="w-full h-12 text-base font-semibold"
                      size="lg"
                      data-testid="button-checkout"
                    >
                      Procedi al Checkout
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    
                    <Link href="/acquista" className="block">
                      <Button variant="ghost" className="w-full text-muted-foreground" data-testid="button-continue-shopping">
                        <Undo2 className="w-4 h-4 mr-2" />
                        Continua lo shopping
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                
                <Card className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-4 h-4 text-teal-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Acquisto Sicuro</p>
                        <p className="text-xs text-muted-foreground">Protezione dati garantita</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Pagamento Crittografato</p>
                        <p className="text-xs text-muted-foreground">SSL 256-bit encryption</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Metodi di Pagamento</p>
                        <p className="text-xs text-muted-foreground">Carta, Apple Pay, Google Pay</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6">
                <ShoppingCart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Carrello vuoto</h3>
              <p className="text-muted-foreground text-center mb-8 max-w-sm">
                Non hai ancora aggiunto biglietti al carrello. Scopri gli eventi disponibili!
              </p>
              <Link href="/acquista">
                <Button data-testid="button-browse">
                  <Ticket className="w-5 h-5 mr-2" />
                  Sfoglia Eventi
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

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
