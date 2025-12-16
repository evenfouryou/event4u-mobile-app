import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Cookie, X, Settings, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface CookieSettings {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = "event4u_cookie_consent";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [settings, setSettings] = useState<CookieSettings>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  const { data: cookieConfig } = useQuery<{
    enabled: boolean;
    text: string;
    privacyUrl: string;
  }>({
    queryKey: ["/api/public/cookie-settings"],
  });

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent && cookieConfig?.enabled !== false) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [cookieConfig]);

  const handleAcceptAll = () => {
    const allAccepted: CookieSettings = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(allAccepted));
    setIsVisible(false);
  };

  const handleAcceptSelected = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(settings));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const necessaryOnly: CookieSettings = {
      necessary: true,
      analytics: false,
      marketing: false,
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(necessaryOnly));
    setIsVisible(false);
  };

  if (!isVisible || cookieConfig?.enabled === false) return null;

  const consentText = cookieConfig?.text || 
    "Utilizziamo i cookie per migliorare la tua esperienza sul nostro sito. Alcuni cookie sono necessari per il funzionamento del sito, mentre altri ci aiutano a capire come lo utilizzi.";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        data-testid="cookie-consent-banner"
      >
        <Card className="max-w-4xl mx-auto bg-background/95 backdrop-blur-lg border-border shadow-2xl">
          <div className="p-4 md:p-6">
            <div className="flex items-start gap-4">
              <div className="hidden md:flex w-12 h-12 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0">
                <Cookie className="w-6 h-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Cookie className="w-5 h-5 md:hidden text-primary" />
                      Impostazioni Cookie
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {consentText}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsVisible(false)}
                    className="flex-shrink-0"
                    data-testid="button-close-cookies"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <AnimatePresence>
                  {showDetails && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium text-sm">Cookie Necessari</p>
                          <p className="text-xs text-muted-foreground">Essenziali per il funzionamento del sito</p>
                        </div>
                        <div className="w-10 h-5 rounded-full bg-primary flex items-center justify-end px-0.5">
                          <div className="w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>
                      
                      <div 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                        onClick={() => setSettings(s => ({ ...s, analytics: !s.analytics }))}
                        data-testid="toggle-analytics-cookies"
                      >
                        <div>
                          <p className="font-medium text-sm">Cookie Analitici</p>
                          <p className="text-xs text-muted-foreground">Ci aiutano a capire come utilizzi il sito</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full ${settings.analytics ? 'bg-primary' : 'bg-muted-foreground/30'} flex items-center ${settings.analytics ? 'justify-end' : 'justify-start'} px-0.5 transition-all`}>
                          <div className="w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>
                      
                      <div 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover-elevate"
                        onClick={() => setSettings(s => ({ ...s, marketing: !s.marketing }))}
                        data-testid="toggle-marketing-cookies"
                      >
                        <div>
                          <p className="font-medium text-sm">Cookie di Marketing</p>
                          <p className="text-xs text-muted-foreground">Permettono di mostrarti annunci pertinenti</p>
                        </div>
                        <div className={`w-10 h-5 rounded-full ${settings.marketing ? 'bg-primary' : 'bg-muted-foreground/30'} flex items-center ${settings.marketing ? 'justify-end' : 'justify-start'} px-0.5 transition-all`}>
                          <div className="w-4 h-4 rounded-full bg-white" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="gap-1"
                    data-testid="button-cookie-details"
                  >
                    <Settings className="w-3 h-3" />
                    {showDetails ? "Nascondi" : "Personalizza"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRejectAll}
                    data-testid="button-reject-cookies"
                  >
                    Rifiuta tutti
                  </Button>
                  
                  {showDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAcceptSelected}
                      className="gap-1"
                      data-testid="button-accept-selected-cookies"
                    >
                      <Check className="w-3 h-3" />
                      Salva preferenze
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    onClick={handleAcceptAll}
                    className="gap-1"
                    data-testid="button-accept-all-cookies"
                  >
                    <Check className="w-3 h-3" />
                    Accetta tutti
                  </Button>
                </div>

                {cookieConfig?.privacyUrl && (
                  <p className="text-xs text-muted-foreground">
                    Per maggiori informazioni, consulta la nostra{" "}
                    <a 
                      href={cookieConfig.privacyUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Privacy Policy
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
