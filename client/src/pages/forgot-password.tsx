import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { triggerHaptic } from "@/components/mobile-primitives";

export default function ForgotPassword() {
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

  return (
    <div 
      className="fixed inset-0 bg-background flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
      >
        <div className="w-full max-w-sm flex flex-col items-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 25 }}
            className="mb-8"
          >
            <Link href="/">
              <img 
                src="/logo.png" 
                alt="EventFourYou" 
                className="h-16 w-auto cursor-pointer"
                data-testid="img-logo"
              />
            </Link>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full text-center mb-8"
          >
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Password dimenticata
            </h1>
            <p className="text-muted-foreground text-base">
              Inserisci la tua email per ricevere il link di reset
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3"
                data-testid="alert-error"
              >
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive text-sm">{error}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="w-full mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-start gap-3"
                data-testid="alert-success"
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSubmit} 
            className="w-full space-y-6"
          >
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tuaemail@esempio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-14 pl-12 text-base rounded-xl"
                  data-testid="input-email"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.98 }}
              onClick={() => triggerHaptic('light')}
              className="w-full h-14 bg-primary text-primary-foreground font-semibold text-base rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="button-submit"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Invio in corso...</span>
                </>
              ) : (
                <span>Invia link</span>
              )}
            </motion.button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Link 
              href="/login" 
              onClick={() => triggerHaptic('light')}
              className="flex items-center justify-center gap-2 text-muted-foreground min-h-[44px] min-w-[44px] px-4"
              data-testid="link-login"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-base">Torna al login</span>
            </Link>
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
