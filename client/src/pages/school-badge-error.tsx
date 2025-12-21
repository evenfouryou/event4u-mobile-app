import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { XCircle, AlertTriangle, Clock, Home, RefreshCw } from "lucide-react";
import { MobileAppLayout, HapticButton, triggerHaptic } from "@/components/mobile-primitives";

const springConfig = { stiffness: 400, damping: 30 };

const ERROR_MESSAGES: Record<string, { title: string; description: string; icon: typeof XCircle; color: string }> = {
  "missing-token": {
    title: "Token mancante",
    description: "Il link di verifica non contiene un token valido. Assicurati di aver copiato correttamente il link dall'email.",
    icon: AlertTriangle,
    color: "text-amber-500",
  },
  "invalid-token": {
    title: "Token non valido",
    description: "Il link di verifica non è valido. Potrebbe essere stato già utilizzato o non esiste.",
    icon: XCircle,
    color: "text-destructive",
  },
  "expired-token": {
    title: "Link scaduto",
    description: "Il link di verifica è scaduto. I link sono validi per 24 ore. Richiedi un nuovo badge per ricevere un nuovo link.",
    icon: Clock,
    color: "text-amber-500",
  },
  "server-error": {
    title: "Errore del server",
    description: "Si è verificato un errore durante la verifica. Riprova più tardi o contatta l'assistenza.",
    icon: XCircle,
    color: "text-destructive",
  },
};

export default function SchoolBadgeError() {
  const [, setLocation] = useLocation();
  
  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") || "server-error";
  
  const errorInfo = ERROR_MESSAGES[reason] || ERROR_MESSAGES["server-error"];
  const IconComponent = errorInfo.icon;

  const handleGoHome = () => {
    triggerHaptic('medium');
    setLocation("/");
  };

  const handleRetry = () => {
    triggerHaptic('light');
    window.location.reload();
  };

  return (
    <MobileAppLayout
      className="bg-background"
      contentClassName="flex flex-col items-center justify-center px-6"
      noPadding
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", ...springConfig }}
        className="w-full flex flex-col items-center text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", ...springConfig, delay: 0.1 }}
          className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center mb-6"
        >
          <motion.div
            initial={{ rotate: -180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: "spring", ...springConfig, delay: 0.2 }}
          >
            <IconComponent className={`h-10 w-10 ${errorInfo.color}`} />
          </motion.div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", ...springConfig, delay: 0.15 }}
          className="text-2xl font-bold text-foreground mb-3"
          data-testid="text-error-title"
        >
          {errorInfo.title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", ...springConfig, delay: 0.2 }}
          className="text-base text-muted-foreground leading-relaxed mb-10 px-4"
          data-testid="text-error-description"
        >
          {errorInfo.description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", ...springConfig, delay: 0.25 }}
          className="w-full flex flex-col gap-3 px-2"
        >
          <HapticButton
            onClick={handleGoHome}
            hapticType="medium"
            className="w-full h-14 text-base font-semibold rounded-2xl"
            data-testid="button-go-home"
          >
            <Home className="h-5 w-5 mr-3" />
            Torna alla home
          </HapticButton>

          {reason === "server-error" && (
            <HapticButton
              variant="outline"
              onClick={handleRetry}
              hapticType="light"
              className="w-full h-14 text-base font-medium rounded-2xl"
              data-testid="button-retry"
            >
              <RefreshCw className="h-5 w-5 mr-3" />
              Riprova
            </HapticButton>
          )}
        </motion.div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-8 text-xs text-muted-foreground/60"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        Codice errore: {reason}
      </motion.p>
    </MobileAppLayout>
  );
}
