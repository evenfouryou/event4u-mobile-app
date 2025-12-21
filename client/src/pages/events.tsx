import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Users, 
  Repeat, 
  Clock, 
  CalendarCheck, 
  FilePenLine, 
  CheckCircle2, 
  MapPin,
  ChevronRight,
  Sparkles,
  ListFilter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MobileAppLayout,
  HapticButton, 
  FloatingActionButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { Event, Station, EventFormat, Location } from "@shared/schema";

type FilterType = 'all' | 'active' | 'past';

const springConfig = { type: "spring", stiffness: 400, damping: 30 };

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  draft: { label: 'Bozza', color: 'text-muted-foreground', bgColor: 'bg-muted/50', icon: FilePenLine },
  scheduled: { label: 'Programmato', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: CalendarCheck },
  ongoing: { label: 'In Corso', color: 'text-teal', bgColor: 'bg-teal-500/20', icon: Clock },
  closed: { label: 'Chiuso', color: 'text-rose-400', bgColor: 'bg-rose-500/20', icon: CheckCircle2 },
};

function FilterChip({ 
  active, 
  label, 
  count, 
  onClick,
  testId,
}: { 
  active: boolean; 
  label: string; 
  count: number; 
  onClick: () => void;
  testId: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={springConfig}
      onClick={() => {
        triggerHaptic('light');
        onClick();
      }}
      data-testid={testId}
      className={`
        flex items-center gap-2 px-5 py-3 rounded-full text-base font-medium transition-all min-h-[48px]
        ${active 
          ? 'bg-primary text-black shadow-lg shadow-primary/25' 
          : 'bg-white/5 text-muted-foreground active:bg-white/10'
        }
      `}
    >
      <span>{label}</span>
      {count > 0 && (
        <span className={`
          px-2.5 py-0.5 rounded-full text-sm font-bold
          ${active ? 'bg-black/20 text-black' : 'bg-white/10 text-foreground'}
        `}>
          {count}
        </span>
      )}
    </motion.button>
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
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ ...springConfig, delay }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        triggerHaptic('medium');
        onNavigate(isDraft ? `/events/wizard/${event.id}` : `/events/${event.id}/hub`);
      }}
      className="relative overflow-hidden rounded-3xl bg-card border border-border active:bg-card/80 cursor-pointer"
      data-testid={`event-card-${event.id}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-2 ${
        event.status === 'ongoing' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 
        event.status === 'scheduled' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
        event.status === 'closed' ? 'bg-gradient-to-r from-rose-500 to-pink-500' :
        'bg-gradient-to-r from-gray-500 to-slate-500'
      }`} />
      
      <div className="p-6 pt-7">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-bold truncate mb-3">{event.name}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium min-h-[32px] ${status.bgColor} ${status.color}`}>
                <StatusIcon className="h-4 w-4" />
                {status.label}
              </span>
              {format && (
                <span 
                  className="px-4 py-1.5 rounded-full text-sm font-medium text-white min-h-[32px] inline-flex items-center"
                  style={{ backgroundColor: format.color ?? '#3b82f6' }}
                >
                  {format.name}
                </span>
              )}
              {event.seriesId && (
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-violet-500/20 text-violet-400 min-h-[32px]">
                  <Repeat className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
          
          <motion.div 
            className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 min-w-[48px] min-h-[48px]"
            whileTap={{ scale: 0.9 }}
            transition={springConfig}
          >
            <ChevronRight className="h-6 w-6 text-muted-foreground" />
          </motion.div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg">
                {new Date(event.startDatetime).toLocaleDateString('it-IT', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <p className="text-muted-foreground text-base">
                {new Date(event.startDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                {' - '}
                {new Date(event.endDatetime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {locationName && (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <MapPin className="h-6 w-6 text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-lg truncate">{locationName}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-6 pt-4 border-t border-border/50">
            {event.capacity && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-5 w-5" />
                <span className="text-base font-medium">{event.capacity} posti</span>
              </div>
            )}
            {stationCount > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <ListFilter className="h-5 w-5" />
                <span className="text-base font-medium">{stationCount} postazioni</span>
              </div>
            )}
          </div>
        </div>

        {isDraft && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springConfig}
            className="mt-5 pt-4 border-t border-border/50"
          >
            <div className="flex items-center gap-2 text-primary">
              <FilePenLine className="h-5 w-5" />
              <span className="text-base font-medium">Tocca per continuare la configurazione</span>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function EmptyState({ 
  filter, 
  searchQuery, 
  canCreate, 
  onCreateClick 
}: { 
  filter: FilterType;
  searchQuery: string;
  canCreate: boolean;
  onCreateClick: () => void;
}) {
  const messages: Record<FilterType, { title: string; subtitle: string }> = {
    all: { 
      title: "Nessun evento", 
      subtitle: "Crea il tuo primo evento per iniziare" 
    },
    active: { 
      title: "Nessun evento attivo", 
      subtitle: "Gli eventi in corso e programmati appariranno qui" 
    },
    past: { 
      title: "Nessun evento passato", 
      subtitle: "Gli eventi conclusi appariranno qui" 
    },
  };

  const { title, subtitle } = messages[filter];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={springConfig}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <motion.div 
        className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center mb-8"
        animate={{ 
          scale: [1, 1.05, 1],
          rotate: [0, 2, -2, 0],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut" 
        }}
      >
        <CalendarIcon className="h-12 w-12 text-primary" />
      </motion.div>
      
      <h3 className="text-2xl font-bold mb-3">
        {searchQuery ? `Nessun risultato per "${searchQuery}"` : title}
      </h3>
      <p className="text-lg text-muted-foreground mb-8 max-w-[300px]">
        {searchQuery ? "Prova con un termine di ricerca diverso" : subtitle}
      </p>
      
      {canCreate && !searchQuery && filter === 'all' && (
        <HapticButton 
          onClick={onCreateClick}
          className="gradient-golden text-black font-semibold min-h-[56px] px-8 text-lg"
          hapticType="success"
          data-testid="button-create-event-empty"
        >
          <Sparkles className="h-6 w-6 mr-2" />
          Crea Evento
        </HapticButton>
      )}
    </motion.div>
  );
}

function EventsHeader({ 
  totalCount 
}: { 
  totalCount: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
      className="flex items-center gap-4 px-5 py-4 bg-background/80 backdrop-blur-xl border-b border-border/50"
    >
      <motion.div 
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0"
        whileTap={{ scale: 0.95 }}
        transition={springConfig}
      >
        <CalendarIcon className="h-7 w-7 text-white" />
      </motion.div>
      <div>
        <h1 className="text-2xl font-bold">I Miei Eventi</h1>
        <p className="text-base text-muted-foreground">
          {totalCount} {totalCount === 1 ? 'evento' : 'eventi'} totali
        </p>
      </div>
    </motion.div>
  );
}

export default function Events() {
  const [, navigate] = useLocation();
  const [searchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
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

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    
    let filtered = events;
    
    if (searchQuery) {
      filtered = filtered.filter(e => 
        e.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(e => e.status === 'ongoing' || e.status === 'scheduled' || e.status === 'draft');
        break;
      case 'past':
        filtered = filtered.filter(e => e.status === 'closed');
        break;
    }
    
    return filtered.sort((a, b) => {
      const statusOrder = { ongoing: 0, scheduled: 1, draft: 2, closed: 3 };
      const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 4) - 
                        (statusOrder[b.status as keyof typeof statusOrder] || 4);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime();
    });
  }, [events, activeFilter, searchQuery]);

  const filterCounts = useMemo(() => ({
    all: events?.length || 0,
    active: events?.filter(e => e.status === 'ongoing' || e.status === 'scheduled' || e.status === 'draft').length || 0,
    past: events?.filter(e => e.status === 'closed').length || 0,
  }), [events]);

  const handleCreateEvent = () => {
    triggerHaptic('success');
    navigate('/events/wizard');
  };

  return (
    <MobileAppLayout
      header={<EventsHeader totalCount={filterCounts.all} />}
      noPadding
      contentClassName="pb-24"
    >
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springConfig, delay: 0.1 }}
        className="flex gap-3 overflow-x-auto px-5 py-4 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <FilterChip
          active={activeFilter === 'all'}
          label="Tutti"
          count={filterCounts.all}
          onClick={() => setActiveFilter('all')}
          testId="filter-all"
        />
        <FilterChip
          active={activeFilter === 'active'}
          label="Attivi"
          count={filterCounts.active}
          onClick={() => setActiveFilter('active')}
          testId="filter-active"
        />
        <FilterChip
          active={activeFilter === 'past'}
          label="Passati"
          count={filterCounts.past}
          onClick={() => setActiveFilter('past')}
          testId="filter-past"
        />
      </motion.div>

      <div className="px-5 space-y-5">
        <AnimatePresence mode="wait">
          {eventsLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springConfig}
              className="space-y-5"
            >
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-64 rounded-3xl" />
              ))}
            </motion.div>
          ) : filteredEvents.length === 0 ? (
            <EmptyState 
              key="empty"
              filter={activeFilter}
              searchQuery={searchQuery}
              canCreate={canCreateEvents}
              onCreateClick={handleCreateEvent}
            />
          ) : (
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={springConfig}
              className="space-y-5"
            >
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  format={event.formatId ? formatsMap.get(event.formatId) : undefined}
                  stationCount={getEventStationCount(event.id)}
                  isDraft={event.status === 'draft'}
                  onNavigate={navigate}
                  delay={index * 0.05}
                  locationName={event.locationId ? locationsMap.get(event.locationId)?.name : undefined}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {canCreateEvents && (
        <FloatingActionButton
          onClick={handleCreateEvent}
          position="bottom-right"
          data-testid="fab-create-event"
          className="gradient-golden shadow-xl shadow-primary/30"
        >
          <Plus className="h-7 w-7 text-black" />
        </FloatingActionButton>
      )}
    </MobileAppLayout>
  );
}
