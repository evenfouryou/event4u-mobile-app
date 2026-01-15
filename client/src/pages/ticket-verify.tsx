import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  MapPin,
  Ticket,
  User,
  Loader2,
  Home,
  Clock,
  ArrowLeft,
} from "lucide-react";

interface TicketVerificationResponse {
  valid: boolean;
  status: "valid" | "used" | "cancelled" | "not_found" | "invalid" | "error";
  message: string;
  ticket?: {
    ticketCode: string;
    ticketType: string;
    participantName: string | null;
    sector: string;
    price: string;
    emissionDate: string;
    usedAt: string | null;
  };
  event?: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    location: {
      name: string;
      address: string | null;
      city: string | null;
    };
  };
}

export default function TicketVerify() {
  const { code } = useParams<{ code: string }>();
  const isMobile = useIsMobile();

  const { data, isLoading, isError } = useQuery<TicketVerificationResponse>({
    queryKey: ["/api/public/tickets/verify", code],
    queryFn: async () => {
      const response = await fetch(`/api/public/tickets/verify/${encodeURIComponent(code || "")}`);
      return response.json();
    },
    enabled: !!code,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4">Verifica in corso...</p>
        </div>
      </div>
    );
  }

  const getStatusConfig = () => {
    if (isError || !data) {
      return {
        icon: AlertCircle,
        iconColor: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        title: "Errore di verifica",
        subtitle: "Impossibile verificare il biglietto",
      };
    }

    switch (data.status) {
      case "valid":
        return {
          icon: CheckCircle,
          iconColor: "text-green-500",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          title: "Biglietto Valido",
          subtitle: "Questo biglietto è autentico e non ancora utilizzato",
        };
      case "used":
        return {
          icon: Clock,
          iconColor: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          title: "Biglietto Già Utilizzato",
          subtitle: data.ticket?.usedAt 
            ? `Utilizzato il ${format(new Date(data.ticket.usedAt), "d MMMM yyyy 'alle' HH:mm", { locale: it })}`
            : "Questo biglietto è già stato validato",
        };
      case "cancelled":
        return {
          icon: XCircle,
          iconColor: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          title: "Biglietto Annullato",
          subtitle: "Questo biglietto è stato annullato e non è più valido",
        };
      case "not_found":
        return {
          icon: AlertCircle,
          iconColor: "text-muted-foreground",
          bgColor: "bg-muted/50",
          borderColor: "border-muted",
          title: "Biglietto Non Trovato",
          subtitle: "Nessun biglietto corrisponde a questo codice",
        };
      default:
        return {
          icon: AlertCircle,
          iconColor: "text-destructive",
          bgColor: "bg-destructive/10",
          borderColor: "border-destructive/30",
          title: "Biglietto Non Valido",
          subtitle: data.message || "Questo biglietto non è valido",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background" data-testid="page-ticket-verify">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/acquista">
              <Button variant="ghost" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna agli eventi
              </Button>
            </Link>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2 overflow-hidden`}>
              <CardHeader className="text-center pb-6">
                <div className={`w-24 h-24 mx-auto rounded-full ${statusConfig.bgColor} flex items-center justify-center mb-4`}>
                  <StatusIcon className={`w-12 h-12 ${statusConfig.iconColor}`} />
                </div>
                <CardTitle className="text-2xl" data-testid="text-status-title">
                  {statusConfig.title}
                </CardTitle>
                <p className="text-muted-foreground mt-2" data-testid="text-status-subtitle">
                  {statusConfig.subtitle}
                </p>
              </CardHeader>

              {data?.ticket && data?.event && (
                <CardContent className="bg-card border-t border-border space-y-6 p-6">
                  <div className="text-center pb-4 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground" data-testid="text-event-name">
                      {data.event.name}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Codice: <span className="font-mono">{data.ticket.ticketCode}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Calendar className="w-6 h-6 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Data Evento</p>
                        <p className="text-foreground font-medium" data-testid="text-event-date">
                          {format(new Date(data.event.startDate), "d MMMM yyyy", { locale: it })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(data.event.startDate), "HH:mm", { locale: it })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <MapPin className="w-6 h-6 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Luogo</p>
                        <p className="text-foreground font-medium" data-testid="text-location">
                          {data.event.location.name}
                        </p>
                        {data.event.location.city && (
                          <p className="text-sm text-muted-foreground">{data.event.location.city}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                      <Ticket className="w-6 h-6 text-primary flex-shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo Biglietto</p>
                        <p className="text-foreground font-medium" data-testid="text-ticket-type">
                          {data.ticket.ticketType}
                        </p>
                        <p className="text-sm text-muted-foreground">{data.ticket.sector}</p>
                      </div>
                    </div>

                    {data.ticket.participantName && (
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <User className="w-6 h-6 text-primary flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">Intestatario</p>
                          <p className="text-foreground font-medium" data-testid="text-participant">
                            {data.ticket.participantName}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {data.ticket.price && (
                    <div className="text-center pt-4 border-t border-border">
                      <Badge variant="secondary" className="text-base px-4 py-1">
                        Prezzo: €{parseFloat(data.ticket.price).toFixed(2)}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Codice verificato: <span className="font-mono">{code}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <Link href="/acquista">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground -ml-2" data-testid="button-home">
              <Home className="w-4 h-4 mr-2" />
              Torna agli eventi
            </Button>
          </Link>
        </div>

        <Card className={`${statusConfig.bgColor} ${statusConfig.borderColor} border-2 overflow-hidden`}>
          <div className="p-6 sm:p-8 text-center">
            <div className={`w-20 h-20 mx-auto rounded-full ${statusConfig.bgColor} flex items-center justify-center mb-4`}>
              <StatusIcon className={`w-10 h-10 ${statusConfig.iconColor}`} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-status-title">
              {statusConfig.title}
            </h1>
            <p className="text-sm text-muted-foreground mt-2" data-testid="text-status-subtitle">
              {statusConfig.subtitle}
            </p>
          </div>

          {data?.ticket && data?.event && (
            <CardContent className="p-4 sm:p-6 bg-card border-t border-border space-y-4">
              <div className="text-center pb-4 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground" data-testid="text-event-name">
                  {data.event.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Codice: <span className="font-mono">{data.ticket.ticketCode}</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data Evento</p>
                    <p className="text-foreground" data-testid="text-event-date">
                      {format(new Date(data.event.startDate), "d MMMM yyyy", { locale: it })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(data.event.startDate), "HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Luogo</p>
                    <p className="text-foreground" data-testid="text-location">
                      {data.event.location.name}
                    </p>
                    {data.event.location.city && (
                      <p className="text-sm text-muted-foreground">{data.event.location.city}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Ticket className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo Biglietto</p>
                    <p className="text-foreground" data-testid="text-ticket-type">
                      {data.ticket.ticketType}
                    </p>
                    <p className="text-sm text-muted-foreground">{data.ticket.sector}</p>
                  </div>
                </div>

                {data.ticket.participantName && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Intestatario</p>
                      <p className="text-foreground" data-testid="text-participant">
                        {data.ticket.participantName}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {data.ticket.price && (
                <div className="text-center pt-4 border-t border-border">
                  <Badge variant="secondary" className="text-sm">
                    Prezzo: €{parseFloat(data.ticket.price).toFixed(2)}
                  </Badge>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Codice verificato: <span className="font-mono">{code}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
