import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Wifi, 
  WifiOff, 
  Monitor, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  RefreshCw,
  Download,
  AlertTriangle
} from "lucide-react";
import { useSmartCardStatus, smartCardService } from "@/lib/smart-card-service";
import { useState } from "react";

export default function SiaeCardReaderPage() {
  const status = useSmartCardStatus();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    smartCardService.startPolling();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-card-reader-title">
              Lettore Carte SIAE
            </h1>
            <p className="text-muted-foreground">
              Stato del lettore Smart Card e della carta SIAE inserita
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh-status"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </motion.div>

      {/* Connection Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                status.connected ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}>
                {status.connected ? (
                  <Wifi className="h-5 w-5 text-green-500" />
                ) : (
                  <WifiOff className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div>
                <CardTitle className="text-lg">Stato Connessione</CardTitle>
                <CardDescription>
                  Desktop App Event Four You
                </CardDescription>
              </div>
              <div className="ml-auto">
                <Badge variant={status.connected ? "default" : "destructive"}>
                  {status.connected ? 'Connesso' : 'Non Connesso'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <div className={`w-3 h-3 rounded-full ${status.relayConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <div>
                  <p className="text-sm font-medium">Server Relay</p>
                  <p className="text-xs text-muted-foreground">
                    {status.relayConnected ? 'Connesso' : 'Non connesso'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <div className={`w-3 h-3 rounded-full ${status.bridgeConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm font-medium">Bridge .NET</p>
                  <p className="text-xs text-muted-foreground">
                    {status.bridgeConnected ? 'Attivo' : 'Non attivo'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                {status.readerDetected ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">Lettore</p>
                  <p className="text-xs text-muted-foreground">
                    {status.readerDetected ? (status.readerName || 'Rilevato') : 'Non rilevato'}
                  </p>
                </div>
              </div>
            </div>

            {status.error && !status.demoMode && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {status.error}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Smart Card Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className={status.cardInserted ? 'border-green-500/50' : ''}>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                status.cardInserted ? 'bg-green-500/20' : 'bg-muted'
              }`}>
                <CreditCard className={`h-5 w-5 ${status.cardInserted ? 'text-green-500' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Smart Card SIAE</CardTitle>
                <CardDescription>
                  Carta sigilli per emissione biglietti
                </CardDescription>
              </div>
              <div className="ml-auto">
                <Badge variant={status.cardInserted ? "default" : "secondary"}>
                  {status.cardInserted ? 'Inserita' : 'Non inserita'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {status.cardInserted ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-600">Carta Pronta per l'Emissione</span>
                  </div>
                  
                  <div className="grid gap-3">
                    {status.cardSerial && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                        <span className="text-sm text-muted-foreground">Numero Seriale</span>
                        <span className="font-mono font-semibold" data-testid="text-card-serial">
                          {status.cardSerial}
                        </span>
                      </div>
                    )}
                    
                    {status.cardAtr && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                        <span className="text-sm text-muted-foreground">ATR</span>
                        <span className="font-mono text-xs" data-testid="text-card-atr">
                          {status.cardAtr}
                        </span>
                      </div>
                    )}
                    
                    {status.cardType && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                        <span className="text-sm text-muted-foreground">Tipo</span>
                        <span data-testid="text-card-type">{status.cardType}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50">
                      <span className="text-sm text-muted-foreground">Ultimo Controllo</span>
                      <span className="text-sm">
                        {status.lastCheck.toLocaleTimeString('it-IT')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Sistema pronto per emettere biglietti con sigillo fiscale
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">
                  Nessuna Smart Card SIAE inserita
                </p>
                <p className="text-sm text-muted-foreground">
                  Inserire la carta nel lettore MiniLector EVO per abilitare l'emissione biglietti
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Download App Section */}
      {!status.connected && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mt-6 border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Monitor className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Desktop App Richiesta</CardTitle>
                  <CardDescription>
                    Scarica e avvia l'app desktop per collegare il lettore
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Per utilizzare il lettore Smart Card SIAE, è necessario scaricare e avviare 
                l'applicazione desktop "Event Four You - SIAE Lettore" sul PC dove è collegato 
                il lettore MiniLector EVO.
              </p>
              <Button asChild className="gradient-golden text-black font-semibold">
                <a href="/download-smart-card-app">
                  <Download className="h-4 w-4 mr-2" />
                  Scarica App Desktop
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Demo Mode */}
      {status.demoMode && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="mt-6 border-amber-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-600">Modalità Demo Attiva</p>
                  <p className="text-sm text-muted-foreground">
                    I sigilli generati non sono validi per uso fiscale
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
