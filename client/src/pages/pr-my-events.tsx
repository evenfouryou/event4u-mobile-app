import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Search,
  MapPin,
  Clock,
  Users,
  ListChecks,
  Armchair,
  QrCode,
  ChevronRight,
  RefreshCw,
  PartyPopper,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { format, isAfter, isBefore, isToday } from "date-fns";
import { it } from "date-fns/locale";
import type { EventStaffAssignment, Event } from "@shared/schema";

export default function PrMyEventsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: assignments = [], isLoading: loadingAssignments, refetch } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/pr/my-assignments"],
  });

  const { data: allEvents = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const myEvents = useMemo(() => {
    const assignedEventIds = new Set(assignments.filter(a => a.isActive).map(a => a.eventId));
    return allEvents.filter(e => assignedEventIds.has(e.id));
  }, [allEvents, assignments]);

  const filteredEvents = useMemo(() => {
    let filtered = myEvents;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(query) ||
        e.locationId?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    return filtered.sort((a, b) => 
      new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime()
    );
  }, [myEvents, searchQuery, statusFilter]);

  const upcomingEvents = useMemo(() =>
    filteredEvents.filter(e => isAfter(new Date(e.startDatetime), new Date()) || isToday(new Date(e.startDatetime))),
    [filteredEvents]
  );

  const pastEvents = useMemo(() =>
    filteredEvents.filter(e => isBefore(new Date(e.startDatetime), new Date()) && !isToday(new Date(e.startDatetime))),
    [filteredEvents]
  );

  const getAssignmentForEvent = (eventId: string) =>
    assignments.find(a => a.eventId === eventId && a.isActive);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Programmato</Badge>;
      case 'ongoing':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">In Corso</Badge>;
      case 'closed':
        return <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20">Concluso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'gestore_covisione':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Co-Visione</Badge>;
      case 'capo_staff':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Capo Staff</Badge>;
      case 'pr':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">PR</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const isLoading = loadingAssignments || loadingEvents;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const EventCard = ({ event }: { event: Event }) => {
    const assignment = getAssignmentForEvent(event.id);
    const eventDate = new Date(event.startDatetime);
    const isEventToday = isToday(eventDate);
    const isEventUpcoming = isAfter(eventDate, new Date());

    return (
      <Card 
        className={`hover-elevate transition-all ${isEventToday ? 'ring-2 ring-primary' : ''}`}
        data-testid={`card-event-${event.id}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{event.name}</CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" />
                {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-1 items-end">
              {getStatusBadge(event.status)}
              {isEventToday && (
                <Badge className="bg-primary/10 text-primary">Oggi</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            {format(eventDate, "HH:mm", { locale: it })}
            {event.endDatetime && ` - ${format(new Date(event.endDatetime), "HH:mm", { locale: it })}`}
          </div>
          
          {assignment && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Il tuo ruolo:</span>
              {getRoleBadge(assignment.role)}
            </div>
          )}

          {assignment?.permissions && assignment.permissions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {assignment.permissions.map((perm) => (
                <Badge key={perm} variant="outline" className="text-xs">
                  {perm === 'gestione_liste' && 'Liste'}
                  {perm === 'gestione_tavoli' && 'Tavoli'}
                  {perm === 'check_in' && 'Check-in'}
                  {perm === 'visualizza_stats' && 'Stats'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 pt-2 border-t">
          {(assignment?.permissions?.includes('gestione_liste') || assignment?.role === 'pr') && (
            <Button variant="outline" size="sm" asChild data-testid={`button-lists-${event.id}`}>
              <Link href="/pr/guest-lists">
                <ListChecks className="w-4 h-4 mr-1" />
                Liste
              </Link>
            </Button>
          )}
          {(assignment?.permissions?.includes('gestione_tavoli') || assignment?.role === 'gestore_covisione') && (
            <Button variant="outline" size="sm" asChild data-testid={`button-tables-${event.id}`}>
              <Link href="/pr/tables">
                <Armchair className="w-4 h-4 mr-1" />
                Tavoli
              </Link>
            </Button>
          )}
          {(assignment?.permissions?.includes('check_in') || assignment?.role === 'capo_staff') && (
            <Button variant="outline" size="sm" asChild data-testid={`button-scanner-${event.id}`}>
              <Link href="/pr/scanner">
                <QrCode className="w-4 h-4 mr-1" />
                Scanner
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <PartyPopper className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            I Miei Eventi
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Eventi a cui sei stato assegnato
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Totale Eventi</p>
                <p className="text-xl sm:text-2xl font-bold">{myEvents.length}</p>
              </div>
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">In Arrivo</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-500">
                  {upcomingEvents.length}
                </p>
              </div>
              <CalendarClock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Oggi</p>
                <p className="text-xl sm:text-2xl font-bold text-green-500">
                  {myEvents.filter(e => isToday(new Date(e.startDatetime))).length}
                </p>
              </div>
              <CalendarCheck className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4 md:pt-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Completati</p>
                <p className="text-xl sm:text-2xl font-bold text-purple-500">
                  {pastEvents.length}
                </p>
              </div>
              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-4 md:pt-6">
          <div className="grid gap-2 sm:gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cerca Evento</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Filtra per Stato</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="draft">Bozza</SelectItem>
                  <SelectItem value="scheduled">Programmato</SelectItem>
                  <SelectItem value="ongoing">In Corso</SelectItem>
                  <SelectItem value="closed">Concluso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            In Arrivo ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Passati ({pastEvents.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="mt-6">
          {upcomingEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarClock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nessun evento in arrivo</h3>
                <p className="text-muted-foreground">
                  Non hai eventi programmati per il futuro
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {upcomingEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="past" className="mt-6">
          {pastEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nessun evento passato</h3>
                <p className="text-muted-foreground">
                  Non hai ancora completato nessun evento
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {myEvents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nessun evento assegnato</h3>
            <p className="text-muted-foreground">
              Non sei stato ancora assegnato a nessun evento.
              <br />
              Contatta il tuo responsabile per essere assegnato.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
