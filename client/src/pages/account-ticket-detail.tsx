import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
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
} from "lucide-react";

interface TicketDetail {
  id: number;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  sector: string;
  seatNumber?: string;
  status: string;
  holderName: string;
  holderFiscalCode?: string;
  qrCode: string;
  canNameChange: boolean;
  canResale: boolean;
  isListed: boolean;
  resaleId?: number;
  purchaseDate: string;
  price: number;
}

export default function AccountTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: ["/api/public/account/tickets", id],
  });

  const cancelResaleMutation = useMutation({
    mutationFn: async () => {
      if (!ticket?.resaleId) return;
      await apiRequest("DELETE", `/api/public/account/resale/${ticket.resaleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets", id] });
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

  const eventDate = parseISO(ticket.eventDate);
  const purchaseDate = parseISO(ticket.purchaseDate);

  const statusVariant = () => {
    if (ticket.isListed) return "secondary";
    switch (ticket.status) {
      case "valid":
        return "default";
      case "used":
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
      case "valid":
        return "Valido";
      case "used":
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

            {ticket.eventLocation && (
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                <MapPin className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-xs text-slate-500">Luogo</p>
                  <p className="text-white" data-testid="text-location">{ticket.eventLocation}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <Ticket className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-500">Settore</p>
                <p className="text-white" data-testid="text-sector">{ticket.sector}</p>
                {ticket.seatNumber && (
                  <p className="text-sm text-slate-400">Posto: {ticket.seatNumber}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
              <User className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-xs text-slate-500">Intestatario</p>
                <p className="text-white" data-testid="text-holder">{ticket.holderName}</p>
                {ticket.holderFiscalCode && (
                  <p className="text-sm text-slate-400">{ticket.holderFiscalCode}</p>
                )}
              </div>
            </div>
          </div>

          {ticket.qrCode && ticket.status === "valid" && !ticket.isListed && (
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
              Prezzo: €{(ticket.price / 100).toFixed(2)}
            </p>
            <p>
              Acquistato il: {format(purchaseDate, "d MMMM yyyy", { locale: it })}
            </p>
          </div>

          {ticket.status === "valid" && (
            <div className="space-y-3 pt-4 border-t border-white/10">
              {ticket.isListed ? (
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
              ) : (
                <>
                  {ticket.canNameChange && (
                    <Button
                      variant="outline"
                      className="w-full text-white border-white/20"
                      data-testid="button-name-change"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Cambia Nominativo
                    </Button>
                  )}
                  {ticket.canResale && (
                    <Button
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-black"
                      data-testid="button-resale"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Metti in Vendita
                    </Button>
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
