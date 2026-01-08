import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  MobileAppLayout, 
  HapticButton, 
  triggerHaptic 
} from "@/components/mobile-primitives";
import { BrandLogo } from "@/components/brand-logo";

const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

export default function ForgotPassword() {
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
      const response: any = await apiRequest('POST', '/api/forgot-password', { email });
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="page-forgot-password">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" data-testid="link-home">
              <BrandLogo variant="horizontal" className="h-16 w-auto" />
            </Link>
          </div>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Password dimenticata</CardTitle>
              <CardDescription>
                Inserisci la tua email per ricevere il link di reset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                    data-testid="alert-error"
                  >
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-destructive text-sm">{error}</p>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3"
                    data-testid="alert-success"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email-desktop">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email-desktop"
                      type="email"
                      placeholder="tuaemail@esempio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  data-testid="button-submit"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Invio in corso...</span>
                    </span>
                  ) : (
                    <span>Invia link</span>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link 
                  href="/login" 
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="link-login"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Torna al login</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <MobileAppLayout
      noPadding
      contentClassName="flex flex-col items-center justify-center px-6 py-8"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col items-center"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, ...springConfig }}
          className="mb-10"
        >
          <Link 
            href="/"
            onClick={() => triggerHaptic('light')}
            className="block min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <BrandLogo variant="horizontal" className="h-20 w-auto" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15, ...springConfig }}
          className="w-full text-center mb-10"
        >
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Password dimenticata
          </h1>
          <p className="text-muted-foreground text-lg px-4">
            Inserisci la tua email per ricevere il link di reset
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springConfig}
              className="w-full mb-6 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-start gap-4"
              data-testid="alert-error-mobile"
            >
              <AlertCircle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
              <p className="text-destructive text-base leading-relaxed">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={springConfig}
              className="w-full mb-6 p-5 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-start gap-4"
              data-testid="alert-success-mobile"
            >
              <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              <p className="text-green-600 dark:text-green-400 text-base leading-relaxed">{success}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, ...springConfig }}
          onSubmit={handleSubmit} 
          className="w-full space-y-8"
        >
          <div className="space-y-4">
            <Label htmlFor="email" className="text-lg font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground pointer-events-none" />
              <Input
                id="email"
                type="email"
                placeholder="tuaemail@esempio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-16 pl-14 pr-5 text-lg rounded-2xl border-2 focus:border-primary"
                data-testid="input-email-mobile"
              />
            </div>
          </div>

          <motion.div
            whileTap={{ scale: 0.98 }}
            transition={springConfig}
          >
            <HapticButton
              type="submit"
              disabled={isLoading}
              hapticType="medium"
              className="w-full h-16 text-lg font-semibold rounded-2xl"
              data-testid="button-submit-mobile"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span>Invio in corso...</span>
                </span>
              ) : (
                <span>Invia link</span>
              )}
            </HapticButton>
          </motion.div>
        </motion.form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, ...springConfig }}
          className="mt-10"
        >
          <Link 
            href="/login" 
            onClick={() => triggerHaptic('light')}
            className="flex items-center justify-center gap-3 text-muted-foreground min-h-[48px] min-w-[48px] px-6 py-3 rounded-xl active:bg-muted/50 transition-colors"
            data-testid="link-login-mobile"
          >
            <ArrowLeft className="h-6 w-6" />
            <span className="text-lg font-medium">Torna al login</span>
          </Link>
        </motion.div>
      </motion.div>
    </MobileAppLayout>
  );
}
