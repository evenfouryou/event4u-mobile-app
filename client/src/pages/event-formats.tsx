import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Plus, Tag, Edit, Trash2, Search } from "lucide-react";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventFormatSchema, type EventFormat, type InsertEventFormat } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function EventFormats() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<EventFormat | null>(null);
  const [deletingFormat, setDeletingFormat] = useState<EventFormat | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  
  const canManageFormats = user?.role === 'super_admin' || user?.role === 'gestore';

  const { data: formats, isLoading } = useQuery<EventFormat[]>({
    queryKey: ['/api/event-formats'],
  });

  const form = useForm<InsertEventFormat>({
    resolver: zodResolver(insertEventFormatSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3b82f6',
      companyId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertEventFormat) => apiRequest('POST', '/api/event-formats', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/event-formats'] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Successo",
        description: "Format evento creato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: "Impossibile creare il format evento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertEventFormat> }) =>
      apiRequest('PATCH', `/api/event-formats/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/event-formats'] });
      setDialogOpen(false);
      setEditingFormat(null);
      form.reset();
      toast({
        title: "Successo",
        description: "Format evento aggiornato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare il format evento",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/event-formats/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/event-formats'] });
      setDeletingFormat(null);
      toast({
        title: "Successo",
        description: "Format evento eliminato con successo",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il format evento",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (format?: EventFormat) => {
    if (format) {
      setEditingFormat(format);
      form.reset({
        name: format.name,
        description: format.description ?? '',
        color: format.color ?? '#3b82f6',
        companyId: format.companyId,
      });
    } else {
      setEditingFormat(null);
      form.reset({
        name: '',
        description: '',
        color: '#3b82f6',
        companyId: '',
      });
    }
    setDialogOpen(true);
  };

  const onSubmit = (data: InsertEventFormat) => {
    // Remove companyId from data - backend will add it automatically from authenticated user
    const { companyId, ...dataWithoutCompanyId } = data;
    
    if (editingFormat) {
      updateMutation.mutate({ id: editingFormat.id, data: dataWithoutCompanyId });
    } else {
      createMutation.mutate(dataWithoutCompanyId as InsertEventFormat);
    }
  };

  const filteredFormats = useMemo(() => {
    if (!formats) return [];
    
    return formats.filter(format => {
      const matchesSearch = !searchQuery || 
        format.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [formats, searchQuery]);

  return (
    <MobileAppLayout
      header={<MobileHeader title="Formati Evento" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()} 
              data-testid="button-create-format"
              disabled={!canManageFormats}
              title={!canManageFormats ? "Solo gli admin possono gestire format eventi" : ""}
            >
              <Plus className="h-4 w-4" />
              Nuovo Format
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingFormat ? 'Modifica Format' : 'Nuovo Format'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Format</FormLabel>
                      <FormControl>
                        <Input placeholder="es. Matrimonio, Concerto, Festa Aziendale" {...field} data-testid="input-format-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrizione</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descrizione del format evento..." 
                          {...field} 
                          value={field.value ?? ''}
                          data-testid="input-format-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colore Badge</FormLabel>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <Input 
                            type="color" 
                            {...field} 
                            value={field.value ?? '#3b82f6'}
                            className="w-20 h-10 cursor-pointer"
                            data-testid="input-format-color"
                          />
                        </FormControl>
                        <Badge 
                          style={{ 
                            backgroundColor: field.value ?? '#3b82f6',
                            color: '#ffffff'
                          }}
                        >
                          Anteprima
                        </Badge>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    data-testid="button-cancel-format"
                  >
                    Annulla
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-format"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Salvataggio..." : "Salva"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cerca format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-formats"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredFormats.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                {searchQuery ? "Nessun format trovato" : "Nessun format configurato"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrizione</TableHead>
                  <TableHead>Anteprima</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFormats.map((format) => (
                  <TableRow key={format.id} data-testid={`row-format-${format.id}`}>
                    <TableCell className="font-medium">{format.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={{ 
                          backgroundColor: format.color ?? '#3b82f6',
                          color: '#ffffff'
                        }}
                      >
                        {format.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(format)}
                          data-testid={`button-edit-format-${format.id}`}
                          disabled={!canManageFormats}
                          title={!canManageFormats ? "Solo gli admin possono modificare format eventi" : ""}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingFormat(format)}
                          data-testid={`button-delete-format-${format.id}`}
                          disabled={!canManageFormats}
                          title={!canManageFormats ? "Solo gli admin possono eliminare format eventi" : ""}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deletingFormat} onOpenChange={() => setDeletingFormat(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il format "{deletingFormat?.name}"?
              Gli eventi che utilizzano questo format non saranno eliminati.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-format">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingFormat && deleteMutation.mutate(deletingFormat.id)}
              data-testid="button-confirm-delete-format"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </MobileAppLayout>
  );
}
