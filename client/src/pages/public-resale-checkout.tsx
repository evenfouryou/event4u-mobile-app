import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState } from "react";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import { 
  RefreshCw, 
  Calendar, 
  MapPin, 
  User, 
  ChevronLeft,
  Ticket,
  Tag,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Lock,
} from "lucide-react";

interface ResaleDetail {
  id: string;
  eventId: number;
  ticketedEventId: string;
  eventName: string;
  eventStart: string;
  eventImageUrl: string | null;
  locationName: string;
  sectorName: string;
  ticketType: string;
  originalPrice: string;
  resalePrice: string;
  listedAt: string;
  status: string;
}

const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
};

export default function PublicResaleCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, customer } = useCustomerAuth();
  const isMobile = useIsMobile();
  const [isReserving, setIsReserving] = useState(false);

  const { data: resale, isLoading, error } = useQuery<ResaleDetail>({
    queryKey: [`/api/public/resales/${id}`],
    enabled: !!id,
  });

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/public/resales/${id}/reserve`, {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      triggerHaptic('success');
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile procedere all'acquisto",
        variant: "destructive",
      });
      setIsReserving(false);
    },
  });

  const handlePurchase = () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/rivendita/${id}`);
      return;
    }
    setIsReserving(true);
    reserveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !resale) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Rivendita non disponibile</h2>
          <p className="text-muted-foreground mb-6">
            Questo biglietto potrebbe essere stato già acquistato o non è più in vendita.
          </p>
          <Link href="/rivendite">
            <Button>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Torna alle rivendite
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (resale.status !== 'listed') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-amber-400" />
          <h2 className="text-xl font-bold mb-2">Biglietto non più disponibile</h2>
          <p className="text-muted-foreground mb-6">
            Questo biglietto è stato già acquistato da un altro utente.
          </p>
          <Link href="/rivendite">
            <Button>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Torna alle rivendite
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const eventDate = new Date(resale.eventStart);
  const originalPrice = parseFloat(resale.originalPrice);
  const resalePrice = parseFloat(resale.resalePrice);
  const discount = originalPrice > 0 ? Math.round(((originalPrice - resalePrice) / originalPrice) * 100) : 0;
  const hasDiscount = discount > 0;

  return (
    <div className="min-h-screen bg-background" data-testid="page-resale-checkout">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/rivendite">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Indietro
            </Button>
          </Link>
          <BrandLogo variant="horizontal" className="h-8" />
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="space-y-6"
        >
          <div className="text-center">
            <Badge className="bg-amber-500/90 text-white mb-4">
              <RefreshCw className="w-3 h-3 mr-1" />
              Acquisto Rivendita
            </Badge>
            <h1 className="text-2xl font-bold">{resale.eventName}</h1>
          </div>

          <Card className="overflow-hidden">
            {resale.eventImageUrl && (
              <div className="relative aspect-video">
                <img
                  src={resale.eventImageUrl}
                  alt={resale.eventName}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              </div>
            )}
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  <Ticket className="w-3 h-3 mr-1" />
                  {resale.ticketType}
                </Badge>
                <Badge variant="outline">
                  {resale.sectorName}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium">{format(eventDate, "EEEE d MMMM yyyy", { locale: it })}</p>
                    <p className="text-sm text-muted-foreground">Ore {format(eventDate, "HH:mm")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-teal-400" />
                  </div>
                  <p className="text-muted-foreground">{resale.locationName}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground">Quantità</span>
                  <span className="font-bold text-lg">1 biglietto</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Prezzo originale</span>
                  <span className={hasDiscount ? "line-through text-muted-foreground" : "font-bold"}>
                    €{originalPrice.toFixed(2)}
                  </span>
                </div>
                {hasDiscount && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Prezzo rivendita</span>
                    <span className="font-bold text-green-500">€{resalePrice.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Totale</span>
                  <span className="text-2xl font-bold text-primary">€{resalePrice.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
              <span className="font-medium">Acquisto Sicuro</span>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                • Biglietto verificato e garantito
              </li>
              <li className="flex items-center gap-2">
                • Trasferimento immediato dopo il pagamento
              </li>
              <li className="flex items-center gap-2">
                • Pagamento sicuro con Stripe
              </li>
            </ul>
          </Card>

          {!isAuthenticated && (
            <Card className="p-4 bg-amber-500/10 border-amber-500/30">
              <div className="flex items-center gap-2 text-amber-400">
                <User className="w-5 h-5" />
                <span className="font-medium">Accedi per acquistare</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Devi effettuare l'accesso per completare l'acquisto.
              </p>
            </Card>
          )}

          <HapticButton
            onClick={handlePurchase}
            disabled={isReserving || reserveMutation.isPending}
            className="w-full h-14 text-lg font-semibold"
            hapticType="heavy"
            data-testid="button-purchase-resale"
          >
            {isReserving || reserveMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Elaborazione...
              </>
            ) : !isAuthenticated ? (
              <>
                <User className="w-5 h-5 mr-2" />
                Accedi e Acquista
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Acquista ora - €{resalePrice.toFixed(2)}
              </>
            )}
          </HapticButton>
        </motion.div>
      </main>
    </div>
  );
}
