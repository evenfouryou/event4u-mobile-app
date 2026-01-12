import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
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

export default function PublicResaleCheckoutPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [isReserving, setIsReserving] = useState(false);
  const [captchaData, setCaptchaData] = useState<{ token: string; svg: string; width: number; height: number; enabled: boolean } | null>(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [captchaValidated, setCaptchaValidated] = useState(false);

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
    enabled: !!customer && !!resale && resale.status === 'listed',
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const handleRefreshCaptcha = () => {
    setCaptchaValidated(false);
    setCaptchaInput("");
    setCaptchaError(null);
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

  const reserveMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/public/resales/${id}/reserve`, {
        captchaToken: captchaData?.token,
      });
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
      const errorCode = error.data?.code || error.code || "";
      
      if (errorCode === "CAPTCHA_INVALID" || errorCode === "CAPTCHA_EXPIRED" || errorCode === "CAPTCHA_NOT_VALIDATED") {
        setCaptchaError(error.message);
        handleRefreshCaptcha();
      } else {
        toast({
          title: "Errore",
          description: error.message || "Impossibile procedere all'acquisto",
          variant: "destructive",
        });
      }
      setIsReserving(false);
    },
  });

  const canProceedWithPurchase = !captchaData?.enabled || (captchaData?.enabled && captchaValidated);

  const handlePurchase = () => {
    if (!customer) {
      navigate(`/login?redirect=/rivendita/${id}`);
      return;
    }
    if (!canProceedWithPurchase) {
      return;
    }
    setIsReserving(true);
    reserveMutation.mutate();
  };

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

  if (resale.status !== 'listed') {
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
              Per acquistare questo biglietto devi accedere al tuo account o registrarti.
            </p>
            <Link href={`/login?redirect=/rivendita/${id}`}>
              <HapticButton 
                className="h-14 px-8 text-base"
                hapticType="medium"
                data-testid="button-login"
              >
                Accedi o Registrati
              </HapticButton>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  const eventDate = new Date(resale.eventStart);
  const originalPrice = parseFloat(resale.originalPrice);
  const resalePrice = parseFloat(resale.resalePrice);
  const discount = originalPrice > 0 ? Math.round(((originalPrice - resalePrice) / originalPrice) * 100) : 0;
  const hasDiscount = discount > 0;
  const currentStep = captchaValidated ? 2 : 1;

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
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-4 pb-32"
        >
          <motion.div variants={fadeInUp}>
            <ResaleProgressIndicator currentStep={currentStep} />
          </motion.div>

          <motion.div variants={fadeInUp} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Ticket className="w-5 h-5 text-primary" />
                Riepilogo Ordine
                <Badge className="ml-auto bg-amber-500/90 text-white text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Rivendita
                </Badge>
              </h2>
            </div>
            <div className="p-4 space-y-4">
              {resale.eventImageUrl && (
                <div className="relative aspect-video rounded-xl overflow-hidden">
                  <img
                    src={resale.eventImageUrl}
                    alt={resale.eventName}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                </div>
              )}

              <div>
                <p className="font-semibold text-lg text-foreground">{resale.eventName}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">
                    <Ticket className="w-3 h-3 mr-1" />
                    {resale.ticketType}
                  </Badge>
                  <Badge variant="outline">
                    {resale.sectorName}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{format(eventDate, "EEEE d MMMM yyyy", { locale: it })}</p>
                    <p className="text-sm text-muted-foreground">Ore {format(eventDate, "HH:mm")}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-teal-400" />
                  </div>
                  <p className="text-muted-foreground">{resale.locationName}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Quantità</span>
                  <span className="text-foreground font-medium">1 biglietto</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Prezzo originale</span>
                  <span className={hasDiscount ? "line-through" : "text-foreground"}>
                    €{originalPrice.toFixed(2)}
                  </span>
                </div>
                {hasDiscount && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Sconto</span>
                    <span className="text-teal-400">-{discount}%</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-lg font-semibold text-foreground">Totale</span>
                  <span className="text-2xl font-bold text-primary" data-testid="text-total">
                    €{resalePrice.toFixed(2)}
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
              onClick={handlePurchase}
              disabled={!canProceedWithPurchase || isReserving || reserveMutation.isPending}
              className="w-full h-14 text-lg font-semibold"
              hapticType="heavy"
              data-testid="button-purchase-resale"
            >
              {isReserving || reserveMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : !canProceedWithPurchase && captchaData?.enabled ? (
                <>
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Completa verifica CAPTCHA
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Acquista ora - €{resalePrice.toFixed(2)}
                </>
              )}
            </HapticButton>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
