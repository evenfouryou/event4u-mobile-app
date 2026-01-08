import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, ArrowLeft, Mail, Send } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { triggerHaptic, HapticButton, MobileAppLayout } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import { BrandLogo } from "@/components/brand-logo";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export default function PublicForgotPassword() {
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);
    triggerHaptic('medium');

    try {
      const response: any = await apiRequest('POST', '/api/public/customers/forgot-password', { email });
      setSuccess(response.message || "Se l'email è registrata, riceverai un link per reimpostare la password.");
      setEmail("");
      triggerHaptic('success');
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore. Riprova più tardi.");
      triggerHaptic('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-testid="page-public-forgot-password-desktop">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/">
              <BrandLogo variant="horizontal" className="h-12 w-auto cursor-pointer" />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Password Dimenticata</CardTitle>
              <CardDescription>
                Inserisci la tua email per ricevere un link di reset password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key="error"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={springTransition}
                    >
                      <Alert variant="destructive" data-testid="alert-error">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}

                  {success && (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={springTransition}
                    >
                      <Alert data-testid="alert-success" className="border-green-500/50 bg-green-500/10">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">
                          {success}
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="email-desktop">Email</Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Input
                      id="email-desktop"
                      type="email"
                      placeholder="tuaemail@esempio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      data-testid="input-email"
                      className="pl-10"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full gap-2" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                    />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Invia Link di Reset
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <p className="text-muted-foreground text-sm">
                    Ricordi la password?{" "}
                    <Link 
                      href="/login" 
                      className="text-primary font-medium hover:underline" 
                      data-testid="link-login"
                    >
                      Accedi
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <Button variant="ghost" size="sm" asChild data-testid="button-back-home">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna alla Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl">
      <Link href="/">
        <BrandLogo variant="horizontal" className="h-10 w-auto cursor-pointer" />
      </Link>
      <HapticButton 
        variant="ghost" 
        size="icon"
        asChild 
        data-testid="button-back-login"
        className="h-11 w-11"
        hapticType="light"
      >
        <Link href="/login">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </HapticButton>
    </div>
  );

  return (
    <MobileAppLayout header={header} contentClassName="flex flex-col justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="w-full"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6"
        >
          <Mail className="h-10 w-10 text-primary" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.15 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2">Password Dimenticata</h1>
          <p className="text-muted-foreground text-base">
            Inserisci la tua email per ricevere un link di reset password
          </p>
        </motion.div>

        <motion.form 
          onSubmit={handleSubmit} 
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
        >
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={springTransition}
              >
                <Alert variant="destructive" data-testid="alert-error" className="border-destructive/50">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base">{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {success && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={springTransition}
              >
                <Alert data-testid="alert-success" className="border-green-500/50 bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <AlertDescription className="text-green-400 text-base">
                    {success}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            <Label htmlFor="email" className="text-muted-foreground text-base font-medium">
              Email
            </Label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder="tuaemail@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                data-testid="input-email"
                className="h-14 pl-12 pr-4 text-base bg-muted/50 border-border text-foreground placeholder:text-muted-foreground rounded-xl"
              />
            </div>
          </div>

          <HapticButton 
            type="submit" 
            className="w-full h-14 text-base font-semibold rounded-xl gap-2" 
            disabled={isLoading}
            data-testid="button-submit"
            hapticType="medium"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full"
              />
            ) : (
              <>
                <Send className="h-5 w-5" />
                Invia Link di Reset
              </>
            )}
          </HapticButton>

          <motion.div 
            className="text-center pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...springTransition, delay: 0.3 }}
          >
            <p className="text-muted-foreground text-base">
              Ricordi la password?{" "}
              <Link 
                href="/login" 
                className="text-primary font-semibold active:opacity-70 transition-opacity" 
                data-testid="link-login"
                onClick={() => triggerHaptic('light')}
              >
                Accedi
              </Link>
            </p>
          </motion.div>
        </motion.form>
      </motion.div>
    </MobileAppLayout>
  );
}
