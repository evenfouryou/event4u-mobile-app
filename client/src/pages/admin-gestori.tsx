import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { format, getMonth } from "date-fns";
import { it } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Building2,
  Calendar,
  ChevronLeft,
  Plus,
  Trash2,
  Star,
  Eye,
  Mail,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { User, Company, Event } from "@shared/schema";

interface UserCompanyAssociation {
  id: string;
  userId: string;
  companyId: string;
  role: string | null;
  isDefault: boolean;
  createdAt: string | null;
  companyName: string;
  companyVatNumber?: string;
}

type EventGroupingMode = "mese" | "stagione" | "giorno";

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.08,
    },
  }),
};

function getSeasonFromMonth(month: number, year: number): string {
  if (month === 11 || month === 0 || month === 1) {
    const seasonYear = month === 11 ? year : year - 1;
    return `Inverno ${seasonYear + 1}`;
  } else if (month >= 2 && month <= 4) {
    return `Primavera ${year}`;
  } else if (month >= 5 && month <= 7) {
    return `Estate ${year}`;
  } else {
    return `Autunno ${year}`;
  }
}

export default function AdminGestori() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();

  const [selectedGestore, setSelectedGestore] = useState<User | null>(null);
  const [companiesDialogOpen, setCompaniesDialogOpen] = useState(false);
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
  const [usersDialogOpen, setUsersDialogOpen] = useState(false);
  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [deleteAssociationId, setDeleteAssociationId] = useState<string | null>(null);
  const [newCompanyId, setNewCompanyId] = useState<string>("");
  const [newCompanyRole, setNewCompanyRole] = useState<string>("owner");
  const [newCompanyIsDefault, setNewCompanyIsDefault] = useState<boolean>(false);
  const [eventStatusFilter, setEventStatusFilter] = useState<string>("tutti");
  const [eventGroupingMode, setEventGroupingMode] = useState<EventGroupingMode>("mese");

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: gestoreCompanies, isLoading: companiesLoading } = useQuery<UserCompanyAssociation[]>({
    queryKey: ["/api/users", selectedGestore?.id, "companies"],
    enabled: !!selectedGestore,
  });

  const { data: allEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: eventsDialogOpen && !!selectedGestore,
  });

  const gestori = useMemo(() => {
    return users?.filter((user) => user.role === "gestore") || [];
  }, [users]);

  const gestoreCompanyIds = useMemo(() => {
    if (!selectedGestore || !gestoreCompanies) return [];
    const companyIds = gestoreCompanies.map((gc) => gc.companyId);
    if (selectedGestore.companyId && !companyIds.includes(selectedGestore.companyId)) {
      companyIds.push(selectedGestore.companyId);
    }
    return companyIds;
  }, [selectedGestore, gestoreCompanies]);

  const gestoreUsers = useMemo(() => {
    if (!users || gestoreCompanyIds.length === 0) return [];
    return users.filter((user) => 
      user.companyId && gestoreCompanyIds.includes(user.companyId) && user.id !== selectedGestore?.id
    );
  }, [users, gestoreCompanyIds, selectedGestore]);

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "Nessuna azienda";
    const company = companies?.find((c) => c.id === companyId);
    return company?.name || "Azienda sconosciuta";
  };

  const gestoreEvents = useMemo(() => {
    if (!selectedGestore || !allEvents || !gestoreCompanies) return [];
    const companyIds = gestoreCompanies.map((gc) => gc.companyId);
    if (selectedGestore.companyId && !companyIds.includes(selectedGestore.companyId)) {
      companyIds.push(selectedGestore.companyId);
    }
    return allEvents.filter((event) => companyIds.includes(event.companyId));
  }, [selectedGestore, allEvents, gestoreCompanies]);

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
        groupKey = getSeasonFromMonth(month, year);
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

  const createAssociationMutation = useMutation({
    mutationFn: async (data: { userId: string; companyId: string; role: string; isDefault: boolean }) => {
      await apiRequest("POST", "/api/user-companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedGestore?.id, "companies"] });
      setAddCompanyDialogOpen(false);
      setNewCompanyId("");
      setNewCompanyRole("owner");
      setNewCompanyIsDefault(false);
      triggerHaptic("success");
      toast({
        title: "Successo",
        description: "Associazione azienda creata con successo",
      });
    },
    onError: () => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: "Impossibile creare l'associazione",
        variant: "destructive",
      });
    },
  });

  const deleteAssociationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/user-companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedGestore?.id, "companies"] });
      setDeleteAssociationId(null);
      triggerHaptic("success");
      toast({
        title: "Successo",
        description: "Associazione rimossa con successo",
      });
    },
    onError: () => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: "Impossibile rimuovere l'associazione",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/user-companies/${id}`, { isDefault: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", selectedGestore?.id, "companies"] });
      triggerHaptic("success");
      toast({
        title: "Successo",
        description: "Azienda predefinita aggiornata",
      });
    },
    onError: () => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'azienda predefinita",
        variant: "destructive",
      });
    },
  });

  const handleViewCompanies = (gestore: User) => {
    triggerHaptic("medium");
    setSelectedGestore(gestore);
    setCompaniesDialogOpen(true);
  };

  const handleViewEvents = (gestore: User) => {
    triggerHaptic("medium");
    setSelectedGestore(gestore);
    setEventsDialogOpen(true);
  };

  const handleViewUsers = (gestore: User) => {
    triggerHaptic("medium");
    setSelectedGestore(gestore);
    setUsersDialogOpen(true);
  };

  const handleAddCompany = () => {
    if (!selectedGestore || !newCompanyId) return;
    createAssociationMutation.mutate({
      userId: selectedGestore.id,
      companyId: newCompanyId,
      role: newCompanyRole,
      isDefault: newCompanyIsDefault,
    });
  };

  const availableCompanies = useMemo(() => {
    if (!companies || !gestoreCompanies) return companies || [];
    const associatedIds = new Set(gestoreCompanies.map((gc) => gc.companyId));
    return companies.filter((c) => !associatedIds.has(c.id));
  }, [companies, gestoreCompanies]);

  const formatEventDateRange = (startDatetime: string | Date, endDatetime: string | Date) => {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    const startFormatted = format(start, "d MMMM yyyy, HH:mm", { locale: it });
    const endFormatted = format(end, "d MMMM yyyy, HH:mm", { locale: it });
    
    if (format(start, "yyyy-MM-dd") === format(end, "yyyy-MM-dd")) {
      return `${format(start, "d MMMM yyyy, HH:mm", { locale: it })} - ${format(end, "HH:mm")}`;
    }
    return `${startFormatted} - ${endFormatted}`;
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "gestore":
        return "default";
      case "capo_staff":
        return "secondary";
      case "pr":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "gestore":
        return "Gestore";
      case "gestore_covisione":
        return "Gestore Co-visione";
      case "capo_staff":
        return "Capo Staff";
      case "pr":
        return "PR";
      case "warehouse":
        return "Magazzino";
      case "bartender":
        return "Bartender";
      case "cassiere":
        return "Cassiere";
      case "cliente":
        return "Cliente";
      default:
        return role;
    }
  };

  const renderGestoreCard = (gestore: User, index: number) => {
    const initials = `${gestore.firstName?.[0] || ""}${gestore.lastName?.[0] || ""}`.toUpperCase();
    return (
      <motion.div
        key={gestore.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileTap={{ scale: 0.98 }}
      >
        <Card className="hover-elevate" data-testid={`card-gestore-${gestore.id}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials || "G"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate" data-testid={`text-gestore-name-${gestore.id}`}>
                  {gestore.firstName} {gestore.lastName}
                </h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Mail className="h-3 w-3" />
                  <span className="truncate" data-testid={`text-gestore-email-${gestore.id}`}>
                    {gestore.email}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate" data-testid={`text-gestore-company-${gestore.id}`}>
                    {getCompanyName(gestore.companyId)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewCompanies(gestore)}
                data-testid={`button-view-companies-${gestore.id}`}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Aziende
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewUsers(gestore)}
                data-testid={`button-view-users-${gestore.id}`}
              >
                <Users className="h-4 w-4 mr-1" />
                Utenti
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewEvents(gestore)}
                data-testid={`button-view-events-${gestore.id}`}
              >
                <Calendar className="h-4 w-4 mr-1" />
                Eventi
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderDesktopTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestori
        </CardTitle>
        <CardDescription>
          Gestisci i gestori e le loro associazioni con le aziende
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Azienda Principale</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gestori.map((gestore) => (
              <TableRow key={gestore.id} data-testid={`row-gestore-${gestore.id}`}>
                <TableCell className="font-medium" data-testid={`text-gestore-name-${gestore.id}`}>
                  {gestore.firstName} {gestore.lastName}
                </TableCell>
                <TableCell data-testid={`text-gestore-email-${gestore.id}`}>
                  {gestore.email}
                </TableCell>
                <TableCell data-testid={`text-gestore-company-${gestore.id}`}>
                  {getCompanyName(gestore.companyId)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCompanies(gestore)}
                      data-testid={`button-view-companies-${gestore.id}`}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Aziende
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewUsers(gestore)}
                      data-testid={`button-view-users-${gestore.id}`}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Utenti
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEvents(gestore)}
                      data-testid={`button-view-events-${gestore.id}`}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Eventi
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {gestori.length === 0 && !usersLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Nessun gestore trovato
          </div>
        )}
      </CardContent>
    </Card>
  );

  const companiesDialogContent = (
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Aziende di {selectedGestore?.firstName} {selectedGestore?.lastName}
        </DialogTitle>
        <DialogDescription>
          Gestisci le associazioni con le aziende per questo gestore
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        {companiesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : gestoreCompanies && gestoreCompanies.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Azienda</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Predefinita</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestoreCompanies.map((assoc) => (
                <TableRow key={assoc.id} data-testid={`row-company-assoc-${assoc.id}`}>
                  <TableCell className="font-medium">{assoc.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{assoc.role || "owner"}</Badge>
                  </TableCell>
                  <TableCell>
                    {assoc.isDefault ? (
                      <Badge className="bg-amber-500/20 text-amber-600">
                        <Star className="h-3 w-3 mr-1" />
                        Predefinita
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(assoc.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${assoc.id}`}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Imposta
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteAssociationId(assoc.id)}
                      data-testid={`button-delete-assoc-${assoc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna associazione trovata
          </div>
        )}
      </div>
      <DialogFooter>
        <Button
          onClick={() => setAddCompanyDialogOpen(true)}
          disabled={availableCompanies.length === 0}
          data-testid="button-add-company"
        >
          <Plus className="h-4 w-4 mr-1" />
          Aggiungi Azienda
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  const usersDialogContent = (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Utenti di {selectedGestore?.firstName} {selectedGestore?.lastName}
        </DialogTitle>
        <DialogDescription>
          Utenti appartenenti alle aziende associate a questo gestore
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4">
        {gestoreUsers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Azienda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestoreUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                  <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell data-testid={`text-user-email-${user.id}`}>
                    {user.email}
                  </TableCell>
                  <TableCell data-testid={`text-user-role-${user.id}`}>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell data-testid={`text-user-company-${user.id}`}>
                    {getCompanyName(user.companyId)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nessun utente trovato nelle aziende associate
          </div>
        )}
      </div>
    </DialogContent>
  );

  const eventsDialogContent = (
    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Eventi di {selectedGestore?.firstName} {selectedGestore?.lastName}
        </DialogTitle>
        <DialogDescription>
          Eventi di tutte le aziende associate a questo gestore
        </DialogDescription>
      </DialogHeader>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-4 mb-4">
          <Tabs value={eventStatusFilter} onValueChange={setEventStatusFilter} className="flex-1">
            <TabsList>
              <TabsTrigger value="tutti" data-testid="tab-events-all">
                Tutti ({gestoreEvents.length})
              </TabsTrigger>
              <TabsTrigger value="in_corso" data-testid="tab-events-ongoing">
                In corso
              </TabsTrigger>
              <TabsTrigger value="passati" data-testid="tab-events-past">
                Passati
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Raggruppa per:</span>
            <Select value={eventGroupingMode} onValueChange={(v) => setEventGroupingMode(v as EventGroupingMode)}>
              <SelectTrigger className="w-32" data-testid="select-event-grouping">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mese" data-testid="select-grouping-mese">Mese</SelectItem>
                <SelectItem value="stagione" data-testid="select-grouping-stagione">Stagione</SelectItem>
                <SelectItem value="giorno" data-testid="select-grouping-giorno">Giorno</SelectItem>
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
                                ? "In corso"
                                : event.status === "scheduled"
                                ? "Programmato"
                                : event.status === "closed"
                                ? "Chiuso"
                                : event.status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setLocation(`/events/${event.id}/hub`)}
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
              Nessun evento trovato
            </div>
          )}
        </div>
      </div>
    </DialogContent>
  );

  const addCompanyDialogContent = (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Aggiungi Azienda</DialogTitle>
        <DialogDescription>
          Associa una nuova azienda a {selectedGestore?.firstName} {selectedGestore?.lastName}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium">Azienda</label>
          <Select value={newCompanyId} onValueChange={setNewCompanyId}>
            <SelectTrigger data-testid="select-company">
              <SelectValue placeholder="Seleziona azienda" />
            </SelectTrigger>
            <SelectContent>
              {availableCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Ruolo</label>
          <Select value={newCompanyRole} onValueChange={setNewCompanyRole}>
            <SelectTrigger data-testid="select-role">
              <SelectValue placeholder="Seleziona ruolo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            checked={newCompanyIsDefault}
            onChange={(e) => setNewCompanyIsDefault(e.target.checked)}
            className="h-4 w-4"
            data-testid="checkbox-is-default"
          />
          <label htmlFor="isDefault" className="text-sm">
            Imposta come azienda predefinita
          </label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => setAddCompanyDialogOpen(false)}>
          Annulla
        </Button>
        <Button
          onClick={handleAddCompany}
          disabled={!newCompanyId || createAssociationMutation.isPending}
          data-testid="button-confirm-add-company"
        >
          {createAssociationMutation.isPending ? "Salvataggio..." : "Aggiungi"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );

  if (isMobile) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Gestori"
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-3">
          {usersLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))
          ) : gestori.length > 0 ? (
            gestori.map((gestore, index) => renderGestoreCard(gestore, index))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nessun gestore trovato
            </div>
          )}
        </div>

        <Dialog open={companiesDialogOpen} onOpenChange={setCompaniesDialogOpen}>
          {companiesDialogContent}
        </Dialog>

        <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
          {usersDialogContent}
        </Dialog>

        <Dialog open={eventsDialogOpen} onOpenChange={setEventsDialogOpen}>
          {eventsDialogContent}
        </Dialog>

        <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
          {addCompanyDialogContent}
        </Dialog>

        <AlertDialog open={!!deleteAssociationId} onOpenChange={() => setDeleteAssociationId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rimuovi associazione</AlertDialogTitle>
              <AlertDialogDescription>
                Sei sicuro di voler rimuovere questa associazione? Il gestore non avrà più accesso a questa azienda.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annulla</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteAssociationId && deleteAssociationMutation.mutate(deleteAssociationId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                Rimuovi
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </MobileAppLayout>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Gestione Gestori</h1>
          <p className="text-muted-foreground">
            Gestisci i gestori e le loro associazioni con le aziende
          </p>
        </div>
      </div>

      {usersLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        renderDesktopTable()
      )}

      <Dialog open={companiesDialogOpen} onOpenChange={setCompaniesDialogOpen}>
        {companiesDialogContent}
      </Dialog>

      <Dialog open={usersDialogOpen} onOpenChange={setUsersDialogOpen}>
        {usersDialogContent}
      </Dialog>

      <Dialog open={eventsDialogOpen} onOpenChange={setEventsDialogOpen}>
        {eventsDialogContent}
      </Dialog>

      <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
        {addCompanyDialogContent}
      </Dialog>

      <AlertDialog open={!!deleteAssociationId} onOpenChange={() => setDeleteAssociationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi associazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler rimuovere questa associazione? Il gestore non avrà più accesso a questa azienda.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAssociationId && deleteAssociationMutation.mutate(deleteAssociationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Rimuovi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
