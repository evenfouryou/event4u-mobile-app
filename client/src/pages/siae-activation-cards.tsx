import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Building2, Shield, Loader2, Wifi, WifiOff, RefreshCw, Users, Hash, Wallet, Monitor, CheckCircle2, XCircle, Download } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useSmartCardStatus, smartCardService } from "@/lib/smart-card-service";

type SiaeActivationCard = {
  id: string;
  companyId: string;
  cardNumber: string;
  fiscalCode: string;
  activationDate?: string;
  expirationDate?: string;
  status: string;
  createdAt: string;
};

type Company = {
  id: string;
  name: string;
};

type CardUsageStats = {
  card: SiaeActivationCard | null;
  totalSeals: number;
  totalTickets: number;
  organizers: {
    userId: string;
    username: string;
    fullName: string;
    ticketCount: number;
    lastEmission: string | null;
  }[];
};

export default function SiaeActivationCardsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const smartCardStatus = useSmartCardStatus();

  const handleRefreshCard = async () => {
    setIsRefreshing(true);
    smartCardService.startPolling();
    setTimeout(() => setIsRefreshing(false), 2000);
  };

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['/api/companies'],
  });

  const { data: cards = [] } = useQuery<SiaeActivationCard[]>({
    queryKey: ['/api/siae/activation-cards'],
  });

  // Query to get usage stats when a physical card is inserted - auto-refresh every 5 seconds
  const { data: cardUsageStats, isLoading: usageStatsLoading } = useQuery<CardUsageStats>({
    queryKey: ['/api/siae/activation-cards/by-serial', smartCardStatus.cardSerial],
    enabled: !!smartCardStatus.cardSerial && smartCardStatus.cardInserted,
    refetchInterval: smartCardStatus.cardInserted ? 5000 : false,
    retry: false,
  });

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-auto h-full pb-24 md:pb-8" data-testid="page-siae-activation-cards">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2" data-testid="title-page">Lettore Carte SIAE</h1>
          <p className="text-muted-foreground text-sm md:text-base" data-testid="description-page">
            Gestione Smart Card e Carte di Attivazione per biglietteria elettronica
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefreshCard}
          disabled={isRefreshing}
          data-testid="button-refresh-main"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card" data-testid="card-stats-total">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carte Totali</CardTitle>
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-total-cards">
              {cards.length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-stats-active">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carte Attive</CardTitle>
            <Shield className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-500" data-testid="text-active-cards">
              {cards.filter(c => c.status === 'active').length}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card" data-testid="card-stats-companies">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aziende</CardTitle>
            <Building2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold" data-testid="text-companies-count">
              {companies.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      <Card className="glass-card" data-testid="card-connection-status">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Stato Connessione Lettore
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className={`w-2.5 h-2.5 rounded-full ${smartCardStatus.relayConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <div>
                <p className="text-xs font-medium">Server Relay</p>
                <p className="text-xs text-muted-foreground">
                  {smartCardStatus.relayConnected ? 'Connesso' : 'Non connesso'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              <div className={`w-2.5 h-2.5 rounded-full ${smartCardStatus.bridgeConnected ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <div>
                <p className="text-xs font-medium">Bridge .NET</p>
                <p className="text-xs text-muted-foreground">
                  {smartCardStatus.bridgeConnected ? 'Attivo' : 'Non attivo'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
              {smartCardStatus.readerDetected ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
              <div>
                <p className="text-xs font-medium">Lettore</p>
                <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                  {smartCardStatus.readerDetected ? (smartCardStatus.readerName || 'Rilevato') : 'Non rilevato'}
                </p>
              </div>
            </div>
          </div>
          
          {!smartCardStatus.connected && (
            <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Download className="w-3 h-3" />
                Scarica l'app desktop Event4U per connettere il lettore
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={`glass-card border-2 ${smartCardStatus.cardInserted ? 'border-green-500/50' : 'border-orange-500/30'}`} data-testid="card-live-smartcard">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${smartCardStatus.cardInserted ? 'bg-green-500/20' : 'bg-orange-500/20'}`}>
                <CreditCard className={`w-6 h-6 ${smartCardStatus.cardInserted ? 'text-green-500' : 'text-orange-500'}`} />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2" data-testid="title-live-card">
                  Smart Card SIAE
                  {smartCardStatus.connected ? (
                    <Badge variant="default" className="bg-green-500 text-xs">
                      <Wifi className="w-3 h-3 mr-1" /> LIVE
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      <WifiOff className="w-3 h-3 mr-1" /> Offline
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription data-testid="description-live-card">
                  {smartCardStatus.cardInserted 
                    ? "Carta inserita - Dati letti in tempo reale"
                    : smartCardStatus.readerDetected
                      ? "Lettore connesso - Inserire la carta SIAE"
                      : "Connettere il lettore MiniLector EVO"}
                </CardDescription>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleRefreshCard}
              disabled={isRefreshing}
              data-testid="button-refresh-card"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {smartCardStatus.cardInserted ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="live-card-data">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Hash className="w-3 h-3" /> Seriale Carta
                  </div>
                  <div className="font-mono font-semibold text-sm" data-testid="live-card-serial">
                    {smartCardStatus.cardSerial || '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Contatore Sigilli
                  </div>
                  <div className="font-mono font-semibold text-sm text-green-500" data-testid="live-card-counter">
                    {smartCardStatus.cardCounter?.toLocaleString('it-IT') || '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wallet className="w-3 h-3" /> Saldo Carta
                  </div>
                  <div className="font-mono font-semibold text-sm" data-testid="live-card-balance">
                    {smartCardStatus.cardBalance?.toLocaleString('it-IT') || '-'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Codice Sistema
                  </div>
                  <div className="font-mono font-semibold text-sm" data-testid="live-card-keyid">
                    {smartCardStatus.cardKeyId || '-'}
                  </div>
                </div>
              </div>

              {usageStatsLoading ? (
              <div className="mt-4 flex items-center justify-center py-4" data-testid="loading-usage-stats">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Caricamento statistiche...</span>
              </div>
            ) : cardUsageStats?.organizers && cardUsageStats.organizers.length > 0 ? (
              <div className="mt-4 border-t pt-4" data-testid="organizers-section">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Organizzatori che hanno usato questa carta</span>
                  <Badge variant="secondary" className="text-xs">
                    {cardUsageStats.totalTickets} biglietti emessi
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cardUsageStats.organizers.map((org) => (
                    <div 
                      key={org.userId} 
                      className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                      data-testid={`organizer-${org.userId}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                          {org.fullName?.charAt(0) || org.username?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{org.fullName || org.username}</div>
                          <div className="text-xs text-muted-foreground">@{org.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default" className="text-xs">
                          {org.ticketCount} biglietti
                        </Badge>
                        {org.lastEmission && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {format(new Date(org.lastEmission), 'dd/MM HH:mm', { locale: it })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : cardUsageStats?.card ? (
              <div className="mt-4 border-t pt-4 text-center text-sm text-muted-foreground" data-testid="no-organizers">
                <Users className="w-6 h-6 mx-auto mb-2 opacity-30" />
                Nessun biglietto emesso con questa carta
              </div>
            ) : smartCardStatus.cardSerial ? (
              <div className="mt-4 border-t pt-4 text-center text-sm text-muted-foreground" data-testid="card-not-in-db">
                <CreditCard className="w-6 h-6 mx-auto mb-2 opacity-30" />
                Carta non registrata nel database
              </div>
            ) : null}
            </>
          ) : (
            <div className="flex items-center justify-center py-6 text-muted-foreground" data-testid="no-card-message">
              <div className="text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Inserisci una Smart Card SIAE per visualizzare i dati</p>
                {smartCardStatus.readerName && (
                  <p className="text-xs mt-2">Lettore: {smartCardStatus.readerName}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
