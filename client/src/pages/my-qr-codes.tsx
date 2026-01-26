import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, QrCode, Calendar, Users, Table2, MapPin, ChevronRight, Check, Clock, X } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

interface TableReservation {
  id: string;
  eventName: string;
  eventDate: string;
  tableName: string;
  venueName: string;
  approvalStatus: 'pending_approval' | 'approved' | 'rejected';
  qrCode: string | null;
  participantId: string;
  isBooker: boolean;
  firstName: string;
  lastName: string;
}

interface GuestListEntry {
  id: string;
  eventName: string;
  eventDate: string;
  listName: string;
  venueName: string;
  qrCode: string | null;
  status: 'pending' | 'confirmed' | 'checked_in' | 'cancelled';
  firstName: string;
  lastName: string;
}

export default function MyQrCodes() {
  const [selectedQr, setSelectedQr] = useState<string | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrTitle, setQrTitle] = useState("");

  const { data: tableReservations, isLoading: loadingTables } = useQuery<TableReservation[]>({
    queryKey: ['/api/my/table-reservations'],
  });

  const { data: guestListEntries, isLoading: loadingLists } = useQuery<GuestListEntry[]>({
    queryKey: ['/api/my/guest-list-entries'],
  });

  const showQrCode = (qrCode: string, title: string) => {
    setSelectedQr(qrCode);
    setQrTitle(title);
    setQrDialogOpen(true);
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" /> Approvato</Badge>;
      case 'pending_approval':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> In Attesa</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Rifiutato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getEntryStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600"><Check className="w-3 h-3 mr-1" /> Confermato</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> In Attesa</Badge>;
      case 'checked_in':
        return <Badge className="bg-blue-600"><Check className="w-3 h-3 mr-1" /> Entrato</Badge>;
      case 'cancelled':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" /> Annullato</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isLoading = loadingTables || loadingLists;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">I Miei QR Code</h1>
          <p className="text-muted-foreground mt-1">
            Visualizza i tuoi QR code per accedere agli eventi
          </p>
        </div>

        <Tabs defaultValue="tables" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tables" data-testid="tab-tables">
              <Table2 className="w-4 h-4 mr-2" />
              Tavoli
              {tableReservations && tableReservations.length > 0 && (
                <Badge variant="secondary" className="ml-2">{tableReservations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lists" data-testid="tab-lists">
              <Users className="w-4 h-4 mr-2" />
              Liste
              {guestListEntries && guestListEntries.length > 0 && (
                <Badge variant="secondary" className="ml-2">{guestListEntries.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !tableReservations || tableReservations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Table2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Nessuna prenotazione tavolo</h3>
                  <p className="text-muted-foreground mt-2">
                    Non hai prenotazioni tavolo attive al momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              tableReservations.map((reservation) => (
                <Card key={reservation.participantId} className="hover-elevate cursor-pointer"
                      onClick={() => reservation.qrCode && showQrCode(reservation.qrCode, `${reservation.eventName} - ${reservation.tableName}`)}
                      data-testid={`card-table-reservation-${reservation.participantId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold truncate">{reservation.eventName}</h3>
                          {getApprovalBadge(reservation.approvalStatus)}
                          {reservation.isBooker && (
                            <Badge variant="outline">Prenotante</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(reservation.eventDate), "EEEE d MMMM yyyy", { locale: it })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Table2 className="w-4 h-4" />
                            <span>Tavolo: {reservation.tableName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{reservation.venueName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {reservation.qrCode && reservation.approvalStatus === 'approved' ? (
                          <div className="bg-white p-2 rounded-lg">
                            <QRCodeSVG value={reservation.qrCode} size={80} />
                          </div>
                        ) : reservation.approvalStatus === 'pending_approval' ? (
                          <div className="flex items-center justify-center w-20 h-20 bg-muted rounded-lg">
                            <Clock className="w-8 h-8 text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-20 h-20 bg-destructive/10 rounded-lg">
                            <X className="w-8 h-8 text-destructive" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="lists" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : !guestListEntries || guestListEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Nessuna iscrizione a liste</h3>
                  <p className="text-muted-foreground mt-2">
                    Non sei iscritto a nessuna lista invitati al momento.
                  </p>
                </CardContent>
              </Card>
            ) : (
              guestListEntries.map((entry) => (
                <Card key={entry.id} className="hover-elevate cursor-pointer"
                      onClick={() => entry.qrCode && showQrCode(entry.qrCode, `${entry.eventName} - ${entry.listName}`)}
                      data-testid={`card-guest-list-entry-${entry.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-semibold truncate">{entry.eventName}</h3>
                          {getEntryStatusBadge(entry.status)}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(entry.eventDate), "EEEE d MMMM yyyy", { locale: it })}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Lista: {entry.listName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{entry.venueName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {entry.qrCode && entry.status !== 'cancelled' ? (
                          <div className="bg-white p-2 rounded-lg">
                            <QRCodeSVG value={entry.qrCode} size={80} />
                          </div>
                        ) : entry.status === 'cancelled' ? (
                          <div className="flex items-center justify-center w-20 h-20 bg-destructive/10 rounded-lg">
                            <X className="w-8 h-8 text-destructive" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-20 h-20 bg-muted rounded-lg">
                            <QrCode className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">{qrTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-6">
            {selectedQr && (
              <div className="bg-white p-4 rounded-xl">
                <QRCodeSVG value={selectedQr} size={240} />
              </div>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Mostra questo QR code all'ingresso dell'evento
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
