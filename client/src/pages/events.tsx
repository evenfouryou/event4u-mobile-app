import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Users, 
  Eye, 
  Search, 
  Warehouse, 
  Repeat, 
  FileEdit, 
  Clock, 
  CalendarCheck, 
  FilePenLine, 
  CheckCircle2, 
  ArrowLeft,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Event, Station, EventFormat, Location } from "@shared/schema";

type TabType = 'ongoing' | 'scheduled' | 'draft' | 'closed';

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Bozza', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: FilePenLine },
  scheduled: { label: 'Programmato', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: CalendarCheck },
  ongoing: { label: 'In Corso', color: 'text-teal', bgColor: 'bg-teal-500/20', icon: Clock },
  closed: { label: 'Chiuso', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2 },
};

function TabPill({ 
  active, 
  label, 
  count, 
  icon: Icon, 
  onClick,
  testId,
}: { 
  active: boolean; 
  label: string; 
  count: number; 
  icon: React.ElementType;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all
        ${active 
          ? 'bg-primary text-black shadow-lg' 
          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
        }
      `}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
      {count > 0 && (
        <span className={`
          px-2 py-0.5 rounded-full text-xs font-bold
          ${active ? 'bg-black/20 text-black' : 'bg-white/10 text-foreground'}
        `}>
          {count}
        </span>
      )}
    </button>
  );
}

function EventCard({ 
  event, 
  format, 
  stationCount, 
  isDraft,
  onNavigate,
  delay = 0,
  locationName,
}: { 
  event: Event; 
  format?: EventFormat;
  stationCount: number;
  isDraft: boolean;
  onNavigate: (path: string) => void;
  delay?: number;
  locationName?: string;
}) {
  const status = statusConfig[event.status] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card overflow-hidden group"
      data-testid={`event-card-${event.id}`}
    >
      {/* Status bar */}
      <div className={`h-1 ${event.status === 'ongoing' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 
        event.status === 'scheduled' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
        event.status === 'closed' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
        'bg-gradient-to-r from-gray-500 to-slate-500'}`} 
      />
      
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold truncate mb-1">{event.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
              {format && (
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: format.color ?? '#3b82f6' }}
                >
                  {format.name}
                </span>
              )}
              {event.seriesId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-500/20 text-violet-400">
                  <Repeat className="h-3 w-3" />
                  Serie
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Event Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
              <p className="text-muted-foreground text-xs">
                {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {locationName && (
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-teal-500" />
              </div>
              <div>
                <p className="font-medium">{locationName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {event.capacity && (
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{event.capacity}</span>
              </div>
            )}
            {stationCount > 0 && (
              <div className="flex items-center gap-1.5">
                <Warehouse className="h-4 w-4" />
                <span>{stationCount} postazioni</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button 
          onClick={() => onNavigate(isDraft ? `/events/wizard/${event.id}` : `/events/${event.id}/hub`)} 
          className={`w-full group-hover:shadow-lg transition-all ${
            isDraft ? 'gradient-golden text-black' : ''
          }`}
          variant={isDraft ? 'default' : 'outline'}
          data-testid={isDraft ? `button-continue-draft-${event.id}` : `button-view-event-${event.id}`}
        >
          {isDraft ? (
            <>
              <FileEdit className="h-4 w-4 mr-2" />
              Continua Bozza
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-2" />
              Dettagli
            </>
          )}
          <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
        </Button>
      </div>
    </motion.div>
  );
}

export default function Events() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>('ongoing');
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

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['/api/locations'],
  });

  const fixedStations = useMemo(() => {
    if (!allStations) return [];
    return allStations.filter(s => !s.eventId && !s.deletedAt);
  }, [allStations]);

  const formatsMap = useMemo(() => {
    if (!formats) return new Map<string, EventFormat>();
    return new Map(formats.map(f => [f.id, f]));
  }, [formats]);

  const locationsMap = useMemo(() => {
    if (!locations) return new Map<string, Location>();
    return new Map(locations.map(l => [l.id, l]));
  }, [locations]);

  const getEventStationCount = (eventId: string) => {
    const eventSpecific = allStations?.filter(s => s.eventId === eventId).length || 0;
    return fixedStations.length + eventSpecific;
  };

  const filterEvents = (status: string) => {
    if (!events) return [];
    return events.filter(e => 
      e.status === status && 
      (searchQuery === "" || e.name.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  };

  const ongoingEvents = filterEvents('ongoing');
  const scheduledEvents = filterEvents('scheduled');
  const draftEvents = filterEvents('draft');
  const closedEvents = filterEvents('closed');

  const tabCounts = useMemo(() => ({
    ongoing: events?.filter(e => e.status === 'ongoing').length || 0,
    scheduled: events?.filter(e => e.status === 'scheduled').length || 0,
    draft: events?.filter(e => e.status === 'draft').length || 0,
    closed: events?.filter(e => e.status === 'closed').length || 0,
  }), [events]);

  const currentEvents = activeTab === 'ongoing' ? ongoingEvents :
    activeTab === 'scheduled' ? scheduledEvents :
    activeTab === 'draft' ? draftEvents : closedEvents;

  const emptyMessages: Record<TabType, string> = {
    ongoing: "Nessun evento in corso",
    scheduled: "Nessun evento programmato",
    draft: "Nessuna bozza in sospeso",
    closed: "Nessun evento chiuso",
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6"
      >
        <div className="flex items-center gap-3 flex-1">
          <Link href="/beverage">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <CalendarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Eventi</h1>
              <p className="text-sm text-muted-foreground">
                {canCreateEvents ? 'Organizza i tuoi eventi' : 'Visualizza gli eventi'}
              </p>
            </div>
          </div>
        </div>
        {canCreateEvents && (
          <Button 
            onClick={() => navigate('/events/wizard')}
            className="gradient-golden text-black font-semibold"
            data-testid="button-create-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuovo Evento
          </Button>
        )}
      </motion.div>

      {/* Search Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Cerca eventi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-white/5 border-white/10 rounded-xl"
            data-testid="input-search-events"
          />
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
      >
        <TabPill
          active={activeTab === 'ongoing'}
          label="In Corso"
          count={tabCounts.ongoing}
          icon={Clock}
          onClick={() => setActiveTab('ongoing')}
          testId="tab-ongoing"
        />
        <TabPill
          active={activeTab === 'scheduled'}
          label="Programmati"
          count={tabCounts.scheduled}
          icon={CalendarCheck}
          onClick={() => setActiveTab('scheduled')}
          testId="tab-scheduled"
        />
        {canCreateEvents && (
          <TabPill
            active={activeTab === 'draft'}
            label="Bozze"
            count={tabCounts.draft}
            icon={FilePenLine}
            onClick={() => setActiveTab('draft')}
            testId="tab-draft"
          />
        )}
        <TabPill
          active={activeTab === 'closed'}
          label="Chiusi"
          count={tabCounts.closed}
          icon={CheckCircle2}
          onClick={() => setActiveTab('closed')}
          testId="tab-closed"
        />
      </motion.div>

      {/* Events Grid */}
      <AnimatePresence mode="wait">
        {eventsLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </motion.div>
        ) : currentEvents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? `Nessun risultato per "${searchQuery}"` : emptyMessages[activeTab]}
            </p>
            {canCreateEvents && searchQuery === '' && activeTab !== 'closed' && (
              <Button 
                onClick={() => navigate('/events/wizard')} 
                className="gradient-golden text-black"
                data-testid="button-create-event-empty"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Crea il tuo primo evento
              </Button>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {currentEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                format={event.formatId ? formatsMap.get(event.formatId) : undefined}
                stationCount={getEventStationCount(event.id)}
                isDraft={activeTab === 'draft'}
                onNavigate={navigate}
                delay={index * 0.05}
                locationName={event.locationId ? locationsMap.get(event.locationId)?.name : undefined}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
