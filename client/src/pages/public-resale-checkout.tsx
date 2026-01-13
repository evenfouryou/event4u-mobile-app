import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  MobileAppLayout, 
  MobileHeader, 
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import { cn } from "@/lib/utils";
import { 
  RefreshCw, 
  Calendar, 
  MapPin, 
  User, 
  ChevronLeft,
  Ticket,
  ShieldCheck,
  Loader2,
  AlertCircle,
  Lock,
  Check,
  RotateCcw,
  CreditCard,
} from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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

interface CustomerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface PaymentIntentResponse {
  clientSecret: string;
  resaleId: string;
  resalePrice: number;
  platformFee: number;
  confirmToken: string;
}

const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

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

let stripePromiseCache: Promise<any> | null = null;

async function getStripe() {
  if (!stripePromiseCache) {
    const res = await fetch("/api/stripe/config");
    const { publishableKey } = await res.json();
    stripePromiseCache = loadStripe(publishableKey);
  }
  return stripePromiseCache;
}

function ResaleProgressIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { label: "Dettagli", icon: Ticket },
    { label: "Verifica", icon: ShieldCheck },
    { label: "Pagamento", icon: CreditCard },
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

export default function PublicResaleCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [captchaData, setCaptchaData] = useState<{ token: string; svg: string; width: number; height: number; enabled: boolean } | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaValidated, setCaptchaValidated] = useState(false);
  
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null);
  const [isElementReady, setIsElementReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const paymentIntentCreated = useRef(false);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);

  const { data: resale, isLoading: resaleLoading, error: resaleError } = useQuery<ResaleDetail>({
    queryKey: [`/api/public/resales/${id}`],
    enabled: !!id,
  });

  const { data: customer, isLoading: customerLoading } = useQuery<CustomerProfile>({
    queryKey: ["/api/public/customers/me"],
    retry: false,
  });

  const { data: captchaResponse, refetch: refetchCaptcha, isLoading: captchaLoading } = useQuery({
    queryKey: ['/api/public/captcha/generate'],
    enabled: !!customer && !!resale && (resale.status === 'listed' || resale.status === 'reserved'),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleRefreshCaptcha = () => {
    setCaptchaValidated(false);
    setCaptchaInput("");
    setCaptchaError(null);
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

  useEffect(() => {
    getStripe().then(setStripePromise);
  }, []);

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
        // Directly trigger payment intent creation after successful CAPTCHA validation
        if (resale && customer && !paymentIntentCreated.current && (resale.status === 'listed' || resale.status === 'reserved')) {
          paymentIntentCreated.current = true;
          createPaymentIntent.mutate();
        }
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

  // Can proceed only when: CAPTCHA is loaded AND (disabled OR validated)
  const canProceedWithPayment = captchaData !== null && (captchaData.enabled === false || captchaValidated);

  const createPaymentIntent = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/resales/${id}/payment-intent`, {
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
      
      if (error.message?.includes("autenticato") || error.message?.includes("loggato")) {
        navigate(`/login?redirect=/rivendita/${id}`);
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
    if (resale && customer && !paymentIntentCreated.current && canProceedWithPayment && (resale.status === 'listed' || resale.status === 'reserved')) {
      paymentIntentCreated.current = true;
      createPaymentIntent.mutate();
    }
  }, [resale, customer, canProceedWithPayment, captchaValidated]);

  const elementsOptions = createPaymentIntent.data?.clientSecret ? {
    clientSecret: createPaymentIntent.data.clientSecret,
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#0ea5e9',
        colorBackground: 'hsl(var(--background))',
        colorText: 'hsl(var(--foreground))',
        colorDanger: 'hsl(var(--destructive))',
        fontFamily: 'system-ui, sans-serif',
        borderRadius: '12px',
        spacingUnit: '4px',
      },
      rules: {
        '.Input': {
          backgroundColor: 'hsl(var(--muted))',
          border: '1px solid hsl(var(--border))',
          padding: '14px',
        },
        '.Input:focus': {
          borderColor: 'hsl(var(--primary))',
          boxShadow: '0 0 0 2px hsl(var(--primary) / 0.2)',
        },
        '.Label': {
          fontWeight: '500',
          marginBottom: '8px',
        },
        '.Tab': {
          backgroundColor: 'hsl(var(--muted))',
          border: '1px solid hsl(var(--border))',
        },
        '.Tab--selected': {
          backgroundColor: 'hsl(var(--background))',
          borderColor: 'hsl(var(--primary))',
        },
      },
    },
  } : null;

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
          return_url: `${window.location.origin}/account/resale-success?resale_id=${id}&token=${createPaymentIntent.data?.confirmToken}`,
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
          const response = await apiRequest("POST", `/api/public/resales/${id}/confirm`, {
            token: createPaymentIntent.data?.confirmToken,
          });

          const result = await response.json();

          triggerHaptic('success');
          toast({
            title: "Acquisto completato!",
            description: "Il biglietto è stato trasferito al tuo account.",
          });

          navigate(`/account/resale-success?resale_id=${id}&success=true`);
        } catch (confirmError: any) {
          setPaymentError(confirmError.message || "Si è verificato un problema. Riprova.");
          toast({
            title: "Errore",
            description: confirmError.message || "Errore nella conferma acquisto",
            variant: "destructive",
          });
          setIsProcessing(false);
          return;
        }
      }
    } catch (error: any) {
      setPaymentError(error.message || "Errore durante il pagamento.");
      setIsProcessing(false);
    }
  };

  const resalePrice = resale ? parseFloat(resale.resalePrice) : 0;
  const platformFee = createPaymentIntent.data?.platformFee ?? Math.round(resalePrice * 5) / 100;
  const currentStep = !canProceedWithPayment ? 1 : 2;

  if (resaleLoading || customerLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Skeleton className="w-20 h-8" />
            <Skeleton className="w-24 h-8" />
            <Skeleton className="w-8 h-8 rounded-full" />
          </div>
        </header>
        <main className="container mx-auto px-4 py-6 max-w-lg space-y-4">
          <Skeleton className="h-16 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </main>
      </div>
    );
  }

  if (resaleError || !resale) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6"
          >
            <AlertCircle className="w-10 h-10 text-red-400" />
          </motion.div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Rivendita non disponibile</h3>
          <p className="text-muted-foreground mb-8">
            Questo biglietto potrebbe essere stato già acquistato o non è più in vendita.
          </p>
          <Link href="/rivendite">
            <HapticButton 
              className="h-14 px-8 text-base"
              hapticType="medium"
              data-testid="button-back-to-resales"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Torna alle rivendite
            </HapticButton>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (resale.status !== 'listed' && resale.status !== 'reserved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
            className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6"
          >
            <AlertCircle className="w-10 h-10 text-amber-400" />
          </motion.div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Biglietto non più disponibile</h3>
          <p className="text-muted-foreground mb-8">
            Questo biglietto è stato già acquistato da un altro utente.
          </p>
          <Link href="/rivendite">
            <HapticButton 
              className="h-14 px-8 text-base"
              hapticType="medium"
              data-testid="button-back-to-resales"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Torna alle rivendite
            </HapticButton>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="flex flex-col items-center justify-center p-8 text-center max-w-md"
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
            Per acquistare questo biglietto devi accedere al tuo account o registrarti.
          </p>
          <Link href={`/login?redirect=/rivendita/${id}`}>
            <HapticButton 
              className="h-14 px-8 text-base"
              hapticType="medium"
              data-testid="button-login"
            >
              <User className="w-4 h-4 mr-2" />
              Accedi o Registrati
            </HapticButton>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/rivendite">
            <Button variant="ghost" size="icon" className="shrink-0" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1 flex justify-center">
            <BrandLogo className="h-8" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-lg">
        <ResaleProgressIndicator currentStep={currentStep} />
        
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-4 mt-4"
        >
          <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="relative">
              {resale.eventImageUrl ? (
                <img
                  src={resale.eventImageUrl}
                  alt={resale.eventName}
                  className="w-full h-36 object-cover"
                />
              ) : (
                <div className="w-full h-36 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Ticket className="w-12 h-12 text-primary/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <Badge variant="secondary" className="mb-2 bg-teal-500/90 text-white border-0">
                  Biglietto in Rivendita
                </Badge>
                <h1 className="text-lg font-bold text-white line-clamp-2">
                  {resale.eventName}
                </h1>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span>{format(new Date(resale.eventStart), "EEEE d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span>{resale.locationName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ticket className="w-4 h-4 text-primary" />
                <span>{resale.sectorName} - {resale.ticketType}</span>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-teal-400" />
                Riepilogo Acquisto
              </h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Prezzo biglietto</span>
                <span className="font-medium">€{resalePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Commissioni piattaforma</span>
                <span className="text-teal-400">Incluse</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-lg font-semibold text-foreground">Totale</span>
                <span className="text-2xl font-bold text-primary" data-testid="text-total">
                  €{resalePrice.toFixed(2)}
                </span>
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
                <div className="flex items-center gap-3 flex-wrap">
                  <div 
                    className="bg-white rounded-lg p-2 border max-w-[200px] w-full overflow-hidden [&_svg]:w-full [&_svg]:h-auto"
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-400">Completa la verifica CAPTCHA per inserire i dati della carta</p>
                  </div>
                  <div className="relative opacity-50 pointer-events-none">
                    <div className="p-4 bg-muted/30 rounded-2xl border border-border space-y-4">
                      <div className="space-y-2">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                        <div className="h-12 bg-muted rounded-lg animate-pulse" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                          <div className="h-12 bg-muted rounded-lg animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                          <div className="h-12 bg-muted rounded-lg animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-background/80 backdrop-blur-sm rounded-lg px-4 py-2 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Completa prima la verifica</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : createPaymentIntent.isError ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                  <p className="text-red-400 mb-2 font-semibold">
                    {(createPaymentIntent.error as any)?.data?.code === 'SEAL_BRIDGE_OFFLINE' || 
                     (createPaymentIntent.error as any)?.data?.code === 'SEAL_CARD_NOT_READY'
                      ? "Sistema fiscale non disponibile"
                      : "Errore nel caricamento del pagamento"}
                  </p>
                  <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
                    {(createPaymentIntent.error as any)?.message || 
                     "Si è verificato un errore. Riprova tra qualche istante."}
                  </p>
                  <HapticButton
                    onClick={() => {
                      paymentIntentCreated.current = false;
                      createPaymentIntent.mutate();
                    }}
                    variant="outline"
                    className="h-12"
                    hapticType="medium"
                  >
                    Riprova
                  </HapticButton>
                </div>
              ) : createPaymentIntent.isPending || validateCaptchaMutation.isPending ? (
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
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                  <p className="text-muted-foreground">Preparazione pagamento...</p>
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
              <span className="text-sm">Biglietto verificato e garantito</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
              <span className="text-sm">Trasferimento immediato dopo il pagamento</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Check className="w-5 h-5 text-teal-400 flex-shrink-0" />
              <span className="text-sm">Pagamento sicuro con Stripe</span>
            </div>
          </motion.div>
        </motion.div>
      </main>

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
              <p className="text-2xl font-bold text-primary">€{resalePrice.toFixed(2)}</p>
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
            data-testid="button-purchase-resale"
          >
            {!isElementReady && canProceedWithPayment ? (
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
                Paga €{resalePrice.toFixed(2)}
              </>
            )}
          </HapticButton>
        </div>
      </motion.div>
    </div>
  );
}
