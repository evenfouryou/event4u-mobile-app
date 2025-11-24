import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Plus, Calendar as CalendarIcon, Users, Eye, Search, Warehouse, Repeat, FileEdit, AlertCircle } from "lucide-react";
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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { user } = useAuth();
  
  const canCreateEvents = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: formats } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  const { data: stations } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const formatsMap = useMemo(() => {
    if (!formats) return new Map<string, EventFormat>();
    return new Map(formats.map(f => [f.id, f]));
  }, [formats]);

  // Separate draft events from published events
  const draftEvents = useMemo(() => {
    return events?.filter(e => e.status === 'draft') || [];
  }, [events]);

  const publishedEvents = useMemo(() => {
    if (!events) return [];
    
    return events.filter((event) => {
      if (event.status === 'draft') return false;
      
      const matchesSearch = searchQuery === "" || 
        event.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchQuery, statusFilter]);

  const renderEventCard = (event: Event, isDraft: boolean = false) => {
    const statusInfo = statusLabels[event.status] || statusLabels.draft;
    const eventStations = stations?.filter(s => s.eventId === event.id) || [];
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

          {eventStations.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Postazioni: <span className="font-medium text-foreground">{eventStations.length}</span>
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Gestione Eventi</h1>
          <p className="text-muted-foreground">
            {canCreateEvents ? 'Crea e organizza i tuoi eventi' : 'Visualizza gli eventi'}
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

      {/* Draft Events Section */}
      {canCreateEvents && draftEvents.length > 0 && (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Bozze in Sospeso</h2>
              <Badge variant="secondary">{draftEvents.length}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Continua a lavorare sugli eventi salvati come bozza
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftEvents.map((event) => renderEventCard(event, true))}
            </div>
          </div>
          <Separator className="my-8" />
        </>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca eventi per nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-events"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-status">
            <SelectValue placeholder="Filtra per stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="scheduled">Programmato</SelectItem>
            <SelectItem value="ongoing">In Corso</SelectItem>
            <SelectItem value="closed">Chiuso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Published Events */}
      {eventsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : publishedEvents && publishedEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {publishedEvents.map((event) => renderEventCard(event, false))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' 
                ? 'Nessun evento trovato con i filtri selezionati' 
                : 'Nessun evento creato'}
            </p>
            {canCreateEvents && !searchQuery && statusFilter === 'all' && (
              <Button 
                onClick={() => navigate('/events/wizard')} 
                data-testid="button-create-first-event"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crea Primo Evento
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
