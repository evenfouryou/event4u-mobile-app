import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Mail, Sparkles, ArrowLeft } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function Login() {
  const [, setLocation] = useLocation();
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

    try {
      // Check if input is email or username (cashier)
      const isEmail = email.includes('@');
      
      if (isEmail) {
        // Unified login - works for both admin/gestore and customers
        const response: any = await apiRequest('POST', '/api/auth/login', { email, password });
        
        // Redirect based on user role and redirect parameter
        if (response.user?.role === 'cliente') {
          // For customers, use redirect param or default to /account
          window.location.href = redirectTo || '/account';
        } else {
          // For admin/gestore, use redirect param or default to dashboard
          window.location.href = redirectTo || '/';
        }
      } else {
        // Cashier login with username - redirect to cashier dashboard
        await apiRequest('POST', '/api/cashiers/login', { username: email, password });
        window.location.href = '/cashier/dashboard';
      }
    } catch (err: any) {
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
    try {
      const response: any = await apiRequest('POST', '/api/resend-verification', { email });
      toast({
        title: "Email inviata",
        description: response.message || "Controlla la tua casella di posta per il link di verifica.",
      });
      setShowResendVerification(false);
    } catch (err: any) {
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
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
          animate={{ 
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
          animate={{ 
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
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
          className="w-full max-w-md"
        >
          <div className="glass-card p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">Bentornato</h1>
              <p className="text-muted-foreground">
                Accedi al tuo account per continuare
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {showResendVerification && (
                <Alert data-testid="alert-resend-verification" className="border-primary/50 bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="text-sm">La tua email non è stata ancora verificata.</p>
                      <Button 
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="border-primary/30 hover:bg-primary/10"
                        data-testid="button-resend-verification"
                      >
                        {isResending ? "Invio in corso..." : "Rinvia Email di Verifica"}
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email o Username</Label>
                <Input
                  id="email"
                  type="text"
                  placeholder="tua@email.com o username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background/50 border-white/10 focus:border-primary"
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-primary hover:underline"
                    data-testid="link-forgot-password"
                  >
                    Password dimenticata?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-background/50 border-white/10 focus:border-primary"
                  data-testid="input-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 gradient-golden text-black font-semibold text-base"
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Accesso in corso..." : "Accedi"}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">oppure</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 border-white/10 hover:bg-white/5"
                onClick={() => window.location.href = '/api/login'}
                data-testid="button-replit-login"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 3c4.97 0 9 4.03 9 9s-4.03 9-9 9-9-4.03-9-9 4.03-9 9-9z"/>
                </svg>
                Accedi con Replit
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-4">
                Non hai un account?{" "}
                <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                  Registrati gratis
                </Link>
              </p>
            </form>
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
