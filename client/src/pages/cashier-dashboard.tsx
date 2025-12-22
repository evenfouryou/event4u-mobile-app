import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import {
  Calendar,
  Ticket,
  Store,
  Clock,
  ChevronRight,
  AlertCircle,
  MapPin,
} from "lucide-react";

interface CashierEventAllocation {
  allocationId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venueName: string;
  sectorId: string | null;
  sectorName: string;
  quotaQuantity: number;
  quotaUsed: number;
  quotaRemaining: number;
  isActive: boolean;
}

export default function CashierDashboardPage() {
  const { user } = useAuth();

  const { data: myEvents, isLoading } = useQuery<CashierEventAllocation[]>({
    queryKey: ["/api/cashier/my-events"],
    enabled: !!user?.id,
  });

  const getQuotaPercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  return (
    <MobileAppLayout
      header={<MobileHeader title="I Miei Eventi" showBackButton />}
      contentClassName="pb-24"
    >
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6" data-testid="page-cashier-dashboard">
        {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !myEvents || myEvents.length === 0 ? (
        <Card className="glass-card" data-testid="card-no-events">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">Nessun Evento Assegnato</h3>
            <p className="text-muted-foreground mt-2">
              Non hai ancora quote biglietti assegnate per nessun evento.
              Contatta il tuo gestore per ricevere le assegnazioni.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {myEvents.map((eventData) => {
            const percentage = getQuotaPercentage(eventData.quotaUsed, eventData.quotaQuantity);
            const remaining = eventData.quotaRemaining;

            return (
              <Card 
                key={eventData.allocationId} 
                className="glass-card hover-elevate transition-all"
                data-testid={`card-event-${eventData.eventId}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {eventData.eventName}
                    </CardTitle>
                    <Badge className="bg-emerald-500/20 text-emerald-400">Attivo</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {eventData.eventDate ? format(new Date(eventData.eventDate), "EEEE d MMMM yyyy", { locale: it }) : "Data non specificata"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {eventData.eventTime || "Orario non specificato"}
                  </div>
                  
                  {eventData.venueName && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      {eventData.venueName}
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-muted-foreground" />
                        Quota Biglietti
                      </span>
                      <span className={`font-medium ${remaining <= 5 && remaining > 0 ? "text-yellow-500" : remaining <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                        {eventData.quotaUsed} / {eventData.quotaQuantity}
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${percentage > 90 ? "[&>div]:bg-red-500" : percentage > 75 ? "[&>div]:bg-yellow-500" : ""}`}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {remaining} biglietti rimanenti
                    </div>
                  </div>

                  {eventData.sectorName && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Settore assegnato:</p>
                      <Badge variant="outline" className="text-xs">
                        {eventData.sectorName}
                      </Badge>
                    </div>
                  )}

                  {remaining <= 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-500 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Quota esaurita
                    </div>
                  )}

                  <Link href={`/cassa-biglietti?eventId=${eventData.eventId}`}>
                    <Button 
                      className="w-full" 
                      disabled={remaining <= 0}
                      data-testid={`button-emit-tickets-${eventData.eventId}`}
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Emetti Biglietti
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
    </MobileAppLayout>
  );
}
