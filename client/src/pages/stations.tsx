import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Boxes, Edit, Trash2, ArrowLeft, MapPin, Calendar, Users, X, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  MobileAppLayout,
  MobileHeader,
  FloatingActionButton,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { Station, User, Event } from "@shared/schema";

const createStationFormSchema = (t: (key: string) => string) => z.object({
  name: z.string().min(1, t('stations.nameRequired')),
  bartenderId: z.string().optional().nullable(),
  stationType: z.enum(['general', 'event']).default('general'),
  eventId: z.string().optional().nullable(),
});

type StationFormData = z.infer<ReturnType<typeof createStationFormSchema>>;

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const cardSpring = {
  type: "spring" as const,
  stiffness: 300,
  damping: 25,
};

function StationCard({
  station,
  eventName,
  bartenderNames,
  canEdit,
  onEdit,
  onDelete,
  delay = 0,
}: {
  station: Station;
  eventName: string | null;
  bartenderNames: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...cardSpring, delay }}
      whileTap={{ scale: 0.98 }}
      className="glass-card p-6 active:bg-white/5 transition-colors"
      data-testid={`station-card-${station.id}`}
    >
      <div className="flex items-start gap-4">
        <motion.div 
          className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${eventName ? 'from-amber-500 to-orange-600' : 'from-violet-500 to-purple-600'} flex items-center justify-center flex-shrink-0 shadow-lg`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <MapPin className="h-7 w-7 text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl mb-2 truncate">{station.name}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {eventName ? (
              <Badge variant="secondary" className="text-sm py-1 px-3" data-testid={`badge-station-type-${station.id}`}>
                <Calendar className="h-4 w-4 mr-1.5" />
                {eventName}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm py-1 px-3 text-teal border-teal/30" data-testid={`badge-station-type-${station.id}`}>
                <MapPin className="h-4 w-4 mr-1.5" />
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-base text-muted-foreground">
            <Users className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{bartenderNames}</span>
          </div>
        </div>
      </div>
      
      {canEdit && (
        <motion.div 
          className="flex gap-3 mt-5 pt-5 border-t border-white/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.2 }}
        >
          <HapticButton
            variant="outline"
            onClick={onEdit}
            className="flex-1 h-12 text-base gap-2"
            hapticType="light"
            data-testid={`button-edit-station-${station.id}`}
          >
            <Edit className="h-5 w-5" />
          </HapticButton>
          <HapticButton
            variant="outline"
            onClick={onDelete}
            className="h-12 w-12 text-destructive border-destructive/30 hover:bg-destructive/10"
            hapticType="medium"
            data-testid={`button-delete-station-${station.id}`}
          >
            <Trash2 className="h-5 w-5" />
          </HapticButton>
        </motion.div>
      )}
    </motion.div>
  );
}

function StationCardSkeleton() {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-7 w-3/4 mb-3" />
          <Skeleton className="h-6 w-24 mb-3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      </div>
    </div>
  );
}

export default function StationsPage() {
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [stationType, setStationType] = useState<'general' | 'event'>('general');
  const [deleteStationId, setDeleteStationId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const canCreateStations = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: stations, isLoading: stationsLoading } = useQuery<Station[]>({
    queryKey: ['/api/stations'],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: events } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  const bartenders = users?.filter(u => u.role === 'bartender') || [];

  const stationFormSchema = createStationFormSchema(t);

  const form = useForm<StationFormData>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      name: '',
      bartenderId: null,
      stationType: 'general',
      eventId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: StationFormData) => {
      const bartenderIds = data.bartenderId && data.bartenderId !== 'null' 
        ? [data.bartenderId] 
        : [];
      const payload = {
        name: data.name,
        bartenderIds,
        eventId: data.stationType === 'event' ? data.eventId : null,
      };
      await apiRequest('POST', '/api/stations', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setSheetOpen(false);
      form.reset();
      triggerHaptic('success');
      toast({
        title: t('stations.createSuccess'),
        description: t('stations.createSuccess'),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('warehouse.unauthorized'),
          description: t('warehouse.loginAgain'),
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: t('stations.error'),
        description: error.message || t('stations.createError'),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<StationFormData> }) => {
      const bartenderIds = data.bartenderId && data.bartenderId !== 'null' 
        ? [data.bartenderId] 
        : [];
      const payload = {
        name: data.name,
        bartenderIds,
        eventId: data.stationType === 'event' ? data.eventId : null,
      };
      await apiRequest('PATCH', `/api/stations/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setSheetOpen(false);
      setEditingStation(null);
      form.reset();
      triggerHaptic('success');
      toast({
        title: t('stations.updateSuccess'),
        description: t('stations.updateSuccess'),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('warehouse.unauthorized'),
          description: t('warehouse.loginAgain'),
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: t('stations.error'),
        description: error.message || t('stations.updateError'),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/stations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stations'] });
      setDeleteStationId(null);
      triggerHaptic('success');
      toast({
        title: t('stations.deleteSuccess'),
        description: t('stations.deleteSuccess'),
      });
    },
    onError: (error: any) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('warehouse.unauthorized'),
          description: t('warehouse.loginAgain'),
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/api/login', 500);
        return;
      }
      toast({
        title: t('stations.error'),
        description: error.message || t('stations.deleteError'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: StationFormData) => {
    if (editingStation) {
      updateMutation.mutate({ id: editingStation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (station: Station) => {
    setEditingStation(station);
    const isEventStation = !!station.eventId;
    setStationType(isEventStation ? 'event' : 'general');
    const bartenderId = station.bartenderIds && station.bartenderIds.length > 0 
      ? station.bartenderIds[0] 
      : null;
    form.reset({
      name: station.name,
      bartenderId,
      stationType: isEventStation ? 'event' : 'general',
      eventId: station.eventId,
    });
    triggerHaptic('light');
    setSheetOpen(true);
  };

  const handleOpenSheet = () => {
    if (!canCreateStations) {
      triggerHaptic('error');
      toast({
        title: t('stations.limitedAccess'),
        description: t('stations.adminOnlyCreate'),
        variant: "destructive",
      });
      return;
    }
    triggerHaptic('medium');
    setSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setSheetOpen(false);
    setEditingStation(null);
    setStationType('general');
    form.reset({
      name: '',
      bartenderId: null,
      stationType: 'general',
      eventId: null,
    });
  };

  const handleOpenDialog = () => {
    if (!canCreateStations) {
      toast({
        title: t('stations.limitedAccess'),
        description: t('stations.adminOnlyCreate'),
        variant: "destructive",
      });
      return;
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingStation(null);
    setStationType('general');
    form.reset({
      name: '',
      bartenderId: null,
      stationType: 'general',
      eventId: null,
    });
  };

  const handleEditDesktop = (station: Station) => {
    setEditingStation(station);
    const isEventStation = !!station.eventId;
    setStationType(isEventStation ? 'event' : 'general');
    const bartenderId = station.bartenderIds && station.bartenderIds.length > 0 
      ? station.bartenderIds[0] 
      : null;
    form.reset({
      name: station.name,
      bartenderId,
      stationType: isEventStation ? 'event' : 'general',
      eventId: station.eventId,
    });
    setIsDialogOpen(true);
  };

  const getEventName = (eventId: string | null) => {
    if (!eventId) return null;
    const event = events?.find(e => e.id === eventId);
    return event?.name || t('warehouse.unknown');
  };

  const getBartenderNames = (bartenderIds: string[] | null) => {
    if (!bartenderIds || bartenderIds.length === 0) return t('stations.none');
    const names = bartenderIds.map(id => {
      const bartender = users?.find(u => u.id === id);
      if (!bartender) return t('warehouse.unknown');
      return `${bartender.firstName} ${bartender.lastName}`;
    });
    return names.join(', ');
  };

  const headerContent = (
    <MobileHeader
      title={t('stations.title')}
      showBackButton showMenuButton
      rightAction={
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Boxes className="h-6 w-6 text-white" />
        </div>
      }
    />
  );

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('stations.stationName')}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder={t('stations.stationNamePlaceholder')} 
                  data-testid="input-station-name-desktop" 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stationType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('stations.stationType')}</FormLabel>
              <Select
                onValueChange={(value) => {
                  field.onChange(value);
                  setStationType(value as 'general' | 'event');
                  if (value === 'general') {
                    form.setValue('eventId', null);
                  }
                }}
                value={field.value}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-station-type-desktop">
                    <SelectValue placeholder={t('stations.selectType')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="general">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-violet-500" />
                      <span>{t('stations.generalFixed')}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="event">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      <span>{t('stations.eventStation')}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {stationType === 'event' && (
          <FormField
            control={form.control}
            name="eventId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('stations.event')}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <FormControl>
                    <SelectTrigger data-testid="select-station-event-desktop">
                      <SelectValue placeholder={t('stations.selectEvent')} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {events?.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="bartenderId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('stations.assignedBartenderOptional')}</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger data-testid="select-station-bartender-desktop">
                    <SelectValue placeholder={t('stations.selectBartender')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="null">{t('stations.none')}</SelectItem>
                  {bartenders.map((bartender) => (
                    <SelectItem key={bartender.id} value={bartender.id}>
                      {bartender.firstName} {bartender.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className="gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleCloseDialog}
            data-testid="button-cancel-station-desktop"
          >
            {t('stations.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            data-testid="button-save-station-desktop"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('stations.saving')}
              </>
            ) : (
              editingStation ? t('stations.update') : t('stations.create')
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-stations">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('stations.title')}</h1>
            <p className="text-muted-foreground">{t('stations.subtitle')}</p>
          </div>
          {canCreateStations && (
            <Button onClick={handleOpenDialog} data-testid="button-create-station-desktop">
              <Plus className="w-4 h-4 mr-2" />
              {t('stations.newStation')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stations?.length || 0}</div>
              <p className="text-sm text-muted-foreground">{t('stations.totalStations')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-violet-500">
                {stations?.filter(s => !s.eventId).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">{t('stations.generalStations')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-500">
                {stations?.filter(s => s.eventId).length || 0}
              </div>
              <p className="text-sm text-muted-foreground">{t('stations.eventStations')}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('stations.stationList')}</CardTitle>
            <CardDescription>{t('stations.allConfiguredStations')}</CardDescription>
          </CardHeader>
          <CardContent>
            {stationsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : stations && stations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('stations.name')}</TableHead>
                    <TableHead>{t('stations.type')}</TableHead>
                    <TableHead>{t('stations.event')}</TableHead>
                    <TableHead>{t('stations.assignedBartender')}</TableHead>
                    {canCreateStations && <TableHead className="text-right">{t('inventory.actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stations.map((station) => (
                    <TableRow key={station.id} data-testid={`row-station-${station.id}`}>
                      <TableCell className="font-medium">{station.name}</TableCell>
                      <TableCell>
                        {station.eventId ? (
                          <Badge variant="secondary">
                            <Calendar className="h-3 w-3 mr-1" />
                            {t('stations.event')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-violet-500 border-violet-500/30">
                            <MapPin className="h-3 w-3 mr-1" />
                            {t('stations.general')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getEventName(station.eventId) || '-'}</TableCell>
                      <TableCell>{getBartenderNames(station.bartenderIds)}</TableCell>
                      {canCreateStations && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleEditDesktop(station)}
                              data-testid={`button-edit-station-desktop-${station.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="text-destructive"
                              onClick={() => setDeleteStationId(station.id)}
                              data-testid={`button-delete-station-desktop-${station.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Boxes className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('stations.noStations')}</h3>
                <p className="text-muted-foreground mb-4">
                  {t('stations.createFirstToStart')}
                </p>
                {canCreateStations && (
                  <Button onClick={handleOpenDialog} data-testid="button-create-first-station-desktop">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('stations.createStation')}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStation ? t('stations.editStation') : t('stations.newStation')}</DialogTitle>
              <DialogDescription>
                {editingStation ? t('stations.editStationDetails') : t('stations.createStationForBar')}
              </DialogDescription>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteStationId} onOpenChange={(open) => !open && setDeleteStationId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('stations.confirmDeletion')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('stations.deleteConfirmMessage')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-station-desktop">
                {t('stations.cancel')}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteStationId && deleteMutation.mutate(deleteStationId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete-station-desktop"
              >
                {t('stations.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={headerContent}
      contentClassName="pb-24"
    >
      <div className="py-4 space-y-4">
        {stationsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <StationCardSkeleton key={i} />
            ))}
          </div>
        ) : stations && stations.length > 0 ? (
          <AnimatePresence mode="popLayout">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={springTransition}
            >
              {stations.map((station, index) => (
                <StationCard
                  key={station.id}
                  station={station}
                  eventName={getEventName(station.eventId)}
                  bartenderNames={getBartenderNames(station.bartenderIds)}
                  canEdit={canCreateStations}
                  onEdit={() => handleEdit(station)}
                  onDelete={() => {
                    triggerHaptic('medium');
                    setDeleteStationId(station.id);
                  }}
                  delay={index * 0.08}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="glass-card p-8 text-center"
          >
            <motion.div 
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-6"
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                repeatType: "reverse" 
              }}
            >
              <Boxes className="h-10 w-10 text-white" />
            </motion.div>
            <h3 className="text-xl font-semibold mb-2">{t('stations.noStations')}</h3>
            <p className="text-muted-foreground text-base mb-6">
              {t('stations.createFirstToStart')}
            </p>
            {canCreateStations && (
              <HapticButton 
                onClick={handleOpenSheet}
                className="gradient-golden text-black font-semibold h-14 px-8 text-lg"
                hapticType="medium"
                data-testid="button-create-first-station"
              >
                <Plus className="h-6 w-6 mr-2" />
                {t('stations.createStation')}
              </HapticButton>
            )}
          </motion.div>
        )}
      </div>

      {canCreateStations && (
        <FloatingActionButton
          onClick={handleOpenSheet}
          className="gradient-golden"
          data-testid="button-create-station"
        >
          <Plus className="h-7 w-7 text-black" />
        </FloatingActionButton>
      )}

      <BottomSheet
        open={sheetOpen}
        onClose={handleCloseSheet}
        title={editingStation ? t('stations.editStation') : t('stations.newStation')}
      >
        <div className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('stations.stationName')}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={t('stations.stationNamePlaceholder')} 
                        className="h-14 text-lg"
                        data-testid="input-station-name" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('stations.stationType')}</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setStationType(value as 'general' | 'event');
                        if (value === 'general') {
                          form.setValue('eventId', null);
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-14 text-base" data-testid="select-station-type">
                          <SelectValue placeholder={t('stations.selectType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general" className="h-14">
                          <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-violet-500" />
                            <span>{t('stations.generalFixed')}</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="event" className="h-14">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-5 w-5 text-amber-500" />
                            <span>{t('stations.eventStation')}</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {stationType === 'event' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={springTransition}
                >
                  <FormField
                    control={form.control}
                    name="eventId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">{t('stations.event')}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || undefined}
                        >
                          <FormControl>
                            <SelectTrigger className="h-14 text-base" data-testid="select-station-event">
                              <SelectValue placeholder={t('stations.selectEvent')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {events?.map((event) => (
                              <SelectItem key={event.id} value={event.id} className="h-12">
                                {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}

              <FormField
                control={form.control}
                name="bartenderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">{t('stations.assignedBartenderOptional')}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger className="h-14 text-base" data-testid="select-station-bartender">
                          <SelectValue placeholder={t('stations.selectBartender')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="null" className="h-12">{t('stations.none')}</SelectItem>
                        {bartenders.map((bartender) => (
                          <SelectItem key={bartender.id} value={bartender.id} className="h-12">
                            {bartender.firstName} {bartender.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <HapticButton
                  type="button"
                  variant="outline"
                  className="flex-1 h-14 text-base"
                  onClick={handleCloseSheet}
                  hapticType="light"
                  data-testid="button-cancel-station"
                >
                  {t('stations.cancel')}
                </HapticButton>
                <HapticButton
                  type="submit"
                  className="flex-1 h-14 text-base gradient-golden text-black font-semibold"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  hapticType="medium"
                  data-testid="button-save-station"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full"
                    />
                  ) : (
                    editingStation ? t('stations.update') : t('stations.create')
                  )}
                </HapticButton>
              </div>
            </form>
          </Form>
        </div>
      </BottomSheet>

      <AlertDialog open={!!deleteStationId} onOpenChange={(open) => !open && setDeleteStationId(null)}>
        <AlertDialogContent className="glass-card border-white/10 mx-4 rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{t('stations.confirmDeletion')}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t('stations.deleteConfirmMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-3">
            <AlertDialogAction
              onClick={() => deleteStationId && deleteMutation.mutate(deleteStationId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 h-14 text-base w-full"
              data-testid="button-confirm-delete-station"
            >
              {t('stations.deleteStation')}
            </AlertDialogAction>
            <AlertDialogCancel 
              className="h-14 text-base w-full mt-0" 
              data-testid="button-cancel-delete-station"
            >
              {t('stations.cancel')}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobileAppLayout>
  );
}
