import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [confirmationStatus, setConfirmationStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [newTicketId, setNewTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const urlParams = new URLSearchParams(window.location.search);
  const resaleId = urlParams.get('resale_id');
  const confirmToken = urlParams.get('token'); // Secure token from Stripe redirect
  const alreadyConfirmed = urlParams.get('success') === 'true'; // Checkout already confirmed
  
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!resaleId) throw new Error(t("account.resaleSuccessPage.resaleIdMissing"));
      // Include token in body for authentication when session cookies are lost after Stripe redirect
      const response = await apiRequest('POST', `/api/public/resales/${resaleId}/confirm`, { token: confirmToken });
      return await response.json();
    },
    onSuccess: (data: any) => {
      setConfirmationStatus('success');
      setNewTicketId(data.newTicketId);
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/tickets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/public/account/resales'] });
      toast({
        title: t("account.resaleSuccessPage.toastSuccess"),
        description: t("account.resaleSuccessPage.toastSuccessDesc"),
      });
    },
    onError: async (error: any) => {
      console.log("[ResaleSuccess] Confirm failed, attempting recovery...", error.message);
      // Try automatic recovery before showing error
      try {
        const recoveryResponse = await fetch(`/api/public/resales/${resaleId}/recover`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ token: confirmToken }),
        });
        
        if (recoveryResponse.ok) {
          const recoveryResult = await recoveryResponse.json();
          if (recoveryResult.success || recoveryResult.alreadyCompleted) {
            console.log("[ResaleSuccess] Recovery successful:", recoveryResult);
            setConfirmationStatus('success');
            setNewTicketId(recoveryResult.newTicketId);
            queryClient.invalidateQueries({ queryKey: ['/api/public/account/tickets'] });
            queryClient.invalidateQueries({ queryKey: ['/api/public/account/resales'] });
            toast({
              title: t("account.resaleSuccessPage.toastSuccess"),
              description: recoveryResult.recovered 
                ? t("account.resaleSuccessPage.recoveredDesc") 
                : t("account.resaleSuccessPage.toastSuccessDesc"),
            });
            return; // Don't show error
          }
        }
      } catch (recoveryError) {
        console.error("[ResaleSuccess] Recovery also failed:", recoveryError);
      }
      
      // Recovery failed, show error
      setConfirmationStatus('error');
      setErrorMessage(error.message || t("account.resaleSuccessPage.confirmError"));
      toast({
        variant: "destructive",
        title: t("account.resaleSuccessPage.error"),
        description: error.message || t("account.resaleSuccessPage.confirmError"),
      });
    },
  });
  
  useEffect(() => {
    if (resaleId && confirmationStatus === 'pending') {
      if (alreadyConfirmed) {
        // Checkout already confirmed successfully, skip redundant call
        console.log("[ResaleSuccess] Skipping confirm - already confirmed by checkout");
        setConfirmationStatus('success');
        queryClient.invalidateQueries({ queryKey: ['/api/public/account/tickets'] });
        queryClient.invalidateQueries({ queryKey: ['/api/public/account/resales'] });
      } else {
        // This is a Stripe redirect or recovery scenario - need to confirm
        console.log("[ResaleSuccess] Confirming - this is a Stripe redirect or recovery");
        confirmMutation.mutate();
      }
    }
  }, [resaleId, alreadyConfirmed]);
  
  if (!resaleId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">{t("account.resaleSuccessPage.missingParams")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("account.resaleSuccessPage.missingResaleId")}
            </p>
            <Button onClick={() => setLocation("/account/tickets")} data-testid="button-go-tickets">
              {t("account.resaleSuccessPage.goToTickets")}
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
                  {t("account.resaleSuccessPage.processing")}
                </>
              )}
              {confirmationStatus === 'success' && (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  {t("account.resaleSuccessPage.purchaseComplete")}
                </>
              )}
              {confirmationStatus === 'error' && (
                <>
                  <AlertCircle className="w-6 h-6 text-destructive" />
                  {t("account.resaleSuccessPage.error")}
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
                  {t("account.resaleSuccessPage.processingDesc")}
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
                    {t("account.resaleSuccessPage.ticketReady")}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t("account.resaleSuccessPage.ticketReadyDesc")}
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
                      {t("account.resaleSuccessPage.viewTicket")}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/account/tickets")}
                    className="w-full"
                    data-testid="button-go-tickets-success"
                  >
                    {t("account.resaleSuccessPage.goToTickets")}
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
                    {t("account.resaleSuccessPage.errorOccurred")}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {errorMessage || t("account.resaleSuccessPage.purchaseError")}
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
                    {t("account.resaleSuccessPage.retry")}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/account/tickets")}
                    className="w-full"
                    data-testid="button-go-tickets-error"
                  >
                    {t("account.resaleSuccessPage.goToTickets")}
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
