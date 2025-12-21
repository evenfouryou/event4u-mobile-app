import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Ticket, Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { Link, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { triggerHaptic } from "@/components/mobile-primitives";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function PublicLoginPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const redirectTo = params.get("redirect") || "/account";
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const response: any = await apiRequest('POST', '/api/auth/login', { email, password });
      
      triggerHaptic('success');
      if (response.user?.role === 'cliente') {
        window.location.href = redirectTo;
      } else {
        window.location.href = redirectTo;
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

  const handleLinkClick = () => {
    triggerHaptic('light');
  };

  return (
    <div 
      className="min-h-screen h-screen bg-background flex flex-col relative overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <motion.div 
        className="absolute -top-32 -left-32 w-80 h-80 rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, 20, 0],
          y: [0, -15, 0],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-15 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,206,209,0.3) 0%, transparent 70%)" }}
        animate={{ 
          x: [0, -15, 0],
          y: [0, 20, 0],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig}
        className="px-4 py-4 relative z-10"
      >
        <Link 
          href="/events"
          onClick={handleLinkClick}
          className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 active:bg-white/10"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
      </motion.header>

      <div className="flex-1 flex flex-col px-6 relative z-10 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
          className="flex flex-col items-center pt-4 pb-8"
        >
          <Link 
            href="/events" 
            onClick={handleLinkClick}
            className="flex flex-col items-center gap-4"
          >
            <motion.div 
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-2xl shadow-primary/30"
              whileTap={{ scale: 0.92 }}
              transition={springConfig}
            >
              <Ticket className="h-12 w-12 text-black" />
            </motion.div>
            <span className="text-3xl font-bold tracking-tight">
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
              Accedi per gestire i tuoi biglietti
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={springConfig}
              >
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10 rounded-2xl">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {showResendVerification && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={springConfig}
              >
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10 rounded-2xl">
                  <Mail className="h-5 w-5 text-primary" />
                  <AlertDescription>
                    <div className="space-y-4">
                      <p className="text-base">La tua email non è stata ancora verificata.</p>
                      <motion.div whileTap={{ scale: 0.98 }} transition={springConfig}>
                        <Button 
                          type="button"
                          variant="outline"
                          onClick={handleResendVerification}
                          disabled={isResending}
                          className="w-full h-14 rounded-2xl border-primary/30 text-base font-medium"
                          data-testid="button-resend-verification"
                        >
                          {isResending ? "Invio in corso..." : "Rinvia Email di Verifica"}
                        </Button>
                      </motion.div>
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
              <Label htmlFor="email" className="text-base font-medium pl-1">Email</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="tua@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => triggerHaptic('light')}
                  required
                  autoComplete="email"
                  className="h-14 text-base bg-white/5 border-white/10 focus:border-primary rounded-2xl pl-12 pr-4"
                  data-testid="input-public-email"
                />
              </div>
            </motion.div>

            <motion.div 
              className="space-y-2"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...springConfig, delay: 0.2 }}
            >
              <Label htmlFor="password" className="text-base font-medium pl-1">Password</Label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => triggerHaptic('light')}
                  required
                  autoComplete="current-password"
                  className="h-14 text-base bg-white/5 border-white/10 focus:border-primary rounded-2xl pl-12 pr-14"
                  data-testid="input-public-password"
                />
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 flex items-center justify-center text-muted-foreground active:text-foreground rounded-xl"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            <motion.div 
              className="flex justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...springConfig, delay: 0.25 }}
            >
              <Link 
                href="/public-forgot-password" 
                onClick={handleLinkClick}
                className="text-base text-primary font-medium h-12 flex items-center px-2 active:opacity-70"
                data-testid="link-public-forgot-password"
              >
                Password dimenticata?
              </Link>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfig, delay: 0.3 }}
              whileTap={{ scale: 0.98 }}
              className="pt-2"
            >
              <Button
                type="submit"
                className="w-full h-14 gradient-golden text-black font-semibold text-lg rounded-2xl shadow-lg shadow-primary/20"
                disabled={isLoading}
                data-testid="button-public-submit"
              >
                {isLoading ? (
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Accesso in corso...
                  </motion.span>
                ) : "Accedi"}
              </Button>
            </motion.div>
          </form>
        </motion.div>

        <div className="flex-1" />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springConfig, delay: 0.35 }}
          className="py-6 text-center"
        >
          <p className="text-base text-muted-foreground">
            Non hai un account?{" "}
            <Link 
              href="/register" 
              onClick={handleLinkClick}
              className="text-primary font-semibold h-12 inline-flex items-center active:opacity-70" 
              data-testid="link-public-register"
            >
              Registrati gratis
            </Link>
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...springConfig, delay: 0.4 }}
          className="pb-4 text-center"
        >
          <Link 
            href="/events" 
            onClick={handleLinkClick}
            className="text-base text-muted-foreground h-12 inline-flex items-center justify-center gap-2 active:opacity-70"
            data-testid="link-back-to-events"
          >
            <Ticket className="h-5 w-5" />
            Esplora eventi
          </Link>
        </motion.div>
      </div>

      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springConfig, delay: 0.45 }}
        className="py-4 text-center text-sm text-muted-foreground/60"
      >
        © {new Date().getFullYear()} Event Four You
      </motion.footer>
    </div>
  );
}
