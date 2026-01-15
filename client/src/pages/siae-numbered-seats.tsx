import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { type SiaeNumberedSeat, type SiaeEventSector } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Armchair,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Search,
  Loader2,
  MapPin,
  Grid3X3,
  Hash,
  Star,
  Crown,
  Accessibility,
  CheckCircle2,
  ShoppingCart,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

const seatFormSchema = z.object({
  sectorId: z.string().min(1, "Seleziona un settore"),
  rowNumber: z.string().min(1, "Numero fila richiesto"),
  seatNumber: z.string().min(1, "Numero posto richiesto"),
  category: z.string().default("standard"),
  priceMultiplier: z.coerce.number().min(0.1).max(10).default(1),
  status: z.string().default("available"),
  xPosition: z.coerce.number().optional(),
  yPosition: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type SeatFormData = z.infer<typeof seatFormSchema>;

export default function SiaeNumberedSeatsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedSeat, setSelectedSeat] = useState<SiaeNumberedSeat | null>(null);
  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.companyId;

  const { data: sectors } = useQuery<SiaeEventSector[]>({
    queryKey: ['/api/siae/companies', companyId, 'event-sectors'],
    enabled: !!companyId,
  });

  const { data: seats, isLoading } = useQuery<SiaeNumberedSeat[]>({
    queryKey: ['/api/siae/sectors', selectedSectorId, 'numbered-seats'],
    enabled: !!selectedSectorId,
  });

  const form = useForm<SeatFormData>({
    resolver: zodResolver(seatFormSchema),
    defaultValues: {
      sectorId: "",
      rowNumber: "",
      seatNumber: "",
      category: "standard",
      priceMultiplier: 1,
      status: "available",
      notes: "",
    },
  });

  useEffect(() => {
    if (!isCreateDialogOpen && !isEditDialogOpen) {
      form.reset();
    }
  }, [isCreateDialogOpen, isEditDialogOpen, form]);

  useEffect(() => {
    if (isEditDialogOpen && selectedSeat) {
      form.reset({
        sectorId: selectedSeat.sectorId,
        rowNumber: selectedSeat.rowNumber,
        seatNumber: selectedSeat.seatNumber,
        category: selectedSeat.category || "standard",
        priceMultiplier: Number(selectedSeat.priceMultiplier) || 1,
        status: selectedSeat.status,
        xPosition: selectedSeat.xPosition ? Number(selectedSeat.xPosition) : undefined,
        yPosition: selectedSeat.yPosition ? Number(selectedSeat.yPosition) : undefined,
        notes: selectedSeat.notes || "",
      });
    }
  }, [isEditDialogOpen, selectedSeat, form]);

  const createSeatMutation = useMutation({
    mutationFn: async (data: SeatFormData) => {
      const response = await apiRequest("POST", `/api/siae/numbered-seats`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('numbered-seats') || false });
      setIsCreateDialogOpen(false);
      toast({
        title: "Posto Creato",
        description: "Il posto è stato creato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateSeatMutation = useMutation({
    mutationFn: async (data: SeatFormData) => {
      const response = await apiRequest("PATCH", `/api/siae/numbered-seats/${selectedSeat?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('numbered-seats') || false });
      setIsEditDialogOpen(false);
      toast({
        title: "Posto Aggiornato",
        description: "Il posto è stato aggiornato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteSeatMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/siae/numbered-seats/${selectedSeat?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string)?.includes('numbered-seats') || false });
      setIsDeleteDialogOpen(false);
      setSelectedSeat(null);
      toast({
        title: "Posto Eliminato",
        description: "Il posto è stato eliminato con successo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Disponibile</Badge>;
      case "sold":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Venduto</Badge>;
      case "reserved":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Riservato</Badge>;
      case "blocked":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Bloccato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case "vip":
        return <Crown className="h-4 w-4 text-amber-400" />;
      case "premium":
        return <Star className="h-4 w-4 text-purple-400" />;
      case "accessibility":
        return <Accessibility className="h-4 w-4 text-blue-400" />;
      default:
        return <Armchair className="h-4 w-4 text-gray-400" />;
    }
  };

  const getCategoryBadge = (category: string | null) => {
    switch (category) {
      case "vip":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">VIP</Badge>;
      case "premium":
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Premium</Badge>;
      case "accessibility":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Accessibilità</Badge>;
      default:
        return <Badge variant="secondary">Standard</Badge>;
    }
  };

  const filteredSeats = seats?.filter((seat) => {
    const matchesSearch =
      searchQuery === "" ||
      seat.rowNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seat.seatNumber?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || seat.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || seat.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const stats = {
    total: seats?.length || 0,
    available: seats?.filter(s => s.status === "available").length || 0,
    sold: seats?.filter(s => s.status === "sold").length || 0,
    reserved: seats?.filter(s => s.status === "reserved").length || 0,
    blocked: seats?.filter(s => s.status === "blocked").length || 0,
  };

  const handleViewDetails = (seat: SiaeNumberedSeat) => {
    setSelectedSeat(seat);
    setIsDetailDialogOpen(true);
  };

  const handleEdit = (seat: SiaeNumberedSeat) => {
    setSelectedSeat(seat);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (seat: SiaeNumberedSeat) => {
    setSelectedSeat(seat);
    setIsDeleteDialogOpen(true);
  };

  const onSubmitCreate = (data: SeatFormData) => {
    createSeatMutation.mutate(data);
  };

  const onSubmitEdit = (data: SeatFormData) => {
    updateSeatMutation.mutate(data);
  };

  const renderDialogs = () => (
    <>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md bg-[#151922] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Armchair className="h-5 w-5 text-amber-400" />
              Nuovo Posto
            </DialogTitle>
            <DialogDescription>
              Inserisci i dettagli del nuovo posto
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4">
              <FormField
                control={form.control}
                name="sectorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Settore</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || selectedSectorId}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0a0e17] border-gray-700">
                          <SelectValue placeholder="Seleziona settore" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sectors?.map((sector) => (
                          <SelectItem key={sector.id} value={sector.id}>
                            {sector.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rowNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fila</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="A, B, 1, 2..." className="bg-[#0a0e17] border-gray-700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Posto</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1, 2, 3..." className="bg-[#0a0e17] border-gray-700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0a0e17] border-gray-700">
                          <SelectValue placeholder="Seleziona categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="accessibility">Accessibilità</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moltiplicatore Prezzo</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0.1" max="10" className="bg-[#0a0e17] border-gray-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Note aggiuntive..." className="bg-[#0a0e17] border-gray-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annulla
                </Button>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                  disabled={createSeatMutation.isPending}
                  data-testid="button-submit-create-seat"
                >
                  {createSeatMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Crea Posto
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md bg-[#151922] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Pencil className="h-5 w-5 text-blue-400" />
              Modifica Posto
            </DialogTitle>
            <DialogDescription>
              Modifica i dettagli del posto
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitEdit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rowNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fila</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-[#0a0e17] border-gray-700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seatNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numero Posto</FormLabel>
                      <FormControl>
                        <Input {...field} className="bg-[#0a0e17] border-gray-700" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0a0e17] border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Standard</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="accessibility">Accessibilità</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stato</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-[#0a0e17] border-gray-700">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="available">Disponibile</SelectItem>
                        <SelectItem value="sold">Venduto</SelectItem>
                        <SelectItem value="reserved">Riservato</SelectItem>
                        <SelectItem value="blocked">Bloccato</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priceMultiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moltiplicatore Prezzo</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0.1" max="10" className="bg-[#0a0e17] border-gray-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="bg-[#0a0e17] border-gray-700" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  disabled={updateSeatMutation.isPending}
                  data-testid="button-submit-edit-seat"
                >
                  {updateSeatMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Salva Modifiche
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-md bg-[#151922] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Armchair className="h-5 w-5 text-amber-400" />
              Dettaglio Posto
            </DialogTitle>
          </DialogHeader>

          {selectedSeat && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Fila</label>
                  <p className="text-white font-mono text-lg">{selectedSeat.rowNumber}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Posto</label>
                  <p className="text-white font-mono text-lg font-bold">{selectedSeat.seatNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Categoria</label>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(selectedSeat.category)}
                    {getCategoryBadge(selectedSeat.category)}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Stato</label>
                  {getStatusBadge(selectedSeat.status)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-400">Moltiplicatore Prezzo</label>
                <p className="text-white">x{Number(selectedSeat.priceMultiplier || 1).toFixed(2)}</p>
              </div>

              {selectedSeat.xPosition && selectedSeat.yPosition && (
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Posizione Mappa</label>
                  <p className="text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    X: {Number(selectedSeat.xPosition).toFixed(2)}, Y: {Number(selectedSeat.yPosition).toFixed(2)}
                  </p>
                </div>
              )}

              {selectedSeat.notes && (
                <div className="space-y-1">
                  <label className="text-sm text-gray-400">Note</label>
                  <p className="text-gray-300 bg-gray-900 p-2 rounded">{selectedSeat.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <label className="text-gray-400">Creato</label>
                  <p className="text-gray-300">
                    {selectedSeat.createdAt ? format(new Date(selectedSeat.createdAt), "dd/MM/yyyy HH:mm", { locale: it }) : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-gray-400">Modificato</label>
                  <p className="text-gray-300">
                    {selectedSeat.updatedAt ? format(new Date(selectedSeat.updatedAt), "dd/MM/yyyy HH:mm", { locale: it }) : "-"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md bg-[#151922] border-gray-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Elimina Posto
            </DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questo posto? L'azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>

          {selectedSeat && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <p className="text-white">
                Posto <strong>Fila {selectedSeat.rowNumber}, N° {selectedSeat.seatNumber}</strong>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteSeatMutation.mutate()}
              disabled={deleteSeatMutation.isPending}
              data-testid="button-confirm-delete-seat"
            >
              {deleteSeatMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Elimina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-numbered-seats">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('siae.numberedSeatsPage.title')}</h1>
            <p className="text-muted-foreground">{t('siae.numberedSeatsPage.subtitle')}</p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={!selectedSectorId}
            data-testid="button-create-seat"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('siae.numberedSeatsPage.newSeat')}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-md">
                <label className="text-sm text-muted-foreground mb-2 block">{t('siae.numberedSeatsPage.selectSector')}</label>
                <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                  <SelectTrigger data-testid="select-sector">
                    <SelectValue placeholder={t('siae.numberedSeatsPage.selectSectorPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors?.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name} ({sector.sectorCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedSectorId && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Armchair className="h-8 w-8 text-amber-500" />
                    <div>
                      <div className="text-2xl font-bold">{stats.total}</div>
                      <p className="text-sm text-muted-foreground">{t('siae.numberedSeatsPage.totalSeats')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold text-green-500">{stats.available}</div>
                      <p className="text-sm text-muted-foreground">{t('siae.numberedSeatsPage.available')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold text-red-500">{stats.sold}</div>
                      <p className="text-sm text-muted-foreground">{t('siae.numberedSeatsPage.sold')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Lock className="h-8 w-8 text-amber-500" />
                    <div>
                      <div className="text-2xl font-bold text-amber-500">{stats.reserved}</div>
                      <p className="text-sm text-muted-foreground">{t('siae.numberedSeatsPage.reserved')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-gray-500" />
                    <div>
                      <div className="text-2xl font-bold">{stats.blocked}</div>
                      <p className="text-sm text-muted-foreground">{t('siae.numberedSeatsPage.blocked')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('siae.numberedSeatsPage.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-seats"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                        <SelectValue placeholder={t('common.status')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('siae.numberedSeatsPage.allStatuses')}</SelectItem>
                        <SelectItem value="available">{t('siae.numberedSeatsPage.available')}</SelectItem>
                        <SelectItem value="sold">{t('siae.numberedSeatsPage.sold')}</SelectItem>
                        <SelectItem value="reserved">{t('siae.numberedSeatsPage.reserved')}</SelectItem>
                        <SelectItem value="blocked">{t('siae.numberedSeatsPage.blocked')}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                        <SelectValue placeholder={t('siae.numberedSeatsPage.category')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('siae.numberedSeatsPage.allCategories')}</SelectItem>
                        <SelectItem value="standard">{t('siae.numberedSeatsPage.standard')}</SelectItem>
                        <SelectItem value="vip">{t('siae.numberedSeatsPage.vip')}</SelectItem>
                        <SelectItem value="premium">{t('siae.numberedSeatsPage.premium')}</SelectItem>
                        <SelectItem value="accessibility">{t('siae.numberedSeatsPage.accessibility')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('siae.numberedSeatsPage.row')}</TableHead>
                        <TableHead>{t('siae.numberedSeatsPage.seat')}</TableHead>
                        <TableHead>{t('siae.numberedSeatsPage.category')}</TableHead>
                        <TableHead>{t('siae.numberedSeatsPage.multiplier')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('siae.numberedSeatsPage.position')}</TableHead>
                        <TableHead className="text-right">{t('common.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSeats && filteredSeats.length > 0 ? (
                        filteredSeats.map((seat) => (
                          <TableRow key={seat.id} data-testid={`row-seat-${seat.id}`}>
                            <TableCell className="font-mono">
                              <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-muted-foreground" />
                                {seat.rowNumber}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                              {seat.seatNumber}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getCategoryIcon(seat.category)}
                                {getCategoryBadge(seat.category)}
                              </div>
                            </TableCell>
                            <TableCell>
                              x{Number(seat.priceMultiplier || 1).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(seat.status)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {seat.xPosition && seat.yPosition ? (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  ({Number(seat.xPosition).toFixed(0)}, {Number(seat.yPosition).toFixed(0)})
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewDetails(seat)}
                                  data-testid={`button-view-seat-${seat.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(seat)}
                                  data-testid={`button-edit-seat-${seat.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(seat)}
                                  data-testid={`button-delete-seat-${seat.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Armchair className="h-12 w-12 text-muted-foreground" />
                              <p className="text-muted-foreground">{t('siae.numberedSeatsPage.noSeatsFound')}</p>
                              <p className="text-sm text-muted-foreground">
                                {t('siae.numberedSeatsPage.createNewSeats')}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedSectorId && (
          <Card>
            <CardContent className="p-12 text-center">
              <Grid3X3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">{t('siae.numberedSeatsPage.selectASector')}</h3>
              <p className="text-muted-foreground">
                {t('siae.numberedSeatsPage.selectSectorToManage')}
              </p>
            </CardContent>
          </Card>
        )}

        {renderDialogs()}
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title="Posti Numerati" showBackButton showMenuButton showUserMenu />}
      contentClassName="pb-24"
    >
      <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <p className="text-xs sm:text-sm text-gray-400">Gestione posti a sedere per eventi</p>
          </div>

          <Button
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black"
          disabled={!selectedSectorId}
          data-testid="button-create-seat"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuovo Posto
        </Button>
      </div>

      <Card className="bg-[#151922] border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <label className="text-sm text-gray-400 mb-2 block">Seleziona Settore</label>
              <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                <SelectTrigger className="bg-[#0a0e17] border-gray-700" data-testid="select-sector">
                  <SelectValue placeholder="Seleziona un settore..." />
                </SelectTrigger>
                <SelectContent>
                  {sectors?.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name} ({sector.sectorCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedSectorId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
            <Card className="bg-[#151922] border-gray-800">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Armchair className="h-6 w-6 sm:h-8 sm:w-8 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                    <p className="text-xs text-gray-400">Totale Posti</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#151922] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.available}</p>
                    <p className="text-xs text-gray-400">Disponibili</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#151922] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-8 w-8 text-red-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.sold}</p>
                    <p className="text-xs text-gray-400">Venduti</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#151922] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-amber-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.reserved}</p>
                    <p className="text-xs text-gray-400">Riservati</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#151922] border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-8 w-8 text-gray-400" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.blocked}</p>
                    <p className="text-xs text-gray-400">Bloccati</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#151922] border-gray-800">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Cerca per fila o numero posto..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-[#0a0e17] border-gray-700"
                    data-testid="input-search-seats"
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] bg-[#0a0e17] border-gray-700" data-testid="select-status-filter">
                      <SelectValue placeholder="Stato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti gli stati</SelectItem>
                      <SelectItem value="available">Disponibile</SelectItem>
                      <SelectItem value="sold">Venduto</SelectItem>
                      <SelectItem value="reserved">Riservato</SelectItem>
                      <SelectItem value="blocked">Bloccato</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[150px] bg-[#0a0e17] border-gray-700" data-testid="select-category-filter">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutte</SelectItem>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="vip">VIP</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="accessibility">Accessibilità</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#151922] border-gray-800">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
              {isLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-800 hover:bg-transparent">
                      <TableHead className="text-gray-400">Fila</TableHead>
                      <TableHead className="text-gray-400">Posto</TableHead>
                      <TableHead className="text-gray-400">Categoria</TableHead>
                      <TableHead className="text-gray-400">Moltiplicatore</TableHead>
                      <TableHead className="text-gray-400">Stato</TableHead>
                      <TableHead className="text-gray-400">Posizione</TableHead>
                      <TableHead className="text-gray-400 text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSeats && filteredSeats.length > 0 ? (
                      filteredSeats.map((seat) => (
                        <TableRow
                          key={seat.id}
                          className="border-gray-800 hover:bg-gray-800/50"
                          data-testid={`row-seat-${seat.id}`}
                        >
                          <TableCell className="text-white font-mono">
                            <div className="flex items-center gap-2">
                              <Hash className="h-4 w-4 text-gray-500" />
                              {seat.rowNumber}
                            </div>
                          </TableCell>
                          <TableCell className="text-white font-mono font-bold">
                            {seat.seatNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(seat.category)}
                              {getCategoryBadge(seat.category)}
                            </div>
                          </TableCell>
                          <TableCell className="text-white">
                            x{Number(seat.priceMultiplier || 1).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(seat.status)}
                          </TableCell>
                          <TableCell className="text-gray-400 text-sm">
                            {seat.xPosition && seat.yPosition ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                ({Number(seat.xPosition).toFixed(0)}, {Number(seat.yPosition).toFixed(0)})
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewDetails(seat)}
                                data-testid={`button-view-seat-${seat.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(seat)}
                                data-testid={`button-edit-seat-${seat.id}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(seat)}
                                className="text-red-400 hover:text-red-300"
                                data-testid={`button-delete-seat-${seat.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Armchair className="h-12 w-12 text-gray-600" />
                            <p className="text-gray-400">Nessun posto trovato</p>
                            <p className="text-sm text-gray-500">
                              Crea nuovi posti per questo settore
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedSectorId && (
        <Card className="bg-[#151922] border-gray-800">
          <CardContent className="p-12 text-center">
            <Grid3X3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Seleziona un Settore</h3>
            <p className="text-gray-400">
              Seleziona un settore per visualizzare e gestire i posti numerati
            </p>
          </CardContent>
        </Card>
      )}

      {renderDialogs()}
      </div>
    </MobileAppLayout>
  );
}
