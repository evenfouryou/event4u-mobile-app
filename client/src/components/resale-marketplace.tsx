import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { 
  RefreshCw,
  Ticket, 
  Tag,
  ShoppingCart,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Shield,
  Clock,
} from "lucide-react";

interface ResaleItem {
  id: string;
  resalePrice: string;
  originalPrice: string;
  listedAt: string;
  ticketType: string;
  sectorName: string;
  sectorId: string;
}

interface ResaleMarketplaceProps {
  eventId: string;
  isAuthenticated: boolean;
  embedded?: boolean;
}

export function ResaleMarketplace({ eventId, isAuthenticated, embedded = false }: ResaleMarketplaceProps) {
  const { toast } = useToast();
  const [selectedResale, setSelectedResale] = useState<ResaleItem | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  
  const { data, isLoading, refetch } = useQuery<{ resales: ResaleItem[] }>({
    queryKey: ['/api/public/events', eventId, 'resales'],
    queryFn: async () => {
      const response = await fetch(`/api/public/events/${eventId}/resales`);
      if (!response.ok) throw new Error('Failed to fetch resales');
      return response.json();
    },
    enabled: !!eventId,
    refetchInterval: 30000,
  });
  
  const reserveMutation = useMutation({
    mutationFn: async (resaleId: string) => {
      const response = await apiRequest(`/api/public/resales/${resaleId}/reserve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      return response;
    },
    onSuccess: (data: any) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Impossibile procedere con l'acquisto",
      });
      setShowPurchaseDialog(false);
    },
  });
  
  const handlePurchaseClick = (resale: ResaleItem) => {
    if (!isAuthenticated) {
      toast({
        title: "Accesso richiesto",
        description: "Devi effettuare il login per acquistare un biglietto in rivendita.",
      });
      return;
    }
    setSelectedResale(resale);
    setShowPurchaseDialog(true);
  };
  
  const handleConfirmPurchase = () => {
    if (selectedResale) {
      reserveMutation.mutate(selectedResale.id);
    }
  };
  
  const resales = data?.resales || [];
  
  if (isLoading) {
    if (embedded) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      );
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            Rivendite disponibili
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (resales.length === 0) {
    if (embedded) {
      return (
        <div className="text-center py-8">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Nessuna rivendita</h3>
          <p className="text-sm text-muted-foreground">
            Non ci sono biglietti in rivendita al momento.
          </p>
        </div>
      );
    }
    return null;
  }
  
  const resaleList = (
    <div className="space-y-3" data-testid="grid-resales">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Biglietti in vendita da altri utenti
        </p>
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
          <Shield className="w-3 h-3 mr-1" />
          SIAE verificato
        </Badge>
      </div>
      {resales.map((resale) => {
        const originalPrice = parseFloat(resale.originalPrice);
        const resalePrice = parseFloat(resale.resalePrice);
        const discount = originalPrice > 0 
          ? Math.round((1 - resalePrice / originalPrice) * 100)
          : 0;
        
        return (
          <div
            key={resale.id}
            className="p-4 rounded-xl border border-border hover-elevate transition-all"
            data-testid={`card-resale-${resale.id}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground" data-testid={`text-resale-sector-${resale.id}`}>
                    {resale.sectorName}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="w-3 h-3" />
                    <span>{resale.ticketType}</span>
                    <span className="text-xs">•</span>
                    <Clock className="w-3 h-3" />
                    <span>
                      In vendita da {format(new Date(resale.listedAt), "d MMM", { locale: it })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary" data-testid={`text-resale-price-${resale.id}`}>
                      €{resalePrice.toFixed(2)}
                    </span>
                    {discount > 0 && (
                      <Badge className="bg-green-500 text-white border-0 text-xs">
                        -{discount}%
                      </Badge>
                    )}
                  </div>
                  {originalPrice !== resalePrice && (
                    <p className="text-xs text-muted-foreground line-through">
                      Originale: €{originalPrice.toFixed(2)}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePurchaseClick(resale)}
                  data-testid={`button-buy-resale-${resale.id}`}
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Acquista
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      
      <div className="pt-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-muted-foreground"
          data-testid="button-refresh-resales"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aggiorna lista
        </Button>
      </div>
    </div>
  );
  
  if (embedded) {
    return (
      <>
        {resaleList}
        <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Conferma acquisto rivendita
              </DialogTitle>
              <DialogDescription>
                Stai per acquistare un biglietto in rivendita
              </DialogDescription>
            </DialogHeader>
            
            {selectedResale && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Settore</span>
                    <span className="font-medium">{selectedResale.sectorName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Tipo</span>
                    <span className="font-medium">{selectedResale.ticketType}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Prezzo</span>
                    <span className="text-xl font-bold text-primary">
                      €{parseFloat(selectedResale.resalePrice).toFixed(2)}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-700 dark:text-green-400">
                      Transazione protetta SIAE
                    </p>
                    <p className="text-muted-foreground">
                      Il biglietto originale verrà annullato e ne verrà emesso uno nuovo a tuo nome.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPurchaseDialog(false)}
                disabled={reserveMutation.isPending}
                data-testid="button-cancel-resale"
              >
                Annulla
              </Button>
              <Button
                onClick={handleConfirmPurchase}
                disabled={reserveMutation.isPending}
                data-testid="button-confirm-resale"
              >
                {reserveMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Elaborazione...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Procedi al pagamento
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }
  
  return (
    <>
      <Card data-testid="card-resale-marketplace">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-green-500" />
                Rivendite disponibili
              </CardTitle>
              <CardDescription className="mt-1">
                Biglietti in vendita da altri utenti
              </CardDescription>
            </div>
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <Shield className="w-3 h-3 mr-1" />
              SIAE verificato
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {resales.map((resale) => {
            const originalPrice = parseFloat(resale.originalPrice);
            const resalePrice = parseFloat(resale.resalePrice);
            const discount = originalPrice > 0 
              ? Math.round((1 - resalePrice / originalPrice) * 100)
              : 0;
            
            return (
              <div
                key={resale.id}
                className="p-4 rounded-xl border border-border hover-elevate transition-all"
                data-testid={`card-resale-${resale.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <Ticket className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground" data-testid={`text-resale-sector-${resale.id}`}>
                        {resale.sectorName}
                      </h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="w-3 h-3" />
                        <span>{resale.ticketType}</span>
                        <span className="text-xs">•</span>
                        <Clock className="w-3 h-3" />
                        <span>
                          In vendita da {format(new Date(resale.listedAt), "d MMM", { locale: it })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary" data-testid={`text-resale-price-${resale.id}`}>
                          €{resalePrice.toFixed(2)}
                        </span>
                        {discount > 0 && (
                          <Badge className="bg-green-500 text-white border-0 text-xs">
                            -{discount}%
                          </Badge>
                        )}
                      </div>
                      {originalPrice !== resalePrice && (
                        <p className="text-xs text-muted-foreground line-through">
                          Originale: €{originalPrice.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handlePurchaseClick(resale)}
                      data-testid={`button-buy-resale-${resale.id}`}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Acquista
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          
          <div className="pt-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              className="text-muted-foreground"
              data-testid="button-refresh-resales"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna lista
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Conferma acquisto rivendita
            </DialogTitle>
            <DialogDescription>
              Stai per acquistare un biglietto in rivendita
            </DialogDescription>
          </DialogHeader>
          
          {selectedResale && (
            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Settore</span>
                  <span className="font-medium">{selectedResale.sectorName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tipo</span>
                  <span className="font-medium">{selectedResale.ticketType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Prezzo</span>
                  <span className="text-xl font-bold text-primary">
                    €{parseFloat(selectedResale.resalePrice).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <Shield className="w-5 h-5 text-green-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-green-700 dark:text-green-400">
                    Transazione protetta SIAE
                  </p>
                  <p className="text-muted-foreground">
                    Il biglietto originale verrà annullato e ne riceverai uno nuovo a tuo nome con sigillo fiscale valido.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-400">
                    Prenotazione temporanea
                  </p>
                  <p className="text-muted-foreground">
                    Hai 10 minuti per completare il pagamento, altrimenti il biglietto tornerà disponibile.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPurchaseDialog(false)}
              disabled={reserveMutation.isPending}
              data-testid="button-cancel-purchase"
            >
              Annulla
            </Button>
            <Button
              onClick={handleConfirmPurchase}
              disabled={reserveMutation.isPending}
              data-testid="button-confirm-purchase"
            >
              {reserveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Elaborazione...
                </>
              ) : (
                <>
                  Procedi al pagamento
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
