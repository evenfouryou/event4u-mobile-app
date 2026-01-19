import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { format, getMonth } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  ChevronLeft,
  Eye,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
} from "@/components/mobile-primitives";
import type { User, Event } from "@shared/schema";

interface UserCompanyAssociation {
  id: string;
  userId: string;
  companyId: string;
  role: string | null;
  isDefault: boolean;
  createdAt: string | null;
  companyName: string;
}

type EventGroupingMode = "mese" | "stagione" | "giorno";

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.05,
    },
  }),
};

function getSeasonFromMonth(month: number, year: number, t: (key: string) => string): string {
  if (month === 11 || month === 0 || month === 1) {
    const seasonYear = month === 11 ? year : year - 1;
    return `${t('admin.gestoreEvents.seasons.winter')} ${seasonYear + 1}`;
  } else if (month >= 2 && month <= 4) {
    return `${t('admin.gestoreEvents.seasons.spring')} ${year}`;
  } else if (month >= 5 && month <= 7) {
    return `${t('admin.gestoreEvents.seasons.summer')} ${year}`;
  } else {
    return `${t('admin.gestoreEvents.seasons.autumn')} ${year}`;
  }
}

export default function AdminGestoreEvents() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const params = useParams<{ gestoreId: string }>();
  const gestoreId = params.gestoreId;
  const isMobile = useIsMobile();

  const [eventStatusFilter, setEventStatusFilter] = useState<string>("tutti");
  const [eventGroupingMode, setEventGroupingMode] = useState<EventGroupingMode>("mese");

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const gestore = useMemo(() => {
    return users?.find(u => u.id === gestoreId);
  }, [users, gestoreId]);

  const gestoreLoading = !users;

  const { data: gestoreCompanies, isLoading: companiesLoading } = useQuery<UserCompanyAssociation[]>({
    queryKey: ["/api/users", gestoreId, "companies"],
    enabled: !!gestoreId,
  });

  // Collect all company IDs for the gestore
  const gestoreCompanyIds = useMemo(() => {
    const ids: string[] = [];
    if (gestoreCompanies) {
      gestoreCompanies.forEach(gc => {
        if (!ids.includes(gc.companyId)) ids.push(gc.companyId);
      });
    }
    if (gestore?.companyId && !ids.includes(gestore.companyId)) {
      ids.push(gestore.companyId);
    }
    return ids;
  }, [gestoreCompanies, gestore]);

  // Fetch events for each company using the query parameter
  const { data: companyEventsResults, isLoading: eventsLoading } = useQuery<Event[][]>({
    queryKey: ["/api/events", "companies", gestoreCompanyIds],
    enabled: gestoreCompanyIds.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        gestoreCompanyIds.map(async (companyId) => {
          const response = await fetch(`/api/events?companyId=${companyId}`);
          if (!response.ok) return [];
          return response.json();
        })
      );
      return results;
    },
  });

  const gestoreEvents = useMemo(() => {
    if (!companyEventsResults) return [];
    return companyEventsResults.flat();
  }, [companyEventsResults]);

  const filteredEvents = useMemo(() => {
    if (eventStatusFilter === "tutti") return gestoreEvents;
    if (eventStatusFilter === "in_corso") {
      return gestoreEvents.filter((e) => e.status === "ongoing" || e.status === "scheduled");
    }
    return gestoreEvents.filter((e) => e.status === "closed" || e.status === "completed");
  }, [gestoreEvents, eventStatusFilter]);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    
    filteredEvents.forEach((event) => {
      const date = new Date(event.startDatetime);
      let groupKey: string;
      
      if (eventGroupingMode === "mese") {
        groupKey = format(date, "MMMM yyyy", { locale: it });
      } else if (eventGroupingMode === "stagione") {
        const month = getMonth(date);
        const year = date.getFullYear();
        groupKey = getSeasonFromMonth(month, year, t);
      } else {
        groupKey = format(date, "EEEE d MMMM yyyy", { locale: it });
      }
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(event);
    });
    
    Object.keys(groups).forEach((key) => {
      groups[key].sort(
        (a, b) => new Date(b.startDatetime).getTime() - new Date(a.startDatetime).getTime()
      );
    });
    
    return groups;
  }, [filteredEvents, eventGroupingMode]);

  const formatEventDateRange = (startDatetime: string | Date, endDatetime: string | Date) => {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    
    if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
      return `${format(start, "d MMMM yyyy, HH:mm", { locale: it })} - ${format(end, "HH:mm")}`;
    }
    return `${format(start, "d MMMM yyyy, HH:mm", { locale: it })} - ${format(end, "d MMMM yyyy, HH:mm", { locale: it })}`;
  };

  const renderEventCard = (event: Event, index: number) => (
    <motion.div
      key={event.id}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="hover-elevate" data-testid={`card-event-${event.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate" data-testid={`text-event-name-${event.id}`}>
                {event.name}
              </h3>
              <p className="text-sm text-muted-foreground mt-1" data-testid={`text-event-dates-${event.id}`}>
                {formatEventDateRange(event.startDatetime, event.endDatetime)}
              </p>
              <div className="mt-2">
                <Badge
                  variant={
                    event.status === "ongoing"
                      ? "default"
                      : event.status === "scheduled"
                      ? "secondary"
                      : "outline"
                  }
                  data-testid={`badge-event-status-${event.id}`}
                >
                  {event.status === "ongoing"
                    ? t('admin.gestoreEvents.status.ongoing')
                    : event.status === "scheduled"
                    ? t('admin.gestoreEvents.status.scheduled')
                    : event.status === "closed"
                    ? t('admin.gestoreEvents.status.closed')
                    : event.status}
                </Badge>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation(`/admin/gestori/${gestoreId}/events/${event.id}`)}
              data-testid={`button-view-event-${event.id}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderDesktopContent = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {t('admin.gestoreEvents.companyEvents')}
        </CardTitle>
        <CardDescription>
          {t('admin.gestoreEvents.companyEventsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 mb-4">
          <Tabs value={eventStatusFilter} onValueChange={setEventStatusFilter} className="flex-1">
            <TabsList>
              <TabsTrigger value="tutti" data-testid="tab-events-all">
                {t('admin.gestoreEvents.tabs.all')} ({gestoreEvents.length})
              </TabsTrigger>
              <TabsTrigger value="in_corso" data-testid="tab-events-ongoing">
                {t('admin.gestoreEvents.tabs.ongoing')}
              </TabsTrigger>
              <TabsTrigger value="passati" data-testid="tab-events-past">
                {t('admin.gestoreEvents.tabs.past')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t('admin.gestoreEvents.groupBy')}:</span>
            <Select value={eventGroupingMode} onValueChange={(v) => setEventGroupingMode(v as EventGroupingMode)}>
              <SelectTrigger className="w-32" data-testid="select-event-grouping">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mese" data-testid="select-grouping-mese">{t('admin.gestoreEvents.grouping.month')}</SelectItem>
                <SelectItem value="stagione" data-testid="select-grouping-stagione">{t('admin.gestoreEvents.grouping.season')}</SelectItem>
                <SelectItem value="giorno" data-testid="select-grouping-giorno">{t('admin.gestoreEvents.grouping.day')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          {Object.keys(groupedEvents).length > 0 ? (
            <Accordion type="multiple" className="space-y-2">
              {Object.entries(groupedEvents).map(([groupKey, events]) => (
                <AccordionItem key={groupKey} value={groupKey} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <span className="font-medium capitalize">{groupKey}</span>
                    <Badge variant="secondary" className="ml-2">
                      {events.length}
                    </Badge>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 py-2">
                      {events.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          data-testid={`event-item-${event.id}`}
                        >
                          <div>
                            <h4 className="font-medium" data-testid={`text-event-name-${event.id}`}>{event.name}</h4>
                            <p className="text-sm text-muted-foreground" data-testid={`text-event-dates-${event.id}`}>
                              {formatEventDateRange(event.startDatetime, event.endDatetime)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                event.status === "ongoing"
                                  ? "default"
                                  : event.status === "scheduled"
                                  ? "secondary"
                                  : "outline"
                              }
                              data-testid={`badge-event-status-${event.id}`}
                            >
                              {event.status === "ongoing"
                                ? t('admin.gestoreEvents.status.ongoing')
                                : event.status === "scheduled"
                                ? t('admin.gestoreEvents.status.scheduled')
                                : event.status === "closed"
                                ? t('admin.gestoreEvents.status.closed')
                                : event.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/admin/gestori/${gestoreId}/events/${event.id}`)}
                              data-testid={`button-view-event-${event.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('admin.gestoreEvents.noEventsFound')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title={`${t('admin.gestoreEvents.eventsOf')} ${gestore?.firstName || ""}`}
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/gestori")}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4">
          <div className="flex flex-col gap-3 mb-4">
            <Tabs value={eventStatusFilter} onValueChange={setEventStatusFilter}>
              <TabsList className="w-full">
                <TabsTrigger value="tutti" className="flex-1">{t('admin.gestoreEvents.tabs.all')}</TabsTrigger>
                <TabsTrigger value="in_corso" className="flex-1">{t('admin.gestoreEvents.tabs.ongoing')}</TabsTrigger>
                <TabsTrigger value="passati" className="flex-1">{t('admin.gestoreEvents.tabs.past')}</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={eventGroupingMode} onValueChange={(v) => setEventGroupingMode(v as EventGroupingMode)}>
              <SelectTrigger data-testid="select-event-grouping-mobile">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mese">{t('admin.gestoreEvents.grouping.byMonth')}</SelectItem>
                <SelectItem value="stagione">{t('admin.gestoreEvents.grouping.bySeason')}</SelectItem>
                <SelectItem value="giorno">{t('admin.gestoreEvents.grouping.byDay')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {eventsLoading || gestoreLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredEvents.length > 0 ? (
            <div className="space-y-3">
              {filteredEvents.map((event, index) => renderEventCard(event, index))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t('admin.gestoreEvents.noEventsFound')}
            </div>
          )}
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/gestori")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {t('admin.gestoreEvents.eventsOf')} {gestore?.firstName} {gestore?.lastName}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.gestoreEvents.companyEventsDescription')}
          </p>
        </div>
      </div>

      {gestoreLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        renderDesktopContent()
      )}
    </div>
  );
}
