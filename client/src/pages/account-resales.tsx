import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

  if (isLoading) {
    return <LoadingState />;
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
