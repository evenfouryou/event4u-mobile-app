import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight, RefreshCw } from "lucide-react";
import { triggerHaptic } from "@/components/mobile-primitives";
import { Button } from "@/components/ui/button";

const springConfig = { stiffness: 400, damping: 30 };

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Token di verifica mancante. Controlla il link nella tua email.');
        triggerHaptic('error');
        return;
      }

      try {
        const response = await fetch(`/api/verify-email/${token}`);
        const data = await response.json();

        if (response.ok) {
          if (data.alreadyVerified) {
            setStatus('already-verified');
            setMessage(data.message || 'Email già verificata');
            triggerHaptic('success');
          } else {
            setStatus('success');
            setMessage(data.message || 'Email verificata con successo!');
            triggerHaptic('success');
          }
        } else {
          setStatus('error');
          setMessage(data.message || 'Verifica fallita. Il link potrebbe essere scaduto o non valido.');
          triggerHaptic('error');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Errore durante la verifica. Riprova più tardi.');
        triggerHaptic('error');
      }
    };

    verifyEmail();
  }, []);

  const handleButtonClick = (type: 'light' | 'medium' = 'medium') => {
    triggerHaptic(type);
  };

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
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", ...springConfig }}
            className="w-full flex flex-col items-center text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", ...springConfig, delay: 0.1 }}
              className={`w-24 h-24 rounded-full flex items-center justify-center mb-8 ${
                status === 'loading' 
                  ? 'bg-primary/10' 
                  : status === 'error' 
                    ? 'bg-destructive/10' 
                    : 'bg-green-500/10'
              }`}
            >
              {status === 'loading' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="h-12 w-12 text-primary" />
                </motion.div>
              )}
              {(status === 'success' || status === 'already-verified') && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", ...springConfig, delay: 0.2 }}
                >
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                </motion.div>
              )}
              {status === 'error' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", ...springConfig, delay: 0.2 }}
                >
                  <XCircle className="h-12 w-12 text-destructive" />
                </motion.div>
              )}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", ...springConfig, delay: 0.2 }}
              className="text-2xl font-bold text-foreground mb-3"
              data-testid="text-verification-title"
            >
              {status === 'loading' && 'Verifica in corso...'}
              {status === 'success' && 'Email Verificata!'}
              {status === 'already-verified' && 'Email già Verificata'}
              {status === 'error' && 'Verifica Fallita'}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", ...springConfig, delay: 0.3 }}
              className="text-base text-muted-foreground mb-8 px-4"
              data-testid="text-verification-message"
            >
              {message || (status === 'loading' && 'Stiamo verificando la tua email...')}
            </motion.p>

            {(status === 'success' || status === 'already-verified') && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", ...springConfig, delay: 0.4 }}
                className="w-full space-y-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", ...springConfig, delay: 0.5 }}
                  className="bg-card/50 backdrop-blur-xl border border-border rounded-2xl p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-foreground text-left flex-1">
                      Ora puoi accedere alla piattaforma con le tue credenziali.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", ...springConfig, delay: 0.4 }}
                className="w-full"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", ...springConfig, delay: 0.5 }}
                  className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 mb-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <RefreshCw className="h-5 w-5 text-destructive" />
                    </div>
                    <p className="text-muted-foreground text-left text-sm pt-2">
                      Se il problema persiste, contatta il supporto o richiedi un nuovo link di verifica.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", ...springConfig, delay: 0.6 }}
        className="px-6 pb-6 space-y-3"
      >
        {(status === 'success' || status === 'already-verified') && (
          <Button
            className="w-full min-h-[56px] text-base font-semibold rounded-2xl"
            asChild
            onClick={() => handleButtonClick('medium')}
            data-testid="button-go-to-login"
          >
            <Link href="/login">
              Vai al Login
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        )}

        {status === 'error' && (
          <>
            <Button
              className="w-full min-h-[56px] text-base font-semibold rounded-2xl"
              variant="outline"
              asChild
              onClick={() => handleButtonClick('light')}
              data-testid="button-back-to-register"
            >
              <Link href="/register">
                Torna alla Registrazione
              </Link>
            </Button>
            <Button
              className="w-full min-h-[56px] text-base font-semibold rounded-2xl"
              variant="ghost"
              asChild
              onClick={() => handleButtonClick('light')}
              data-testid="button-go-to-login"
            >
              <Link href="/login">
                Vai al Login
              </Link>
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
}
