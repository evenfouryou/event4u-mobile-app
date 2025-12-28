import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
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
}

export default function AccountNameChange() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

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

  const nameChangeMutation = useMutation({
    mutationFn: async (data: NameChangeFormData) => {
      return await apiRequest("POST", "/api/public/account/name-change", {
        ticketId: id,
        newFirstName: data.newFirstName,
        newLastName: data.newLastName,
        newEmail: data.newEmail,
        newFiscalCode: data.newFiscalCode.toUpperCase(),
        newDocumentType: data.newDocumentType,
        newDocumentNumber: data.newDocumentNumber,
        newDateOfBirth: data.newDateOfBirth,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/account/tickets/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      toast({
        title: "Richiesta inviata",
        description: "La tua richiesta di cambio nominativo è stata inviata con successo.",
      });
      navigate(`/account/tickets/${id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile inviare la richiesta di cambio nominativo.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: NameChangeFormData) => {
    nameChangeMutation.mutate(data);
  };

  const eventDate = ticket ? new Date(ticket.eventStart) : new Date();
  const currentHolder = ticket
    ? [ticket.participantFirstName, ticket.participantLastName]
        .filter(Boolean)
        .join(" ") || "Non nominativo"
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
            <p className="text-muted-foreground">Biglietto non trovato</p>
            <Link href="/account/tickets">
              <Button variant="ghost" className="mt-4 text-primary" data-testid="button-back-to-tickets">
                Torna ai biglietti
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
                Torna al biglietto
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-8 text-center">
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
      );
    }

    return (
      <div className="container mx-auto p-6 max-w-2xl" data-testid="page-account-name-change">
        <div className="mb-6">
          <Link href={`/account/tickets/${id}`}>
            <Button variant="ghost" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Torna al biglietto
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 border-b">
            <CardTitle className="text-xl font-bold">Cambio Nominativo</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Modifica l'intestatario del biglietto
            </p>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-foreground">{ticket.eventName}</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
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

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>

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

                <div className="grid grid-cols-2 gap-4">
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
    </MobileAppLayout>
  );
}
