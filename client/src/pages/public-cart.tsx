import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Ticket,
  ChevronLeft,
  Trash2,
  ShoppingCart,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Calendar,
  MapPin,
  Clock,
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

function CartItemCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: CartItem;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const reservedUntil = new Date(item.reservedUntil);
  const isExpired = reservedUntil < new Date();
  const minutesLeft = Math.max(0, Math.floor((reservedUntil.getTime() - Date.now()) / 60000));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <Card
        className={`bg-card border-border overflow-hidden ${isExpired ? "opacity-50" : ""}`}
        data-testid={`card-item-${item.id}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-indigo-900/50 to-purple-900/50 flex items-center justify-center shrink-0">
              <Ticket className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground truncate" data-testid={`text-event-${item.id}`}>
                    {item.eventName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{item.sectorName}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  disabled={isRemoving}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-400/10 shrink-0"
                  data-testid={`button-remove-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(item.eventStart), "d MMM", { locale: it })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(item.eventStart), "HH:mm")}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {item.locationName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {item.ticketType === "intero" ? "Intero" : "Ridotto"}
                  </Badge>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    x{item.quantity}
                  </Badge>
                  {item.participantFirstName && (
                    <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                      {item.participantFirstName} {item.participantLastName}
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary" data-testid={`text-price-${item.id}`}>
                    €{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
              {!isExpired && minutesLeft <= 5 && (
                <p className="text-xs text-amber-400 mt-2">
                  Riserva scade tra {minutesLeft} minuti
                </p>
              )}
              {isExpired && (
                <p className="text-xs text-red-400 mt-2">
                  Riserva scaduta - Rimuovi e riprova
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PublicCartPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: cart, isLoading, error } = useQuery<CartData>({
    queryKey: ["/api/public/cart"],
    refetchInterval: 30000, // Refresh ogni 30 secondi per aggiornare lo stato delle riserve
  });

  const removeMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/public/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
      toast({
        title: "Rimosso",
        description: "Articolo rimosso dal carrello.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile rimuovere l'articolo.",
        variant: "destructive",
      });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/public/cart");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/cart"] });
      toast({
        title: "Carrello svuotato",
        description: "Tutti gli articoli sono stati rimossi.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile svuotare il carrello.",
        variant: "destructive",
      });
    },
  });

  const handleCheckout = () => {
    navigate("/checkout");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/acquista">
              <Button variant="ghost" className="text-foreground" data-testid="button-back">
                <ChevronLeft className="w-4 h-4 mr-1" /> Continua Acquisti
              </Button>
            </Link>
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">Event4U</span>
              </div>
            </Link>
            <div className="w-32" /> {/* Spacer per bilanciare */}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 sm:mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3" data-testid="text-page-title">
            <ShoppingCart className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            Il Tuo Carrello
          </h1>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-36" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center bg-red-500/10 border-red-500/20">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="text-red-400">Errore nel caricamento del carrello.</p>
          </Card>
        ) : cart && cart.items.length > 0 ? (
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {cart.itemsCount} {cart.itemsCount === 1 ? "biglietto" : "biglietti"}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearMutation.mutate()}
                  disabled={clearMutation.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  data-testid="button-clear"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Svuota
                </Button>
              </div>
              <AnimatePresence mode="popLayout">
                {cart.items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onRemove={() => removeMutation.mutate(item.id)}
                    isRemoving={removeMutation.isPending}
                  />
                ))}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              <Card className="bg-card border-border sticky top-24">
                <CardHeader className="border-b border-border">
                  <CardTitle className="text-card-foreground">Riepilogo</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotale</span>
                    <span>€{cart.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Commissioni</span>
                    <span className="text-teal-400">Gratuite</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-foreground">Totale</span>
                      <span className="text-2xl font-bold text-primary" data-testid="text-total">
                        €{cart.total.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">IVA inclusa</p>
                  </div>
                  <Button
                    onClick={handleCheckout}
                    className="w-full h-12"
                    data-testid="button-checkout"
                  >
                    Procedi al Pagamento
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Pagamenti sicuri con Stripe
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-12 text-center bg-muted/50 border-border">
              <ShoppingCart className="w-20 h-20 mx-auto mb-6 text-muted-foreground" />
              <h3 className="text-2xl font-semibold text-foreground mb-3">Carrello vuoto</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Non hai ancora aggiunto biglietti al carrello.
                Scopri gli eventi disponibili e scegli i tuoi biglietti.
              </p>
              <Link href="/acquista">
                <Button data-testid="button-browse">
                  <Ticket className="w-4 h-4 mr-2" />
                  Sfoglia Eventi
                </Button>
              </Link>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
}
