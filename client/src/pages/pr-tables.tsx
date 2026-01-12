import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  MobileAppLayout,
  MobileHeader,
  BottomSheet,
  HapticButton,
  FloatingActionButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Calendar,
  Loader2,
  RefreshCw,
  Armchair,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  DollarSign,
  MapPin,
  ChevronDown,
  Edit,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { EventTable, TableBooking, Event } from "@shared/schema";

const getTableFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('pr.validation.tableNameRequired')),
  tableType: z.string().min(1, t('pr.validation.tableTypeRequired')).default("standard"),
  capacity: z.coerce.number().min(1, t('pr.validation.minOneSeats')),
  minSpend: z.coerce.number().min(0, t('pr.validation.notNegative')).optional(),
  notes: z.string().optional(),
});

type TableFormData = z.infer<ReturnType<typeof getTableFormSchema>>;

const getBookingFormSchema = (t: (key: string) => string) => z.object({
  customerName: z.string().min(1, t('pr.validation.customerNameRequired')),
  customerPhone: z.string().optional(),
  customerEmail: z.string().email(t('pr.validation.invalidEmail')).optional().or(z.literal("")),
  guestsCount: z.coerce.number().min(1, t('pr.validation.minOneGuest')),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<ReturnType<typeof getBookingFormSchema>>;

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function PrTablesPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isBookTableOpen, setIsBookTableOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("");
  const [isEventSelectorOpen, setIsEventSelectorOpen] = useState(false);

  const { data: events = [], isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: tables = [], isLoading: loadingTables, refetch: refetchTables } = useQuery<EventTable[]>({
    queryKey: ["/api/pr/events", selectedEventId, "tables"],
    enabled: !!selectedEventId,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery<TableBooking[]>({
    queryKey: ["/api/pr/events", selectedEventId, "bookings"],
    enabled: !!selectedEventId,
  });

  const selectedEvent = useMemo(() =>
    events.find(e => e.id === selectedEventId),
    [events, selectedEventId]
  );

  const selectedTable = useMemo(() =>
    tables.find(t => t.id === selectedTableId),
    [tables, selectedTableId]
  );

  const tableTypes = useMemo(() =>
    Array.from(new Set(tables.map(t => t.tableType))).sort(),
    [tables]
  );

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      const matchesSearch = !searchQuery ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.tableType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesZone = !zoneFilter || t.tableType === zoneFilter;
      return matchesSearch && matchesZone;
    });
  }, [tables, searchQuery, zoneFilter]);

  const getTableBooking = (tableId: string) =>
    bookings.find(b => b.tableId === tableId && b.status !== 'cancelled');

  const tableFormSchema = getTableFormSchema(t);
  const bookingFormSchema = getBookingFormSchema(t);

  const tableForm = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      name: "",
      tableType: "standard",
      capacity: 4,
      minSpend: undefined,
      notes: "",
    },
  });

  const bookingForm = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      guestsCount: 1,
      notes: "",
    },
  });

  const createTableMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/tables`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: t('pr.tableCreated') });
      setIsAddTableOpen(false);
      tableForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EventTable> }) => {
      const response = await apiRequest("PATCH", `/api/pr/tables/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: t('pr.tableUpdated') });
      setIsActionsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/tables/${id}`, undefined);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: t('pr.tableDeleted') });
      setIsActionsOpen(false);
      setSelectedTableId("");
      queryClient.invalidateQueries({ queryKey: ["/api/pr/events", selectedEventId, "tables"] });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest("POST", `/api/pr/events/${selectedEventId}/bookings`, {
        ...data,
        tableId: selectedTableId,
      });
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: t('pr.bookingCreated') });
      setIsBookTableOpen(false);
      bookingForm.reset();
      setSelectedTableId("");
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TableBooking> }) => {
      const response = await apiRequest("PATCH", `/api/pr/bookings/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: t('pr.bookingUpdated') });
      setIsActionsOpen(false);
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const deleteBookingMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pr/bookings/${id}`, undefined);
    },
    onSuccess: () => {
      triggerHaptic('success');
      toast({ title: t('pr.bookingCancelled') });
      setIsActionsOpen(false);
      refetchTables();
      refetchBookings();
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({ title: t('common.error'), description: error.message, variant: "destructive" });
    },
  });

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'available':
        return { color: "bg-green-500", textColor: "text-green-500", label: t('pr.tableStatus.available'), icon: CheckCircle2 };
      case 'reserved':
        return { color: "bg-blue-500", textColor: "text-blue-500", label: t('pr.tableStatus.reserved'), icon: Clock };
      case 'occupied':
        return { color: "bg-amber-500", textColor: "text-amber-500", label: t('pr.tableStatus.occupied'), icon: Users };
      case 'blocked':
        return { color: "bg-red-500", textColor: "text-red-500", label: t('pr.tableStatus.blocked'), icon: XCircle };
      default:
        return { color: "bg-muted", textColor: "text-muted-foreground", label: status, icon: Armchair };
    }
  };

  const getTableTypeLabel = (type: string) => {
    switch (type) {
      case 'standard': return t('pr.tableTypes.standard');
      case 'vip': return t('pr.tableTypes.vip');
      case 'prive': return t('pr.tableTypes.prive');
      default: return type;
    }
  };

  const stats = useMemo(() => ({
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    capacity: tables.reduce((sum, t) => sum + t.capacity, 0),
  }), [tables]);

  const handleTablePress = (table: EventTable) => {
    triggerHaptic('light');
    setSelectedTableId(table.id);
    setIsActionsOpen(true);
  };

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-pr-tables">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('pr.tableManagement')}</h1>
            <p className="text-muted-foreground">
              {selectedEvent ? format(new Date(selectedEvent.startDatetime), "d MMMM yyyy", { locale: it }) : t('pr.selectEvent')}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                refetchTables();
                refetchBookings();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('common.refresh')}
            </Button>
            {selectedEventId && (
              <Button onClick={() => setIsAddTableOpen(true)} data-testid="button-add-table">
                <Plus className="w-4 h-4 mr-2" />
                {t('pr.newTable')}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Seleziona Evento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger data-testid="select-event">
                <SelectValue placeholder={t('pr.selectEvent')} />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.name} - {format(new Date(event.startDatetime), "d MMM yyyy", { locale: it })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedEventId && (
          <>
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.totalTables')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">{stats.available}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.available')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-500">{stats.reserved}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.reserved')}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-purple-500">{stats.capacity}</div>
                  <p className="text-sm text-muted-foreground">{t('pr.totalSeats')}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2">
                <CardTitle>{t('pr.tables')}</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('pr.searchTable')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-search"
                    />
                  </div>
                  <Select value={zoneFilter} onValueChange={setZoneFilter}>
                    <SelectTrigger className="w-40" data-testid="select-zone-filter">
                      <SelectValue placeholder={t('pr.allTypes')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('pr.allTypes')}</SelectItem>
                      {tableTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {getTableTypeLabel(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTables ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredTables.length === 0 ? (
                  <div className="text-center py-12">
                    <Armchair className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('pr.noTables')}</h3>
                    <p className="text-muted-foreground">{t('pr.addFirstTable')}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.name')}</TableHead>
                        <TableHead>{t('pr.type')}</TableHead>
                        <TableHead>{t('pr.seats')}</TableHead>
                        <TableHead>{t('pr.minSpend')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('pr.booking')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTables.map((table) => {
                        const booking = getTableBooking(table.id);
                        const statusInfo = getStatusInfo(table.status);
                        const StatusIcon = statusInfo.icon;

                        return (
                          <TableRow key={table.id} data-testid={`row-table-${table.id}`}>
                            <TableCell className="font-semibold">{table.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{getTableTypeLabel(table.tableType)}</Badge>
                            </TableCell>
                            <TableCell>{table.capacity}</TableCell>
                            <TableCell>{table.minSpend ? `€${table.minSpend}` : "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`${statusInfo.color}/10 ${statusInfo.textColor} border-0`}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {booking ? (
                                <div className="text-sm">
                                  <p className="font-medium">{booking.customerName}</p>
                                  <p className="text-muted-foreground">{booking.guestsCount} {t('pr.guests')}</p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                {table.status === 'available' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTableId(table.id);
                                      setIsBookTableOpen(true);
                                    }}
                                    data-testid={`button-book-${table.id}`}
                                  >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {t('pr.book')}
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedTableId(table.id);
                                    setIsActionsOpen(true);
                                  }}
                                  data-testid={`button-actions-${table.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-red-500"
                                  onClick={() => deleteTableMutation.mutate(table.id)}
                                  data-testid={`button-delete-${table.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedEventId && (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('pr.selectAnEvent')}</h3>
              <p className="text-muted-foreground">{t('pr.chooseEventManageTables')}</p>
            </CardContent>
          </Card>
        )}

        <Dialog open={isAddTableOpen} onOpenChange={setIsAddTableOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('pr.newTable')}</DialogTitle>
            </DialogHeader>
            <Form {...tableForm}>
              <form onSubmit={tableForm.handleSubmit((data) => createTableMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={tableForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pr.tableName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('pr.tableNamePlaceholder')} {...field} data-testid="input-table-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={tableForm.control}
                  name="tableType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pr.tableType')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="input-table-type">
                            <SelectValue placeholder={t('pr.selectType')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">{t('pr.tableTypes.standard')}</SelectItem>
                          <SelectItem value="vip">{t('pr.tableTypes.vip')}</SelectItem>
                          <SelectItem value="prive">{t('pr.tableTypes.prive')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={tableForm.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pr.seats')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} data-testid="input-capacity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={tableForm.control}
                    name="minSpend"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pr.minSpendLabel')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder={t('common.optional')} {...field} data-testid="input-minspend" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={tableForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.notes')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('pr.additionalNotes')} {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddTableOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createTableMutation.isPending} data-testid="button-submit-table">
                    {createTableMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    {t('pr.createTable')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isActionsOpen} onOpenChange={(open) => {
          setIsActionsOpen(open);
          if (!open) setSelectedTableId("");
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{selectedTable?.name || t('pr.tableActions')}</DialogTitle>
            </DialogHeader>
            {selectedTable && (() => {
              const booking = getTableBooking(selectedTable.id);
              const statusInfo = getStatusInfo(selectedTable.status);

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className={`w-12 h-12 rounded-lg ${statusInfo.color}/10 flex items-center justify-center`}>
                      <Armchair className={`w-6 h-6 ${statusInfo.textColor}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedTable.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{getTableTypeLabel(selectedTable.tableType)}</span>
                        <span>•</span>
                        <span>{selectedTable.capacity} {t('pr.seats')}</span>
                      </div>
                      <Badge variant="outline" className={`mt-2 ${statusInfo.color}/10 ${statusInfo.textColor} border-0`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>

                  {booking && (
                    <div className="p-4 bg-card border border-border rounded-lg space-y-2">
                      <h4 className="font-semibold">{t('pr.booking')}</h4>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{booking.customerName}</span>
                        <span className="text-muted-foreground">({booking.guestsCount} {t('pr.guests')})</span>
                      </div>
                      {booking.customerPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.customerPhone}</span>
                        </div>
                      )}
                      {booking.customerEmail && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{booking.customerEmail}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-2">
                    {selectedTable.status === 'available' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsActionsOpen(false);
                            setIsBookTableOpen(true);
                          }}
                          data-testid={`action-book-${selectedTable.id}`}
                        >
                          <Clock className="w-4 h-4 mr-2" />
                          {t('pr.proposeTableBook')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => updateTableMutation.mutate({ id: selectedTable.id, data: { status: 'blocked' } })}
                          data-testid={`action-block-${selectedTable.id}`}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {t('pr.blockTable')}
                        </Button>
                      </>
                    )}

                    {selectedTable.status === 'blocked' && (
                      <Button
                        variant="outline"
                        onClick={() => updateTableMutation.mutate({ id: selectedTable.id, data: { status: 'available' } })}
                        data-testid={`action-unblock-${selectedTable.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                        {t('pr.unblockTable')}
                      </Button>
                    )}

                    {selectedTable.status === 'reserved' && booking && (
                      <>
                        <Button
                          className="bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          variant="outline"
                          onClick={() => updateBookingMutation.mutate({ id: booking.id, data: { status: 'arrived' } })}
                          data-testid={`action-arrived-${selectedTable.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          {t('pr.customerArrived')}
                        </Button>
                        <Button
                          variant="outline"
                          className="text-red-500"
                          onClick={() => deleteBookingMutation.mutate(booking.id)}
                          data-testid={`action-cancel-booking-${selectedTable.id}`}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('pr.cancelBooking')}
                        </Button>
                      </>
                    )}

                    <Button variant="outline" data-testid={`action-edit-${selectedTable.id}`}>
                      <Edit className="w-4 h-4 mr-2" />
                      {t('pr.editTable')}
                    </Button>

                    <Button
                      variant="outline"
                      className="text-red-500"
                      onClick={() => deleteTableMutation.mutate(selectedTable.id)}
                      data-testid={`action-delete-${selectedTable.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('pr.deleteTable')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Dialog open={isBookTableOpen} onOpenChange={(open) => {
          setIsBookTableOpen(open);
          if (!open) setSelectedTableId("");
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('pr.bookTable')}</DialogTitle>
            </DialogHeader>
            <Form {...bookingForm}>
              <form onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={bookingForm.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pr.customerName')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('pr.fullName')} {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={bookingForm.control}
                    name="customerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('common.phone')}</FormLabel>
                        <FormControl>
                          <Input placeholder="+39 333..." {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={bookingForm.control}
                    name="guestsCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('pr.guests')}</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} data-testid="input-guest-count" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={bookingForm.control}
                  name="customerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('pr.emailOptional')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder={t('pr.emailPlaceholder')} {...field} data-testid="input-customer-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bookingForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('common.notes')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('pr.additionalNotes')} {...field} data-testid="input-booking-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsBookTableOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" disabled={createBookingMutation.isPending} data-testid="button-submit-booking">
                    {createBookingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    {t('pr.confirmBooking')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (loadingEvents) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader title={t('pr.tableManagement')} />
        }
      >
        <div className="space-y-4 py-4 pb-24">
          <Skeleton className="h-16 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={t('pr.tableManagement')}
          subtitle={selectedEvent ? format(new Date(selectedEvent.startDatetime), "d MMM yyyy", { locale: it }) : undefined}
          rightAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={() => {
                refetchTables();
                refetchBookings();
              }}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
    >
      <div className="space-y-4 py-4 pb-24">
        <motion.button
          onClick={() => {
            triggerHaptic('light');
            setIsEventSelectorOpen(true);
          }}
          className="w-full flex items-center justify-between p-5 bg-card rounded-3xl border border-border min-h-[80px]"
          whileTap={{ scale: 0.97 }}
          transition={springTransition}
          data-testid="button-select-event"
        >
          <div className="flex items-center gap-4">
            <motion.div 
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              transition={springTransition}
            >
              <Calendar className="w-7 h-7 text-primary" />
            </motion.div>
            <div className="text-left">
              <p className="text-sm text-muted-foreground">{t('pr.selectedEvent')}</p>
              <p className="font-bold text-lg">
                {selectedEvent ? selectedEvent.name : t('pr.selectEvent')}
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: isEventSelectorOpen ? 180 : 0 }}
            transition={springTransition}
          >
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </motion.div>
        </motion.button>

        {selectedEventId && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
              className="grid grid-cols-2 gap-3"
            >
              {[
                { label: t('pr.total'), value: stats.total, color: "text-foreground", bgColor: "bg-muted/50" },
                { label: t('pr.available'), value: stats.available, color: "text-green-500", bgColor: "bg-green-500/10" },
                { label: t('pr.reserved'), value: stats.reserved, color: "text-blue-500", bgColor: "bg-blue-500/10" },
                { label: t('pr.totalSeats'), value: stats.capacity, color: "text-purple-500", bgColor: "bg-purple-500/10" },
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ ...springTransition, delay: idx * 0.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`${stat.bgColor} rounded-2xl p-4 text-center border border-border min-h-[80px] flex flex-col justify-center`}
                >
                  <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>

            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
              <motion.button
                whileTap={{ scale: 0.95 }}
                transition={springTransition}
                onClick={() => {
                  triggerHaptic('light');
                  setZoneFilter("");
                }}
                className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-medium transition-colors min-h-[48px] ${
                  !zoneFilter 
                    ? "bg-primary text-primary-foreground shadow-lg" 
                    : "bg-card border border-border text-muted-foreground"
                }`}
              >
                {t('pr.all')}
              </motion.button>
              {tableTypes.map((type) => (
                <motion.button
                  key={type}
                  whileTap={{ scale: 0.95 }}
                  transition={springTransition}
                  onClick={() => {
                    triggerHaptic('light');
                    setZoneFilter(type);
                  }}
                  className={`flex-shrink-0 px-5 py-3 rounded-full text-base font-medium transition-colors min-h-[48px] ${
                    zoneFilter === type
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-card border border-border text-muted-foreground"
                  }`}
                >
                  {getTableTypeLabel(type)}
                </motion.button>
              ))}
            </div>

            <motion.div 
              className="relative"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Cerca tavolo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-card border-border text-base"
                data-testid="input-search"
              />
            </motion.div>

            {loadingTables ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40 rounded-3xl" />
                ))}
              </div>
            ) : filteredTables.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={springTransition}
                className="text-center py-20"
              >
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={springTransition}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center"
                >
                  <Armchair className="h-12 w-12 text-muted-foreground" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Nessun tavolo</h3>
                <p className="text-muted-foreground">
                  Aggiungi il primo tavolo per questo evento
                </p>
              </motion.div>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-4"
              >
                {filteredTables.map((table) => {
                  const booking = getTableBooking(table.id);
                  const statusInfo = getStatusInfo(table.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <motion.div
                      key={table.id}
                      variants={cardVariants}
                      transition={springTransition}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleTablePress(table)}
                      className="bg-card rounded-3xl p-5 border border-border active:bg-muted/50 cursor-pointer min-h-[120px]"
                      data-testid={`card-table-${table.id}`}
                    >
                      <div className="flex items-start gap-4">
                        <motion.div 
                          className={`w-16 h-16 rounded-2xl ${statusInfo.color}/10 flex items-center justify-center flex-shrink-0`}
                          whileHover={{ scale: 1.05 }}
                          transition={springTransition}
                        >
                          <Armchair className={`w-8 h-8 ${statusInfo.textColor}`} />
                        </motion.div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <h3 className="font-bold text-xl truncate">{table.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={`${statusInfo.color}/10 ${statusInfo.textColor} border-0 flex-shrink-0 px-3 py-1.5`}
                            >
                              <StatusIcon className="w-4 h-4 mr-1.5" />
                              {statusInfo.label}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-base text-muted-foreground mb-3">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" />
                              {getTableTypeLabel(table.tableType)}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              {table.capacity} posti
                            </span>
                            {table.minSpend && (
                              <span className="flex items-center gap-1.5">
                                <DollarSign className="w-4 h-4" />
                                Min €{table.minSpend}
                              </span>
                            )}
                          </div>
                          
                          {booking && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              transition={springTransition}
                              className="pt-3 border-t border-border"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Users className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold">{booking.customerName}</p>
                                  <p className="text-sm text-muted-foreground">{booking.guestsCount} ospiti</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}

        {!selectedEventId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-12 w-12 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Seleziona un evento</h3>
            <p className="text-muted-foreground mb-6">
              Scegli un evento per gestire i tavoli
            </p>
            <HapticButton
              onClick={() => setIsEventSelectorOpen(true)}
              className="min-h-[48px] px-6"
              data-testid="button-select-event-cta"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Seleziona Evento
            </HapticButton>
          </motion.div>
        )}
      </div>

      {selectedEventId && (
        <FloatingActionButton
          onClick={() => setIsAddTableOpen(true)}
          data-testid="button-add-table-fab"
        >
          <Plus className="w-6 h-6" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={isEventSelectorOpen}
        onClose={() => setIsEventSelectorOpen(false)}
        title="Seleziona Evento"
      >
        <div className="p-4 space-y-3 pb-8">
          <AnimatePresence>
            {events.map((event, idx) => (
              <motion.button
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springTransition, delay: idx * 0.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  triggerHaptic('medium');
                  setSelectedEventId(event.id);
                  setIsEventSelectorOpen(false);
                }}
                className={`w-full p-5 rounded-2xl text-left transition-colors min-h-[80px] ${
                  selectedEventId === event.id
                    ? "bg-primary/10 border-2 border-primary"
                    : "bg-card border border-border active:bg-muted"
                }`}
                data-testid={`button-event-${event.id}`}
              >
                <div className="flex items-center gap-4">
                  <motion.div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      selectedEventId === event.id ? "bg-primary/20" : "bg-muted"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    transition={springTransition}
                  >
                    <Calendar className={`w-7 h-7 ${selectedEventId === event.id ? "text-primary" : "text-muted-foreground"}`} />
                  </motion.div>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{event.name}</p>
                    <p className="text-base text-muted-foreground">
                      {format(new Date(event.startDatetime), "d MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  {selectedEventId === event.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springTransition}
                    >
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </motion.div>
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        title="Nuovo Tavolo"
      >
        <Form {...tableForm}>
          <form onSubmit={tableForm.handleSubmit((data) => createTableMutation.mutate(data))} className="p-4 space-y-4">
            <FormField
              control={tableForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Tavolo</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Es: Tavolo 1, VIP-1" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-table-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={tableForm.control}
              name="tableType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo Tavolo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 rounded-xl" data-testid="input-table-type">
                        <SelectValue placeholder="Seleziona tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="prive">Privé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={tableForm.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posti</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-capacity" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tableForm.control}
                name="minSpend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min. Spesa (€)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        placeholder="Opzionale" 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-minspend" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={tableForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Note aggiuntive" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <HapticButton 
              type="submit" 
              disabled={createTableMutation.isPending}
              className="w-full h-14 rounded-xl text-base font-semibold"
              hapticType="success"
              data-testid="button-submit-table"
            >
              {createTableMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  Crea Tavolo
                </>
              )}
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>

      <BottomSheet
        open={isActionsOpen}
        onClose={() => {
          setIsActionsOpen(false);
          setSelectedTableId("");
        }}
        title={selectedTable?.name || "Azioni Tavolo"}
      >
        {selectedTable && (() => {
          const booking = getTableBooking(selectedTable.id);
          const statusInfo = getStatusInfo(selectedTable.status);

          return (
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-2xl">
                <div className={`w-16 h-16 rounded-xl ${statusInfo.color}/10 flex items-center justify-center`}>
                  <Armchair className={`w-8 h-8 ${statusInfo.textColor}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedTable.name}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{getTableTypeLabel(selectedTable.tableType)}</span>
                    <span>•</span>
                    <span>{selectedTable.capacity} posti</span>
                  </div>
                  <Badge variant="outline" className={`mt-2 ${statusInfo.color}/10 ${statusInfo.textColor} border-0`}>
                    {statusInfo.label}
                  </Badge>
                </div>
              </div>

              {booking && (
                <div className="p-4 bg-card border border-border rounded-2xl space-y-3">
                  <h4 className="font-semibold">Prenotazione</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{booking.customerName}</p>
                        <p className="text-sm text-muted-foreground">{booking.guestsCount} ospiti</p>
                      </div>
                    </div>
                    {booking.customerPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <p className="text-sm">{booking.customerPhone}</p>
                      </div>
                    )}
                    {booking.customerEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <p className="text-sm">{booking.customerEmail}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {selectedTable.status === 'available' && (
                  <>
                    <HapticButton
                      onClick={() => {
                        setIsActionsOpen(false);
                        setIsBookTableOpen(true);
                      }}
                      className="w-full h-14 rounded-xl justify-start text-base"
                      variant="outline"
                      hapticType="medium"
                      data-testid={`action-book-${selectedTable.id}`}
                    >
                      <Clock className="w-5 h-5 mr-3" />
                      Proponi Tavolo / Prenota
                    </HapticButton>
                    <HapticButton
                      onClick={() => updateTableMutation.mutate({ id: selectedTable.id, data: { status: 'blocked' } })}
                      className="w-full h-14 rounded-xl justify-start text-base"
                      variant="outline"
                      hapticType="medium"
                      data-testid={`action-block-${selectedTable.id}`}
                    >
                      <XCircle className="w-5 h-5 mr-3" />
                      Blocca Tavolo
                    </HapticButton>
                  </>
                )}

                {selectedTable.status === 'blocked' && (
                  <HapticButton
                    onClick={() => updateTableMutation.mutate({ id: selectedTable.id, data: { status: 'available' } })}
                    className="w-full h-14 rounded-xl justify-start text-base"
                    variant="outline"
                    hapticType="medium"
                    data-testid={`action-unblock-${selectedTable.id}`}
                  >
                    <CheckCircle2 className="w-5 h-5 mr-3 text-green-500" />
                    Sblocca Tavolo
                  </HapticButton>
                )}

                {selectedTable.status === 'reserved' && booking && (
                  <>
                    <HapticButton
                      onClick={() => updateBookingMutation.mutate({ id: booking.id, data: { status: 'arrived' } })}
                      className="w-full h-14 rounded-xl justify-start text-base bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20"
                      variant="outline"
                      hapticType="success"
                      data-testid={`action-arrived-${selectedTable.id}`}
                    >
                      <CheckCircle2 className="w-5 h-5 mr-3" />
                      Cliente Arrivato
                    </HapticButton>
                    <HapticButton
                      onClick={() => deleteBookingMutation.mutate(booking.id)}
                      className="w-full h-14 rounded-xl justify-start text-base text-red-500"
                      variant="outline"
                      hapticType="error"
                      data-testid={`action-cancel-booking-${selectedTable.id}`}
                    >
                      <Trash2 className="w-5 h-5 mr-3" />
                      Cancella Prenotazione
                    </HapticButton>
                  </>
                )}

                <HapticButton
                  onClick={() => {}}
                  className="w-full h-14 rounded-xl justify-start text-base"
                  variant="outline"
                  hapticType="light"
                >
                  <Edit className="w-5 h-5 mr-3" />
                  Modifica Tavolo
                </HapticButton>

                <HapticButton
                  onClick={() => deleteTableMutation.mutate(selectedTable.id)}
                  className="w-full h-14 rounded-xl justify-start text-base text-red-500"
                  variant="outline"
                  hapticType="error"
                  data-testid={`action-delete-${selectedTable.id}`}
                >
                  <Trash2 className="w-5 h-5 mr-3" />
                  Elimina Tavolo
                </HapticButton>
              </div>
            </div>
          );
        })()}
      </BottomSheet>

      <BottomSheet
        open={isBookTableOpen}
        onClose={() => {
          setIsBookTableOpen(false);
          setSelectedTableId("");
        }}
        title="Prenota Tavolo"
      >
        <Form {...bookingForm}>
          <form onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))} className="p-4 space-y-4">
            <FormField
              control={bookingForm.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Nome completo" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-customer-name" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={bookingForm.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefono</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+39 333..." 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-customer-phone" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={bookingForm.control}
                name="guestsCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ospiti</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        {...field} 
                        className="h-12 rounded-xl text-base"
                        data-testid="input-guest-count" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={bookingForm.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (opzionale)</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@esempio.com" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-customer-email" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={bookingForm.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Note aggiuntive" 
                      {...field} 
                      className="h-12 rounded-xl text-base"
                      data-testid="input-booking-notes" 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <HapticButton 
              type="submit" 
              disabled={createBookingMutation.isPending}
              className="w-full h-14 rounded-xl text-base font-semibold"
              hapticType="success"
              data-testid="button-submit-booking"
            >
              {createBookingMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Conferma Prenotazione
                </>
              )}
            </HapticButton>
          </form>
        </Form>
      </BottomSheet>
    </MobileAppLayout>
  );
}
