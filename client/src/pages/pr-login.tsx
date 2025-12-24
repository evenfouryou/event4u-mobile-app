import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Phone, Lock, LogIn } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { motion } from "framer-motion";
import { triggerHaptic, HapticButton, SafeArea } from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";
import { usePrAuth } from "@/hooks/usePrAuth";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function PrLogin() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { isAuthenticated, isLoading: authLoading } = usePrAuth();
  
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    setLocation("/pr/wallet");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      await apiRequest('POST', '/api/pr/login', { phone, password });
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ["/api/pr/me"] });
      toast({
        title: "Accesso riuscito",
        description: "Benvenuto nel tuo portafoglio PR",
      });
      setLocation("/pr/wallet");
    } catch (err: any) {
      triggerHaptic('error');
      setError(err.message || "Credenziali non valide");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden" data-testid="page-pr-login">
        <motion.div 
          className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,215,0,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[700px] h-[700px] rounded-full opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,206,209,0.2) 0%, transparent 70%)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />

        <Card className="w-full max-w-md relative z-10">
          <CardHeader className="text-center space-y-4">
            <Link href="/" className="flex flex-col items-center gap-3">
              <BrandLogo variant="vertical" className="h-24 w-auto" />
            </Link>
            <div>
              <CardTitle className="text-2xl">Accesso PR</CardTitle>
              <CardDescription>Inserisci il tuo numero di telefono e password</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Numero di Telefono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+39 3XX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="pl-10"
                    data-testid="input-phone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="La password ricevuta via SMS"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                    data-testid="input-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    Accesso in corso...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Accedi
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Non hai ricevuto le credenziali?</p>
              <p>Contatta il tuo gestore per assistenza.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <SafeArea className="min-h-screen bg-background flex flex-col" data-testid="page-pr-login">
      <motion.div 
        className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,215,0,0.15) 0%, transparent 70%)" }}
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,206,209,0.15) 0%, transparent 70%)" }}
        animate={{ x: [0, -15, 0], y: [0, 20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="flex-1 flex flex-col justify-center px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfig}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <Link href="/" className="inline-block">
              <BrandLogo variant="vertical" className="h-20 w-auto mx-auto" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Accesso PR</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Inserisci il tuo numero di telefono e password
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50 bg-destructive/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone-mobile">Numero di Telefono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone-mobile"
                  type="tel"
                  placeholder="+39 3XX XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 pl-10 text-base"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password-mobile">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password-mobile"
                  type="password"
                  placeholder="La password ricevuta via SMS"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pl-10 text-base"
                  data-testid="input-password"
                />
              </div>
            </div>

            <HapticButton
              type="submit"
              className="w-full h-12 gap-2 text-base"
              disabled={isLoading}
              hapticType="medium"
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Accesso in corso...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Accedi
                </>
              )}
            </HapticButton>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Non hai ricevuto le credenziali?</p>
            <p>Contatta il tuo gestore per assistenza.</p>
          </div>
        </motion.div>
      </div>
    </SafeArea>
  );
}
