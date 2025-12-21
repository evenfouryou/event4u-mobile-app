import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, ArrowLeft, Lock } from "lucide-react";
import { Link, useLocation, useSearch } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, HapticButton } from "@/components/mobile-primitives";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const token = new URLSearchParams(search).get("token") || "";
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Link non valido. Manca il token di reset.");
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch(`/api/verify-reset-token/${token}`);
        const data = await response.json();
        
        if (data.valid) {
          setIsValidToken(true);
          setUserEmail(data.email || "");
        } else {
          setError(data.message || "Link non valido o scaduto.");
        }
      } catch (err) {
        setError("Errore durante la verifica del link.");
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    triggerHaptic('medium');

    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      triggerHaptic('error');
      return;
    }

    if (password.length < 8) {
      setError("La password deve essere di almeno 8 caratteri");
      triggerHaptic('error');
      return;
    }

    setIsLoading(true);

    try {
      const response: any = await apiRequest('POST', '/api/reset-password', { 
        token, 
        password 
      });
      setSuccess(response.message || "Password reimpostata con successo!");
      triggerHaptic('success');
      
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore. Riprova più tardi.");
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div 
        className="fixed inset-0 flex flex-col bg-background"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
      >
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground text-lg">Verifica del link in corso...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 flex flex-col bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <header className="shrink-0 px-4 py-3">
        <Link href="/login">
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center"
            onClick={() => triggerHaptic('light')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </motion.button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-6 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md mx-auto"
          >
            <div className="flex justify-center mb-8">
              <img 
                src="/logo.png" 
                alt="EventFourYou" 
                className="h-16 w-auto"
              />
            </div>

            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                Reimposta Password
              </h1>
              <p className="text-muted-foreground">
                {isValidToken 
                  ? `Inserisci una nuova password per ${userEmail}`
                  : "Impossibile reimpostare la password"
                }
              </p>
            </div>

            <AnimatePresence mode="wait">
              {!isValidToken ? (
                <motion.div
                  key="invalid"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <Alert variant="destructive" data-testid="alert-error">
                    <AlertCircle className="h-5 w-5" />
                    <AlertDescription className="text-base">{error}</AlertDescription>
                  </Alert>
                  
                  <Link href="/forgot-password" className="block">
                    <HapticButton 
                      variant="outline" 
                      className="w-full h-14 text-base font-medium rounded-xl"
                      hapticType="light"
                      data-testid="button-request-new"
                    >
                      Richiedi nuovo link
                    </HapticButton>
                  </Link>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit}
                  className="space-y-6"
                >
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Alert variant="destructive" data-testid="alert-error">
                          <AlertCircle className="h-5 w-5" />
                          <AlertDescription className="text-base">{error}</AlertDescription>
                        </Alert>
                      </motion.div>
                    )}

                    {success && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <Alert data-testid="alert-success" className="border-green-500 bg-green-50 dark:bg-green-950">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                          <AlertDescription className="text-green-700 dark:text-green-300 text-base">
                            {success}
                            <br />
                            <span className="text-sm">Reindirizzamento al login...</span>
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base font-medium">
                      Nuova Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimo 8 caratteri"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading || !!success}
                        className="h-14 text-base rounded-xl pr-14"
                        data-testid="input-password"
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-0 top-0 h-14 w-14 flex items-center justify-center"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowPassword(!showPassword);
                        }}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-base font-medium">
                      Conferma Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Ripeti la password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={isLoading || !!success}
                        className="h-14 text-base rounded-xl pr-14"
                        data-testid="input-confirm-password"
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.9 }}
                        className="absolute right-0 top-0 h-14 w-14 flex items-center justify-center"
                        onClick={() => {
                          triggerHaptic('light');
                          setShowConfirmPassword(!showConfirmPassword);
                        }}
                        data-testid="button-toggle-confirm-password"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <Eye className="h-5 w-5 text-muted-foreground" />
                        )}
                      </motion.button>
                    </div>
                  </div>

                  <motion.div
                    whileTap={{ scale: 0.98 }}
                    className="pt-2"
                  >
                    <HapticButton 
                      type="submit" 
                      className="w-full h-14 text-base font-semibold rounded-xl bg-primary"
                      disabled={isLoading || !!success}
                      hapticType="medium"
                      data-testid="button-submit"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Salvataggio...
                        </>
                      ) : "Reimposta Password"}
                    </HapticButton>
                  </motion.div>

                  <div className="text-center pt-4">
                    <Link 
                      href="/login" 
                      className="text-primary font-medium text-base"
                      data-testid="link-login"
                      onClick={() => triggerHaptic('light')}
                    >
                      Torna al Login
                    </Link>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
