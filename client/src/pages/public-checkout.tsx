import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  loadStripe,
  StripeElementsOptions,
} from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  ChevronLeft,
  CreditCard,
  Lock,
  Sparkles,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  Calendar,
  Ticket,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

interface CartItem {
  id: string;
  ticketedEventId: string;
  sectorId: string;
  quantity: number;
  ticketType: string;
  unitPrice: string;
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

interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface PaymentIntentResponse {
  clientSecret: string;
  checkoutSessionId: string;
  total: number;
}

let stripePromise: Promise<any> | null = null;

async function getStripe() {
  if (!stripePromise) {
    const response = await fetch("/api/public/stripe-key");
    const { publishableKey } = await response.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function CheckoutForm({
  clientSecret,
  checkoutSessionId,
  total,
}: {
  clientSecret: string;
  checkoutSessionId: string;
  total: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !isElementReady) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setPaymentError(error.message || "Pagamento fallito. Riprova.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        try {
          const response = await apiRequest("POST", "/api/public/checkout/confirm", {
            paymentIntentId: paymentIntent.id,
            checkoutSessionId,
          });

          const result = await response.json();

          toast({
            title: "Pagamento completato!",
            description: "I tuoi biglietti sono stati generati.",
          });

          navigate(`/checkout/success?transaction=${result.transactionCode}`);
        } catch (confirmError: any) {
          // Gestione specifica degli errori di conferma/sigillo fiscale
          const errorData = confirmError.data || {};
          const errorCode = errorData.code || confirmError.code || "";
          
          if (errorData.refunded || errorCode.includes("REFUNDED")) {
            // Pagamento stornato automaticamente
            setPaymentError(confirmError.message);
            toast({
              title: "Rimborso elaborato",
              description: "L'importo ti sarà restituito entro 5-10 giorni lavorativi.",
            });
          } else if (errorCode === "SEAL_ERROR_REFUND_FAILED" || errorCode === "CRITICAL_ERROR_REFUND_FAILED") {
            // Errore critico - storno fallito
            setPaymentError(confirmError.message);
            toast({
              title: "Ti ricontatteremo",
              description: "Il nostro team verificherà lo stato del tuo ordine.",
              variant: "destructive",
            });
          } else if (errorCode.includes("SEAL_BRIDGE") || errorCode.includes("SEAL_CARD")) {
            // Sistema sigilli non disponibile (senza storno - non dovrebbe accadere)
            setPaymentError(
              confirmError.message || "Il sistema di emissione biglietti è temporaneamente non disponibile. Ti invitiamo a riprovare tra qualche minuto."
            );
          } else {
            // Errore generico
            setPaymentError(confirmError.message || "Si è verificato un problema durante la conferma dell'ordine. Riprova tra qualche istante.");
          }
          setIsProcessing(false);
          return;
        }
      }
    } catch (error: any) {
      // Errore nel pagamento Stripe stesso
      setPaymentError(error.message || "Errore durante il pagamento.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-xl">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
          onReady={() => setIsElementReady(true)}
        />
      </div>

      {paymentError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{paymentError}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || !isElementReady || isProcessing}
        className="w-full h-14 text-lg"
        data-testid="button-pay"
      >
        {!isElementReady ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Caricamento...
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Elaborazione...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Paga €{total.toFixed(2)}
          </>
        )}
      </Button>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="w-4 h-4" />
        <span>Pagamento sicuro e crittografato</span>
      </div>
    </form>
  );
}

function CheckoutContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const paymentIntentCreated = useRef(false);

  const { data: cart, isLoading: cartLoading } = useQuery<CartData>({
    queryKey: ["/api/public/cart"],
  });

  const { data: customer, isLoading: customerLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      console.log("[Checkout] Creating payment intent...");
      const res = await apiRequest("POST", "/api/public/checkout/create-payment-intent");
      console.log("[Checkout] Response status:", res.status);
      const data = await res.json();
      console.log("[Checkout] Response data:", data);
      return data as PaymentIntentResponse;
    },
    onSuccess: (data) => {
      console.log("[Checkout] Payment intent created successfully:", data);
    },
    onError: (error: any) => {
      console.log("[Checkout] Payment intent error:", error);
      const errorCode = error.data?.code || error.code || "";
      
      if (error.message?.includes("autenticato")) {
        navigate("/login?redirect=/checkout");
      } else if (errorCode === "SEAL_BRIDGE_OFFLINE" || errorCode === "SEAL_CARD_NOT_READY") {
        // Sistema sigilli non disponibile - errore specifico
        toast({
          title: "Sistema non disponibile",
          description: error.message || "Il sistema di emissione biglietti è temporaneamente non disponibile. Riprova tra qualche minuto.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Errore",
          description: error.message || "Impossibile avviare il pagamento.",
          variant: "destructive",
        });
      }
    },
  });

  useEffect(() => {
    getStripe().then(setStripePromise);
  }, []);

  useEffect(() => {
    if (cart && cart.items.length > 0 && customer && !paymentIntentCreated.current) {
      paymentIntentCreated.current = true;
      createPaymentIntent.mutate();
    }
  }, [cart, customer]);

  console.log("[Checkout] cartLoading:", cartLoading, "customerLoading:", customerLoading, "cart:", cart, "customer:", customer);

  if (cartLoading || customerLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40" />
        <Skeleton className="h-60" />
      </div>
    );
  }

  if (!customer) {
    return (
      <Card className="p-8 text-center bg-primary/10 border-primary/20">
        <User className="w-16 h-16 mx-auto mb-4 text-primary" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Accesso Richiesto</h3>
        <p className="text-muted-foreground mb-6">
          Per completare l'acquisto devi accedere al tuo account o registrarti.
        </p>
        <Link href="/accedi?redirect=/checkout">
          <Button data-testid="button-login">
            Accedi o Registrati
          </Button>
        </Link>
      </Card>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="p-8 text-center bg-muted/50 border-border">
        <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Carrello Vuoto</h3>
        <p className="text-muted-foreground mb-6">Aggiungi biglietti al carrello per procedere al pagamento.</p>
        <Link href="/acquista">
          <Button data-testid="button-browse">
            Sfoglia Eventi
          </Button>
        </Link>
      </Card>
    );
  }

  const elementsOptions: StripeElementsOptions | null = createPaymentIntent.data
    ? {
        clientSecret: createPaymentIntent.data.clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#FFD700",
            colorBackground: "#151922",
            colorText: "#FFFFFF",
            colorDanger: "#EF4444",
            fontFamily: "Inter, system-ui, sans-serif",
            borderRadius: "8px",
          },
        },
      }
    : null;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-teal-400" />
              Dati Acquirente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Nome</Label>
                <p className="text-foreground font-medium" data-testid="text-firstname">{customer.firstName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Cognome</Label>
                <p className="text-foreground font-medium" data-testid="text-lastname">{customer.lastName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-foreground font-medium" data-testid="text-email">{customer.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Telefono</Label>
                <p className="text-foreground font-medium" data-testid="text-phone">{customer.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-400" />
              Metodo di Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {(createPaymentIntent.isPending || (!createPaymentIntent.data && !createPaymentIntent.isError)) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : createPaymentIntent.data && elementsOptions && stripePromise ? (
              <Elements stripe={stripePromise} options={elementsOptions}>
                <CheckoutForm
                  clientSecret={createPaymentIntent.data.clientSecret}
                  checkoutSessionId={createPaymentIntent.data.checkoutSessionId}
                  total={createPaymentIntent.data.total}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <p className="text-red-400">Errore nel caricamento del modulo di pagamento.</p>
                <Button
                  onClick={() => createPaymentIntent.mutate()}
                  variant="outline"
                  className="mt-4 border-border text-foreground"
                >
                  Riprova
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <Card className="bg-card border-border sticky top-24">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-card-foreground">Riepilogo Ordine</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-start py-3 border-b border-border last:border-0"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{item.eventName}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.sectorName} - {item.ticketType === "intero" ? "Intero" : "Ridotto"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(item.eventStart), "d MMM yyyy, HH:mm", { locale: it })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">x{item.quantity}</p>
                  <p className="text-sm text-primary">
                    €{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}

            <div className="pt-4 space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotale</span>
                <span>€{cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Commissioni</span>
                <span className="text-teal-400">Gratuite</span>
              </div>
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

            <div className="pt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400" />
                <span>Biglietti digitali immediati via email</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400" />
                <span>Garanzia di rimborso per eventi annullati</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-teal-400" />
                <span>Assistenza clienti 24/7</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PublicCheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/carrello">
              <Button variant="ghost" className="text-foreground" data-testid="button-back">
                <ChevronLeft className="w-4 h-4 mr-1" /> Carrello
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Checkout Sicuro</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="text-page-title">
            <CreditCard className="w-8 h-8 text-primary" />
            Checkout
          </h1>
          <p className="text-muted-foreground mt-2">Completa il pagamento per ricevere i tuoi biglietti</p>
        </motion.div>

        <CheckoutContent />
      </main>
    </div>
  );
}
