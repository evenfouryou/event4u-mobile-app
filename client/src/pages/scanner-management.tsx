import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Search,
  Plus,
  QrCode,
  User,
  Calendar,
  Settings,
  Trash2,
  CheckCircle,
  XCircle,
  Ticket,
  ArrowLeft,
  ScanLine,
  Eye,
  EyeOff,
  RefreshCw,
  Users,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event, EventScanner } from "@shared/schema";

const createScannerSchema = z.object({
  firstName: z.string().min(1, "Nome richiesto"),
  lastName: z.string().min(1, "Cognome richiesto"),
  username: z.string().min(3, "Username minimo 3 caratteri").regex(/^[a-zA-Z0-9_]+$/, "Solo lettere, numeri e underscore"),
  password: z.string().min(8, "Password minimo 8 caratteri"),
});

type CreateScannerData = z.infer<typeof createScannerSchema>;

interface ScannerWithAssignments extends UserType {
  assignments?: EventScanner[];
}

interface SectorOption {
  id: string;
  name: string;
  code: string;
}

export default function ScannerManagement() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedScanner, setSelectedScanner] = useState<UserType | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [canScanLists, setCanScanLists] = useState(true);
  const [canScanTables, setCanScanTables] = useState(true);
  const [canScanTickets, setCanScanTickets] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<CreateScannerData>({
    resolver: zodResolver(createScannerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      password: "",
    },
  });

  const { data: scanners, isLoading: scannersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users/scanners'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const { data: ticketedEvents } = useQuery<any[]>({
    queryKey: ['/api/siae/ticketed-events'],
  });

  const { data: scannerAssignments } = useQuery<EventScanner[]>({
    queryKey: ['/api/e4u/scanners/assignments'],
  });

  const { data: eventSectors } = useQuery<SectorOption[]>({
    queryKey: ['/api/siae/ticketed-events', selectedEventId, 'sectors'],
    enabled: !!selectedEventId && canScanTickets,
  });

  const filteredScanners = useMemo(() => {
    if (!scanners) return [];
    if (!searchQuery.trim()) return scanners;
    const query = searchQuery.toLowerCase();
    return scanners.filter(scanner =>
      scanner.firstName?.toLowerCase().includes(query) ||
      scanner.lastName?.toLowerCase().includes(query) ||
      scanner.email?.toLowerCase().includes(query)
    );
  }, [scanners, searchQuery]);

  const createScannerMutation = useMutation({
    mutationFn: async (data: CreateScannerData) => {
      const response = await apiRequest("POST", "/api/users", {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.username, // Username viene salvato nel campo email
        password: data.password,
        role: "scanner",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/scanners'] });
      toast({ title: "Scanner creato con successo" });
      setShowCreateDialog(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Errore creazione scanner",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const assignScannerMutation = useMutation({
    mutationFn: async ({ scannerId, eventId, sectors }: { scannerId: string; eventId: string; sectors: string[] }) => {
      const response = await apiRequest("POST", `/api/e4u/events/${eventId}/scanners`, {
        userId: scannerId,
        canScanLists,
        canScanTables,
        canScanTickets,
        allowedSectorIds: canScanTickets ? sectors : [],
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/scanners/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/scanners'] });
      toast({ title: "Scanner assegnato all'evento" });
      setShowAssignDialog(false);
      resetAssignForm();
    },
    onError: (error: any) => {
      toast({
        title: "Errore assegnazione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeScannerMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiRequest("DELETE", `/api/e4u/scanners/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/e4u/scanners/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/scanners'] });
      toast({ title: "Scanner rimosso dall'evento" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore rimozione",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleScannerActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, {
        isActive,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/scanners'] });
      toast({ title: "Stato scanner aggiornato" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore aggiornamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetAssignForm = () => {
    setSelectedScanner(null);
    setSelectedEventId("");
    setSelectedSectorIds([]);
    setCanScanLists(true);
    setCanScanTables(true);
    setCanScanTickets(true);
  };

  const openAssignDialog = (scanner: UserType) => {
    setSelectedScanner(scanner);
    resetAssignForm();
    setShowAssignDialog(true);
  };

  const handleAssign = () => {
    if (!selectedScanner || !selectedEventId) return;
    assignScannerMutation.mutate({
      scannerId: selectedScanner.id,
      eventId: selectedEventId,
      sectors: selectedSectorIds,
    });
  };

  const toggleSector = (sectorId: string) => {
    setSelectedSectorIds(prev =>
      prev.includes(sectorId)
        ? prev.filter(id => id !== sectorId)
        : [...prev, sectorId]
    );
  };

  const getScannerAssignments = (scannerId: string) => {
    return scannerAssignments?.filter(a => a.userId === scannerId) || [];
  };

  const getEventName = (eventId: string) => {
    return events?.find(e => e.id === eventId)?.name || "Evento sconosciuto";
  };

  const getTicketedEventSectors = (eventId: string) => {
    const ticketedEvent = ticketedEvents?.find(te => te.eventId === eventId);
    return ticketedEvent?.sectors || [];
  };

  const onSubmitCreate = (data: CreateScannerData) => {
    createScannerMutation.mutate(data);
  };

  if (!user || (user.role !== 'super_admin' && user.role !== 'gestore')) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="glass-card p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Accesso Negato</h2>
          <p className="text-muted-foreground">Non hai i permessi per accedere a questa pagina</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="md:hidden" data-testid="btn-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <ScanLine className="h-6 w-6 text-emerald-500" />
                <span className="hidden sm:inline">Gestione Scanner</span>
                <span className="sm:hidden">Scanner</span>
              </h1>
              <p className="text-sm text-muted-foreground hidden md:block">
                Crea e gestisci gli account scanner per il controllo accessi
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-emerald-500 to-green-600"
            data-testid="btn-create-scanner"
          >
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Nuovo Scanner</span>
            <span className="sm:hidden">Nuovo</span>
          </Button>
        </div>

        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cerca scanner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
              data-testid="input-search-scanner"
            />
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {scannersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredScanners.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nessuno Scanner</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery ? "Nessun risultato per la ricerca" : "Crea il primo account scanner"}
              </p>
              {!searchQuery && (
                <Button 
                  onClick={() => setShowCreateDialog(true)}
                  data-testid="btn-create-first-scanner"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crea Scanner
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredScanners.map((scanner, index) => {
            const assignments = getScannerAssignments(scanner.id);
            return (
              <motion.div
                key={scanner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="glass-card hover:border-emerald-500/30 transition-all" data-testid={`card-scanner-${scanner.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                        scanner.isActive 
                          ? 'bg-gradient-to-br from-emerald-500 to-green-600' 
                          : 'bg-gray-500'
                      }`}>
                        <User className="h-6 w-6 text-white" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate" data-testid={`text-scanner-name-${scanner.id}`}>
                            {scanner.firstName} {scanner.lastName}
                          </h3>
                          <Badge 
                            variant={scanner.isActive ? "default" : "secondary"}
                            className={scanner.isActive ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}
                          >
                            {scanner.isActive ? "Attivo" : "Disattivato"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{scanner.email}</p>
                        
                        {assignments.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {assignments.slice(0, 2).map(assignment => (
                              <Badge 
                                key={assignment.id} 
                                variant="outline" 
                                className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30"
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                {getEventName(assignment.eventId)}
                              </Badge>
                            ))}
                            {assignments.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{assignments.length - 2} altri
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openAssignDialog(scanner)}
                          title="Assegna a evento"
                          data-testid={`btn-assign-scanner-${scanner.id}`}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleScannerActiveMutation.mutate({
                            userId: scanner.id,
                            isActive: !scanner.isActive,
                          })}
                          title={scanner.isActive ? "Disattiva" : "Attiva"}
                          data-testid={`btn-toggle-scanner-${scanner.id}`}
                        >
                          {scanner.isActive ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {assignments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-xs text-muted-foreground mb-2">Eventi assegnati:</p>
                        <div className="space-y-2">
                          {assignments.map(assignment => {
                            const sectors = getTicketedEventSectors(assignment.eventId);
                            const allowedSectors = assignment.allowedSectorIds || [];
                            return (
                              <div 
                                key={assignment.id} 
                                className="flex items-center justify-between bg-background/30 rounded-lg p-2"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{getEventName(assignment.eventId)}</p>
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {assignment.canScanLists && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 bg-cyan-500/20 text-cyan-400">Liste</Badge>
                                    )}
                                    {assignment.canScanTables && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 bg-purple-500/20 text-purple-400">Tavoli</Badge>
                                    )}
                                    {assignment.canScanTickets && (
                                      <Badge variant="secondary" className="text-[10px] px-1.5 bg-amber-500/20 text-amber-400">
                                        Biglietti
                                        {sectors.length > 0 && allowedSectors.length > 0 && allowedSectors.length < sectors.length && (
                                          <span className="ml-1">({allowedSectors.length}/{sectors.length})</span>
                                        )}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => removeScannerMutation.mutate(assignment.id)}
                                  disabled={removeScannerMutation.isPending}
                                  data-testid={`btn-remove-assignment-${assignment.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-emerald-500" />
              Nuovo Scanner
            </DialogTitle>
            <DialogDescription>
              Crea un account scanner per il controllo accessi
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Mario" {...field} data-testid="input-scanner-firstname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cognome</FormLabel>
                      <FormControl>
                        <Input placeholder="Rossi" {...field} data-testid="input-scanner-lastname" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Utente</FormLabel>
                    <FormControl>
                      <Input 
                        type="text" 
                        placeholder="scanner1" 
                        {...field} 
                        data-testid="input-scanner-username" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimo 8 caratteri" 
                          {...field} 
                          data-testid="input-scanner-password" 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Annulla
                </Button>
                <Button 
                  type="submit" 
                  disabled={createScannerMutation.isPending}
                  className="bg-gradient-to-r from-emerald-500 to-green-600"
                  data-testid="btn-submit-create-scanner"
                >
                  {createScannerMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Crea Scanner
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Assegna a Evento
            </DialogTitle>
            <DialogDescription>
              {selectedScanner && (
                <span>
                  Scanner: <strong>{selectedScanner.firstName} {selectedScanner.lastName}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Seleziona Evento</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger className="mt-1.5" data-testid="select-event">
                  <SelectValue placeholder="Scegli un evento" />
                </SelectTrigger>
                <SelectContent>
                  {events?.filter(e => e.status !== 'closed').map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Permessi Scansione</Label>
              
              <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm">Liste Ospiti</span>
                </div>
                <Switch 
                  checked={canScanLists} 
                  onCheckedChange={setCanScanLists}
                  data-testid="switch-scan-lists"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />
                  <span className="text-sm">Tavoli</span>
                </div>
                <Switch 
                  checked={canScanTables} 
                  onCheckedChange={setCanScanTables}
                  data-testid="switch-scan-tables"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-background/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-amber-400" />
                  <span className="text-sm">Biglietti</span>
                </div>
                <Switch 
                  checked={canScanTickets} 
                  onCheckedChange={setCanScanTickets}
                  data-testid="switch-scan-tickets"
                />
              </div>
            </div>

            {canScanTickets && selectedEventId && eventSectors && eventSectors.length > 0 && (
              <div className="space-y-2">
                <Label>Tipologie Biglietto Consentite</Label>
                <p className="text-xs text-muted-foreground">
                  Seleziona quali tipologie questo scanner può validare. Lascia vuoto per consentire tutte.
                </p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {eventSectors.map(sector => (
                    <div 
                      key={sector.id}
                      className="flex items-center gap-2 p-2 bg-background/30 rounded-lg"
                    >
                      <Checkbox
                        id={`sector-${sector.id}`}
                        checked={selectedSectorIds.includes(sector.id)}
                        onCheckedChange={() => toggleSector(sector.id)}
                        data-testid={`checkbox-sector-${sector.id}`}
                      />
                      <label 
                        htmlFor={`sector-${sector.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {sector.name}
                        <span className="text-muted-foreground ml-1">({sector.code})</span>
                      </label>
                    </div>
                  ))}
                </div>
                {selectedSectorIds.length > 0 && (
                  <p className="text-xs text-amber-400">
                    {selectedSectorIds.length} tipologie selezionate
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Annulla
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedEventId || assignScannerMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
              data-testid="btn-submit-assign"
            >
              {assignScannerMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Assegna
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
