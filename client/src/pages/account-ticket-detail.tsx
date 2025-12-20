import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { DigitalTicketCard } from "@/components/DigitalTicketCard";
import type { DigitalTicketTemplate } from '@shared/schema';
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Ticket,
  User,
  RefreshCw,
  Tag,
  XCircle,
  Loader2,
  Clock,
  Download,
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
  emissionDate: string;
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
  organizerCompany: string | null;
  ticketingManager: string | null;
  progressiveNumber: number | null;
  emissionDateTime: string | null;
}

export default function AccountTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: [`/api/public/account/tickets/${id}`],
    enabled: !!id,
  });

  const { data: digitalTemplate } = useQuery<DigitalTicketTemplate | null>({
    queryKey: ['/api/digital-templates/default'],
  });

  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/public/account/tickets/${id}/pdf`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore nel download');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `biglietto-${ticket?.ticketCode || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download completato",
        description: "Il biglietto è stato scaricato.",
      });
    } catch (error: any) {
      toast({
        title: "Errore download",
        description: error.message || "Impossibile scaricare il PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
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
        <p className="text-muted-foreground">Biglietto non trovato</p>
        <Link href="/account/tickets">
          <Button variant="ghost" className="mt-4 text-primary">
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
    <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6">
        <Link href="/account/tickets">
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2 sm:-ml-4 h-10" data-testid="button-back">
            <ChevronLeft className="w-4 h-4 mr-1" />
            I Miei Biglietti
          </Button>
        </Link>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-4 sm:p-6 border-b border-border">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <Badge variant={statusVariant()} className="mb-2 sm:mb-3">
                {statusLabel()}
              </Badge>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground" data-testid="text-event-name">
                {ticket.eventName}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Codice: {ticket.ticketCode}</p>
            </div>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Data Evento</p>
                <p className="text-foreground" data-testid="text-event-date">
                  {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(eventDate, "HH:mm", { locale: it })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Luogo</p>
                <p className="text-foreground" data-testid="text-location">{ticket.locationName}</p>
                {ticket.locationAddress && (
                  <p className="text-sm text-muted-foreground">{ticket.locationAddress}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
              <Ticket className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Settore</p>
                <p className="text-foreground" data-testid="text-sector">{ticket.sectorName}</p>
                <p className="text-sm text-muted-foreground">{ticket.ticketType}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 sm:p-3 bg-muted/50 rounded-lg">
              <User className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Intestatario</p>
                <p className="text-foreground" data-testid="text-holder">{holderName}</p>
              </div>
            </div>
          </div>

          {ticket.hoursToEvent > 0 && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 p-2 sm:p-3 rounded-lg">
              <Clock className="w-4 h-4" />
              <span>
                {ticket.hoursToEvent < 24 
                  ? `Mancano ${ticket.hoursToEvent} ore all'evento`
                  : `Mancano ${Math.floor(ticket.hoursToEvent / 24)} giorni all'evento`
                }
              </span>
            </div>
          )}

          {(ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && !ticket.isListed && (
            <div className="py-4 sm:py-6 border-y border-border space-y-4">
              <DigitalTicketCard ticket={ticket} template={digitalTemplate} />
              
              <Button
                variant="outline"
                className="w-full"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                data-testid="button-download-pdf"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Scarica PDF
              </Button>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
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

          {(ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && (
            <div className="space-y-3 pt-4 border-t border-border">
              {ticket.isListed && ticket.existingResale ? (
                <div className="space-y-3">
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <p className="text-sm text-primary">
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
                        className="w-full"
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
                        className="w-full"
                        data-testid="button-resale"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Metti in Vendita
                      </Button>
                    </Link>
                  )}
                  {!ticket.canNameChange && !ticket.canResale && ticket.hoursToEvent > 0 && (
                    <p className="text-center text-sm text-muted-foreground">
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
