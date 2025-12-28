import { useState, useEffect } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, MapPin, User, QrCode, Loader2, RotateCcw, Building2, FileText, Hash, CreditCard, CalendarCheck } from "lucide-react";
import QRCodeLib from "qrcode";
import { Button } from "@/components/ui/button";

export interface SubscriptionDetail {
  id: string;
  subscriptionCode: string;
  subscriptionTypeName: string | null;
  holderFirstName: string;
  holderLastName: string;
  status: string;
  eventsCount: number;
  eventsUsed: number;
  validFrom: string;
  validTo: string;
  qrCode: string | null;
  fiscalSealCode: string | null;
  cardCode: string | null;
  progressiveNumber: string | number | null;
  fiscalSealCounter: number | null;
  locationName: string | null;
  eventName: string | null;
  emissionDate?: string | null;
  organizerCompany?: string | null;
}

interface DigitalSubscriptionCardProps {
  subscription: SubscriptionDetail;
}

export function DigitalSubscriptionCard({ subscription }: DigitalSubscriptionCardProps) {
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  
  const validFrom = subscription.validFrom ? new Date(subscription.validFrom) : null;
  const validTo = subscription.validTo ? new Date(subscription.validTo) : null;
  const holderName = [subscription.holderFirstName, subscription.holderLastName]
    .filter(Boolean)
    .join(" ") || "Non nominativo";
  const showQrCode = (subscription.status === "active") && subscription.qrCode;

  const qrSizeValue = 192;
  const qrDarkColor = '#000000';
  const qrLightColor = '#FFFFFF';

  useEffect(() => {
    if (showQrCode && subscription.qrCode) {
      setQrLoading(true);
      QRCodeLib.toDataURL(subscription.qrCode, {
        width: qrSizeValue,
        margin: 2,
        color: {
          dark: qrDarkColor,
          light: qrLightColor,
        },
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
  }, [showQrCode, subscription.qrCode]);

  return (
    <div 
      className="relative w-full max-w-md mx-auto"
      data-testid={`digital-subscription-${subscription.id}`}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-card to-card" />
        
        <div className="relative">
          <div className="bg-gradient-to-r from-primary to-amber-500 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-black/60 uppercase tracking-wider mb-1">
                  Abbonamento
                </p>
                <h2 
                  className="text-lg sm:text-xl font-bold text-black truncate"
                  data-testid="subscription-type-name"
                >
                  {subscription.subscriptionTypeName || subscription.eventName || "Abbonamento"}
                </h2>
              </div>
              <div className="flex-shrink-0">
                <CreditCard className="w-8 h-8 text-black/40" />
              </div>
            </div>
          </div>

          <div className="relative">
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

            <div className="bg-card px-6 py-5 border-y-2 border-dashed border-border/50">
              <div className="grid grid-cols-2 gap-4">
                {validFrom && validTo && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="text-xs uppercase tracking-wide">Validità</span>
                    </div>
                    <p 
                      className="text-sm font-semibold text-foreground"
                      data-testid="subscription-validity"
                    >
                      {format(validFrom, "d MMM yyyy", { locale: it })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      fino al {format(validTo, "d MMM yyyy", { locale: it })}
                    </p>
                  </div>
                )}

                {subscription.locationName && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-xs uppercase tracking-wide">Luogo</span>
                    </div>
                    <p 
                      className="text-sm font-semibold text-foreground truncate"
                      data-testid="subscription-location"
                    >
                      {subscription.locationName}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarCheck className="w-4 h-4 text-primary" />
                    <span className="text-xs uppercase tracking-wide">Eventi</span>
                  </div>
                  <p 
                    className="text-sm font-semibold text-foreground"
                    data-testid="subscription-events"
                  >
                    {subscription.eventsUsed} / {subscription.eventsCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    utilizzati
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-xs uppercase tracking-wide">Intestatario</span>
                  </div>
                  <p 
                    className="text-sm font-semibold text-foreground truncate"
                    data-testid="subscription-holder"
                  >
                    {holderName}
                  </p>
                </div>
              </div>
            </div>

            {showQrCode && (
              <div className="bg-card px-6 py-6 flex flex-col items-center">
                <div 
                  className="relative"
                  style={{ 
                    perspective: '1000px',
                    width: qrSizeValue + 32,
                    height: qrSizeValue + 32,
                  }}
                  data-testid="subscription-qr-flip-container"
                >
                  <div
                    className="relative w-full h-full transition-transform duration-500"
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    <div 
                      className="absolute inset-0 bg-white p-4 rounded-xl shadow-lg flex items-center justify-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      {qrLoading ? (
                        <div 
                          className="flex items-center justify-center"
                          style={{ width: qrSizeValue, height: qrSizeValue }}
                        >
                          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                      ) : qrCodeImage ? (
                        <img
                          src={qrCodeImage}
                          alt="QR Code abbonamento"
                          style={{ width: qrSizeValue, height: qrSizeValue }}
                          className="w-40 h-40 sm:w-48 sm:h-48"
                          data-testid="subscription-qrcode"
                        />
                      ) : (
                        <div 
                          className="flex items-center justify-center bg-gray-100 text-gray-400"
                          style={{ width: qrSizeValue, height: qrSizeValue }}
                        >
                          <QrCode className="w-12 h-12" />
                        </div>
                      )}
                    </div>

                    <div 
                      className="absolute inset-0 bg-card border border-border rounded-xl shadow-lg p-4 flex flex-col"
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <p className="text-xs font-medium text-primary uppercase tracking-wider mb-3 text-center">
                        Dettagli Abbonamento
                      </p>
                      
                      <div className="flex-1 space-y-2 overflow-y-auto">
                        {subscription.organizerCompany && (
                          <div className="flex items-start gap-2">
                            <Building2 className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase">Organizzatore</p>
                              <p className="text-xs font-medium text-foreground truncate" data-testid="subscription-organizer">
                                {subscription.organizerCompany}
                              </p>
                            </div>
                          </div>
                        )}

                        {subscription.emissionDate && (
                          <div className="flex items-start gap-2">
                            <Calendar className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase">Data Emissione</p>
                              <p className="text-xs font-medium text-foreground" data-testid="subscription-emission-date">
                                {format(new Date(subscription.emissionDate), "d MMM yyyy HH:mm", { locale: it })}
                              </p>
                            </div>
                          </div>
                        )}

                        {subscription.fiscalSealCode && (
                          <div className="flex items-start gap-2">
                            <FileText className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase">Sigillo Fiscale</p>
                              <p className="text-[10px] font-mono text-foreground break-all" data-testid="subscription-fiscal-seal-back">
                                {subscription.fiscalSealCode}
                              </p>
                            </div>
                          </div>
                        )}

                        {subscription.progressiveNumber && (
                          <div className="flex items-start gap-2">
                            <Hash className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase">N. Progressivo</p>
                              <p className="text-xs font-medium text-foreground" data-testid="subscription-progressive-number">
                                {subscription.progressiveNumber}
                              </p>
                            </div>
                          </div>
                        )}

                        {subscription.cardCode && (
                          <div className="flex items-start gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase">Carta</p>
                              <p className="text-xs font-medium text-foreground" data-testid="subscription-card-code">
                                {subscription.cardCode}
                              </p>
                            </div>
                          </div>
                        )}

                        {subscription.fiscalSealCounter !== null && subscription.fiscalSealCounter !== undefined && (
                          <div className="flex items-start gap-2">
                            <Hash className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[10px] text-muted-foreground uppercase">Contatore</p>
                              <p className="text-xs font-medium text-foreground" data-testid="subscription-counter">
                                {subscription.fiscalSealCounter}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(false);
                        }}
                        data-testid="button-subscription-flip-back"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Mostra QR
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="default"
                  className="mt-4 w-full bg-card/80 backdrop-blur-sm border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                  onClick={() => setIsFlipped(!isFlipped)}
                  data-testid="button-subscription-toggle-flip"
                >
                  {isFlipped ? (
                    <>
                      <QrCode className="w-5 h-5 mr-2" />
                      Mostra Fronte (QR Code)
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Gira Abbonamento (Retro)
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="bg-gradient-to-b from-card to-muted/30 px-6 py-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Codice Abbonamento
                  </p>
                  <p 
                    className="font-mono text-sm font-bold text-foreground"
                    data-testid="subscription-code"
                  >
                    {subscription.subscriptionCode}
                  </p>
                </div>
              </div>

              {subscription.fiscalSealCode && (
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    Sigillo Fiscale
                  </p>
                  <p 
                    className="font-mono text-xs text-muted-foreground break-all"
                    data-testid="subscription-fiscal-seal"
                  >
                    {subscription.fiscalSealCode}
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
