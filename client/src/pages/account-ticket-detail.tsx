import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import type { DigitalTicketTemplate } from '@shared/schema';
import QRCodeLib from "qrcode";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Ticket,
  User,
  RefreshCw,
  XCircle,
  Loader2,
  Clock,
  Download,
  Share2,
  Tag,
  RotateCcw,
  QrCode,
  ArrowLeft,
  UserCog,
  ArrowDown,
} from "lucide-react";
import { SiApple, SiGoogle } from "react-icons/si";
import { DigitalTicketCard } from "@/components/DigitalTicketCard";

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
  companyId: string | null;
  ticketingManager: string | null;
  progressiveNumber: number | null;
  emissionDateTime: string | null;
  previousTicket: {
    id: string;
    sigilloFiscale: string;
    progressiveNumber: number;
  } | null;
  replacedBy: {
    id: string;
    sigilloFiscale: string;
    progressiveNumber: number;
  } | null;
  nameChangeDate: string | null;
  isFromNameChange: boolean;
}

const springConfig = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: springConfig,
  },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: springConfig,
  },
};

export default function AccountTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: ticket, isLoading, isError } = useQuery<TicketDetail>({
    queryKey: [`/api/public/account/tickets/${id}`],
    enabled: !!id,
  });

  const { data: digitalTemplate } = useQuery<DigitalTicketTemplate | null>({
    queryKey: ['/api/digital-templates/default', ticket?.companyId],
    queryFn: async () => {
      const url = ticket?.companyId 
        ? `/api/digital-templates/default/${ticket.companyId}`
        : '/api/digital-templates/default';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!ticket,
  });

  const showQrCode = ticket && 
    (ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && 
    !ticket.isListed && 
    ticket.qrCode;

  useEffect(() => {
    if (showQrCode && ticket?.qrCode) {
      setQrLoading(true);
      const qrSize = 280;
      // Use dedicated QR colors from template, fallback to black on white for readability
      // Note: QR code library doesn't support 'transparent', convert to white
      const qrForeground = digitalTemplate?.qrForegroundColor || '#000000';
      const qrBackground = (digitalTemplate?.qrBackgroundColor && digitalTemplate.qrBackgroundColor !== 'transparent') 
        ? digitalTemplate.qrBackgroundColor 
        : '#FFFFFF';
      
      QRCodeLib.toDataURL(ticket.qrCode, {
        width: qrSize,
        margin: 2,
        color: {
          dark: qrForeground,
          light: qrBackground,
        },
        errorCorrectionLevel: 'H',
      })
        .then((url: string) => {
          setQrCodeImage(url);
          setQrLoading(false);
        })
        .catch((err: Error) => {
          console.error('Error generating QR code:', err);
          setQrLoading(false);
        });
    }
  }, [showQrCode, ticket?.qrCode, digitalTemplate]);

  const cancelResaleMutation = useMutation({
    mutationFn: async () => {
      if (!ticket?.existingResale?.id) return;
      await apiRequest("DELETE", `/api/public/account/resale/${ticket.existingResale.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/public/account/tickets/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/resales"] });
      triggerHaptic('success');
      toast({
        title: "Rivendita annullata",
        description: "Il biglietto è stato rimosso dalla vendita.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
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
    triggerHaptic('medium');
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
      
      triggerHaptic('success');
      toast({
        title: "Download completato",
        description: "Il biglietto è stato scaricato.",
      });
    } catch (error: any) {
      triggerHaptic('error');
      toast({
        title: "Errore download",
        description: error.message || "Impossibile scaricare il PDF.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    triggerHaptic('light');
    if (navigator.share && ticket) {
      try {
        await navigator.share({
          title: `Biglietto - ${ticket.eventName}`,
          text: `Il mio biglietto per ${ticket.eventName} - ${format(new Date(ticket.eventStart), "d MMMM yyyy", { locale: it })}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    }
  };

  if (isLoading) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6" data-testid="page-account-ticket-detail">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/account/tickets")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Caricamento...</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          </div>
        </div>
      );
    }
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            leftAction={
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/account/tickets")}
                className="min-h-[44px] min-w-[44px]"
                data-testid="button-back"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            }
            title="Caricamento..."
          />
        }
      >
        <div className="flex items-center justify-center h-full">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-10 h-10 text-primary" />
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  if (isError || !ticket) {
    if (!isMobile) {
      return (
        <div className="container mx-auto p-6" data-testid="page-account-ticket-detail">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate("/account/tickets")} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold">Errore</h1>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
              <Ticket className="w-16 h-16 text-muted-foreground/50" />
              <p className="text-lg text-muted-foreground text-center">Biglietto non trovato</p>
              <Button onClick={() => navigate("/account/tickets")} data-testid="button-go-back">
                Torna ai biglietti
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            leftAction={
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/account/tickets")}
                className="min-h-[44px] min-w-[44px]"
                data-testid="button-back"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            }
            title="Errore"
          />
        }
      >
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
          <Ticket className="w-16 h-16 text-muted-foreground/50" />
          <p className="text-lg text-muted-foreground text-center">Biglietto non trovato</p>
          <HapticButton
            variant="default"
            onClick={() => navigate("/account/tickets")}
            className="min-h-[48px] px-8 text-base"
            data-testid="button-go-back"
          >
            Torna ai biglietti
          </HapticButton>
        </div>
      </MobileAppLayout>
    );
  }

  const eventDate = new Date(ticket.eventStart);
  // Se il biglietto proviene da un cambio nominativo, nascondere l'intestatario
  const holderName = ticket.isFromNameChange 
    ? "Dati riservati" 
    : ([ticket.participantFirstName, ticket.participantLastName].filter(Boolean).join(" ") || "Non nominativo");
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

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-account-ticket-detail">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/account/tickets")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{ticket.eventName}</h1>
            <p className="text-muted-foreground">
              {format(eventDate, "EEEE d MMMM yyyy 'ore' HH:mm", { locale: it })}
            </p>
          </div>
          <Badge variant={statusVariant()} className="text-sm px-4 py-1.5" data-testid="badge-status">
            {statusLabel()}
          </Badge>
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <Button variant="outline" size="icon" onClick={handleShare} data-testid="button-share">
              <Share2 className="w-5 h-5" />
            </Button>
          )}
        </div>

        {ticket.hoursToEvent > 0 && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5" />
            <span>
              {ticket.hoursToEvent < 24
                ? `Mancano ${ticket.hoursToEvent} ore`
                : `Mancano ${Math.floor(ticket.hoursToEvent / 24)} giorni`}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <DigitalTicketCard
                  ticket={{
                    ...ticket,
                    allowNameChange: ticket.allowNameChange,
                    allowResale: ticket.allowResale,
                    organizerCompany: ticket.organizerCompany,
                    ticketingManager: ticket.ticketingManager,
                    emissionDateTime: ticket.emissionDateTime,
                    progressiveNumber: ticket.progressiveNumber,
                  }}
                  template={digitalTemplate}
                  hideHolderName={ticket.isFromNameChange}
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informazioni Biglietto</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo</p>
                      <p className="text-base font-medium" data-testid="text-ticket-type">
                        {ticket.ticketType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Settore</p>
                      <p className="text-base font-medium" data-testid="text-sector">
                        {ticket.sectorName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Tag className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Prezzo</p>
                      <p className="text-xl font-bold text-primary" data-testid="text-price">
                        €{price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Intestatario</p>
                      <p className="text-base font-medium" data-testid="text-holder">
                        {holderName}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(ticket.previousTicket || ticket.replacedBy) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCog className="w-5 h-5" />
                    Storico Cambio Nominativo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ticket.previousTicket && (
                    <>
                      {ticket.nameChangeDate && (
                        <p className="text-sm text-muted-foreground">
                          Data cambio: {format(new Date(ticket.nameChangeDate), "d MMMM yyyy 'ore' HH:mm", { locale: it })}
                        </p>
                      )}
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="destructive" data-testid="badge-old-ticket-cancelled">ANNULLATO</Badge>
                          <span className="text-sm text-muted-foreground">Biglietto precedente</span>
                        </div>
                        <p className="text-sm">
                          Sigillo: <span className="line-through text-muted-foreground" data-testid="text-old-sigillo">{ticket.previousTicket.sigilloFiscale}</span>
                        </p>
                        <p className="text-sm">
                          Progressivo: <span className="line-through text-muted-foreground" data-testid="text-old-progressivo">#{ticket.previousTicket.progressiveNumber}</span>
                        </p>
                        <p className="text-xs text-muted-foreground italic">Questo biglietto sostituisce il precedente</p>
                      </div>
                      <div className="flex justify-center py-2">
                        <ArrowDown className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-600 hover:bg-green-600" data-testid="badge-new-ticket-valid">VALIDO</Badge>
                          <span className="text-sm text-muted-foreground">Biglietto attuale</span>
                        </div>
                        <p className="text-sm">
                          Sigillo: <span className="font-medium" data-testid="text-current-sigillo">{ticket.fiscalSealCode}</span>
                        </p>
                        <p className="text-sm">
                          Progressivo: <span className="font-medium" data-testid="text-current-progressivo">#{ticket.progressiveNumber}</span>
                        </p>
                      </div>
                    </>
                  )}
                  {ticket.replacedBy && (
                    <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="destructive" className="text-base px-4 py-1" data-testid="badge-replaced-cancelled">ANNULLATO</Badge>
                      </div>
                      <p className="text-center text-sm text-muted-foreground">
                        Questo biglietto è stato annullato a seguito di cambio nominativo
                      </p>
                      <p className="text-sm text-center">
                        Sigillo: <span className="line-through text-muted-foreground">{ticket.fiscalSealCode}</span>
                      </p>
                      <p className="text-xs text-center text-muted-foreground italic">
                        Il nuovo biglietto è stato trasferito al nuovo intestatario
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Informazioni Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data e Ora</p>
                    <p className="text-base font-medium" data-testid="text-event-date">
                      {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
                    </p>
                    <p className="text-muted-foreground">
                      ore {format(eventDate, "HH:mm", { locale: it })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Luogo</p>
                    <p className="text-base font-medium" data-testid="text-location">
                      {ticket.locationName}
                    </p>
                    {ticket.locationAddress && (
                      <p className="text-sm text-muted-foreground">{ticket.locationAddress}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {(ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && !ticket.isListed && (
              <Card>
                <CardHeader>
                  <CardTitle>Salva Biglietto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Scarica l'immagine del biglietto, poi salvala nelle Foto per aggiungerla al Wallet
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="bg-black text-white border-black hover:bg-black/90"
                      onClick={() => {
                        window.location.href = `/api/public/account/tickets/${id}/wallet/apple`;
                      }}
                      data-testid="button-add-apple-wallet"
                    >
                      <SiApple className="w-5 h-5 mr-2" />
                      Immagine
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-gradient-to-r from-blue-500 to-green-500 text-white border-0 hover:opacity-90"
                      onClick={() => {
                        window.location.href = `/api/public/account/tickets/${id}/wallet/google`;
                      }}
                      data-testid="button-add-google-wallet"
                    >
                      <SiGoogle className="w-5 h-5 mr-2" />
                      Immagine
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    data-testid="button-download-pdf"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Download className="w-5 h-5 mr-2" />
                    )}
                    Scarica PDF
                  </Button>
                </CardContent>
              </Card>
            )}

            {(ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && (
              <Card>
                <CardHeader>
                  <CardTitle>Azioni</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ticket.isListed && ticket.existingResale ? (
                    <>
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                        <p className="text-base font-medium text-primary text-center">
                          In vendita a €{parseFloat(ticket.existingResale.resalePrice).toFixed(2)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-destructive border-destructive/30"
                        onClick={() => cancelResaleMutation.mutate()}
                        disabled={cancelResaleMutation.isPending}
                        data-testid="button-cancel-resale"
                      >
                        {cancelResaleMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-5 h-5 mr-2" />
                            Rimuovi dalla Vendita
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      {ticket.canNameChange && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => navigate(`/account/tickets/${id}/name-change`)}
                          data-testid="button-name-change"
                        >
                          <User className="w-5 h-5 mr-2" />
                          Cambia Nominativo
                        </Button>
                      )}
                      {ticket.canResale && (
                        <Button
                          className="w-full"
                          onClick={() => navigate(`/account/tickets/${id}/resale`)}
                          data-testid="button-resale"
                        >
                          <RefreshCw className="w-5 h-5 mr-2" />
                          Metti in Vendita
                        </Button>
                      )}
                      {!ticket.canNameChange && !ticket.canResale && ticket.hoursToEvent > 0 && (
                        <p className="text-center text-muted-foreground py-4">
                          Cambio nominativo e rivendita non disponibili
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {ticket.fiscalSealCode && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-xs text-muted-foreground text-center">
                    Sigillo fiscale: {ticket.fiscalSealCode}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          leftAction={
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                triggerHaptic('light');
                navigate("/account/tickets");
              }}
              className="min-h-[44px] min-w-[44px]"
              data-testid="button-back"
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>
          }
          title={ticket.eventName}
          rightAction={
            typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleShare}
                className="min-h-[44px] min-w-[44px]"
                data-testid="button-share"
              >
                <Share2 className="w-5 h-5" />
              </Button>
            ) : undefined
          }
        />
      }
      noPadding
    >
      <motion.div
        className="flex flex-col pb-24"
        initial="hidden"
        animate="visible"
        variants={staggerChildren}
      >
        <motion.div 
          className="flex justify-center pt-4 pb-2"
          variants={fadeInUp}
        >
          <Badge 
            variant={statusVariant()} 
            className="text-sm px-4 py-1.5"
            data-testid="badge-status"
          >
            {statusLabel()}
          </Badge>
        </motion.div>

        {ticket.hoursToEvent > 0 && (
          <motion.div 
            className="flex items-center justify-center gap-2 text-base text-muted-foreground py-2"
            variants={fadeInUp}
          >
            <Clock className="w-5 h-5" />
            <span>
              {ticket.hoursToEvent < 24 
                ? `Mancano ${ticket.hoursToEvent} ore`
                : `Mancano ${Math.floor(ticket.hoursToEvent / 24)} giorni`
              }
            </span>
          </motion.div>
        )}

        <motion.div 
          className="px-4 py-4"
          variants={scaleIn}
        >
          <DigitalTicketCard 
            ticket={{
              ...ticket,
              allowNameChange: ticket.allowNameChange,
              allowResale: ticket.allowResale,
              organizerCompany: ticket.organizerCompany,
              ticketingManager: ticket.ticketingManager,
              emissionDateTime: ticket.emissionDateTime,
              progressiveNumber: ticket.progressiveNumber,
            }} 
            template={digitalTemplate}
            hideHolderName={ticket.isFromNameChange}
          />
        </motion.div>

        <motion.div 
          className="px-4 space-y-3"
          variants={staggerChildren}
        >
          <motion.div 
            className="bg-card rounded-2xl p-4 space-y-4"
            variants={fadeInUp}
          >
            <h3 className="text-lg font-semibold text-foreground">Informazioni Biglietto</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="text-base font-medium text-foreground" data-testid="text-ticket-type">
                    {ticket.ticketType}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Settore</p>
                  <p className="text-base font-medium text-foreground" data-testid="text-sector">
                    {ticket.sectorName}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prezzo</p>
                  <p className="text-xl font-bold text-primary" data-testid="text-price">
                    €{price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Intestatario</p>
                  <p className="text-base font-medium text-foreground" data-testid="text-holder">
                    {holderName}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {(ticket.previousTicket || ticket.replacedBy) && (
            <motion.div 
              className="bg-card rounded-2xl p-4 space-y-4"
              variants={fadeInUp}
            >
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                Storico Cambio Nominativo
              </h3>
              
              {ticket.previousTicket && (
                <div className="space-y-3">
                  {ticket.nameChangeDate && (
                    <p className="text-sm text-muted-foreground">
                      Data cambio: {format(new Date(ticket.nameChangeDate), "d MMMM yyyy 'ore' HH:mm", { locale: it })}
                    </p>
                  )}
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" data-testid="badge-old-ticket-cancelled-mobile">ANNULLATO</Badge>
                      <span className="text-sm text-muted-foreground">Biglietto precedente</span>
                    </div>
                    <p className="text-sm">
                      Sigillo: <span className="line-through text-muted-foreground" data-testid="text-old-sigillo-mobile">{ticket.previousTicket.sigilloFiscale}</span>
                    </p>
                    <p className="text-sm">
                      Progressivo: <span className="line-through text-muted-foreground" data-testid="text-old-progressivo-mobile">#{ticket.previousTicket.progressiveNumber}</span>
                    </p>
                    <p className="text-xs text-muted-foreground italic">Questo biglietto sostituisce il precedente</p>
                  </div>
                  <div className="flex justify-center py-2">
                    <ArrowDown className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 hover:bg-green-600" data-testid="badge-new-ticket-valid-mobile">VALIDO</Badge>
                      <span className="text-sm text-muted-foreground">Biglietto attuale</span>
                    </div>
                    <p className="text-sm">
                      Sigillo: <span className="font-medium" data-testid="text-current-sigillo-mobile">{ticket.fiscalSealCode}</span>
                    </p>
                    <p className="text-sm">
                      Progressivo: <span className="font-medium" data-testid="text-current-progressivo-mobile">#{ticket.progressiveNumber}</span>
                    </p>
                  </div>
                </div>
              )}
              
              {ticket.replacedBy && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-center">
                    <Badge variant="destructive" className="text-base px-4 py-1" data-testid="badge-replaced-cancelled-mobile">ANNULLATO</Badge>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    Questo biglietto è stato annullato a seguito di cambio nominativo
                  </p>
                  <p className="text-sm text-center">
                    Sigillo: <span className="line-through text-muted-foreground">{ticket.fiscalSealCode}</span>
                  </p>
                  <p className="text-xs text-center text-muted-foreground italic">
                    Il nuovo biglietto è stato trasferito al nuovo intestatario
                  </p>
                </div>
              )}
            </motion.div>
          )}

          <motion.div 
            className="bg-card rounded-2xl p-4 space-y-4"
            variants={fadeInUp}
          >
            <h3 className="text-lg font-semibold text-foreground">Informazioni Evento</h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data e Ora</p>
                  <p className="text-base font-medium text-foreground" data-testid="text-event-date">
                    {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
                  </p>
                  <p className="text-base text-muted-foreground">
                    ore {format(eventDate, "HH:mm", { locale: it })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Luogo</p>
                  <p className="text-base font-medium text-foreground" data-testid="text-location">
                    {ticket.locationName}
                  </p>
                  {ticket.locationAddress && (
                    <p className="text-sm text-muted-foreground">
                      {ticket.locationAddress}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {(ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && !ticket.isListed && (
            <motion.div 
              className="space-y-3 pt-2"
              variants={fadeInUp}
            >
              <h3 className="text-lg font-semibold text-foreground px-1">Salva Biglietto</h3>
              <p className="text-xs text-muted-foreground px-1 -mt-2">
                Scarica l'immagine del biglietto, poi salvala nelle Foto per aggiungerla al Wallet
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <HapticButton
                  variant="outline"
                  className="min-h-[52px] bg-black text-white border-black rounded-xl text-base font-medium"
                  onClick={() => {
                    window.location.href = `/api/public/account/tickets/${id}/wallet/apple`;
                  }}
                  data-testid="button-add-apple-wallet"
                  hapticType="medium"
                >
                  <SiApple className="w-5 h-5 mr-2" />
                  Immagine
                </HapticButton>
                
                <HapticButton
                  variant="outline"
                  className="min-h-[52px] bg-gradient-to-r from-blue-500 to-green-500 text-white border-0 rounded-xl text-base font-medium"
                  onClick={() => {
                    window.location.href = `/api/public/account/tickets/${id}/wallet/google`;
                  }}
                  data-testid="button-add-google-wallet"
                  hapticType="medium"
                >
                  <SiGoogle className="w-5 h-5 mr-2" />
                  Immagine
                </HapticButton>
              </div>

              <HapticButton
                variant="outline"
                className="w-full min-h-[52px] rounded-xl text-base font-medium"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                data-testid="button-download-pdf"
                hapticType="medium"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Download className="w-5 h-5 mr-2" />
                )}
                Scarica PDF
              </HapticButton>
            </motion.div>
          )}

          {(ticket.status === "emitted" || ticket.status === "active" || ticket.status === "valid") && (
            <motion.div 
              className="space-y-3 pt-4"
              variants={fadeInUp}
            >
              {ticket.isListed && ticket.existingResale ? (
                <div className="space-y-3">
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl">
                    <p className="text-base font-medium text-primary text-center">
                      In vendita a €{parseFloat(ticket.existingResale.resalePrice).toFixed(2)}
                    </p>
                  </div>
                  <HapticButton
                    variant="outline"
                    className="w-full min-h-[52px] text-destructive border-destructive/30 rounded-xl text-base font-medium"
                    onClick={() => cancelResaleMutation.mutate()}
                    disabled={cancelResaleMutation.isPending}
                    data-testid="button-cancel-resale"
                    hapticType="medium"
                  >
                    {cancelResaleMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 mr-2" />
                        Rimuovi dalla Vendita
                      </>
                    )}
                  </HapticButton>
                </div>
              ) : (
                <>
                  {ticket.canNameChange && (
                    <HapticButton
                      variant="outline"
                      className="w-full min-h-[52px] rounded-xl text-base font-medium"
                      onClick={() => navigate(`/account/tickets/${id}/name-change`)}
                      data-testid="button-name-change"
                      hapticType="light"
                    >
                      <User className="w-5 h-5 mr-2" />
                      Cambia Nominativo
                    </HapticButton>
                  )}
                  {ticket.canResale && (
                    <HapticButton
                      className="w-full min-h-[52px] rounded-xl text-base font-medium"
                      onClick={() => navigate(`/account/tickets/${id}/resale`)}
                      data-testid="button-resale"
                      hapticType="medium"
                    >
                      <RefreshCw className="w-5 h-5 mr-2" />
                      Metti in Vendita
                    </HapticButton>
                  )}
                  {!ticket.canNameChange && !ticket.canResale && ticket.hoursToEvent > 0 && (
                    <p className="text-center text-base text-muted-foreground py-4">
                      Cambio nominativo e rivendita non disponibili
                    </p>
                  )}
                </>
              )}
            </motion.div>
          )}

          {ticket.fiscalSealCode && (
            <motion.div 
              className="pt-4 pb-8"
              variants={fadeInUp}
            >
              <p className="text-xs text-muted-foreground text-center font-mono break-all px-4">
                Sigillo fiscale: {ticket.fiscalSealCode}
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </MobileAppLayout>
  );
}
