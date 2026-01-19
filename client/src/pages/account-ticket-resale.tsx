import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FormDescription,
} from "@/components/ui/form";
import {
  MobileAppLayout,
  MobileHeader,
} from "@/components/mobile-primitives";
import {
  Calendar,
  MapPin,
  Ticket,
  Euro,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Tag,
} from "lucide-react";

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
  canResale: boolean;
  isListed: boolean;
  existingResale: { id: string; resalePrice: string } | null;
  hoursToEvent: number;
}

export default function AccountTicketResale() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: [`/api/public/account/tickets/${id}`],
    enabled: !!id,
  });

  const originalPrice = ticket ? parseFloat(ticket.ticketPrice) : 0;

  const resaleSchema = z.object({
    resalePrice: z
      .string()
      .min(1, "Inserisci un prezzo di vendita")
      .refine((val) => !isNaN(parseFloat(val)), "Inserisci un prezzo valido")
      .refine((val) => parseFloat(val) > 0, "Il prezzo deve essere maggiore di 0")
      .refine(
        (val) => parseFloat(val) <= originalPrice,
        `Il prezzo non può superare il prezzo originale (€${originalPrice.toFixed(2)})`
      ),
  });

  type ResaleFormData = z.infer<typeof resaleSchema>;

  const form = useForm<ResaleFormData>({
    resolver: zodResolver(resaleSchema),
    defaultValues: {
      resalePrice: originalPrice > 0 ? originalPrice.toFixed(2) : "",
    },
  });

  const resaleMutation = useMutation({
    mutationFn: async (data: ResaleFormData) => {
      return await apiRequest("POST", "/api/public/account/resale", {
        ticketId: id,
        resalePrice: parseFloat(data.resalePrice),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/account/tickets/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/resales"] });
      toast({
        title: t("account.ticketResalePage.successTitle"),
        description: t("account.ticketResalePage.successDesc"),
      });
      navigate(`/account/tickets/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: t("account.ticketResalePage.error"),
        description: error.message || t("account.ticketResalePage.submitError"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResaleFormData) => {
    resaleMutation.mutate(data);
  };

  const eventDate = ticket ? new Date(ticket.eventStart) : new Date();

  if (!isMobile) {
    if (isLoading) {
      return (
        <div className="container mx-auto p-6" data-testid="page-account-ticket-resale">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      );
    }

    if (isError || !ticket) {
      return (
        <div className="container mx-auto p-6" data-testid="page-account-ticket-resale">
          <div className="text-center py-16">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("account.ticketResalePage.ticketNotFound")}</p>
            <Link href="/account/tickets">
              <Button variant="ghost" className="mt-4 text-primary" data-testid="button-back-to-tickets">
                {t("account.ticketResalePage.backToTickets")}
              </Button>
            </Link>
          </div>
        </div>
      );
    }

    if (!ticket.canResale) {
      return (
        <div className="container mx-auto p-6 max-w-2xl" data-testid="page-account-ticket-resale">
          <div className="mb-6">
            <Link href={`/account/tickets/${id}`}>
              <Button variant="ghost" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                {t("account.ticketResalePage.backToTicket")}
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t("account.ticketResalePage.notAvailable")}
              </h2>
              <p className="text-muted-foreground">
                {ticket.hoursToEvent < 24
                  ? t("account.ticketResalePage.notAvailableDeadline")
                  : t("account.ticketResalePage.notAllowed")}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (ticket.isListed) {
      return (
        <div className="container mx-auto p-6 max-w-2xl" data-testid="page-account-ticket-resale">
          <div className="mb-6">
            <Link href={`/account/tickets/${id}`}>
              <Button variant="ghost" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                {t("account.ticketResalePage.backToTicket")}
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                {t("account.ticketResalePage.alreadyListed")}
              </h2>
              <p className="text-muted-foreground mb-4">
                {t("account.ticketResalePage.alreadyListedDesc")}
                {ticket.existingResale && ` a €${parseFloat(ticket.existingResale.resalePrice).toFixed(2)}`}.
              </p>
              <Link href="/account/resales">
                <Button variant="outline" data-testid="button-view-resales">
                  {t("account.ticketResalePage.manageResales")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="container mx-auto p-6 max-w-2xl" data-testid="page-account-ticket-resale">
        <div className="mb-6">
          <Link href={`/account/tickets/${id}`}>
            <Button variant="ghost" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              {t("account.ticketResalePage.backToTicket")}
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 border-b">
            <CardTitle className="text-xl font-bold">{t("account.ticketResalePage.title")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t("account.ticketResalePage.subtitle")}
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
                  <Tag className="w-4 h-4 text-primary" />
                  <span>{t("account.ticketResalePage.originalPrice")}: €{originalPrice.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {t("account.ticketResalePage.maxPriceTitle")}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {t("account.ticketResalePage.maxPriceDesc")} (€{originalPrice.toFixed(2)}).
                  </p>
                </div>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="resalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("account.ticketResalePage.resalePrice")}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={originalPrice}
                            placeholder="0.00"
                            className="pl-9"
                            {...field}
                            data-testid="input-resale-price"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        {t("account.ticketResalePage.resalePriceDesc")} ({t("account.ticketResalePage.resalePriceMax")} €{originalPrice.toFixed(2)})
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("account.ticketResalePage.howItWorks")}</p>
                      <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                        <li>{t("account.ticketResalePage.howItWorksStep1")}</li>
                        <li>{t("account.ticketResalePage.howItWorksStep2")}</li>
                        <li>{t("account.ticketResalePage.howItWorksStep3")}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <Link href={`/account/tickets/${id}`}>
                    <Button type="button" variant="outline" data-testid="button-cancel">
                      {t("account.ticketResalePage.cancel")}
                    </Button>
                  </Link>
                  <Button
                    type="submit"
                    disabled={resaleMutation.isPending}
                    data-testid="button-submit"
                  >
                    {resaleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t("account.ticketResalePage.submitting")}
                      </>
                    ) : (
                      t("account.ticketResalePage.submit")
                    )}
                  </Button>
                </div>
              </form>
            </Form>

            <p className="text-xs text-muted-foreground text-center">
              {t("account.ticketResalePage.validUntilSold")}
            </p>
          </CardContent>
        </Card>
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

  if (!ticket.canResale) {
    return (
      <MobileAppLayout>
        <MobileHeader
          title="Rivendi Biglietto"
          showBackButton
          onBack={() => window.history.back()}
        />
        <div className="px-4 py-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Rivendita non disponibile
              </h2>
              <p className="text-muted-foreground">
                {ticket.hoursToEvent < 24
                  ? "La rivendita non è più disponibile (scadenza: 24h prima dell'evento)."
                  : "La rivendita non è consentita per questo evento."}
              </p>
            </CardContent>
          </Card>
        </div>
      </MobileAppLayout>
    );
  }

  if (ticket.isListed) {
    return (
      <MobileAppLayout>
        <MobileHeader
          title="Rivendi Biglietto"
          showBackButton
          onBack={() => window.history.back()}
        />
        <div className="px-4 py-4">
          <Card className="bg-card border-border">
            <CardContent className="p-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Biglietto già in vendita
              </h2>
              <p className="text-muted-foreground mb-4">
                Questo biglietto è già stato messo in vendita
                {ticket.existingResale && ` a €${parseFloat(ticket.existingResale.resalePrice).toFixed(2)}`}.
              </p>
              <Link href="/account/resales">
                <Button variant="outline" data-testid="button-view-resales">
                  Gestisci le tue rivendite
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout>
      <MobileHeader
        title="Rivendi Biglietto"
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
              <Tag className="w-4 h-4 text-primary" />
              <span>Prezzo originale: €{originalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Prezzo massimo: €{originalPrice.toFixed(2)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                Il prezzo non può superare il prezzo originale.
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="resalePrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prezzo di Vendita</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={originalPrice}
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                        data-testid="input-resale-price"
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Max €{originalPrice.toFixed(2)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Come funziona</p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>Il biglietto sarà visibile nel marketplace</li>
                    <li>Riceverai il pagamento alla vendita</li>
                    <li>Puoi rimuovere l'annuncio quando vuoi</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={resaleMutation.isPending}
                data-testid="button-submit"
              >
                {resaleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Pubblicazione...
                  </>
                ) : (
                  "Metti in Vendita"
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
          Il biglietto rimarrà valido fino alla vendita.
        </p>
      </div>
    </MobileAppLayout>
  );
}
