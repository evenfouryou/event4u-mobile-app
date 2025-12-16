import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import type { SiaeTicketedEvent, SiaeCashierAllocation, SiaeEventSector } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  Ticket,
  Store,
  MapPin,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

interface MyEventAllocation {
  event: SiaeTicketedEvent;
  allocations: (SiaeCashierAllocation & { sector?: SiaeEventSector })[];
  totalQuota: number;
  usedQuota: number;
}

export default function CashierDashboardPage() {
  const { user } = useAuth();

  const { data: myEvents, isLoading } = useQuery<MyEventAllocation[]>({
    queryKey: ["/api/cashier/my-events"],
    enabled: !!user?.id,
  });

  const getQuotaPercentage = (used: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400">Attivo</Badge>;
      case "draft":
        return <Badge variant="secondary">Bozza</Badge>;
      case "completed":
        return <Badge variant="outline">Completato</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400">Annullato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-cashier-dashboard">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <Store className="w-8 h-8 text-[#FFD700]" />
            I Miei Eventi
          </h1>
          <p className="text-muted-foreground mt-1">
            Eventi con quote biglietti assegnate
          </p>
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {myEvents.map((eventData) => {
            const percentage = getQuotaPercentage(eventData.usedQuota, eventData.totalQuota);
            const remaining = eventData.totalQuota - eventData.usedQuota;
            const isEventActive = eventData.event.status === "active" || eventData.event.status === "draft";

            return (
              <Card 
                key={eventData.event.id} 
                className="glass-card hover-elevate transition-all"
                data-testid={`card-event-${eventData.event.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg line-clamp-2">
                      {eventData.event.eventName}
                    </CardTitle>
                    {getStatusBadge(eventData.event.status)}
                  </div>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(eventData.event.eventDate), "EEEE d MMMM yyyy", { locale: it })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {eventData.event.eventTime || "Orario non specificato"}
                    {eventData.event.endTime && ` - ${eventData.event.endTime}`}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Ticket className="w-4 h-4 text-muted-foreground" />
                        Quota Biglietti
                      </span>
                      <span className={`font-medium ${remaining <= 5 ? "text-yellow-500" : remaining <= 0 ? "text-red-500" : "text-emerald-400"}`}>
                        {eventData.usedQuota} / {eventData.totalQuota}
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

                  {eventData.allocations.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Settori assegnati:</p>
                      <div className="flex flex-wrap gap-1">
                        {eventData.allocations.slice(0, 3).map((alloc) => (
                          <Badge key={alloc.id} variant="outline" className="text-xs">
                            {alloc.sector?.name || "Settore"}
                          </Badge>
                        ))}
                        {eventData.allocations.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{eventData.allocations.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {remaining <= 0 && (
                    <div className="flex items-center gap-2 text-sm text-yellow-500 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Quota esaurita
                    </div>
                  )}

                  {isEventActive && (
                    <Link href="/cassa-biglietti">
                      <Button 
                        className="w-full" 
                        disabled={remaining <= 0}
                        data-testid={`button-emit-tickets-${eventData.event.id}`}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        Emetti Biglietti
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
