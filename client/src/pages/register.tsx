import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  Phone,
  ArrowRight,
  Loader2,
  Shield,
  Eye,
  EyeOff,
  Building2,
  Ticket
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { triggerHaptic } from "@/components/mobile-primitives";

type AccountType = "cliente" | "gestore" | null;

const gestoreRegisterSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Devi accettare i termini e condizioni"
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "Devi accettare la privacy policy"
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

const clienteRegisterSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().min(10, "Numero di telefono non valido"),
  password: z.string().min(8, "Password deve avere almeno 8 caratteri"),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Devi accettare i termini e condizioni"
  }),
  acceptPrivacy: z.boolean().refine(val => val === true, {
    message: "Devi accettare la privacy policy"
  }),
});

type GestoreFormValues = z.infer<typeof gestoreRegisterSchema>;
type ClienteFormValues = z.infer<typeof clienteRegisterSchema>;

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

export default function Register() {
  const [, navigate] = useLocation();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [gestoreSuccess, setGestoreSuccess] = useState(false);
  const [clienteOtpStep, setClienteOtpStep] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const { data: gestoreRegEnabled, isLoading: checkingGestore } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/public/registration-enabled'],
  });

  const { data: clienteRegEnabled, isLoading: checkingCliente } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/public/customer-registration-enabled'],
  });

  const gestoreForm = useForm<GestoreFormValues>({
    resolver: zodResolver(gestoreRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const clienteForm = useForm<ClienteFormValues>({
    resolver: zodResolver(clienteRegisterSchema),
    defaultValues: {
      email: "",
      phone: "",
      firstName: "",
      lastName: "",
      password: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const gestoreMutation = useMutation({
    mutationFn: async (data: GestoreFormValues) => {
      const { confirmPassword, acceptTerms, acceptPrivacy, ...registerData } = data;
      return await apiRequest('POST', '/api/register', { ...registerData, role: 'gestore' });
    },
    onSuccess: () => {
      triggerHaptic('success');
      setGestoreSuccess(true);
      toast({
        title: "Registrazione completata",
        description: "Controlla la tua email per il messaggio di benvenuto",
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Registrazione fallita",
        variant: "destructive",
      });
    },
  });

  const handleClienteRegister = async (data: ClienteFormValues) => {
    triggerHaptic('medium');
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/public/customers/register", {
        email: data.email,
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
      });
      const result = await res.json();
      setCustomerId(result.customerId);
      setClienteOtpStep(true);
      triggerHaptic('success');
      toast({
        title: "Registrazione avviata",
        description: "Ti abbiamo inviato un codice OTP al telefono.",
      });
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: "Errore di registrazione",
        description: error.message || "Impossibile completare la registrazione.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpValue.length !== 6 || !customerId) return;
    triggerHaptic('medium');
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/public/customers/verify-otp", {
        customerId,
        otpCode: otpValue,
      });
      triggerHaptic('success');
      toast({
        title: "Verifica completata!",
        description: "Il tuo account è stato attivato. Ora puoi accedere.",
      });
      navigate("/login");
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: "Errore verifica",
        description: error.message || "Codice OTP non valido.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingGestore || checkingCliente) {
    return (
      <div 
        className="fixed inset-0 bg-background flex items-center justify-center"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Caricamento...</p>
        </motion.div>
      </div>
    );
  }

  if (gestoreSuccess) {
    return (
      <div 
        className="fixed inset-0 bg-background flex items-center justify-center px-6"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.3) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springTransition}
          className="glass-card p-8 max-w-md w-full text-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle2 className="w-10 h-10 text-black" />
          </motion.div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Registrazione Completata!</h2>
          <p className="text-muted-foreground mb-6">
            Controlla la tua email per verificare il tuo account.
          </p>
          <Link href="/login">
            <button
              onClick={() => triggerHaptic('medium')}
              className="w-full h-14 rounded-xl gradient-golden text-black font-semibold text-lg active:scale-[0.98] transition-transform"
              data-testid="button-go-login"
            >
              Vai al Login
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  if (clienteOtpStep) {
    return (
      <div 
        className="fixed inset-0 bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.4) 0%, transparent 70%)" }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="w-full max-w-sm"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="mx-auto mb-8 h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center"
              >
                <Shield className="h-10 w-10 text-black" />
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h1 className="text-2xl font-bold text-foreground mb-2">Verifica OTP</h1>
                <p className="text-muted-foreground">
                  Inserisci il codice a 6 cifre inviato al tuo telefono
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mb-8"
              >
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => {
                    setOtpValue(value);
                    if (value.length === 6) triggerHaptic('light');
                  }}
                  data-testid="input-otp"
                >
                  <InputOTPGroup className="gap-2">
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-14 w-12 text-xl border-border bg-muted/30 text-foreground rounded-xl"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <button
                  onClick={handleVerifyOTP}
                  disabled={otpValue.length !== 6 || isLoading}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                  data-testid="button-verify"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verifica
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setClienteOtpStep(false);
                    setOtpValue("");
                  }}
                  className="w-full h-14 rounded-xl border border-border text-muted-foreground font-medium flex items-center justify-center gap-2 active:bg-muted/20 transition-colors"
                  data-testid="button-back-to-form"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Torna indietro
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  if (accountType === null) {
    return (
      <div 
        className="fixed inset-0 bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
            animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between px-4 py-3"
        >
          <Link href="/">
            <button 
              onClick={() => triggerHaptic('light')}
              className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/20 transition-colors"
              data-testid="button-back-home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
        </motion.div>

        <div className="flex-1 flex flex-col px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center mb-10"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="h-10 w-10 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Crea Account</h1>
            <p className="text-muted-foreground text-center mt-2">
              Scegli il tipo di account
            </p>
          </motion.div>

          <div className="flex-1 flex flex-col justify-center gap-4 max-w-md mx-auto w-full">
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, ...springTransition }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic('medium');
                if (clienteRegEnabled?.enabled === false) {
                  toast({
                    title: "Registrazioni clienti sospese",
                    description: "Le registrazioni clienti sono temporaneamente disabilitate.",
                    variant: "destructive"
                  });
                  return;
                }
                setAccountType("cliente");
              }}
              className="glass-card p-6 rounded-2xl flex items-center gap-5 text-left active:scale-[0.98] transition-transform"
              data-testid="button-select-cliente"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center shrink-0">
                <Ticket className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">Cliente</h3>
                <p className="text-muted-foreground text-sm">
                  Acquista biglietti, gestisci prenotazioni e rivendite
                </p>
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground shrink-0" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, ...springTransition }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                triggerHaptic('medium');
                if (gestoreRegEnabled?.enabled === false) {
                  toast({
                    title: "Registrazioni organizzatori sospese",
                    description: "Le registrazioni per organizzatori sono temporaneamente disabilitate.",
                    variant: "destructive"
                  });
                  return;
                }
                setAccountType("gestore");
              }}
              className={`glass-card p-6 rounded-2xl flex items-center gap-5 text-left active:scale-[0.98] transition-transform ${gestoreRegEnabled?.enabled === false ? 'opacity-50' : ''}`}
              data-testid="button-select-gestore"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-black" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground mb-1">Organizzatore</h3>
                <p className="text-muted-foreground text-sm">
                  Crea eventi, gestisci staff, vendita biglietti e inventario
                </p>
                {gestoreRegEnabled?.enabled === false && (
                  <p className="text-red-400 text-xs mt-1">Registrazioni sospese</p>
                )}
              </div>
              <ArrowRight className="w-6 h-6 text-muted-foreground shrink-0" />
            </motion.button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-muted-foreground">
              Hai già un account?{" "}
              <Link href="/login" className="text-primary font-semibold">
                Accedi
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  if (accountType === "gestore") {
    return (
      <div 
        className="fixed inset-0 bg-background flex flex-col"
        style={{ 
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(255,165,0,0.2) 0%, transparent 70%)" }}
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between px-4 py-3"
          >
            <button 
              onClick={() => {
                triggerHaptic('light');
                setAccountType(null);
              }}
              className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/20 transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </motion.div>

          <div className="flex-1 flex flex-col px-6 pb-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col items-center mb-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg">
                <Building2 className="h-8 w-8 text-black" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Registrati come Organizzatore</h1>
              <p className="text-muted-foreground text-center mt-1">
                Crea il tuo account gestore
              </p>
            </motion.div>

            <Form {...gestoreForm}>
              <form onSubmit={gestoreForm.handleSubmit((data) => gestoreMutation.mutate(data))} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <FormField
                    control={gestoreForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">Nome</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              placeholder="Mario"
                              className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-firstname"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={gestoreForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">Cognome</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Rossi"
                            className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-lastname"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type="email"
                              placeholder="mario@azienda.it"
                              className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-email"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-password"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setShowPassword(!showPassword);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <FormField
                    control={gestoreForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-muted-foreground text-sm font-medium">Conferma Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 pl-12 pr-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                              data-testid="input-confirm-password"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setShowConfirmPassword(!showConfirmPassword);
                              }}
                              className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                            >
                              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-4 pt-2"
                >
                  <FormField
                    control={gestoreForm.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              triggerHaptic('light');
                              field.onChange(checked);
                            }}
                            className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            data-testid="checkbox-terms"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                            Accetto i{" "}
                            <Link href="/terms" className="text-primary underline">
                              Termini e Condizioni
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={gestoreForm.control}
                    name="acceptPrivacy"
                    render={({ field }) => (
                      <FormItem className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              triggerHaptic('light');
                              field.onChange(checked);
                            }}
                            className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            data-testid="checkbox-privacy"
                          />
                        </FormControl>
                        <div className="flex-1">
                          <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                            Accetto la{" "}
                            <Link href="/privacy" className="text-primary underline">
                              Privacy Policy
                            </Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="pt-4"
                >
                  <button
                    type="submit"
                    disabled={gestoreMutation.isPending}
                    onClick={() => triggerHaptic('medium')}
                    className="w-full h-14 rounded-xl gradient-golden text-black font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                    data-testid="button-register"
                  >
                    {gestoreMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Registrati
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.div>
              </form>
            </Form>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center mt-8"
            >
              <p className="text-muted-foreground">
                Hai già un account?{" "}
                <Link href="/login" className="text-primary font-semibold">
                  Accedi
                </Link>
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-background flex flex-col"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between px-4 py-3"
        >
          <button 
            onClick={() => {
              triggerHaptic('light');
              setAccountType(null);
            }}
            className="h-11 w-11 rounded-full flex items-center justify-center text-muted-foreground active:bg-muted/20 transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </motion.div>

        <div className="flex-1 flex flex-col px-6 pb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center mb-4 shadow-lg">
              <Ticket className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Registrati come Cliente</h1>
            <p className="text-muted-foreground text-center mt-1">
              Crea il tuo account
            </p>
          </motion.div>

          <Form {...clienteForm}>
            <form onSubmit={clienteForm.handleSubmit(handleClienteRegister)} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-2 gap-4"
              >
                <FormField
                  control={clienteForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">Nome</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="Mario"
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-firstname"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={clienteForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">Cognome</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Rossi"
                          className="h-14 text-base bg-muted/30 border-border text-foreground rounded-xl"
                          data-testid="input-lastname"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type="email"
                            placeholder="mario@esempio.it"
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-email"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">Telefono</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="+39 333 1234567"
                            className="h-14 pl-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-phone"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <FormField
                  control={clienteForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-muted-foreground text-sm font-medium">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-14 pl-12 pr-12 text-base bg-muted/30 border-border text-foreground rounded-xl"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('light');
                              setShowPassword(!showPassword);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4 pt-2"
              >
                <FormField
                  control={clienteForm.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                          Accetto i{" "}
                          <Link href="/terms" className="text-primary underline">
                            Termini e Condizioni
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={clienteForm.control}
                  name="acceptPrivacy"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            triggerHaptic('light');
                            field.onChange(checked);
                          }}
                          className="mt-1 h-6 w-6 rounded-md border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          data-testid="checkbox-privacy"
                        />
                      </FormControl>
                      <div className="flex-1">
                        <FormLabel className="text-sm text-foreground font-normal leading-relaxed">
                          Accetto la{" "}
                          <Link href="/privacy" className="text-primary underline">
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="pt-4"
              >
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={() => triggerHaptic('medium')}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-teal-400 to-cyan-500 text-black font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Registrati
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </motion.div>
            </form>
          </Form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-8"
          >
            <p className="text-muted-foreground">
              Hai già un account?{" "}
              <Link href="/login" className="text-primary font-semibold">
                Accedi
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
