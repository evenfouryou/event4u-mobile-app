import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar, 
  Euro,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Trash2,
  Eye,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import type { NightFile, Event } from "@shared/schema";

export default function NightFilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [viewingFile, setViewingFile] = useState<NightFile | null>(null);
  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  const { data: nightFiles = [], isLoading } = useQuery<NightFile[]>({
    queryKey: ["/api/night-files"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const generateMutation = useMutation({
    mutationFn: (eventId: string) => apiRequest("POST", `/api/night-files/generate/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/night-files"] });
      toast({ title: "File della Serata generato con successo" });
      setSelectedEventId("");
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/night-files/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/night-files"] });
      toast({ title: "File della Serata approvato" });
      setViewingFile(null);
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/night-files/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/night-files"] });
      toast({ title: "File della Serata eliminato" });
    },
    onError: (err: any) => {
      toast({ title: "Errore", description: err.message, variant: "destructive" });
    },
  });

  const getEventName = (eventId: string) => {
    const e = events.find(x => x.id === eventId);
    return e?.name || "N/D";
  };

  const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
    draft: { label: "Bozza", variant: "secondary", icon: Clock },
    pending_review: { label: "In Revisione", variant: "outline", icon: AlertCircle },
    approved: { label: "Approvato", variant: "default", icon: CheckCircle },
    closed: { label: "Chiuso", variant: "secondary", icon: FileCheck },
  };

  const eventsWithoutFile = events.filter(e => 
    !nightFiles.some(nf => nf.eventId === e.id) &&
    (e.status === 'ongoing' || e.status === 'closed')
  );

  if (isLoading) {
    return <div className="text-center py-8">Caricamento...</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" data-testid="text-night-file-title">
          <FileText className="h-8 w-8 text-primary" />
          File della Serata
        </h1>
        <p className="text-muted-foreground">
          Documento riepilogativo integrato di contabilità, personale e cassa per ogni evento
        </p>
      </div>

      {isAdmin && eventsWithoutFile.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Genera Nuovo File
            </CardTitle>
            <CardDescription>
              Seleziona un evento per generare il documento riepilogativo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger data-testid="select-event-generate">
                    <SelectValue placeholder="Seleziona evento..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eventsWithoutFile.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => selectedEventId && generateMutation.mutate(selectedEventId)}
                disabled={!selectedEventId || generateMutation.isPending}
                data-testid="button-generate-file"
              >
                {generateMutation.isPending ? "Generazione..." : "Genera File"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {nightFiles.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nessun File della Serata</h3>
            <p className="text-muted-foreground mb-4">
              Non sono ancora stati generati documenti riepilogativi per gli eventi
            </p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground">
                Seleziona un evento completato sopra per generare il primo file.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nightFiles.map((file) => (
            <Card key={file.id} className="hover-elevate" data-testid={`card-night-file-${file.id}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{getEventName(file.eventId)}</CardTitle>
                    <CardDescription>
                      {file.generatedAt && format(new Date(file.generatedAt), "dd MMMM yyyy", { locale: it })}
                    </CardDescription>
                  </div>
                  <Badge variant={statusLabels[file.status]?.variant || "secondary"}>
                    {statusLabels[file.status]?.label || file.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Ricavi
                    </p>
                    <p className="font-medium text-green-600">
                      €{parseFloat(file.totalRevenue || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" /> Costi
                    </p>
                    <p className="font-medium text-red-600">
                      €{parseFloat(file.totalExpenses || '0').toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Staff
                    </p>
                    <p className="font-medium">{file.totalStaffCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <Euro className="h-3 w-3" /> Risultato
                    </p>
                    <p className={`font-bold ${parseFloat(file.netResult || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{parseFloat(file.netResult || '0').toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setViewingFile(file)}
                  data-testid={`button-view-file-${file.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Dettagli
                </Button>
                {isAdmin && file.status !== 'approved' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" data-testid={`button-delete-file-${file.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare questo file?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Questa azione non può essere annullata.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(file.id)}>
                          Elimina
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!viewingFile} onOpenChange={(open) => !open && setViewingFile(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              File della Serata - {viewingFile && getEventName(viewingFile.eventId)}
            </DialogTitle>
          </DialogHeader>
          
          {viewingFile && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Generato il: {viewingFile.generatedAt && format(new Date(viewingFile.generatedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                </div>
                <Badge variant={statusLabels[viewingFile.status]?.variant || "secondary"}>
                  {statusLabels[viewingFile.status]?.label || viewingFile.status}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Ricavi Totali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      €{parseFloat(viewingFile.totalRevenue || '0').toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Costi Totali</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      €{parseFloat(viewingFile.totalExpenses || '0').toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Risultato Netto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-2xl font-bold ${parseFloat(viewingFile.netResult || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      €{parseFloat(viewingFile.netResult || '0').toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Dettaglio Ricavi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Contanti</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalCashRevenue || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Carta</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalCardRevenue || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Online</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalOnlineRevenue || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Crediti</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalCreditsRevenue || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Dettaglio Costi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell>Costi Extra</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalExtraCosts || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Manutenzioni</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalMaintenances || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Costi Personale</TableCell>
                          <TableCell className="text-right font-medium">
                            €{parseFloat(viewingFile.totalStaffCosts || '0').toFixed(2)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Personale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span>Membri staff impiegati</span>
                    <span className="font-medium">{viewingFile.totalStaffCount || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Euro className="h-4 w-4" />
                    Quadratura Fondi Cassa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell>Fondo Apertura</TableCell>
                        <TableCell className="text-right font-medium">
                          €{parseFloat(viewingFile.openingFund || '0').toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Fondo Chiusura</TableCell>
                        <TableCell className="text-right font-medium">
                          €{parseFloat(viewingFile.closingFund || '0').toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Differenza</TableCell>
                        <TableCell className={`text-right font-bold ${parseFloat(viewingFile.fundDifference || '0') === 0 ? 'text-green-600' : 'text-red-600'}`}>
                          €{parseFloat(viewingFile.fundDifference || '0').toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {viewingFile.notes && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Note</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{viewingFile.notes}</p>
                  </CardContent>
                </Card>
              )}

              {viewingFile.approvedBy && viewingFile.approvedAt && (
                <div className="text-sm text-muted-foreground text-center">
                  Approvato il {format(new Date(viewingFile.approvedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isAdmin && viewingFile && viewingFile.status === 'draft' && (
              <Button 
                onClick={() => approveMutation.mutate(viewingFile.id)}
                disabled={approveMutation.isPending}
                data-testid="button-approve-file"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {approveMutation.isPending ? "Approvazione..." : "Approva File"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setViewingFile(null)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
