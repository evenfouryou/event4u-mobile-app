import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MobileAppLayout,
  MobileHeader,
} from "@/components/mobile-primitives";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Ticket,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Euro,
  CreditCard,
} from "lucide-react";

const nameChangeSchema = z.object({
  newFirstName: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  newLastName: z.string().min(2, "Il cognome deve avere almeno 2 caratteri"),
  newEmail: z.string().email("Inserisci un'email valida"),
  newFiscalCode: z.string().length(16, "Il codice fiscale deve essere di 16 caratteri").toUpperCase(),
  newDocumentType: z.enum(["carta_identita", "passaporto", "patente"], {
    required_error: "Seleziona un tipo di documento",
  }),
  newDocumentNumber: z.string().min(5, "Inserisci un numero documento valido"),
  newDateOfBirth: z.string().min(1, "Inserisci la data di nascita"),
});

type NameChangeFormData = z.infer<typeof nameChangeSchema>;

interface TicketDetail {
  id: string;
  ticketCode: string;
  ticketType: string;
  ticketTypeCode: string;
  ticketPrice: string;
  participantFirstName: string | null;
  participantLastName: string | null;
  status: string;
  eventName: string;
  eventStart: string;
  locationName: string;
  locationAddress: string | null;
  sectorName: string;
  canNameChange: boolean;
  hoursToEvent: number;
  nameChangeFee: string;
}

interface NameChangeResponse {
  message: string;
  nameChangeId: string;
  fee: string;
  paymentStatus: string;
  requiresPayment: boolean;
}

interface PaymentIntentResponse {
  clientSecret: string;
  amount: number;
}

let stripePromise: Promise<any> | null = null;

async function getStripe() {
  if (!stripePromise) {
    const response = await fetch("/api/public/stripe-key");
    const { publishableKey } = await response.json();
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

function NameChangePaymentForm({
  nameChangeId,
  fee,
  onSuccess,
  onCancel,
}: {
  nameChangeId: string;
  fee: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements || !isReady) return;

    setIsProcessing(true);
    setError(null);

    try {
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account/tickets`,
        },
        redirect: "if_required",
      });

      if (paymentError) {
        setError(paymentError.message || "Pagamento fallito. Riprova.");
        setIsProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        await apiRequest("POST", `/api/public/account/name-change/${nameChangeId}/pay/confirm`, {
          paymentIntentId: paymentIntent.id,
        });

        toast({
          title: "Pagamento completato",
          description: "Il cambio nominativo sarà processato a breve.",
        });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || "Errore durante il pagamento.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Commissione cambio nominativo</span>
          <span className="font-semibold text-foreground">€{parseFloat(fee).toFixed(2)}</span>
        </div>
      </div>

      <div className="p-4 bg-muted/30 rounded-lg border border-border">
        <PaymentElement
          options={{ layout: "tabs" }}
          onReady={() => setIsReady(true)}
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
          data-testid="button-cancel-payment"
        >
          Annulla
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!isReady || isProcessing}
          className="flex-1"
          data-testid="button-confirm-payment"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Elaborazione...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              Paga €{parseFloat(fee).toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function AccountNameChange() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [pendingNameChangeId, setPendingNameChangeId] = useState<string | null>(null);
  const [pendingFee, setPendingFee] = useState<string>("0");

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: [`/api/public/account/tickets/${id}`],
    enabled: !!id,
  });

  const form = useForm<NameChangeFormData>({
    resolver: zodResolver(nameChangeSchema),
    defaultValues: {
      newFirstName: "",
      newLastName: "",
      newEmail: "",
      newFiscalCode: "",
      newDocumentType: undefined,
      newDocumentNumber: "",
      newDateOfBirth: "",
    },
  });

  const fee = parseFloat(ticket?.nameChangeFee || '0');
  const hasFee = fee > 0;

  const nameChangeMutation = useMutation({
    mutationFn: async (data: NameChangeFormData) => {
      const response = await apiRequest("POST", "/api/public/account/name-change", {
        ticketId: id,
        newFirstName: data.newFirstName,
        newLastName: data.newLastName,
        newEmail: data.newEmail,
        newFiscalCode: data.newFiscalCode.toUpperCase(),
        newDocumentType: data.newDocumentType,
        newDocumentNumber: data.newDocumentNumber,
        newDateOfBirth: data.newDateOfBirth,
      });
      return response as NameChangeResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/account/tickets/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      
      if (data.requiresPayment) {
        setPendingNameChangeId(data.nameChangeId);
        setPendingFee(data.fee);
        setShowPaymentDialog(true);
        toast({
          title: t("account.nameChangePage.requestCreated"),
          description: t("account.nameChangePage.requestCreatedDesc"),
        });
      } else {
        toast({
          title: t("account.nameChangePage.requestSent"),
          description: t("account.nameChangePage.requestSentDesc"),
        });
        navigate(`/account/tickets/${id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: t("account.nameChangePage.error"),
        description: error.message || t("account.nameChangePage.submitError"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NameChangeFormData) => {
    nameChangeMutation.mutate(data);
  };

  const [stripeInstance, setStripeInstance] = useState<Promise<any> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    if (showPaymentDialog && pendingNameChangeId) {
      getStripe().then(setStripeInstance);
      
      apiRequest("POST", `/api/public/account/name-change/${pendingNameChangeId}/pay`)
        .then((response) => {
          const data = response as PaymentIntentResponse;
          setClientSecret(data.clientSecret);
        })
        .catch((error) => {
          toast({
            title: t("account.nameChangePage.error"),
            description: error.message || t("account.nameChangePage.paymentInitError"),
            variant: "destructive",
          });
          setShowPaymentDialog(false);
        });
    }
  }, [showPaymentDialog, pendingNameChangeId]);

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
    setPendingNameChangeId(null);
    queryClient.invalidateQueries({ queryKey: [`/api/public/account/tickets/${id}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
    navigate(`/account/tickets/${id}`);
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setClientSecret(null);
    toast({
      title: t("account.nameChangePage.paymentCancelled"),
      description: t("account.nameChangePage.paymentCancelledDesc"),
    });
    navigate(`/account/tickets/${id}`);
  };

  const eventDate = ticket ? new Date(ticket.eventStart) : new Date();
  const currentHolder = ticket
    ? [ticket.participantFirstName, ticket.participantLastName]
        .filter(Boolean)
        .join(" ") || t("account.nameChangePage.noHolder")
    : "";

  if (!isMobile) {
    if (isLoading) {
      return (
        <div className="container mx-auto p-6" data-testid="page-account-name-change">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      );
    }

    if (isError || !ticket) {
      return (
        <div className="container mx-auto p-6" data-testid="page-account-name-change">
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("account.nameChangePage.ticketNotFound")}</p>
            <Link href="/account/tickets">
              <Button variant="ghost" className="mt-4 text-primary" data-testid="button-back-to-tickets">
                {t("account.nameChangePage.backToTickets")}
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (!ticket.canNameChange) {
      return (
        <div className="container mx-auto p-6 max-w-2xl" data-testid="page-account-name-change">
          <div className="mb-6">
            <Link href={`/account/tickets/${id}`}>
              <Button variant="ghost" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                {t("account.nameChangePage.backToTicket")}
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t("account.nameChangePage.notAvailable")}
              </h2>
              <p className="text-muted-foreground">
                {ticket.hoursToEvent < 24
                  ? t("account.nameChangePage.notAvailableDeadline")
                  : t("account.nameChangePage.notAllowed")}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6 max-w-2xl" data-testid="page-account-name-change">
        <div className="mb-6">
          <Link href={`/account/tickets/${id}`}>
            <Button variant="ghost" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              {t("account.nameChangePage.backToTicket")}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 border-b">
            <CardTitle className="text-xl font-bold">{t("account.nameChangePage.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("account.nameChangePage.subtitle")}
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">{ticket.eventName}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>{format(eventDate, "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{ticket.locationName}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ticket className="w-4 h-4 text-primary" />
                  <span>{ticket.sectorName} - {ticket.ticketType}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="w-4 h-4 text-primary" />
                  <span>{t("account.nameChangePage.currentHolder")}: {currentHolder}</span>
                </div>
              </div>
            </div>

            {hasFee ? (
              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <Euro className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t("account.nameChangePage.feeLabel")}: €{fee.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("account.nameChangePage.feeNote")}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("account.nameChangePage.freeChange")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("account.nameChangePage.freeChangeNote")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newFirstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("account.nameChangePage.newFirstName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("account.nameChangePage.newFirstNamePlaceholder")}
                            {...field}
                            data-testid="input-first-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newLastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("account.nameChangePage.newLastName")}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t("account.nameChangePage.newLastNamePlaceholder")}
                            {...field}
                            data-testid="input-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("account.nameChangePage.newEmail")}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t("account.nameChangePage.emailPlaceholder")}
                          {...field}
                          data-testid="input-new-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newFiscalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("account.nameChangePage.fiscalCode")}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t("account.nameChangePage.fiscalCodePlaceholder")}
                          maxLength={16}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-fiscal-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newDateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("account.nameChangePage.dateOfBirth")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-date-of-birth"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="newDocumentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Documento</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-document-type">
                              <SelectValue placeholder="Seleziona..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="carta_identita">Carta d'Identità</SelectItem>
                            <SelectItem value="passaporto">Passaporto</SelectItem>
                            <SelectItem value="patente">Patente di Guida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="newDocumentNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero Documento</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="AB1234567"
                            {...field}
                            data-testid="input-document-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Secondo le normative SIAE, tutti i dati sono obbligatori per il cambio nominativo.
                    I dati saranno utilizzati esclusivamente per la gestione del biglietto.
                  </p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Link href={`/account/tickets/${id}`}>
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      Annulla
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={nameChangeMutation.isPending}
                    data-testid="button-submit"
                  >
                    {nameChangeMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Invio in corso...
                      </>
                    ) : (
                      "Richiedi Cambio Nominativo"
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <p className="text-xs text-muted-foreground text-center">
              La richiesta sarà processata entro 24 ore. Riceverai una conferma via email.
            </p>
          </CardContent>
        </Card>

        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Pagamento Commissione
              </DialogTitle>
            </DialogHeader>
            {stripeInstance && clientSecret ? (
              <Elements
                stripe={stripeInstance}
                options={{
                  clientSecret,
                  appearance: {
                    theme: "stripe",
                    variables: {
                      colorPrimary: "#7c3aed",
                    },
                  },
                }}
              >
                <NameChangePaymentForm
                  nameChangeId={pendingNameChangeId!}
                  fee={pendingFee}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handlePaymentCancel}
                />
              </Elements>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (isLoading) {
    return (
      <MobileAppLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileAppLayout>
    );
  }

  if (isError || !ticket) {
    return (
      <MobileAppLayout>
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Biglietto non trovato</p>
          <Link href="/account/tickets">
            <Button variant="ghost" className="mt-4 text-primary" data-testid="button-back-to-tickets">
              Torna ai biglietti
            </Button>
          </Link>
        </div>
      </MobileAppLayout>
    );
  }

  if (!ticket.canNameChange) {
    return (
      <MobileAppLayout>
        <MobileHeader
          title="Cambio Nominativo"
          showBackButton
          onBack={() => window.history.back()}
        />
        <div className="px-4 py-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Cambio nominativo non disponibile
              </h2>
              <p className="text-muted-foreground">
                {ticket.hoursToEvent < 24
                  ? "Il cambio nominativo non è più disponibile (scadenza: 24h prima dell'evento)."
                  : "Il cambio nominativo non è consentito per questo evento."}
              </p>
            </CardContent>
          </Card>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout>
      <MobileHeader
        title="Cambio Nominativo"
        showBackButton
        onBack={() => window.history.back()}
      />
      <div className="px-4 py-4 space-y-4">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h3 className="font-semibold text-foreground">{ticket.eventName}</h3>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{format(eventDate, "d MMMM yyyy 'alle' HH:mm", { locale: it })}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{ticket.locationName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Ticket className="w-4 h-4 text-primary" />
              <span>{ticket.sectorName} - {ticket.ticketType}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4 text-primary" />
              <span>Attuale: {currentHolder}</span>
            </div>
          </div>
        </div>

        {hasFee ? (
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <Euro className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Commissione: €{fee.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Il pagamento sarà richiesto dopo l'invio della richiesta.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Cambio gratuito</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Nessun costo aggiuntivo per il cambio nominativo di questo biglietto.
                </p>
              </div>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newFirstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuovo Nome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Inserisci il nome"
                      {...field}
                      data-testid="input-first-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newLastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuovo Cognome</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Inserisci il cognome"
                      {...field}
                      data-testid="input-last-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email del Nuovo Intestatario</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@esempio.com"
                      {...field}
                      data-testid="input-new-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newFiscalCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codice Fiscale</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="RSSMRA85M01H501Z"
                      maxLength={16}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      data-testid="input-fiscal-code"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newDateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data di Nascita</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-date-of-birth"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newDocumentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Documento</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-document-type">
                        <SelectValue placeholder="Seleziona..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="carta_identita">Carta d'Identità</SelectItem>
                      <SelectItem value="passaporto">Passaporto</SelectItem>
                      <SelectItem value="patente">Patente di Guida</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newDocumentNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Numero Documento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="AB1234567"
                      {...field}
                      data-testid="input-document-number"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Secondo le normative SIAE, tutti i dati sono obbligatori per il cambio nominativo.
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={nameChangeMutation.isPending}
                data-testid="button-submit"
              >
                {nameChangeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  "Richiedi Cambio Nominativo"
                )}
              </Button>
              <Link href={`/account/tickets/${id}`}>
                <Button type="button" variant="outline" className="w-full" data-testid="button-cancel">
                  Annulla
                </Button>
              </Link>
            </div>
          </form>
        </Form>

        <p className="text-xs text-muted-foreground text-center pb-4">
          La richiesta sarà processata entro 24 ore. Riceverai una conferma via email.
        </p>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Pagamento Commissione
            </DialogTitle>
          </DialogHeader>
          {stripeInstance && clientSecret ? (
            <Elements
              stripe={stripeInstance}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#7c3aed",
                  },
                },
              }}
            >
              <NameChangePaymentForm
                nameChangeId={pendingNameChangeId!}
                fee={pendingFee}
                onSuccess={handlePaymentSuccess}
                onCancel={handlePaymentCancel}
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MobileAppLayout>
  );
}
