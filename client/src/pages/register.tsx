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
  EyeOff
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { triggerHaptic } from "@/components/mobile-primitives";

const registerSchema = z.object({
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

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, navigate] = useLocation();
  const [otpStep, setOtpStep] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const { data: regEnabled, isLoading: checkingReg } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/public/customer-registration-enabled'],
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      acceptTerms: false,
      acceptPrivacy: false,
    },
  });

  const handleRegister = async (data: RegisterFormValues) => {
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
      setOtpStep(true);
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

  if (checkingReg) {
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

  if (otpStep) {
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
                    setOtpStep(false);
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

      <div className="flex-1 flex flex-col overflow-y-auto overscroll-contain">
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
            className="flex flex-col items-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center mb-4 shadow-lg">
              <Sparkles className="h-8 w-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Crea Account</h1>
            <p className="text-muted-foreground text-center mt-1">
              Registrati per iniziare
            </p>
          </motion.div>

          {regEnabled?.enabled === false ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-2xl text-center"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Registrazioni Sospese</h2>
              <p className="text-muted-foreground mb-6">
                Le registrazioni sono temporaneamente sospese. Riprova più tardi.
              </p>
              <Link href="/">
                <button 
                  onClick={() => triggerHaptic('light')}
                  className="w-full h-14 rounded-xl border border-border text-foreground font-medium active:bg-muted/20 transition-colors"
                >
                  Torna alla Home
                </button>
              </Link>
            </motion.div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-5">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <FormField
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
                              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-foreground"
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
                    control={form.control}
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
                    control={form.control}
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
                    className="w-full h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform shadow-lg"
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

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center pt-4"
                >
                  <p className="text-muted-foreground">
                    Hai già un account?{" "}
                    <Link 
                      href="/login" 
                      className="text-primary font-medium"
                      onClick={() => triggerHaptic('light')}
                      data-testid="link-login"
                    >
                      Accedi
                    </Link>
                  </p>
                </motion.div>
              </form>
            </Form>
          )}
        </div>
      </div>
    </div>
  );
}
