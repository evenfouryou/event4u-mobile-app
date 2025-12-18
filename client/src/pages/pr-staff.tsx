import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Calendar,
  UserPlus,
  RefreshCw,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  UserCog,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { EventStaffAssignment, Event, User } from "@shared/schema";

const assignmentFormSchema = z.object({
  userId: z.string().min(1, "Seleziona un utente"),
  role: z.string().min(1, "Seleziona un ruolo"),
  permissions: z.array(z.string()).default([]),
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

const PERMISSION_OPTIONS = [
  { value: "gestione_liste", label: "Gestione Liste" },
  { value: "gestione_tavoli", label: "Gestione Tavoli" },
  { value: "check_in", label: "Check-in Ospiti" },
  { value: "visualizza_stats", label: "Visualizza Statistiche" },
];

const ROLE_OPTIONS = [
  { value: "gestore_covisione", label: "Gestore Co-Visione" },
  { value: "capo_staff", label: "Capo Staff" },
  { value: "pr", label: "PR" },
];

export default function PrStaffPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Only gestore and super_admin can access this page
  const canManageStaff = user?.role === 'gestore' || user?.role === 'super_admin';

  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: canManageStaff,
  });

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: canManageStaff,
  });

  const { data: staffAssignments = [], isLoading: loadingStaff, refetch: refetchStaff } = useQuery<EventStaffAssignment[]>({
    queryKey: ["/api/pr/events", selectedEventId, "staff"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const res = await fetch(`/api/pr/events/${selectedEventId}/staff`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch staff');
      return res.json();
    },
    enabled: !!selectedEventId,
  });

  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const availableUsers = useMemo(() => {
    const assignedUserIds = new Set(staffAssignments.map(a => a.userId));
    return allUsers.filter(u => 
      !assignedUserIds.has(u.id) && 
      ['gestore_covisione', 'capo_staff', 'pr'].includes(u.role || '')
    );
  }, [allUsers, staffAssignments]);

  const filteredAssignments = useMemo(() => {
    if (!searchQuery) return staffAssignments;
    const query = searchQuery.toLowerCase();
    return staffAssignments.filter(a => {
      const assignedUser = allUsers.find(u => u.id === a.userId);
      return assignedUser?.firstName?.toLowerCase().includes(query) ||
             assignedUser?.lastName?.toLowerCase().includes(query) ||
             a.role.toLowerCase().includes(query);
    });
  }, [staffAssignments, searchQuery, allUsers]);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      userId: "",
      role: "",
      permissions: ["gestione_liste", "check_in"],
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async (data: AssignmentFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/staff`, {
        ...data,
        assignedByUserId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "staff"] });
      setIsAddStaffOpen(false);
      form.reset();
      toast({
        title: "Staff Assegnato",
        description: "Il membro dello staff è stato assegnato all'evento",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'assegnazione",
        variant: "destructive",
      });
    },
  });

  const updateAssignmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AssignmentFormData> & { isActive?: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/pr/staff-assignments/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "staff"] });
      toast({
        title: "Assegnazione Aggiornata",
        description: "I permessi sono stati aggiornati",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'aggiornamento",
        variant: "destructive",
      });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/staff-assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "staff"] });
      toast({
        title: "Assegnazione Rimossa",
        description: "Il membro dello staff è stato rimosso dall'evento",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante la rimozione",
        variant: "destructive",
      });
    },
  });

  const getUserName = (userId: string) => {
    const assignedUser = allUsers.find(u => u.id === userId);
    return assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Utente sconosciuto';
  };

  const getUserEmail = (userId: string) => {
    const assignedUser = allUsers.find(u => u.id === userId);
    return assignedUser?.email || '';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'gestore_covisione':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Gestore Co-Visione</Badge>;
      case 'capo_staff':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Capo Staff</Badge>;
      case 'pr':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">PR</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  // Access control - only gestore and super_admin
  if (!canManageStaff) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Accesso Non Autorizzato</h3>
            <p className="text-muted-foreground">
              Non hai i permessi per accedere a questa pagina.
              <br />
              Solo i gestori possono gestire lo staff degli eventi.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadingEvents) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="w-6 h-6 sm:w-8 sm:h-8 text-primary flex-shrink-0" />
            Staff Eventi
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Assegna e gestisci lo staff per ogni evento
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetchStaff()}
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seleziona Evento</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Scegli un evento" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.name} - {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cerca Staff</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o ruolo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedEventId && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Totale Staff</p>
                    <p className="text-2xl font-bold">{staffAssignments.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">PR</p>
                    <p className="text-2xl font-bold text-green-500">
                      {staffAssignments.filter(a => a.role === 'pr').length}
                    </p>
                  </div>
                  <UserCog className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Capo Staff</p>
                    <p className="text-2xl font-bold text-blue-500">
                      {staffAssignments.filter(a => a.role === 'capo_staff').length}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Attivi</p>
                    <p className="text-2xl font-bold text-purple-500">
                      {staffAssignments.filter(a => a.isActive).length}
                    </p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Staff - {selectedEvent?.name}</CardTitle>
                  <CardDescription>
                    {selectedEvent && format(new Date(selectedEvent.startDatetime), "d MMMM yyyy", { locale: it })}
                  </CardDescription>
                </div>
                <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-staff">
                      <Plus className="w-4 h-4 mr-2" />
                      Aggiungi Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assegna Staff all'Evento</DialogTitle>
                      <DialogDescription>
                        Seleziona un membro dello staff e assegna i permessi
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit((data) => createAssignmentMutation.mutate(data))} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Membro Staff</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-user">
                                    <SelectValue placeholder="Seleziona utente" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {availableUsers.map((u) => (
                                    <SelectItem key={u.id} value={u.id}>
                                      {u.firstName} {u.lastName} ({u.role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="role"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ruolo per l'Evento</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-role">
                                    <SelectValue placeholder="Seleziona ruolo" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((role) => (
                                    <SelectItem key={role.value} value={role.value}>
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="permissions"
                          render={() => (
                            <FormItem>
                              <FormLabel>Permessi</FormLabel>
                              <div className="grid grid-cols-2 gap-2">
                                {PERMISSION_OPTIONS.map((permission) => (
                                  <FormField
                                    key={permission.value}
                                    control={form.control}
                                    name="permissions"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(permission.value)}
                                            onCheckedChange={(checked) => {
                                              const newValue = checked
                                                ? [...(field.value || []), permission.value]
                                                : field.value?.filter((v) => v !== permission.value) || [];
                                              field.onChange(newValue);
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal cursor-pointer">
                                          {permission.label}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createAssignmentMutation.isPending} data-testid="button-submit-staff">
                            {createAssignmentMutation.isPending ? "Assegnando..." : "Assegna Staff"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStaff ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold">Nessuno staff assegnato</h3>
                  <p className="text-muted-foreground">
                    Aggiungi membri dello staff per questo evento
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Ruolo</TableHead>
                        <TableHead>Permessi</TableHead>
                        <TableHead className="text-center">Stato</TableHead>
                        <TableHead className="text-right">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id} data-testid={`row-staff-${assignment.id}`}>
                          <TableCell className="font-medium">
                            {getUserName(assignment.userId)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getUserEmail(assignment.userId)}
                          </TableCell>
                          <TableCell>
                            {getRoleBadge(assignment.role)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(assignment.permissions || []).map((perm) => (
                                <Badge key={perm} variant="outline" className="text-xs">
                                  {PERMISSION_OPTIONS.find(p => p.value === perm)?.label || perm}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {assignment.isActive ? (
                              <Badge className="bg-green-500/10 text-green-500">Attivo</Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-500">Disattivato</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-menu-${assignment.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => updateAssignmentMutation.mutate({
                                    id: assignment.id,
                                    data: { isActive: !assignment.isActive }
                                  })}
                                >
                                  {assignment.isActive ? (
                                    <>
                                      <XCircle className="w-4 h-4 mr-2" />
                                      Disattiva
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 mr-2" />
                                      Attiva
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteAssignmentMutation.mutate(assignment.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Rimuovi
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Seleziona un evento</h3>
            <p className="text-muted-foreground">
              Scegli un evento per gestire lo staff assegnato
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
