import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Sparkles } from "lucide-react";
import { Link, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { triggerHaptic, HapticButton, SafeArea } from "@/components/mobile-primitives";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function Login() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectTo = params.get("redirect");
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowResendVerification(false);
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      try {
        const response: any = await apiRequest('POST', '/api/auth/login', { email, password });
        
        triggerHaptic('success');
        if (response.user?.role === 'cliente') {
          window.location.href = redirectTo || '/account';
        } else if (response.user?.role === 'scanner') {
          window.location.href = '/scanner';
        } else {
          window.location.href = redirectTo || '/';
        }
        return;
      } catch (loginErr: any) {
        const isEmail = email.includes('@');
        if (!isEmail) {
          try {
            await apiRequest('POST', '/api/cashiers/login', { username: email, password });
            triggerHaptic('success');
            window.location.href = '/cashier/dashboard';
            return;
          } catch (cashierErr: any) {
            throw loginErr;
          }
        }
        throw loginErr;
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.message || "Credenziali non valide");
      if (err.message && err.message.includes("non verificata")) {
        setShowResendVerification(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    triggerHaptic('medium');
    try {
      const response: any = await apiRequest('POST', '/api/resend-verification', { email });
      triggerHaptic('success');
      toast({
        title: "Email inviata",
        description: response.message || "Controlla la tua casella di posta per il link di verifica.",
      });
      setShowResendVerification(false);
    } catch (err: any) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: err.message || "Impossibile inviare l'email. Riprova più tardi.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeArea 
      className="min-h-screen bg-background flex flex-col relative overflow-hidden"
      top={true}
      bottom={true}
      left={true}
      right={true}
    >
      <motion.div 
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="flex flex-col items-center mb-10"
        >
          <Link href="/" className="flex flex-col items-center gap-3 min-h-[44px]">
            <motion.div 
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg"
              whileTap={{ scale: 0.95 }}
              transition={springConfig}
            >
              <Sparkles className="h-10 w-10 text-black" />
            </motion.div>
            <span className="text-2xl font-bold">
              Event<span className="text-primary">4</span>U
            </span>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springConfig, delay: 0.1 }}
          className="w-full"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">Bentornato</h1>
            <p className="text-muted-foreground text-base">
              Accedi al tuo account per continuare
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
              >
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {showResendVerification && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={springConfig}
              >
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <p className="text-base">La tua email non è stata ancora verificata.</p>
                      <HapticButton 
                        type="button"
                        variant="outline"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="w-full h-14 border-primary/30 text-base rounded-xl"
                        hapticType="medium"
                        data-testid="button-resend-verification"
                      >
                        {isResending ? "Invio in corso..." : "Rinvia Email di Verifica"}
                      </HapticButton>
                    </div>
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.15 }}
            >
              <Label htmlFor="email" className="text-base font-medium">Email o Username</Label>
              <Input
                id="email"
                type="text"
                placeholder="tua@email.com o username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                data-testid="input-email"
              />
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.2 }}
            >
              <Label htmlFor="password" className="text-base font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 text-lg bg-background/50 border-white/10 focus:border-primary px-4 rounded-xl"
                data-testid="input-password"
              />
            </motion.div>

            <motion.div 
              className="flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springConfig, delay: 0.25 }}
            >
              <Link 
                href="/forgot-password" 
                className="text-base text-primary font-medium min-h-[44px] flex items-center px-2"
                data-testid="link-forgot-password"
              >
                Password dimenticata?
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.3 }}
              whileTap={{ scale: 0.98 }}
            >
              <HapticButton
                type="submit"
                className="w-full h-14 gradient-golden text-black font-semibold text-lg rounded-xl"
                disabled={isLoading}
                hapticType="medium"
                data-testid="button-submit"
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </HapticButton>
            </motion.div>

            <motion.div 
              className="relative my-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springConfig, delay: 0.35 }}
            >
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-sm uppercase">
                <span className="bg-background px-4 text-muted-foreground">oppure</span>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.4 }}
              whileTap={{ scale: 0.98 }}
            >
              <HapticButton
                type="button"
                variant="outline"
                className="w-full h-14 border-white/10 text-base rounded-xl"
                onClick={() => {
                  window.location.href = '/api/login';
                }}
                hapticType="light"
                data-testid="button-replit-login"
              >
                <svg className="h-6 w-6 mr-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z"/>
                </svg>
                Accedi con Replit
              </HapticButton>
            </motion.div>
          </form>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springConfig, delay: 0.45 }}
          className="mt-10 text-center"
        >
          <p className="text-base text-muted-foreground">
            Non hai un account?{" "}
            <Link 
              href="/register" 
              className="text-primary font-semibold min-h-[44px] inline-flex items-center px-1" 
              data-testid="link-register"
            >
              Registrati gratis
            </Link>
          </p>
        </motion.div>
      </div>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springConfig, delay: 0.5 }}
        className="py-6 text-center text-sm text-muted-foreground"
      >
        © {new Date().getFullYear()} Event Four You
      </motion.footer>
    </SafeArea>
  );
}
