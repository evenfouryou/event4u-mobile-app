import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { HapticButton, triggerHaptic } from "@/components/mobile-primitives";
import {
  RefreshCw,
  Calendar,
  Tag,
  XCircle,
  Loader2,
  Ticket,
  MapPin,
  ShoppingBag,
  ArrowRight,
  Eye,
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

interface ResalesResponse {
  resales: ResaleListing[];
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const listItemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.08,
    },
  }),
  exit: { 
    opacity: 0, 
    x: -100, 
    scale: 0.9,
    transition: springTransition 
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

function ResaleTicketCard({
  resale,
  onCancel,
  isCancelling,
  index,
}: {
  resale: ResaleListing;
  onCancel: (id: string) => void;
  isCancelling: boolean;
  index: number;
}) {
  const eventDate = new Date(resale.eventStart);
  const resalePrice = parseFloat(resale.resalePrice || "0");
  const originalPrice = parseFloat(resale.originalPrice || "0");

  const getStatusConfig = () => {
    switch (resale.status) {
      case "listed":
        return { label: "In Vendita", variant: "default" as const, color: "text-primary" };
      case "sold":
        return { label: "Venduto", variant: "secondary" as const, color: "text-green-500" };
      case "cancelled":
        return { label: "Annullato", variant: "destructive" as const, color: "text-destructive" };
      case "pending":
        return { label: "In Attesa", variant: "outline" as const, color: "text-yellow-500" };
      default:
        return { label: resale.status, variant: "outline" as const, color: "text-muted-foreground" };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <motion.div
      custom={index}
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layout
      className="relative"
      data-testid={`resale-${resale.id}`}
    >
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={springTransition}
        className="bg-card rounded-2xl border border-border overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                  className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"
                >
                  <Ticket className="w-6 h-6 text-primary" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <Badge variant={statusConfig.variant} className="text-sm px-3 py-1">
                    {statusConfig.label}
                  </Badge>
                </div>
              </div>

              <h3 
                className="text-xl font-bold text-foreground mb-3 line-clamp-2" 
                data-testid="text-event-name"
              >
                {resale.eventName}
              </h3>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-base text-muted-foreground">
                  <Calendar className="w-5 h-5 shrink-0" />
                  <span className="font-medium">
                    {format(eventDate, "EEEE d MMMM yyyy", { locale: it })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-base text-muted-foreground">
                  <MapPin className="w-5 h-5 shrink-0" />
                  <span>Settore: {resale.sectorName}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Tag className="w-5 h-5" />
                    <span className="text-base line-through">€{originalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      €{resalePrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {resale.status === "listed" && (
          <div className="px-5 pb-5">
            <HapticButton
              variant="destructive"
              className="w-full h-14 text-lg font-semibold rounded-xl"
              onClick={() => {
                triggerHaptic('medium');
                onCancel(resale.id);
              }}
              disabled={isCancelling}
              hapticType="medium"
              data-testid="button-cancel-resale"
            >
              {isCancelling ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-6 h-6 mr-2" />
                  Annulla Rivendita
                </>
              )}
            </HapticButton>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springTransition}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6"
      >
        <ShoppingBag className="w-12 h-12 text-muted-foreground" />
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold text-foreground mb-3 text-center"
      >
        Nessun biglietto in vendita
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-base text-muted-foreground text-center max-w-xs mb-8"
      >
        Metti in vendita i tuoi biglietti dalla pagina dettaglio del biglietto
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 text-primary"
      >
        <span className="text-base font-medium">Vai ai tuoi biglietti</span>
        <ArrowRight className="w-5 h-5" />
      </motion.div>
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className="w-12 h-12 text-primary" />
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-lg text-muted-foreground"
      >
        Caricamento...
      </motion.p>
    </div>
  );
}

export default function AccountResales() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedResale, setSelectedResale] = useState<ResaleListing | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const { data: resalesData, isLoading } = useQuery<ResalesResponse>({
    queryKey: ["/api/public/account/resales"],
  });

  const cancelResaleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/public/account/resale/${id}`);
    },
    onSuccess: () => {
      triggerHaptic('success');
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/resales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/account/tickets"] });
      setIsCancelDialogOpen(false);
      setIsDetailDialogOpen(false);
      toast({
        title: "Rivendita annullata",
        description: "Il biglietto è stato rimosso dalla vendita.",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: error.message || "Impossibile annullare la rivendita.",
        variant: "destructive",
      });
    },
  });

  const resales = resalesData?.resales || [];
  const activeResales = resales.filter(r => r.status === "listed");
  const completedResales = resales.filter(r => r.status !== "listed");

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "listed":
        return { label: "In Vendita", variant: "default" as const };
      case "sold":
        return { label: "Venduto", variant: "secondary" as const };
      case "cancelled":
        return { label: "Annullato", variant: "destructive" as const };
      case "pending":
        return { label: "In Attesa", variant: "outline" as const };
      default:
        return { label: status, variant: "outline" as const };
    }
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-account-resales">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Rivendita Biglietti</h1>
            <p className="text-muted-foreground">
              Gestisci i tuoi biglietti in vendita
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{resales.length}</div>
              <p className="text-sm text-muted-foreground">Totale</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-primary">{activeResales.length}</div>
              <p className="text-sm text-muted-foreground">In Vendita</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">
                {resales.filter(r => r.status === "sold").length}
              </div>
              <p className="text-sm text-muted-foreground">Venduti</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {resales.filter(r => r.status === "cancelled").length}
              </div>
              <p className="text-sm text-muted-foreground">Annullati</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Elenco Rivendite</CardTitle>
            <CardDescription>
              I tuoi biglietti in vendita e lo storico delle rivendite
            </CardDescription>
          </CardHeader>
          <CardContent>
            {resales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nessun biglietto in vendita</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Metti in vendita i tuoi biglietti dalla pagina dettaglio del biglietto
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data Evento</TableHead>
                    <TableHead>Settore</TableHead>
                    <TableHead>Prezzo Originale</TableHead>
                    <TableHead>Prezzo Rivendita</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resales.map((resale) => {
                    const statusConfig = getStatusConfig(resale.status);
                    const eventDate = new Date(resale.eventStart);
                    return (
                      <TableRow key={resale.id} data-testid={`row-resale-${resale.id}`}>
                        <TableCell className="font-medium">{resale.eventName}</TableCell>
                        <TableCell>
                          {format(eventDate, "d MMM yyyy", { locale: it })}
                        </TableCell>
                        <TableCell>{resale.sectorName}</TableCell>
                        <TableCell>€{parseFloat(resale.originalPrice || "0").toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          €{parseFloat(resale.resalePrice || "0").toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
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
                            {resale.status === "listed" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedResale(resale);
                                  setIsCancelDialogOpen(true);
                                }}
                                data-testid={`button-cancel-${resale.id}`}
                              >
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
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

        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dettaglio Rivendita</DialogTitle>
              <DialogDescription>
                Informazioni sulla rivendita del biglietto
              </DialogDescription>
            </DialogHeader>
            {selectedResale && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Evento</p>
                    <p className="font-medium">{selectedResale.eventName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Evento</p>
                    <p className="font-medium">
                      {format(new Date(selectedResale.eventStart), "d MMMM yyyy", { locale: it })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Settore</p>
                    <p className="font-medium">{selectedResale.sectorName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stato</p>
                    <Badge variant={getStatusConfig(selectedResale.status).variant}>
                      {getStatusConfig(selectedResale.status).label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prezzo Originale</p>
                    <p className="font-medium">€{parseFloat(selectedResale.originalPrice || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prezzo Rivendita</p>
                    <p className="font-medium text-primary">€{parseFloat(selectedResale.resalePrice || "0").toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Inserimento</p>
                    <p className="font-medium">
                      {format(new Date(selectedResale.listedAt), "d MMM yyyy HH:mm", { locale: it })}
                    </p>
                  </div>
                  {selectedResale.soldAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data Vendita</p>
                      <p className="font-medium">
                        {format(new Date(selectedResale.soldAt), "d MMM yyyy HH:mm", { locale: it })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              {selectedResale?.status === "listed" && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsDetailDialogOpen(false);
                    setIsCancelDialogOpen(true);
                  }}
                  data-testid="button-cancel-from-detail"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Annulla Rivendita
                </Button>
              )}
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
                Chiudi
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Conferma Annullamento</DialogTitle>
              <DialogDescription>
                Sei sicuro di voler annullare la rivendita di questo biglietto?
              </DialogDescription>
            </DialogHeader>
            {selectedResale && (
              <div className="py-4">
                <p className="font-medium">{selectedResale.eventName}</p>
                <p className="text-sm text-muted-foreground">
                  Prezzo: €{parseFloat(selectedResale.resalePrice || "0").toFixed(2)}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Annulla
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedResale && cancelResaleMutation.mutate(selectedResale.id)}
                disabled={cancelResaleMutation.isPending}
                data-testid="button-confirm-cancel"
              >
                {cancelResaleMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Conferma Annullamento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ 
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      <div className="px-4 pt-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springTransition}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...springTransition, delay: 0.1 }}
              className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center"
            >
              <RefreshCw className="w-7 h-7 text-primary" />
            </motion.div>
            <div>
              <h1 
                className="text-2xl font-bold text-foreground"
                data-testid="text-page-title"
              >
                Rivendita Biglietti
              </h1>
              <p className="text-base text-muted-foreground">
                {resales.length} {resales.length === 1 ? 'biglietto' : 'biglietti'}
              </p>
            </div>
          </div>
        </motion.div>

        {resales.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            {activeResales.length > 0 && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={springTransition}
                  className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  In vendita ({activeResales.length})
                </motion.h2>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  <AnimatePresence mode="popLayout">
                    {activeResales.map((resale, index) => (
                      <ResaleTicketCard
                        key={resale.id}
                        resale={resale}
                        onCancel={(id) => cancelResaleMutation.mutate(id)}
                        isCancelling={cancelResaleMutation.isPending}
                        index={index}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </motion.section>
            )}

            {completedResales.length > 0 && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.h2
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={springTransition}
                  className="text-lg font-semibold text-muted-foreground mb-4"
                >
                  Storico ({completedResales.length})
                </motion.h2>
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-4"
                >
                  {completedResales.map((resale, index) => (
                    <ResaleTicketCard
                      key={resale.id}
                      resale={resale}
                      onCancel={(id) => cancelResaleMutation.mutate(id)}
                      isCancelling={cancelResaleMutation.isPending}
                      index={index}
                    />
                  ))}
                </motion.div>
              </motion.section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
