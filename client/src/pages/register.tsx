import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  XCircle, 
  Phone,
  Building2,
  Users,
  Ticket,
  ArrowRight,
  Loader2,
  Shield
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type AccountType = "cliente" | "gestore" | null;

const gestoreRegisterSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

const clienteRegisterSchema = z.object({
  email: z.string().email("Email non valida"),
  phone: z.string().min(10, "Numero di telefono non valido"),
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  password: z.string().min(8, "Password deve avere almeno 8 caratteri"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type GestoreFormValues = z.infer<typeof gestoreRegisterSchema>;
type ClienteFormValues = z.infer<typeof clienteRegisterSchema>;

export default function Register() {
  const [, navigate] = useLocation();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [gestoreSuccess, setGestoreSuccess] = useState(false);
  const [clienteOtpStep, setClienteOtpStep] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      confirmPassword: "",
    },
  });

  const gestoreMutation = useMutation({
    mutationFn: async (data: GestoreFormValues) => {
      const { confirmPassword, ...registerData } = data;
      return await apiRequest('POST', '/api/register', { ...registerData, role: 'gestore' });
    },
    onSuccess: () => {
      setGestoreSuccess(true);
      toast({
        title: "Registrazione completata",
        description: "Controlla la tua email per il messaggio di benvenuto",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Registrazione fallita",
        variant: "destructive",
      });
    },
  });

  const handleClienteRegister = async (data: ClienteFormValues) => {
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
      toast({
        title: "Registrazione avviata",
        description: "Ti abbiamo inviato un codice OTP al telefono.",
      });
    } catch (error: any) {
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
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/public/customers/verify-otp", {
        customerId,
        otpCode: otpValue,
      });
      toast({
        title: "Verifica completata!",
        description: "Il tuo account è stato attivato. Ora puoi accedere.",
      });
      // Redirect to unified login
      navigate("/login");
    } catch (error: any) {
      toast({
        title: "Errore verifica",
        description: error.message || "Codice OTP non valido.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (gestoreSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
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
          transition={{ duration: 0.5 }}
          className="glass-card p-8 md:p-10 max-w-md w-full text-center relative z-10"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 h-20 w-20 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center glow-teal"
          >
            <CheckCircle2 className="h-10 w-10 text-black" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Registrazione Completata!</h1>
          <p className="text-muted-foreground mb-6">
            Il tuo account organizzatore è stato creato con successo
          </p>
          <div className="glass p-4 rounded-xl mb-6">
            <p className="text-sm text-muted-foreground">
              Ti abbiamo inviato un'email con un link di conferma. 
              Clicca sul link nell'email per verificare il tuo account.
            </p>
          </div>
          <Button 
            className="w-full h-12 gradient-golden text-black font-semibold" 
            asChild
            data-testid="button-go-to-login"
          >
            <Link href="/login">Vai al Login</Link>
          </Button>
        </motion.div>
      </div>
    );
  }

  if (clienteOtpStep) {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <Card className="bg-[#151922] border-white/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                <Shield className="w-8 h-8 text-yellow-400" />
              </div>
              <CardTitle className="text-2xl text-white">Verifica OTP</CardTitle>
              <CardDescription className="text-slate-400">
                Inserisci il codice a 6 cifre inviato al tuo telefono
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  data-testid="input-otp"
                >
                  <InputOTPGroup>
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="border-white/20 text-white"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={handleVerifyOTP}
                disabled={otpValue.length !== 6 || isLoading}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-12"
                data-testid="button-verify"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Verifica
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setClienteOtpStep(false);
                  setOtpValue("");
                }}
                className="w-full text-slate-400"
                data-testid="button-back-to-form"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna indietro
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (checkingGestore || checkingCliente) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!accountType) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)" }}
            animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(0,206,209,0.15) 0%, transparent 70%)" }}
            animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="p-4 md:p-6 relative z-10"
        >
          <div className="container mx-auto flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" data-testid="button-back-home">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Torna alla Home</span>
              </Button>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-black" />
              </div>
              <span className="text-lg font-bold hidden sm:block">
                Event<span className="text-primary">4</span>U
              </span>
            </Link>
          </div>
        </motion.header>

        <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold mb-3">Crea il tuo account</h1>
              <p className="text-muted-foreground text-lg">
                Scegli il tipo di account che vuoi creare
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                    clienteRegEnabled?.enabled === false ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => clienteRegEnabled?.enabled !== false && setAccountType("cliente")}
                  data-testid="card-register-cliente"
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
                      <Ticket className="h-8 w-8 text-black" />
                    </div>
                    <CardTitle className="text-xl">Cliente</CardTitle>
                    <CardDescription>
                      Voglio acquistare biglietti per eventi
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Acquista biglietti online
                      </li>
                      <li className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Gestisci i tuoi ordini
                      </li>
                      <li className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Accedi a promozioni esclusive
                      </li>
                    </ul>
                    {clienteRegEnabled?.enabled === false && (
                      <div className="mt-4 p-2 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-red-400">Registrazioni temporaneamente sospese</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className={`glass-card cursor-pointer transition-all hover:border-primary/50 ${
                    gestoreRegEnabled?.enabled === false ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={() => gestoreRegEnabled?.enabled !== false && setAccountType("gestore")}
                  data-testid="card-register-gestore"
                >
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-black" />
                    </div>
                    <CardTitle className="text-xl">Organizzatore</CardTitle>
                    <CardDescription>
                      Voglio gestire eventi e locali
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Crea e gestisci eventi
                      </li>
                      <li className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Vendi biglietti e abbonamenti
                      </li>
                      <li className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Accedi a report e analytics
                      </li>
                    </ul>
                    {gestoreRegEnabled?.enabled === false && (
                      <div className="mt-4 p-2 bg-red-500/10 rounded-lg">
                        <p className="text-xs text-red-400">Registrazioni temporaneamente sospese</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <div className="text-center mt-8">
              <p className="text-muted-foreground">
                Hai già un account?{" "}
                <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
                  Accedi qui
                </Link>
              </p>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  if (accountType === "cliente") {
    return (
      <div className="min-h-screen bg-[#0a0e17] flex flex-col">
        <header className="border-b border-white/5">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Button 
                variant="ghost" 
                className="text-white hover:bg-white/10" 
                onClick={() => setAccountType(null)}
                data-testid="button-back-select"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
              </Button>
              <Link href="/">
                <div className="flex items-center gap-2 cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-black" />
                  </div>
                  <span className="text-lg font-bold text-white">Event4U</span>
                </div>
              </Link>
              <div className="w-24" />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card className="bg-[#151922] border-white/10">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-white">Registrazione Cliente</CardTitle>
                    <CardDescription className="text-slate-400">
                      Crea il tuo account per acquistare biglietti
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Form {...clienteForm}>
                  <form onSubmit={clienteForm.handleSubmit(handleClienteRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={clienteForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-slate-400">Nome</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                  {...field}
                                  placeholder="Mario"
                                  className="pl-10 bg-white/5 border-white/10 text-white"
                                  data-testid="input-cliente-firstname"
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
                            <FormLabel className="text-slate-400">Cognome</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Rossi"
                                className="bg-white/5 border-white/10 text-white"
                                data-testid="input-cliente-lastname"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={clienteForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input
                                {...field}
                                type="email"
                                placeholder="mario@esempio.it"
                                className="pl-10 bg-white/5 border-white/10 text-white"
                                data-testid="input-cliente-email"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clienteForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400">Telefono</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input
                                {...field}
                                type="tel"
                                placeholder="+39 333 1234567"
                                className="pl-10 bg-white/5 border-white/10 text-white"
                                data-testid="input-cliente-phone"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clienteForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input
                                {...field}
                                type="password"
                                placeholder="Minimo 8 caratteri"
                                className="pl-10 bg-white/5 border-white/10 text-white"
                                data-testid="input-cliente-password"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={clienteForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-slate-400">Conferma Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input
                                {...field}
                                type="password"
                                placeholder="Ripeti la password"
                                className="pl-10 bg-white/5 border-white/10 text-white"
                                data-testid="input-cliente-confirm-password"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold h-12"
                      data-testid="button-cliente-register"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          Registrati
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.15) 0%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="p-4 md:p-6 relative z-10"
      >
        <div className="container mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-muted-foreground hover:text-foreground" 
            onClick={() => setAccountType(null)}
            data-testid="button-back-select-gestore"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Cambia tipo account</span>
          </Button>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <span className="text-lg font-bold hidden sm:block">
              Event<span className="text-primary">4</span>U
            </span>
          </Link>
        </div>
      </motion.header>

      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="glass-card p-6 md:p-8">
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center">
                <Building2 className="h-8 w-8 text-black" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Registrazione Organizzatore</h1>
              <p className="text-muted-foreground">
                Inizia a gestire i tuoi eventi come un professionista
              </p>
            </div>

            <Form {...gestoreForm}>
              <form onSubmit={gestoreForm.handleSubmit((data) => gestoreMutation.mutate(data))} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={gestoreForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          Nome
                        </FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Mario" 
                            className="h-12 bg-background/50 border-white/10 focus:border-primary"
                            data-testid="input-gestore-first-name" 
                          />
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
                        <FormLabel className="text-sm font-medium">Cognome</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Rossi" 
                            className="h-12 bg-background/50 border-white/10 focus:border-primary"
                            data-testid="input-gestore-last-name" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={gestoreForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="email" 
                          placeholder="mario.rossi@example.com" 
                          className="h-12 bg-background/50 border-white/10 focus:border-primary"
                          data-testid="input-gestore-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={gestoreForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium flex items-center gap-2">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Minimo 8 caratteri" 
                          className="h-12 bg-background/50 border-white/10 focus:border-primary"
                          data-testid="input-gestore-password" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={gestoreForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium">Conferma Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="password" 
                          placeholder="Ripeti la password" 
                          className="h-12 bg-background/50 border-white/10 focus:border-primary"
                          data-testid="input-gestore-confirm-password" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={gestoreMutation.isPending}
                  className="w-full h-12 gradient-golden text-black font-semibold"
                  data-testid="button-gestore-register"
                >
                  {gestoreMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Crea Account Organizzatore
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Hai già un account?{" "}
                <Link href="/login" className="text-primary hover:underline" data-testid="link-login-gestore">
                  Accedi qui
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
