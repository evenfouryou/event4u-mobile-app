import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  type SiaeResale,
  type SiaeTicket,
} from "@shared/schema";
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
import { Input } from "@/components/ui/input";
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
  RefreshCcw,
  Euro,
  Search,
  ShoppingCart,
  Tag,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
} from "lucide-react";

export default function SiaeResalesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedResale, setSelectedResale] = useState<SiaeResale | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const companyId = user?.companyId;

  const { data: resales, isLoading } = useQuery<SiaeResale[]>({
    queryKey: ['/api/siae/companies', companyId, 'resales'],
    enabled: !!companyId,
  });

  const { data: availableResales } = useQuery<SiaeResale[]>({
    queryKey: ['/api/siae/resales/available'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sold":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Venduto</Badge>;
      case "listed":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Disponibile</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Annullato</Badge>;
      case "expired":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Scaduto</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredResales = resales?.filter((resale) => {
    const matchesSearch =
      searchQuery === "" ||
      resale.originalTicketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resale.sellerId?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || resale.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: resales?.length || 0,
    available: resales?.filter(r => r.status === "listed").length || 0,
    sold: resales?.filter(r => r.status === "sold").length || 0,
    cancelled: resales?.filter(r => r.status === "cancelled").length || 0,
    totalValue: resales?.filter(r => r.status === "sold").reduce((sum, r) => sum + Number(r.resalePrice || 0), 0) || 0,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-siae-resales">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3" data-testid="page-title">
            <RefreshCcw className="w-8 h-8 text-[#FFD700]" />
            Secondary Ticketing
          </h1>
          <p className="text-muted-foreground mt-1">
            Marketplace per la rivendita di biglietti nominativi
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1">Totale Inseriti</div>
            <div className="text-2xl font-bold" data-testid="stat-total">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3" /> Disponibili
            </div>
            <div className="text-2xl font-bold text-blue-400" data-testid="stat-available">{stats.available}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" /> Venduti
            </div>
            <div className="text-2xl font-bold text-emerald-400" data-testid="stat-sold">{stats.sold}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Annullati
            </div>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-cancelled">{stats.cancelled}</div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Valore Venduto
            </div>
            <div className="text-2xl font-bold text-[#FFD700]" data-testid="stat-value">
              €{stats.totalValue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Cerca per codice biglietto o venditore..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="Stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="listed">Disponibili</SelectItem>
                  <SelectItem value="sold">Venduti</SelectItem>
                  <SelectItem value="cancelled">Annullati</SelectItem>
                  <SelectItem value="expired">Scaduti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card className="glass-card">
          <CardContent className="p-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredResales?.length === 0 ? (
        <Card className="glass-card" data-testid="card-empty-state">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
              <RefreshCcw className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nessuna Rivendita</h3>
            <p className="text-muted-foreground">
              Non ci sono biglietti in rivendita
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card" data-testid="card-resales-table">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Biglietto</TableHead>
                    <TableHead>Venditore</TableHead>
                    <TableHead>Acquirente</TableHead>
                    <TableHead>Prezzo Originale</TableHead>
                    <TableHead>Prezzo Rivendita</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResales?.map((resale) => (
                    <TableRow key={resale.id} data-testid={`row-resale-${resale.id}`}>
                      <TableCell className="font-mono text-xs" data-testid={`cell-ticket-${resale.id}`}>
                        {resale.originalTicketId?.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`cell-seller-${resale.id}`}>
                        {resale.sellerId?.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-mono text-xs" data-testid={`cell-buyer-${resale.id}`}>
                        {resale.buyerId ? `${resale.buyerId.slice(0, 8)}...` : "-"}
                      </TableCell>
                      <TableCell data-testid={`cell-original-price-${resale.id}`}>
                        <span className="flex items-center gap-1">
                          <Euro className="w-3 h-3" />
                          {Number(resale.originalPrice).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-resale-price-${resale.id}`}>
                        <span className="flex items-center gap-1 text-[#FFD700]">
                          <Euro className="w-3 h-3" />
                          {Number(resale.resalePrice).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell data-testid={`cell-status-${resale.id}`}>
                        {getStatusBadge(resale.status)}
                      </TableCell>
                      <TableCell data-testid={`cell-date-${resale.id}`}>
                        {resale.listedAt && format(new Date(resale.listedAt), "dd/MM/yyyy", { locale: it })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedResale(resale);
                            setIsDetailDialogOpen(true);
                          }}
                          data-testid={`button-view-${resale.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-[#FFD700]" />
              Dettaglio Rivendita
            </DialogTitle>
          </DialogHeader>
          {selectedResale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Stato</div>
                  {getStatusBadge(selectedResale.status)}
                </div>
                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                  <div className="text-xs text-muted-foreground mb-1">Prezzo Rivendita</div>
                  <div className="text-xl font-bold text-[#FFD700] flex items-center gap-1">
                    <Euro className="w-4 h-4" />
                    {Number(selectedResale.resalePrice).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">ID Biglietto</span>
                  <span className="font-mono text-sm">{selectedResale.originalTicketId}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Venditore</span>
                  <span className="font-mono text-sm">{selectedResale.sellerId}</span>
                </div>
                {selectedResale.buyerId && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Acquirente</span>
                    <span className="font-mono text-sm">{selectedResale.buyerId}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Prezzo Originale</span>
                  <span>€{Number(selectedResale.originalPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Data Inserimento</span>
                  <span>
                    {selectedResale.listedAt && format(new Date(selectedResale.listedAt), "dd/MM/yyyy HH:mm", { locale: it })}
                  </span>
                </div>
                {selectedResale.soldAt && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Data Vendita</span>
                    <span>
                      {format(new Date(selectedResale.soldAt), "dd/MM/yyyy HH:mm", { locale: it })}
                    </span>
                  </div>
                )}
                {selectedResale.platformFee && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Commissione Piattaforma</span>
                    <span>€{Number(selectedResale.platformFee).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
