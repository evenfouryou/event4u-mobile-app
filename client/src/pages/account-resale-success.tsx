import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  CheckCircle2, 
  Loader2, 
  Ticket, 
  AlertCircle,
  ArrowRight,
  XCircle
} from "lucide-react";

export default function AccountResaleSuccess() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [newTicketId, setNewTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const urlParams = new URLSearchParams(window.location.search);
  const resaleId = urlParams.get('resale_id');
  
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!resaleId) throw new Error("ID rivendita mancante");
      const response = await apiRequest('POST', `/api/public/resales/${resaleId}/confirm`);
      return response;
    },
    onSuccess: (data: any) => {
      setConfirmationStatus('success');
      setNewTicketId(data.newTicketId);
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/resales'] });
      toast({
        title: "Acquisto completato!",
        description: "Il tuo nuovo biglietto è pronto.",
      });
    },
    onError: (error: any) => {
      setConfirmationStatus('error');
      setErrorMessage(error.message || "Errore nella conferma dell'acquisto");
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Errore nella conferma dell'acquisto",
      });
    },
  });
  
  useEffect(() => {
    if (resaleId && confirmationStatus === 'pending') {
      confirmMutation.mutate();
    }
  }, [resaleId]);
  
  if (!resaleId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Parametri mancanti</h2>
            <p className="text-muted-foreground mb-6">
              ID rivendita non trovato nella richiesta.
            </p>
            <Button onClick={() => setLocation("/account/tickets")} data-testid="button-go-tickets">
              Vai ai miei biglietti
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/30">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {confirmationStatus === 'pending' && (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Elaborazione in corso...
                </>
              )}
              {confirmationStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Acquisto completato!
                </>
              )}
              {confirmationStatus === 'error' && (
                <>
                  <AlertCircle className="w-6 h-6 text-destructive" />
                  Errore
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {confirmationStatus === 'pending' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="relative">
                  <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  </div>
                </div>
                <p className="text-muted-foreground">
                  Stiamo elaborando il tuo acquisto e generando il nuovo biglietto...
                </p>
              </motion.div>
            )}
            
            {confirmationStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                    className="w-24 h-24 mx-auto rounded-full bg-green-500/10 flex items-center justify-center"
                  >
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                  </motion.div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Il tuo nuovo biglietto è pronto!
                  </p>
                  <p className="text-muted-foreground text-sm">
                    Il biglietto originale è stato annullato e ne è stato emesso uno nuovo a tuo nome
                    con un nuovo sigillo fiscale SIAE-compliant.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  {newTicketId && (
                    <Button 
                      onClick={() => setLocation(`/account/tickets/${newTicketId}`)}
                      className="w-full"
                      data-testid="button-view-ticket"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Visualizza biglietto
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/account/tickets")}
                    className="w-full"
                    data-testid="button-go-tickets-success"
                  >
                    Vai ai miei biglietti
                  </Button>
                </div>
              </motion.div>
            )}
            
            {confirmationStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="relative">
                  <div className="w-24 h-24 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-destructive" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-lg font-medium">
                    Si è verificato un errore
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {errorMessage || "Non è stato possibile completare l'acquisto."}
                  </p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Button 
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending}
                    className="w-full"
                    data-testid="button-retry"
                  >
                    {confirmMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Riprova
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/account/tickets")}
                    className="w-full"
                    data-testid="button-go-tickets-error"
                  >
                    Vai ai miei biglietti
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
