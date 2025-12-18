import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import {
  RefreshCw,
  User,
  Calendar,
  Tag,
  XCircle,
  Loader2,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";

interface ResaleListing {
  id: number;
  ticketId: number;
  eventName: string;
  eventDate: string;
  sector: string;
  askingPrice: number;
  status: "active" | "sold" | "cancelled";
  createdAt: string;
}

interface NameChangeRequest {
  id: number;
  ticketId: number;
  eventName: string;
  newHolderName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

function ResaleCard({
  resale,
  onCancel,
  isCancelling,
}: {
  resale: ResaleListing;
  onCancel: (id: number) => void;
  isCancelling: boolean;
}) {
  const eventDate = parseISO(resale.eventDate);

  const statusVariant = () => {
    switch (resale.status) {
      case "active":
        return "default";
      case "sold":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    switch (resale.status) {
      case "active":
        return "In Vendita";
      case "sold":
        return "Venduto";
      case "cancelled":
        return "Annullato";
      default:
        return resale.status;
    }
  };

  return (
    <Card className="bg-[#151922] border-white/10" data-testid={`resale-${resale.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusVariant()} className="text-xs">
                {statusLabel()}
              </Badge>
            </div>
            <h3 className="font-semibold text-white truncate" data-testid="text-event-name">
              {resale.eventName}
            </h3>
            <div className="flex flex-col gap-1 mt-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(eventDate, "d MMM yyyy, HH:mm", { locale: it })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span>Settore: {resale.sector}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">
                  €{(resale.askingPrice / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          {resale.status === "active" && (
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={() => onCancel(resale.id)}
              disabled={isCancelling}
              data-testid="button-cancel-resale"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NameChangeCard({ request }: { request: NameChangeRequest }) {
  const statusVariant = () => {
    switch (request.status) {
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const statusLabel = () => {
    switch (request.status) {
      case "pending":
        return "In Attesa";
      case "approved":
        return "Approvato";
      case "rejected":
        return "Rifiutato";
      default:
        return request.status;
    }
  };

  const StatusIcon = () => {
    switch (request.status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "approved":
        return <Check className="w-4 h-4" />;
      case "rejected":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const createdDate = parseISO(request.createdAt);

  return (
    <Card className="bg-[#151922] border-white/10" data-testid={`name-change-${request.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusVariant()} className="text-xs">
                <StatusIcon />
                <span className="ml-1">{statusLabel()}</span>
              </Badge>
            </div>
            <h3 className="font-semibold text-white truncate" data-testid="text-event-name">
              {request.eventName}
            </h3>
            <div className="flex flex-col gap-1 mt-2 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Nuovo intestatario: {request.newHolderName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Richiesto il: {format(createdDate, "d MMM yyyy", { locale: it })}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AccountResales() {
  const { toast } = useToast();

  const { data: resales, isLoading: resalesLoading } = useQuery<ResaleListing[]>({
    queryKey: ["/api/public/account/resales"],
  });

  const { data: nameChanges, isLoading: nameChangesLoading } = useQuery<NameChangeRequest[]>({
    queryKey: ["/api/public/account/name-changes"],
  });

  const cancelResaleMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/public/account/resale/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/resales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      toast({
        title: "Rivendita annullata",
        description: "Il biglietto è stato rimosso dalla vendita.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile annullare la rivendita.",
        variant: "destructive",
      });
    },
  });

  const isLoading = resalesLoading || nameChangesLoading;
  const activeResales = resales?.filter((r) => r.status === "active") || [];
  const completedResales = resales?.filter((r) => r.status !== "active") || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white" data-testid="text-page-title">Rivendita e Cambi Nominativo</h1>
        <p className="text-slate-400 mt-2">Gestisci le tue rivendite e i cambi nominativo</p>
      </div>

      <Tabs defaultValue="resales" className="w-full">
        <TabsList className="w-full bg-white/5 border border-white/10 rounded-lg h-12 mb-6">
          <TabsTrigger
            value="resales"
            className="flex-1 h-full text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            data-testid="tab-resales"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Rivendite ({resales?.length || 0})
          </TabsTrigger>
          <TabsTrigger
            value="name-changes"
            className="flex-1 h-full text-white data-[state=active]:bg-yellow-500 data-[state=active]:text-black"
            data-testid="tab-name-changes"
          >
            <User className="w-4 h-4 mr-2" />
            Cambi Nominativo ({nameChanges?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resales" className="mt-0">
          {!resales || resales.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              message="Nessuna rivendita"
              subMessage="Puoi mettere in vendita i tuoi biglietti dalla sezione I Miei Biglietti"
            />
          ) : (
            <div className="space-y-4">
              {activeResales.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3">In vendita</h3>
                  <div className="space-y-3">
                    {activeResales.map((resale) => (
                      <ResaleCard
                        key={resale.id}
                        resale={resale}
                        onCancel={(id) => cancelResaleMutation.mutate(id)}
                        isCancelling={cancelResaleMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
              {completedResales.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-3 mt-6">Archivio</h3>
                  <div className="space-y-3">
                    {completedResales.map((resale) => (
                      <ResaleCard
                        key={resale.id}
                        resale={resale}
                        onCancel={(id) => cancelResaleMutation.mutate(id)}
                        isCancelling={cancelResaleMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="name-changes" className="mt-0">
          {!nameChanges || nameChanges.length === 0 ? (
            <EmptyState
              icon={User}
              message="Nessun cambio nominativo"
              subMessage="Puoi richiedere un cambio nominativo dalla sezione I Miei Biglietti"
            />
          ) : (
            <div className="space-y-3">
              {nameChanges.map((request) => (
                <NameChangeCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  message,
  subMessage,
}: {
  icon: typeof RefreshCw;
  message: string;
  subMessage: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
      <p className="text-slate-400">{message}</p>
      <p className="text-sm text-slate-500 mt-1">{subMessage}</p>
      <Link href="/account/tickets">
        <span className="text-yellow-400 hover:underline mt-4 inline-block cursor-pointer">
          Vai ai miei biglietti
        </span>
      </Link>
    </div>
  );
}
