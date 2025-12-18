import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, 
  Users, 
  CheckCircle2, 
  ListChecks, 
  Armchair, 
  ArrowRight,
  Clock,
  MapPin,
  UserPlus,
  QrCode,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { Event } from "@shared/schema";

interface EventWithAssignment extends Event {
  assignmentType: 'owner' | 'staff' | 'pr' | 'scanner';
  permissions: {
    canManageLists?: boolean;
    canManageTables?: boolean;
    canCreatePr?: boolean;
    canApproveTables?: boolean;
    canAddToLists?: boolean;
    canProposeTables?: boolean;
    canScanLists?: boolean;
    canScanTables?: boolean;
    canScanTickets?: boolean;
  };
  staffUserId?: string;
}

interface MyStats {
  entriesCreated: number;
  checkIns: number;
  tablesProposed: number;
  activeEvents: number;
}

export default function StaffPrHome() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const { data: myEvents, isLoading: eventsLoading } = useQuery<EventWithAssignment[]>({
    queryKey: ['/api/e4u/my-events'],
  });

  const { data: myStats, isLoading: statsLoading } = useQuery<MyStats>({
    queryKey: ['/api/e4u/my-stats'],
  });

  const isStaff = user?.role === 'capo_staff';
  const isPr = user?.role === 'pr';
  const isScanner = user?.role === 'scanner';

  const getRoleBadge = (assignmentType: string) => {
    switch (assignmentType) {
      case 'staff':
        return <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">Staff</Badge>;
      case 'pr':
        return <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">PR</Badge>;
      case 'scanner':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Scanner</Badge>;
      default:
        return <Badge>Gestore</Badge>;
    }
  };

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const start = new Date(event.startDatetime);
    const end = event.endDatetime ? new Date(event.endDatetime) : null;
    
    if (end && now > end) return { label: 'Concluso', color: 'bg-gray-500/20 text-gray-400' };
    if (now >= start && (!end || now <= end)) return { label: 'In corso', color: 'bg-green-500/20 text-green-400' };
    return { label: 'Programmato', color: 'bg-blue-500/20 text-blue-400' };
  };

  const renderPermissions = (permissions: EventWithAssignment['permissions']) => {
    const badges = [];
    if (permissions.canManageLists) badges.push(<Badge key="ml" variant="outline" className="text-xs">Gestione Liste</Badge>);
    if (permissions.canManageTables) badges.push(<Badge key="mt" variant="outline" className="text-xs">Gestione Tavoli</Badge>);
    if (permissions.canCreatePr) badges.push(<Badge key="cp" variant="outline" className="text-xs">Crea PR</Badge>);
    if (permissions.canAddToLists) badges.push(<Badge key="al" variant="outline" className="text-xs">Aggiungi Liste</Badge>);
    if (permissions.canProposeTables) badges.push(<Badge key="pt" variant="outline" className="text-xs">Proponi Tavoli</Badge>);
    if (permissions.canScanLists) badges.push(<Badge key="sl" variant="outline" className="text-xs">Scan Liste</Badge>);
    if (permissions.canScanTables) badges.push(<Badge key="st" variant="outline" className="text-xs">Scan Tavoli</Badge>);
    return badges;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        {/* Header */}
        <div className="glass-card p-4 sm:p-6 rounded-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground" data-testid="text-welcome">
                Ciao, {user?.firstName || user?.email?.split('@')[0] || 'Utente'}!
              </h1>
              <p className="text-muted-foreground">
                {isStaff && "Pannello Staff - Gestisci i tuoi eventi assegnati"}
                {isPr && "Pannello PR - Aggiungi ospiti e proponi tavoli"}
                {isScanner && "Pannello Scanner - Scansiona i QR code agli eventi"}
              </p>
            </div>
            <Badge className="text-lg px-4 py-2" data-testid="badge-role">
              {isStaff && "Capo Staff"}
              {isPr && "PR"}
              {isScanner && "Scanner"}
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card className="glass-card border-white/10">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Calendar className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Eventi Attivi</p>
                  <p className="text-2xl font-bold" data-testid="stat-active-events">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : myStats?.activeEvents || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-teal-500/20">
                  <Users className="h-6 w-6 text-teal-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Persone Aggiunte</p>
                  <p className="text-2xl font-bold" data-testid="stat-entries">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : myStats?.entriesCreated || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Check-in Effettuati</p>
                  <p className="text-2xl font-bold" data-testid="stat-checkins">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : myStats?.checkIns || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-pink-500/20">
                  <Armchair className="h-6 w-6 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tavoli Proposti</p>
                  <p className="text-2xl font-bold" data-testid="stat-tables">
                    {statsLoading ? <Skeleton className="h-8 w-12" /> : myStats?.tablesProposed || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            I Miei Eventi
          </h2>

          {eventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="glass-card">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : myEvents && myEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myEvents.map((event) => {
                const status = getEventStatus(event);
                return (
                  <Card 
                    key={event.id} 
                    className="glass-card border-white/10 hover-elevate cursor-pointer"
                    onClick={() => navigate(`/events/${event.id}/panel`)}
                    data-testid={`card-event-${event.id}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1">{event.name}</CardTitle>
                        {getRoleBadge(event.assignmentType)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {format(new Date(event.startDatetime), "d MMM yyyy, HH:mm", { locale: it })}
                        </span>
                      </div>
                      
                      {event.locationId && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">Location assegnata</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Badge className={status.color}>{status.label}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-2">
                        {renderPermissions(event.permissions)}
                      </div>

                      <Button 
                        className="w-full mt-2" 
                        variant="outline"
                        data-testid={`button-enter-event-${event.id}`}
                      >
                        <span>Entra nel Pannello</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="glass-card border-white/10">
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nessun evento assegnato</h3>
                <p className="text-muted-foreground">
                  Non hai ancora eventi assegnati. Contatta il tuo responsabile per essere aggiunto a un evento.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Azioni Rapide
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(isStaff || isPr) && (
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel`)}
                disabled={!myEvents?.length}
                data-testid="button-quick-lists"
              >
                <ListChecks className="h-6 w-6" />
                <span>Gestione Liste</span>
              </Button>
            )}
            
            {isPr && (
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=tables`)}
                disabled={!myEvents?.length}
                data-testid="button-quick-tables"
              >
                <Armchair className="h-6 w-6" />
                <span>Proponi Tavoli</span>
              </Button>
            )}

            {isStaff && (
              <Button 
                variant="outline" 
                className="h-20 flex-col gap-2"
                onClick={() => myEvents?.[0] && navigate(`/events/${myEvents[0].id}/panel?tab=pr`)}
                disabled={!myEvents?.length}
                data-testid="button-quick-pr"
              >
                <UserPlus className="h-6 w-6" />
                <span>Gestione PR</span>
              </Button>
            )}

            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/scanner')}
              data-testid="button-quick-scanner"
            >
              <QrCode className="h-6 w-6" />
              <span>Scanner QR</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
