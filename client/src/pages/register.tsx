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
import { CheckCircle2, Sparkles, ArrowLeft, User, Mail, Lock, XCircle } from "lucide-react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const { toast } = useToast();

  // Check if registration is enabled
  const { data: registrationStatus, isLoading: checkingStatus } = useQuery<{ enabled: boolean }>({
    queryKey: ['/api/public/registration-enabled'],
  });

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const { confirmPassword, ...registerData } = data;
      return await apiRequest('POST', '/api/register', { ...registerData, role: 'gestore' });
    },
    onSuccess: () => {
      setRegistrationSuccess(true);
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

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
        {/* Animated background */}
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
            Il tuo account è stato creato con successo
          </p>
          
          <div className="glass p-4 rounded-xl mb-6">
            <p className="text-sm text-muted-foreground">
              Ti abbiamo inviato un'email con un link di conferma. 
              Clicca sul link nell'email per verificare il tuo account.
            </p>
          </div>

          <div className="bg-muted/30 p-3 rounded-lg mb-6">
            <p className="text-xs text-muted-foreground">
              Non hai ricevuto l'email? Controlla nella cartella spam.
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

  // Show message if registration is disabled
  if (!checkingStatus && registrationStatus && !registrationStatus.enabled) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6 relative overflow-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 pointer-events-none">
          <motion.div 
            className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)" }}
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
            className="mx-auto mb-6 h-20 w-20 rounded-full bg-gradient-to-br from-red-400 to-red-500 flex items-center justify-center"
          >
            <XCircle className="h-10 w-10 text-white" />
          </motion.div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Registrazioni Disabilitate</h1>
          <p className="text-muted-foreground mb-6">
            Al momento le nuove registrazioni non sono disponibili
          </p>
          
          <div className="glass p-4 rounded-xl mb-6">
            <p className="text-sm text-muted-foreground">
              La registrazione di nuovi organizzatori è stata temporaneamente sospesa. 
              Se hai già un account, puoi effettuare il login.
            </p>
          </div>

          <Button 
            className="w-full h-12 gradient-golden text-black font-semibold" 
            asChild
            data-testid="button-go-to-login-disabled"
          >
            <Link href="/login">Vai al Login</Link>
          </Button>
          
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-4"
            data-testid="link-back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // Show loading state
  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated background */}
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

      {/* Header */}
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

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          <div className="glass-card p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Crea il tuo account</h1>
              <p className="text-muted-foreground">
                Inizia a gestire i tuoi eventi come un professionista
              </p>
            </div>

            {/* Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-5">
                {/* Name fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                            data-testid="input-first-name" 
                          />
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
                        <FormLabel className="text-sm font-medium">Cognome</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Rossi" 
                            className="h-12 bg-background/50 border-white/10 focus:border-primary"
                            data-testid="input-last-name" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Email */}
                <FormField
                  control={form.control}
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
                          data-testid="input-email" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Password fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
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
                            placeholder="Min. 8 caratteri" 
                            className="h-12 bg-background/50 border-white/10 focus:border-primary"
                            data-testid="input-password" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">Conferma Password</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="password" 
                            placeholder="Ripeti password" 
                            className="h-12 bg-background/50 border-white/10 focus:border-primary"
                            data-testid="input-confirm-password" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Submit */}
                <div className="pt-4 space-y-4">
                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-golden text-black font-semibold text-base" 
                    disabled={registerMutation.isPending}
                    data-testid="button-register"
                  >
                    {registerMutation.isPending ? "Registrazione in corso..." : "Crea Account"}
                  </Button>

                  <p className="text-sm text-center text-muted-foreground">
                    Hai già un account?{" "}
                    <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                      Accedi
                    </Link>
                  </p>
                </div>
              </form>
            </Form>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground relative z-10">
        © {new Date().getFullYear()} Event Four You
      </footer>
    </div>
  );
}
