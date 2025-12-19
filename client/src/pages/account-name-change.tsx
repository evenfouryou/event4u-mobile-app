import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Ticket,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const nameChangeSchema = z.object({
  newFirstName: z.string().min(2, "Il nome deve avere almeno 2 caratteri"),
  newLastName: z.string().min(2, "Il cognome deve avere almeno 2 caratteri"),
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

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: [`/api/public/account/tickets/${id}`],
    enabled: !!id,
  });

  const form = useForm<NameChangeFormData>({
    resolver: zodResolver(nameChangeSchema),
    defaultValues: {
      newFirstName: "",
      newLastName: "",
    },
  });

  const nameChangeMutation = useMutation({
    mutationFn: async (data: NameChangeFormData) => {
      return await apiRequest("POST", "/api/public/account/name-change", {
        ticketId: id,
        newFirstName: data.newFirstName,
        newLastName: data.newLastName,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Biglietto non trovato</p>
        <Link href="/account/tickets">
          <Button variant="ghost" className="mt-4 text-primary" data-testid="button-back-to-tickets">
            Torna ai biglietti
          </Button>
        </Link>
      </div>
    );
  }

  const eventDate = new Date(ticket.eventStart);
  const currentHolder = [ticket.participantFirstName, ticket.participantLastName]
    .filter(Boolean)
    .join(" ") || "Non nominativo";

  if (!ticket.canNameChange) {
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        <div className="mb-4 sm:mb-6">
          <Link href={`/account/tickets/${id}`}>
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2 sm:-ml-4 h-10" data-testid="button-back">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Torna al biglietto
            </Button>
          </Link>
        </div>

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
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6">
        <Link href={`/account/tickets/${id}`}>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2 sm:-ml-4 h-10" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Torna al biglietto
          </Button>
        </Link>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 p-4 sm:p-6 border-b border-border">
          <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
            Cambio Nominativo
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Modifica l'intestatario del biglietto
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
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

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  className="flex-1"
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
                  <Button type="button" variant="outline" className="w-full sm:w-auto" data-testid="button-cancel">
                    Annulla
                  </Button>
                </Link>
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
