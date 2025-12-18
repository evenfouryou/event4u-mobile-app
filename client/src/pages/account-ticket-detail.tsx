import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Ticket,
  User,
  QrCode,
  RefreshCw,
  Tag,
  XCircle,
  Loader2,
  Clock,
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
  emittedAt: string;
  qrCode: string | null;
  customText: string | null;
  fiscalSealCode: string | null;
  sectorId: string;
  sectorName: string;
  ticketedEventId: string;
  eventId: string;
  eventName: string;
  eventStart: string;
  eventEnd: string;
  locationName: string;
  locationAddress: string | null;
  allowNameChange: boolean;
  allowResale: boolean;
  nameChangeDeadlineHours: number | null;
  resaleDeadlineHours: number | null;
  resaleMaxMarkupPercent: number | null;
  canNameChange: boolean;
  canResale: boolean;
  isListed: boolean;
  existingResale: { id: string; resalePrice: string } | null;
  hoursToEvent: number;
}

export default function AccountTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: [`/api/public/account/tickets/${id}`],
    enabled: !!id,
  });

  const cancelResaleMutation = useMutation({
    mutationFn: async () => {
      if (!ticket?.existingResale?.id) return;
      await apiRequest("DELETE", `/api/public/account/resale/${ticket.existingResale.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/account/tickets/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/resales"] });
      toast({
        title: "Rivendita annullata",
        description: "Il biglietto è stato rimosso dalla vendita.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile annullare la rivendita.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Biglietto non trovato</p>
        <Link href="/account/tickets">
          <Button variant="ghost" className="mt-4 text-yellow-400">
            Torna ai biglietti
          </Button>
        </Link>
      </div>
    );
  }

  const eventDate = new Date(ticket.eventStart);
  const emittedDate = ticket.emittedAt ? new Date(ticket.emittedAt) : null;
  const holderName = [ticket.participantFirstName, ticket.participantLastName].filter(Boolean).join(" ") || "Non nominativo";
  const price = parseFloat(ticket.ticketPrice || "0");

  const statusVariant = () => {
    if (ticket.isListed) return "secondary";
    switch (ticket.status) {
      case "emitted":
        return "default";
      case "validated":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    if (ticket.isListed) return "In Vendita";
    switch (ticket.status) {
      case "emitted":
        return "Valido";
      case "validated":
        return "Usato";
      case "cancelled":
        return "Annullato";
      default:
        return ticket.status;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/account/tickets">
          <Button variant="ghost" className="text-slate-400 hover:text-white -ml-4" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            I Miei Biglietti
          </Button>
        </Link>
      </div>

      <Card className="bg-[#151922] border-white/10 overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 p-6 border-b border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Badge variant={statusVariant()} className="mb-3">
                {statusLabel()}
              </Badge>
              <h1 className="text-2xl font-bold text-white" data-testid="text-event-name">
                {ticket.eventName}
              </h1>
              <p className="text-sm text-slate-400 mt-1">Codice: {ticket.ticketCode}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <Calendar className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-500">Data Evento</p>
                <p className="text-white" data-testid="text-event-date">
                  {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
                </p>
                <p className="text-sm text-slate-400">
                  {format(eventDate, "HH:mm", { locale: it })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <MapPin className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-500">Luogo</p>
                <p className="text-white" data-testid="text-location">{ticket.locationName}</p>
                {ticket.locationAddress && (
                  <p className="text-sm text-slate-400">{ticket.locationAddress}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <Ticket className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-500">Settore</p>
                <p className="text-white" data-testid="text-sector">{ticket.sectorName}</p>
                <p className="text-sm text-slate-400">{ticket.ticketType}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <User className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-500">Intestatario</p>
                <p className="text-white" data-testid="text-holder">{holderName}</p>
              </div>
            </div>
          </div>

          {ticket.hoursToEvent > 0 && (
            <div className="flex items-center gap-2 text-sm text-slate-400 bg-white/5 p-3 rounded-lg">
              <Clock className="w-4 h-4" />
              <span>
                {ticket.hoursToEvent < 24 
                  ? `Mancano ${ticket.hoursToEvent} ore all'evento`
                  : `Mancano ${Math.floor(ticket.hoursToEvent / 24)} giorni all'evento`
                }
              </span>
            </div>
          )}

          {ticket.qrCode && ticket.status === "emitted" && !ticket.isListed && (
            <div className="flex flex-col items-center py-6 border-y border-white/10">
              <div className="bg-white p-4 rounded-xl mb-4">
                <img
                  src={ticket.qrCode}
                  alt="QR Code biglietto"
                  className="w-48 h-48"
                  data-testid="img-qrcode"
                />
              </div>
              <p className="text-sm text-slate-400 flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                Mostra questo QR code all'ingresso
              </p>
            </div>
          )}

          <div className="text-sm text-slate-400 space-y-1">
            <p>
              <Tag className="w-4 h-4 inline mr-2" />
              Prezzo: €{price.toFixed(2)}
            </p>
            {emittedDate && (
              <p>
                Emesso il: {format(emittedDate, "d MMMM yyyy 'alle' HH:mm", { locale: it })}
              </p>
            )}
            {ticket.fiscalSealCode && (
              <p className="font-mono text-xs">
                Sigillo fiscale: {ticket.fiscalSealCode}
              </p>
            )}
          </div>

          {ticket.status === "emitted" && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              {ticket.isListed && ticket.existingResale ? (
                <div className="space-y-3">
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-400">
                      Biglietto in vendita a €{parseFloat(ticket.existingResale.resalePrice).toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full text-red-400 border-red-400/30 hover:bg-red-500/10"
                    onClick={() => cancelResaleMutation.mutate()}
                    disabled={cancelResaleMutation.isPending}
                    data-testid="button-cancel-resale"
                  >
                    {cancelResaleMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Rimuovi dalla Vendita
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  {ticket.canNameChange && (
                    <Link href={`/account/tickets/${id}/name-change`}>
                      <Button
                        variant="outline"
                        className="w-full text-white border-white/20"
                        data-testid="button-name-change"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Cambia Nominativo
                      </Button>
                    </Link>
                  )}
                  {ticket.canResale && (
                    <Link href={`/account/tickets/${id}/resale`}>
                      <Button
                        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black"
                        data-testid="button-resale"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Metti in Vendita
                      </Button>
                    </Link>
                  )}
                  {!ticket.canNameChange && !ticket.canResale && ticket.hoursToEvent > 0 && (
                    <p className="text-center text-sm text-slate-500">
                      Cambio nominativo e rivendita non disponibili per questo biglietto
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
