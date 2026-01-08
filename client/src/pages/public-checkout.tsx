import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  Ticket,
  User,
  Calendar,
  MapPin,
  RotateCcw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import { cn } from "@/lib/utils";

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

const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

function CheckoutProgressIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Carrello", icon: Ticket },
    { label: "Pagamento", icon: CreditCard },
    { label: "Conferma", icon: Check },
  ];

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: isCurrent ? 1.1 : 1 }}
                transition={springConfig}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                  isCompleted ? "bg-teal-500 text-white" :
                  isCurrent ? "bg-primary text-primary-foreground" :
                  "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <StepIcon className="w-5 h-5" />
                )}
              </motion.div>
              <span className={cn(
                "text-xs mt-1.5 font-medium",
                isCurrent ? "text-primary" : 
                isCompleted ? "text-teal-500" : 
                "text-muted-foreground"
              )}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-12 h-0.5 mx-2 transition-colors",
                isCompleted ? "bg-teal-500" : "bg-muted"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: springConfig,
  },
};

function PaymentFormContent({
  checkoutSessionId,
  total,
  onProcessing,
  onError,
  onSuccess,
}: {
  checkoutSessionId: string;
  total: number;
  onProcessing: (processing: boolean) => void;
  onError: (error: string | null) => void;
  onSuccess: (transactionCode: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements || !isElementReady) {
      return;
    }

    onProcessing(true);
    onError(null);
    triggerHaptic('medium');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        onError(error.message || "Pagamento fallito. Riprova.");
        onProcessing(false);
        triggerHaptic('error');
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        try {
          const response = await apiRequest("POST", "/api/public/checkout/confirm", {
            paymentIntentId: paymentIntent.id,
            checkoutSessionId,
          });

          const result = await response.json();
          triggerHaptic('success');

          toast({
            title: "Pagamento completato!",
            description: "I tuoi biglietti sono stati generati.",
          });

          onSuccess(result.transactionCode);
        } catch (confirmError: any) {
          const errorData = confirmError.data || {};
          const errorCode = errorData.code || confirmError.code || "";
          
          if (errorData.refunded || errorCode.includes("REFUNDED")) {
            onError(confirmError.message);
            toast({
              title: "Rimborso elaborato",
              description: "L'importo ti sarà restituito entro 5-10 giorni lavorativi.",
            });
          } else if (errorCode === "SEAL_ERROR_REFUND_FAILED" || errorCode === "CRITICAL_ERROR_REFUND_FAILED") {
            onError(confirmError.message);
            toast({
              title: "Ti ricontatteremo",
              description: "Il nostro team verificherà lo stato del tuo ordine.",
              variant: "destructive",
            });
          } else if (errorCode.includes("SEAL_BRIDGE") || errorCode.includes("SEAL_CARD")) {
            onError(
              confirmError.message || "Il sistema di emissione biglietti è temporaneamente non disponibile. Ti invitiamo a riprovare tra qualche minuto."
            );
          } else {
            onError(confirmError.message || "Si è verificato un problema durante la conferma dell'ordine. Riprova tra qualche istante.");
          }
          onProcessing(false);
          triggerHaptic('error');
          return;
        }
      }
    } catch (error: any) {
      onError(error.message || "Errore durante il pagamento.");
      onProcessing(false);
      triggerHaptic('error');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-muted/30 rounded-2xl border border-border">
        <PaymentElement
          options={{
            layout: "tabs",
          }}
          onReady={() => setIsElementReady(true)}
        />
      </div>
      
      <PaymentButton 
        isReady={isElementReady && !!stripe && !!elements}
        total={total}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

function PaymentButton({ 
  isReady, 
  total,
  onSubmit,
  isProcessing = false,
}: { 
  isReady: boolean;
  total: number;
  onSubmit: () => void;
  isProcessing?: boolean;
}) {
  return null;
}

function CheckoutContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const paymentIntentCreated = useRef(false);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const [captchaData, setCaptchaData] = useState<{ token: string; svg: string; width: number; height: number; enabled: boolean } | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaValidated, setCaptchaValidated] = useState(false);

  const { data: cart, isLoading: cartLoading } = useQuery<CartData>({
    queryKey: ["/api/public/cart"],
  });

  const { data: customer, isLoading: customerLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  const { data: captchaResponse, refetch: refetchCaptcha, isLoading: captchaLoading } = useQuery({
    queryKey: ['/api/public/captcha/generate'],
    enabled: !!customer && !!cart && cart.items.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleRefreshCaptcha = () => {
    setCaptchaValidated(false);
    paymentIntentCreated.current = false;
    refetchCaptcha();
    triggerHaptic('light');
  };

  useEffect(() => {
    if (captchaResponse) {
      setCaptchaData(captchaResponse as { token: string; svg: string; width: number; height: number; enabled: boolean });
      setCaptchaInput("");
      setCaptchaError(null);
      setCaptchaValidated(false);
    }
  }, [captchaResponse]);

  const validateCaptchaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/captcha/validate", {
        token: captchaData?.token,
        text: captchaInput,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setCaptchaValidated(true);
        setCaptchaError(null);
        triggerHaptic('success');
      } else {
        setCaptchaError(data.message || "Codice non corretto");
        setCaptchaValidated(false);
        handleRefreshCaptcha();
      }
    },
    onError: (error: any) => {
      setCaptchaError(error.message || "Errore validazione");
      setCaptchaValidated(false);
      handleRefreshCaptcha();
    },
  });

  const canProceedWithPayment = !captchaData?.enabled || (captchaData?.enabled && captchaValidated);

  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/checkout/create-payment-intent", {
        captchaToken: captchaData?.token,
      });
      const data = await res.json();
      return data as PaymentIntentResponse;
    },
    onError: (error: any) => {
      const errorCode = error.data?.code || error.code || "";
      
      if (errorCode === "CAPTCHA_INVALID" || errorCode === "CAPTCHA_EXPIRED" || errorCode === "CAPTCHA_NOT_VALIDATED") {
        setCaptchaError(error.message);
        handleRefreshCaptcha();
        return;
      }
      
      if (error.message?.includes("autenticato")) {
        navigate("/login?redirect=/checkout");
      } else if (errorCode === "SEAL_BRIDGE_OFFLINE" || errorCode === "SEAL_CARD_NOT_READY") {
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
    // Crea Payment Intent solo dopo validazione CAPTCHA (backend richiede CAPTCHA valido)
    if (cart && cart.items.length > 0 && customer && !paymentIntentCreated.current && canProceedWithPayment) {
      paymentIntentCreated.current = true;
      createPaymentIntent.mutate();
    }
  }, [cart, customer, canProceedWithPayment]);

  const handlePaymentSubmit = async () => {
    if (!stripeRef.current || !elementsRef.current || !isElementReady) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);
    triggerHaptic('medium');

    try {
      const { error, paymentIntent } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`,
        },
        redirect: "if_required",
      });

      if (error) {
        setPaymentError(error.message || "Pagamento fallito. Riprova.");
        setIsProcessing(false);
        triggerHaptic('error');
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        try {
          const response = await apiRequest("POST", "/api/public/checkout/confirm", {
            paymentIntentId: paymentIntent.id,
            checkoutSessionId: createPaymentIntent.data?.checkoutSessionId,
          });

          const result = await response.json();
          triggerHaptic('success');

          toast({
            title: "Pagamento completato!",
            description: "I tuoi biglietti sono stati generati.",
          });

          navigate(`/checkout/success?transaction=${result.transactionCode}`);
        } catch (confirmError: any) {
          const errorData = confirmError.data || {};
          const errorCode = errorData.code || confirmError.code || "";
          
          if (errorData.refunded || errorCode.includes("REFUNDED")) {
            setPaymentError(confirmError.message);
            toast({
              title: "Rimborso elaborato",
              description: "L'importo ti sarà restituito entro 5-10 giorni lavorativi.",
            });
          } else if (errorCode === "SEAL_ERROR_REFUND_FAILED" || errorCode === "CRITICAL_ERROR_REFUND_FAILED") {
            setPaymentError(confirmError.message);
            toast({
              title: "Ti ricontatteremo",
              description: "Il nostro team verificherà lo stato del tuo ordine.",
              variant: "destructive",
            });
          } else if (errorCode.includes("SEAL_BRIDGE") || errorCode.includes("SEAL_CARD")) {
            setPaymentError(
              confirmError.message || "Il sistema di emissione biglietti è temporaneamente non disponibile."
            );
          } else {
            setPaymentError(confirmError.message || "Si è verificato un problema. Riprova.");
          }
          setIsProcessing(false);
          triggerHaptic('error');
          return;
        }
      }
    } catch (error: any) {
      setPaymentError(error.message || "Errore durante il pagamento.");
      setIsProcessing(false);
      triggerHaptic('error');
    }
  };

  if (cartLoading || customerLoading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springConfig}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6"
        >
          <User className="w-10 h-10 text-primary" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Accesso Richiesto</h3>
        <p className="text-muted-foreground mb-8">
          Per completare l'acquisto devi accedere al tuo account o registrarti.
        </p>
        <Link href="/login?redirect=/checkout">
          <HapticButton 
            className="h-14 px-8 text-base"
            hapticType="medium"
            data-testid="button-login"
          >
            Accedi o Registrati
          </HapticButton>
        </Link>
      </motion.div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={springConfig}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6"
        >
          <Ticket className="w-10 h-10 text-muted-foreground" />
        </motion.div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Carrello Vuoto</h3>
        <p className="text-muted-foreground mb-8">Aggiungi biglietti al carrello per procedere.</p>
        <Link href="/acquista">
          <HapticButton 
            className="h-14 px-8 text-base"
            hapticType="medium"
            data-testid="button-browse"
          >
            Sfoglia Eventi
          </HapticButton>
        </Link>
      </motion.div>
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
            borderRadius: "12px",
            spacingUnit: "4px",
          },
          rules: {
            '.Input': {
              padding: '16px',
              fontSize: '16px',
            },
            '.Tab': {
              padding: '14px 16px',
            },
          },
        },
      }
    : null;

  return (
    <>
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4 pb-32"
      >
        <motion.div variants={fadeInUp}>
          <CheckoutProgressIndicator currentStep={1} />
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              Riepilogo Ordine
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {cart.items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springConfig, delay: index * 0.05 }}
                className="flex gap-3 py-3 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{item.eventName}</p>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{format(new Date(item.eventStart), "d MMM, HH:mm", { locale: it })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{item.sectorName}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {item.quantity}
                  </div>
                  <p className="text-primary font-semibold mt-1">
                    €{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </motion.div>
            ))}
            
            <div className="pt-2 space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Subtotale</span>
                <span>€{cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Commissioni</span>
                <span className="text-teal-400">Gratuite</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-lg font-semibold text-foreground">Totale</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-total">
                  €{cart.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-teal-400" />
              Dati Acquirente
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Nome</Label>
                <p className="text-foreground font-medium" data-testid="text-firstname">{customer.firstName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Cognome</Label>
                <p className="text-foreground font-medium" data-testid="text-lastname">{customer.lastName}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-foreground font-medium truncate" data-testid="text-email">{customer.email}</p>
              </div>
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs">Telefono</Label>
                <p className="text-foreground font-medium" data-testid="text-phone">{customer.phone}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {captchaData?.enabled && (
          <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Verifica di Sicurezza
                {captchaValidated && <Check className="w-4 h-4 text-teal-400 ml-auto" />}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="bg-white rounded-lg p-2 border flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: captchaData.svg }}
                  data-testid="captcha-image"
                />
                <HapticButton 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefreshCaptcha}
                  disabled={captchaLoading || validateCaptchaMutation.isPending}
                  hapticType="light"
                  data-testid="button-refresh-captcha"
                >
                  <RotateCcw className={cn("w-4 h-4", captchaLoading && "animate-spin")} />
                </HapticButton>
              </div>
              {!captchaValidated ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Inserisci il codice mostrato nell'immagine</Label>
                    <Input
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value.toUpperCase());
                        setCaptchaError(null);
                      }}
                      placeholder="Codice CAPTCHA"
                      className="uppercase tracking-widest font-mono"
                      maxLength={8}
                      disabled={validateCaptchaMutation.isPending}
                      data-testid="input-captcha"
                    />
                    {captchaError && (
                      <p className="text-sm text-destructive mt-1" data-testid="text-captcha-error">{captchaError}</p>
                    )}
                  </div>
                  <HapticButton
                    onClick={() => validateCaptchaMutation.mutate()}
                    disabled={captchaInput.length < 4 || validateCaptchaMutation.isPending}
                    className="w-full h-12"
                    hapticType="medium"
                    data-testid="button-verify-captcha"
                  >
                    {validateCaptchaMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifica in corso...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Verifica Codice
                      </>
                    )}
                  </HapticButton>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-teal-400 py-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Verifica completata</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-400" />
              Metodo di Pagamento
            </h2>
          </div>
          <div className="p-4">
            {!canProceedWithPayment && captchaData?.enabled ? (
              <div className="flex flex-col items-center justify-center py-12 opacity-60">
                <Lock className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">Completa la verifica CAPTCHA per sbloccare il pagamento</p>
              </div>
            ) : (createPaymentIntent.isPending || (!createPaymentIntent.data && !createPaymentIntent.isError)) ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Preparazione pagamento...</p>
              </div>
            ) : createPaymentIntent.data && elementsOptions && stripePromise ? (
              <Elements 
                stripe={stripePromise} 
                options={elementsOptions}
              >
                <PaymentElementWrapper
                  onReady={() => setIsElementReady(true)}
                  onStripeReady={(stripe) => { stripeRef.current = stripe; }}
                  onElementsReady={(elements) => { elementsRef.current = elements; }}
                />
              </Elements>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                <p className="text-red-400 mb-4">Errore nel caricamento del modulo di pagamento.</p>
                <HapticButton
                  onClick={() => createPaymentIntent.mutate()}
                  variant="outline"
                  className="h-12"
                  hapticType="medium"
                >
                  Riprova
                </HapticButton>
              </div>
            )}
          </div>
        </motion.div>

        {paymentError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springConfig}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{paymentError}</p>
          </motion.div>
        )}

        <motion.div variants={fadeInUp} className="space-y-3 pt-2">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <span className="text-sm">Biglietti digitali immediati via email</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <span className="text-sm">Garanzia di rimborso per eventi annullati</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
            <span className="text-sm">Assistenza clienti 24/7</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={springConfig}
        className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs text-muted-foreground">Totale da pagare</p>
              <p className="text-2xl font-bold text-primary">€{cart.total.toFixed(2)}</p>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-xs">Pagamento sicuro</span>
            </div>
          </div>
          
          <HapticButton
            onClick={handlePaymentSubmit}
            disabled={!isElementReady || isProcessing || !stripeRef.current || !canProceedWithPayment}
            className="w-full h-14 text-lg font-semibold"
            hapticType="heavy"
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
            ) : !canProceedWithPayment ? (
              <>
                <ShieldCheck className="w-5 h-5 mr-2" />
                Completa verifica CAPTCHA
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 mr-2" />
                Paga €{cart.total.toFixed(2)}
              </>
            )}
          </HapticButton>
        </div>
      </motion.div>
    </>
  );
}

function PaymentElementWrapper({
  onReady,
  onStripeReady,
  onElementsReady,
}: {
  onReady: () => void;
  onStripeReady: (stripe: any) => void;
  onElementsReady: (elements: any) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();

  useEffect(() => {
    if (stripe) {
      onStripeReady(stripe);
    }
  }, [stripe, onStripeReady]);

  useEffect(() => {
    if (elements) {
      onElementsReady(elements);
    }
  }, [elements, onElementsReady]);

  return (
    <div className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
        onReady={onReady}
      />
    </div>
  );
}

function DesktopCheckoutContent() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const paymentIntentCreated = useRef(false);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const [captchaData, setCaptchaData] = useState<{ token: string; svg: string; width: number; height: number; enabled: boolean } | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaValidated, setCaptchaValidated] = useState(false);

  const { data: cart, isLoading: cartLoading } = useQuery<CartData>({
    queryKey: ["/api/public/cart"],
  });

  const { data: customer, isLoading: customerLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  const { data: captchaResponse, refetch: refetchCaptcha, isLoading: captchaLoading } = useQuery({
    queryKey: ['/api/public/captcha/generate'],
    enabled: !!customer && !!cart && cart.items.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleRefreshCaptcha = () => {
    setCaptchaValidated(false);
    paymentIntentCreated.current = false;
    refetchCaptcha();
  };

  useEffect(() => {
    if (captchaResponse) {
      setCaptchaData(captchaResponse as { token: string; svg: string; width: number; height: number; enabled: boolean });
      setCaptchaInput("");
      setCaptchaError(null);
      setCaptchaValidated(false);
    }
  }, [captchaResponse]);

  const validateCaptchaMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/captcha/validate", {
        token: captchaData?.token,
        text: captchaInput,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setCaptchaValidated(true);
        setCaptchaError(null);
      } else {
        setCaptchaError(data.message || "Codice non corretto");
        setCaptchaValidated(false);
        handleRefreshCaptcha();
      }
    },
    onError: (error: any) => {
      setCaptchaError(error.message || "Errore validazione");
      setCaptchaValidated(false);
      handleRefreshCaptcha();
    },
  });

  const canProceedWithPayment = !captchaData?.enabled || (captchaData?.enabled && captchaValidated);

  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/public/checkout/create-payment-intent", {
        captchaToken: captchaData?.token,
      });
      const data = await res.json();
      return data as PaymentIntentResponse;
    },
    onError: (error: any) => {
      const errorCode = error.data?.code || error.code || "";
      
      if (errorCode === "CAPTCHA_INVALID" || errorCode === "CAPTCHA_EXPIRED" || errorCode === "CAPTCHA_NOT_VALIDATED") {
        setCaptchaError(error.message);
        handleRefreshCaptcha();
        return;
      }
      
      if (error.message?.includes("autenticato")) {
        navigate("/login?redirect=/checkout");
      } else if (errorCode === "SEAL_BRIDGE_OFFLINE" || errorCode === "SEAL_CARD_NOT_READY") {
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
    // Crea Payment Intent solo dopo validazione CAPTCHA (backend richiede CAPTCHA valido)
    if (cart && cart.items.length > 0 && customer && !paymentIntentCreated.current && canProceedWithPayment) {
      paymentIntentCreated.current = true;
      createPaymentIntent.mutate();
    }
  }, [cart, customer, canProceedWithPayment]);

  const handlePaymentSubmit = async () => {
    if (!stripeRef.current || !elementsRef.current || !isElementReady) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const { error, paymentIntent } = await stripeRef.current.confirmPayment({
        elements: elementsRef.current,
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
            checkoutSessionId: createPaymentIntent.data?.checkoutSessionId,
          });

          const result = await response.json();

          toast({
            title: "Pagamento completato!",
            description: "I tuoi biglietti sono stati generati.",
          });

          navigate(`/checkout/success?transaction=${result.transactionCode}`);
        } catch (confirmError: any) {
          const errorData = confirmError.data || {};
          const errorCode = errorData.code || confirmError.code || "";
          
          if (errorData.refunded || errorCode.includes("REFUNDED")) {
            setPaymentError(confirmError.message);
            toast({
              title: "Rimborso elaborato",
              description: "L'importo ti sarà restituito entro 5-10 giorni lavorativi.",
            });
          } else if (errorCode === "SEAL_ERROR_REFUND_FAILED" || errorCode === "CRITICAL_ERROR_REFUND_FAILED") {
            setPaymentError(confirmError.message);
            toast({
              title: "Ti ricontatteremo",
              description: "Il nostro team verificherà lo stato del tuo ordine.",
              variant: "destructive",
            });
          } else if (errorCode.includes("SEAL_BRIDGE") || errorCode.includes("SEAL_CARD")) {
            setPaymentError(
              confirmError.message || "Il sistema di emissione biglietti è temporaneamente non disponibile."
            );
          } else {
            setPaymentError(confirmError.message || "Si è verificato un problema. Riprova.");
          }
          setIsProcessing(false);
          return;
        }
      }
    } catch (error: any) {
      setPaymentError(error.message || "Errore durante il pagamento.");
      setIsProcessing(false);
    }
  };

  if (cartLoading || customerLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-64 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Accesso Richiesto</h3>
            <p className="text-muted-foreground mb-6">
              Per completare l'acquisto devi accedere al tuo account o registrarti.
            </p>
            <Link href="/login?redirect=/checkout">
              <Button data-testid="button-login-desktop">
                Accedi o Registrati
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">Carrello Vuoto</h3>
            <p className="text-muted-foreground mb-6">Aggiungi biglietti al carrello per procedere.</p>
            <Link href="/acquista">
              <Button data-testid="button-browse-desktop">
                Sfoglia Eventi
              </Button>
            </Link>
          </div>
        </CardContent>
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
            spacingUnit: "4px",
          },
          rules: {
            '.Input': {
              padding: '12px',
              fontSize: '14px',
            },
            '.Tab': {
              padding: '12px 14px',
            },
          },
        },
      }
    : null;

  return (
    <div className="space-y-6">
      <CheckoutProgressIndicator currentStep={1} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Riepilogo Ordine
              </CardTitle>
            </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Settore</TableHead>
                  <TableHead className="text-center">Qtà</TableHead>
                  <TableHead className="text-right">Prezzo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cart.items.map((item) => (
                  <TableRow key={item.id} data-testid={`row-cart-item-${item.id}`}>
                    <TableCell className="font-medium">{item.eventName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {format(new Date(item.eventStart), "d MMM, HH:mm", { locale: it })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {item.sectorName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      €{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-teal-400" />
              Dati Acquirente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Nome</Label>
                <p className="text-foreground font-medium" data-testid="text-firstname-desktop">{customer.firstName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Cognome</Label>
                <p className="text-foreground font-medium" data-testid="text-lastname-desktop">{customer.lastName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Email</Label>
                <p className="text-foreground font-medium" data-testid="text-email-desktop">{customer.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Telefono</Label>
                <p className="text-foreground font-medium" data-testid="text-phone-desktop">{customer.phone}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {captchaData?.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" />
                Verifica di Sicurezza
                {captchaValidated && <Check className="w-4 h-4 text-teal-400 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div 
                  className="bg-white rounded-lg p-2 border flex-shrink-0"
                  dangerouslySetInnerHTML={{ __html: captchaData.svg }}
                  data-testid="captcha-image-desktop"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleRefreshCaptcha}
                  disabled={captchaLoading || validateCaptchaMutation.isPending}
                  data-testid="button-refresh-captcha-desktop"
                >
                  <RotateCcw className={cn("w-4 h-4", captchaLoading && "animate-spin")} />
                </Button>
              </div>
              {!captchaValidated ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label>Inserisci il codice mostrato nell'immagine</Label>
                    <Input
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value.toUpperCase());
                        setCaptchaError(null);
                      }}
                      placeholder="Codice CAPTCHA"
                      className="uppercase tracking-widest font-mono"
                      maxLength={8}
                      disabled={validateCaptchaMutation.isPending}
                      data-testid="input-captcha-desktop"
                    />
                    {captchaError && (
                      <p className="text-sm text-destructive mt-1" data-testid="text-captcha-error-desktop">{captchaError}</p>
                    )}
                  </div>
                  <Button
                    onClick={() => validateCaptchaMutation.mutate()}
                    disabled={captchaInput.length < 4 || validateCaptchaMutation.isPending}
                    className="w-full"
                    data-testid="button-verify-captcha-desktop"
                  >
                    {validateCaptchaMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifica in corso...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        Verifica Codice
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-teal-400 py-2">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Verifica completata</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-400" />
              Metodo di Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!canProceedWithPayment && captchaData?.enabled ? (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <Lock className="w-8 h-8 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">Completa la verifica CAPTCHA per sbloccare il pagamento</p>
              </div>
            ) : (createPaymentIntent.isPending || (!createPaymentIntent.data && !createPaymentIntent.isError)) ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                <p className="text-muted-foreground">Preparazione pagamento...</p>
              </div>
            ) : createPaymentIntent.data && elementsOptions && stripePromise ? (
              <Elements 
                stripe={stripePromise} 
                options={elementsOptions}
              >
                <PaymentElementWrapper
                  onReady={() => setIsElementReady(true)}
                  onStripeReady={(stripe) => { stripeRef.current = stripe; }}
                  onElementsReady={(elements) => { elementsRef.current = elements; }}
                />
              </Elements>
            ) : (
              <div className="text-center py-6">
                <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
                <p className="text-red-400 mb-4">Errore nel caricamento del modulo di pagamento.</p>
                <Button
                  onClick={() => createPaymentIntent.mutate()}
                  variant="outline"
                  data-testid="button-retry-desktop"
                >
                  Riprova
                </Button>
              </div>
            )}

            {paymentError && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{paymentError}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Riepilogo Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Subtotale ({cart.itemsCount} biglietti)</span>
                <span>€{cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>Commissioni</span>
                <span className="text-teal-400">Gratuite</span>
              </div>
              <div className="h-px bg-border my-3" />
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Totale</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-total-desktop">
                  €{cart.total.toFixed(2)}
                </span>
              </div>
            </div>

            <Button
              onClick={handlePaymentSubmit}
              disabled={!isElementReady || isProcessing || !stripeRef.current || !canProceedWithPayment}
              className="w-full"
              size="lg"
              data-testid="button-pay-desktop"
            >
              {!isElementReady ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Caricamento...
                </>
              ) : isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : !canProceedWithPayment ? (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Completa verifica CAPTCHA
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Paga €{cart.total.toFixed(2)}
                </>
              )}
            </Button>

            <div className="space-y-2 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Biglietti digitali immediati via email</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Garanzia di rimborso per eventi annullati</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Check className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Assistenza clienti 24/7</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
              <Lock className="w-4 h-4" />
              <span className="text-xs">Pagamento sicuro crittografato</span>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}

export default function PublicCheckoutPage() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  if (!isMobile) {
    return (
      <div className="container mx-auto px-6 py-8" data-testid="page-checkout-desktop">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/carrello')}
            data-testid="button-back-desktop"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Checkout</h1>
            <p className="text-muted-foreground text-sm">Completa il tuo acquisto</p>
          </div>
        </div>
        <DesktopCheckoutContent />
      </div>
    );
  }

  const header = (
    <MobileHeader
      title="Checkout"
      leftAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={() => navigate('/carrello')}
          className="rounded-full"
          hapticType="light"
          data-testid="button-back"
        >
          <ChevronLeft className="w-6 h-6" />
        </HapticButton>
      }
      rightAction={
        <div className="flex items-center gap-1 text-muted-foreground">
          <Lock className="w-4 h-4" />
        </div>
      }
    />
  );

  return (
    <MobileAppLayout
      header={header}
      className="bg-background"
    >
      <div className="py-4">
        <CheckoutContent />
      </div>
    </MobileAppLayout>
  );
}
