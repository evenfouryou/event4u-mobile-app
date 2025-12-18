import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
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
  Ticket,
} from "lucide-react";

interface ResaleListing {
  id: string;
  originalTicketId: string;
  originalPrice: string;
  resalePrice: string;
  status: string;
  listedAt: string;
  soldAt: string | null;
  ticketCode: string;
  eventName: string;
  eventStart: string;
  sectorName: string;
}

interface NameChangeRequest {
  id: string;
  originalTicketId: string;
  previousFirstName: string | null;
  previousLastName: string | null;
  newFirstName: string;
  newLastName: string;
  fee: string;
  status: string;
  createdAt: string;
  ticketCode: string;
  eventName: string;
  eventStart: string;
}

interface ResalesResponse {
  resales: ResaleListing[];
}

interface NameChangesResponse {
  nameChanges: NameChangeRequest[];
}

function ResaleCard({
  resale,
  onCancel,
  isCancelling,
}: {
  resale: ResaleListing;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const eventDate = new Date(resale.eventStart);
  const resalePrice = parseFloat(resale.resalePrice || "0");
  const originalPrice = parseFloat(resale.originalPrice || "0");

  const statusVariant = () => {
    switch (resale.status) {
      case "listed":
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
      case "listed":
        return "In Vendita";
      case "pending":
        return "In Attesa";
      case "sold":
        return "Venduto";
      case "cancelled":
        return "Annullato";
      default:
        return resale.status;
    }
  };

  return (
    <Card className="bg-card border-border" data-testid={`resale-${resale.id}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusVariant()} className="text-xs">
                {statusLabel()}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground truncate" data-testid="text-event-name">
              {resale.eventName}
            </h3>
            <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(eventDate, "d MMM yyyy, HH:mm", { locale: it })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                <span>Settore: {resale.sectorName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <span className="text-muted-foreground">
                  Originale: €{originalPrice.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">
                  In vendita a: €{resalePrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          {resale.status === "listed" && (
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

  const createdDate = new Date(request.createdAt);
  const eventDate = new Date(request.eventStart);
  const previousName = [request.previousFirstName, request.previousLastName].filter(Boolean).join(" ");
  const newName = `${request.newFirstName} ${request.newLastName}`;

  return (
    <Card className="bg-card border-border" data-testid={`name-change-${request.id}`}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant={statusVariant()} className="text-xs flex items-center gap-1">
                <StatusIcon />
                {statusLabel()}
              </Badge>
            </div>
            <h3 className="font-semibold text-foreground truncate" data-testid="text-event-name">
              {request.eventName}
            </h3>
            <div className="flex flex-col gap-1 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{format(eventDate, "d MMM yyyy, HH:mm", { locale: it })}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>
                  {previousName ? (
                    <>
                      <span className="line-through text-muted-foreground">{previousName}</span>
                      <span className="mx-2">→</span>
                      <span className="text-foreground">{newName}</span>
                    </>
                  ) : (
                    <span className="text-foreground">{newName}</span>
                  )}
                </span>
              </div>
              {request.fee && parseFloat(request.fee) > 0 && (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>Commissione: €{parseFloat(request.fee).toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Richiesto: {format(createdDate, "d MMM yyyy, HH:mm", { locale: it })}</span>
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

  const { data: resalesData, isLoading: resalesLoading } = useQuery<ResalesResponse>({
    queryKey: ["/api/public/account/resales"],
  });

  const { data: nameChangesData, isLoading: nameChangesLoading } = useQuery<NameChangesResponse>({
    queryKey: ["/api/public/account/name-changes"],
  });

  const cancelResaleMutation = useMutation({
    mutationFn: async (id: string) => {
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
  const resales = resalesData?.resales || [];
  const nameChanges = nameChangesData?.nameChanges || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground" data-testid="text-page-title">Gestione Biglietti</h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">Rivendite e cambi nominativo</p>
      </div>

      <Tabs defaultValue="resales" className="space-y-4 sm:space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="resales"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-resales"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Rivendite ({resales.length})
          </TabsTrigger>
          <TabsTrigger
            value="name-changes"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            data-testid="tab-name-changes"
          >
            <User className="w-4 h-4 mr-2" />
            Cambi Nominativo ({nameChanges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resales" className="space-y-4">
          {resales.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Non hai biglietti in vendita</p>
                <p className="text-sm text-muted-foreground">
                  Puoi mettere in vendita un biglietto dalla sua pagina di dettaglio
                </p>
              </CardContent>
            </Card>
          ) : (
            resales.map((resale) => (
              <ResaleCard
                key={resale.id}
                resale={resale}
                onCancel={(id) => cancelResaleMutation.mutate(id)}
                isCancelling={cancelResaleMutation.isPending}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="name-changes" className="space-y-4">
          {nameChanges.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">Nessuna richiesta di cambio nominativo</p>
                <p className="text-sm text-muted-foreground">
                  Puoi richiedere un cambio nominativo dalla pagina di dettaglio del biglietto
                </p>
              </CardContent>
            </Card>
          ) : (
            nameChanges.map((request) => (
              <NameChangeCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
