import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Users, Eye, Search, Warehouse, Repeat, FileEdit, Clock, CalendarCheck, FilePenLine } from "lucide-react";
import type { Event, Station, EventFormat } from "@shared/schema";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: 'Bozza', variant: 'outline' },
  scheduled: { label: 'Programmato', variant: 'secondary' },
  ongoing: { label: 'In Corso', variant: 'default' },
  closed: { label: 'Chiuso', variant: 'destructive' },
};

export default function Events() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'ongoing' | 'scheduled' | 'draft'>('ongoing');
  const { user } = useAuth();
  
  const canCreateEvents = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: formats } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  const { data: allStations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  // Separate fixed (general) stations from event-specific stations
  const fixedStations = useMemo(() => {
    if (!allStations) return [];
    return allStations.filter(s => !s.eventId && !s.deletedAt);
  }, [allStations]);

  const formatsMap = useMemo(() => {
    if (!formats) return new Map<string, EventFormat>();
    return new Map(formats.map(f => [f.id, f]));
  }, [formats]);

  // Filter events by tab
  const ongoingEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => 
      e.status === 'ongoing' && 
      (searchQuery === "" || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [events, searchQuery]);

  const scheduledEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => 
      e.status === 'scheduled' && 
      (searchQuery === "" || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [events, searchQuery]);

  const draftEvents = useMemo(() => {
    if (!events) return [];
    return events.filter(e => 
      e.status === 'draft' && 
      (searchQuery === "" || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [events, searchQuery]);

  // Get count for each tab
  const tabCounts = useMemo(() => ({
    ongoing: events?.filter(e => e.status === 'ongoing').length || 0,
    scheduled: events?.filter(e => e.status === 'scheduled').length || 0,
    draft: events?.filter(e => e.status === 'draft').length || 0,
  }), [events]);

  const renderEventCard = (event: Event, isDraft: boolean = false) => {
    const statusInfo = statusLabels[event.status] || statusLabels.draft;
    // Get both fixed stations and event-specific stations
    const eventSpecificStations = allStations?.filter(s => s.eventId === event.id) || [];
    const totalStations = fixedStations.length + eventSpecificStations.length;
    const eventFormat = event.formatId ? formatsMap.get(event.formatId) : undefined;

    return (
      <Card key={event.id} className="hover-elevate" data-testid={`event-card-${event.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <CardTitle className="text-lg flex-1">{event.name}</CardTitle>
            <div className="flex gap-2 flex-wrap">
              {eventFormat && (
                <Badge 
                  style={{ 
                    backgroundColor: eventFormat.color ?? '#3b82f6',
                    color: '#ffffff'
                  }}
                >
                  {eventFormat.name}
                </Badge>
              )}
              {event.seriesId && (
                <Badge variant="outline" className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  Ricorrente
                </Badge>
              )}
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <CalendarIcon className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div>
              <p className="font-medium">
                {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
              <p className="text-muted-foreground">
                {new Date(event.startDatetime).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
                {' - '}
                {new Date(event.endDatetime).toLocaleTimeString('it-IT', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {event.capacity && (
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Capienza: <span className="font-medium text-foreground">{event.capacity}</span>
              </span>
            </div>
          )}

          {totalStations > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Postazioni: <span className="font-medium text-foreground">{totalStations}</span>
                {fixedStations.length > 0 && eventSpecificStations.length > 0 && (
                  <span className="text-xs ml-1">
                    ({fixedStations.length} fisse + {eventSpecificStations.length} evento)
                  </span>
                )}
                {fixedStations.length > 0 && eventSpecificStations.length === 0 && (
                  <span className="text-xs ml-1">(fisse)</span>
                )}
              </span>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            {isDraft ? (
              <Button 
                onClick={() => navigate(`/events/wizard/${event.id}`)} 
                className="flex-1" 
                variant="default"
                data-testid={`button-continue-draft-${event.id}`}
              >
                <FileEdit className="h-4 w-4 mr-2" />
                Continua
              </Button>
            ) : (
              <Button asChild className="flex-1" variant="outline">
                <Link href={`/events/${event.id}`} data-testid={`button-view-event-${event.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  Dettagli
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEventList = (eventsList: Event[], emptyMessage: string, isDraft: boolean = false) => {
    if (eventsLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      );
    }

    if (eventsList.length === 0) {
      return (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">{emptyMessage}</p>
            {canCreateEvents && searchQuery === '' && (
              <Button 
                onClick={() => navigate('/events/wizard')} 
                data-testid="button-create-event-empty"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea Evento
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {eventsList.map(event => renderEventCard(event, isDraft))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gestione Eventi</h1>
          <p className="text-muted-foreground">
            {canCreateEvents ? 'Organizza e monitora i tuoi eventi' : 'Visualizza gli eventi'}
          </p>
        </div>
        <Button 
          onClick={() => navigate('/events/wizard')}
          data-testid="button-create-event"
          disabled={!canCreateEvents}
          title={!canCreateEvents ? "Solo gli admin possono creare eventi" : ""}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Evento
        </Button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca eventi per nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 max-w-md"
            data-testid="input-search-events"
          />
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'ongoing' | 'scheduled' | 'draft')}>
        <TabsList className="mb-6 grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="ongoing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>In Corso</span>
            {tabCounts.ongoing > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5">
                {tabCounts.ongoing}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4" />
            <span>Programmati</span>
            {tabCounts.scheduled > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                {tabCounts.scheduled}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <FilePenLine className="h-4 w-4" />
            <span>Bozze</span>
            {tabCounts.draft > 0 && (
              <Badge variant="outline" className="ml-1 h-5 px-1.5">
                {tabCounts.draft}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="mt-0">
          {renderEventList(ongoingEvents, searchQuery ? "Nessun evento in corso trovato" : "Nessun evento in corso")}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-0">
          {renderEventList(scheduledEvents, searchQuery ? "Nessun evento programmato trovato" : "Nessun evento programmato")}
        </TabsContent>

        <TabsContent value="draft" className="mt-0">
          {canCreateEvents ? (
            renderEventList(draftEvents, searchQuery ? "Nessuna bozza trovata" : "Nessuna bozza in sospeso", true)
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FilePenLine className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Solo gli amministratori possono vedere le bozze</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
