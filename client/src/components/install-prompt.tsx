import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                               (window.navigator as any).standalone === true;
    
    setIsIOS(isIOSDevice);
    
    if (isInStandaloneMode) {
      return;
    }

    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    if (isIOSDevice) {
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 z-50 animate-in slide-in-from-bottom-4"
      data-testid="install-prompt"
    >
      <div className="bg-card border border-border rounded-lg shadow-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Installa Event4U</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isIOS 
                ? "Tocca l'icona Condividi e poi 'Aggiungi alla schermata Home'"
                : "Installa l'app per un accesso rapido"
              }
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0 -mt-1 -mr-1"
            onClick={handleDismiss}
            data-testid="button-dismiss-install"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {!isIOS && deferredPrompt && (
          <div className="mt-3 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleDismiss}
              data-testid="button-later-install"
            >
              Più tardi
            </Button>
            <Button 
              size="sm" 
              className="flex-1"
              onClick={handleInstall}
              data-testid="button-install-app"
            >
              <Download className="w-4 h-4 mr-2" />
              Installa
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
