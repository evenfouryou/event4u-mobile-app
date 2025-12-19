import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, MapPin, Ticket, User, QrCode } from "lucide-react";

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

interface DigitalTemplate {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  backgroundStyle?: string;
  gradientDirection?: string;
  qrSize?: number;
  qrPosition?: string;
  showEventName?: boolean;
  showEventDate?: boolean;
  showEventTime?: boolean;
  showVenue?: boolean;
  showPrice?: boolean;
  showTicketType?: boolean;
  showSector?: boolean;
  showSeat?: boolean;
  showBuyerName?: boolean;
  showFiscalSeal?: boolean;
  showPerforatedEdge?: boolean;
  fontFamily?: string;
  titleFontSize?: number;
  bodyFontSize?: number;
}

interface DigitalTicketCardProps {
  ticket: TicketDetail;
  template?: DigitalTemplate | null;
}

export function DigitalTicketCard({ ticket, template }: DigitalTicketCardProps) {
  const t = template || {};
  const eventDate = new Date(ticket.eventStart);
  const holderName = [ticket.participantFirstName, ticket.participantLastName]
    .filter(Boolean)
    .join(" ") || "Non nominativo";
  const price = parseFloat(ticket.ticketPrice || "0");
  const showQrCode = ticket.status === "emitted" && !ticket.isListed && ticket.qrCode;

  const containerStyle: React.CSSProperties = template ? {
    fontFamily: t.fontFamily || undefined,
  } : {};

  const cardBgStyle: React.CSSProperties = template && t.backgroundColor ? {
    backgroundColor: t.backgroundColor,
  } : {};

  const headerStyle: React.CSSProperties = template ? {
    background: `linear-gradient(to right, ${t.primaryColor || '#6366f1'}, ${t.secondaryColor || '#f59e0b'})`,
  } : {};

  const textStyle: React.CSSProperties = template && t.textColor ? {
    color: t.textColor,
  } : {};

  const accentStyle: React.CSSProperties = template && t.accentColor ? {
    color: t.accentColor,
  } : {};

  const qrSize = t.qrSize || 192;

  return (
    <div 
      className="relative w-full max-w-md mx-auto"
      data-testid={`digital-ticket-${ticket.id}`}
      style={containerStyle}
    >
      <div 
        className="relative overflow-hidden rounded-2xl shadow-2xl"
        style={cardBgStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-card" />
        
        <div className="relative">
          <div 
            className="bg-gradient-to-r from-primary to-amber-500 p-4 sm:p-5"
            style={template ? headerStyle : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-black/60 uppercase tracking-wider mb-1">
                  Biglietto Evento
                </p>
                {(t.showEventName !== false) && (
                  <h2 
                    className="text-lg sm:text-xl font-bold text-black truncate"
                    data-testid="ticket-event-name"
                    style={t.titleFontSize ? { fontSize: `${t.titleFontSize}px` } : undefined}
                  >
                    {ticket.eventName}
                  </h2>
                )}
              </div>
              <div className="flex-shrink-0">
                <Ticket className="w-8 h-8 text-black/40" />
              </div>
            </div>
          </div>

          <div className="relative">
            {(t.showPerforatedEdge !== false) && (
              <>
                <div className="absolute left-0 top-0 bottom-0 w-4 flex flex-col justify-around -ml-2">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-4 h-4 rounded-full bg-background"
                    />
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-0 w-4 flex flex-col justify-around -mr-2">
                  {[...Array(8)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-4 h-4 rounded-full bg-background"
                    />
                  ))}
                </div>
              </>
            )}

            <div 
              className="bg-card px-6 py-5 border-y-2 border-dashed border-border/50"
              style={template && t.backgroundColor ? { backgroundColor: t.backgroundColor } : undefined}
            >
              <div className="grid grid-cols-2 gap-4">
                {(t.showEventDate !== false) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" style={accentStyle} />
                      <span className="text-xs uppercase tracking-wide">Data</span>
                    </div>
                    <p 
                      className="text-sm font-semibold text-foreground"
                      data-testid="ticket-date"
                      style={textStyle}
                    >
                      {format(eventDate, "d MMM yyyy", { locale: it })}
                    </p>
                    {(t.showEventTime !== false) && (
                      <p className="text-xs text-muted-foreground">
                        {format(eventDate, "HH:mm", { locale: it })}
                      </p>
                    )}
                  </div>
                )}

                {(t.showVenue !== false) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary" style={accentStyle} />
                      <span className="text-xs uppercase tracking-wide">Luogo</span>
                    </div>
                    <p 
                      className="text-sm font-semibold text-foreground truncate"
                      data-testid="ticket-location"
                      style={textStyle}
                    >
                      {ticket.locationName}
                    </p>
                    {ticket.locationAddress && (
                      <p className="text-xs text-muted-foreground truncate">
                        {ticket.locationAddress}
                      </p>
                    )}
                  </div>
                )}

                {(t.showSector !== false) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Ticket className="w-4 h-4 text-primary" style={accentStyle} />
                      <span className="text-xs uppercase tracking-wide">Settore</span>
                    </div>
                    <p 
                      className="text-sm font-semibold text-foreground"
                      data-testid="ticket-sector"
                      style={textStyle}
                    >
                      {ticket.sectorName}
                    </p>
                    {(t.showTicketType !== false) && (
                      <p className="text-xs text-muted-foreground">
                        {ticket.ticketType}
                      </p>
                    )}
                  </div>
                )}

                {(t.showBuyerName !== false) && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4 text-primary" style={accentStyle} />
                      <span className="text-xs uppercase tracking-wide">Intestatario</span>
                    </div>
                    <p 
                      className="text-sm font-semibold text-foreground truncate"
                      data-testid="ticket-holder"
                      style={textStyle}
                    >
                      {holderName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {showQrCode && (
              <div 
                className="bg-card px-6 py-6 flex flex-col items-center"
                style={template && t.backgroundColor ? { backgroundColor: t.backgroundColor } : undefined}
              >
                <div className="bg-white p-4 rounded-xl shadow-lg mb-3">
                  <img
                    src={ticket.qrCode!}
                    alt="QR Code biglietto"
                    style={{ width: qrSize, height: qrSize }}
                    className="w-40 h-40 sm:w-48 sm:h-48"
                    data-testid="ticket-qrcode"
                  />
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <QrCode className="w-4 h-4" />
                  <span className="text-xs">Mostra all'ingresso</span>
                </div>
              </div>
            )}

            <div 
              className="bg-gradient-to-b from-card to-muted/30 px-6 py-4 space-y-3"
              style={template && t.backgroundColor ? { backgroundColor: t.backgroundColor } : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Codice Biglietto
                  </p>
                  <p 
                    className="font-mono text-sm font-bold text-foreground"
                    data-testid="ticket-code"
                    style={textStyle}
                  >
                    {ticket.ticketCode}
                  </p>
                </div>
                {(t.showPrice !== false) && (
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      Prezzo
                    </p>
                    <p 
                      className="text-lg font-bold text-primary"
                      data-testid="ticket-price"
                      style={accentStyle}
                    >
                      €{price.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              {(t.showFiscalSeal !== false) && ticket.fiscalSealCode && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Sigillo Fiscale
                  </p>
                  <p 
                    className="font-mono text-xs text-muted-foreground break-all"
                    data-testid="ticket-fiscal-seal"
                  >
                    {ticket.fiscalSealCode}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-4 bg-black/20 blur-xl rounded-full" />
    </div>
  );
}
