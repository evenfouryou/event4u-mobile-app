import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  Ticket,
  Download,
  Mail,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ChevronRight,
  QrCode,
  Copy,
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface TicketData {
  id: string;
  fiscalSealCode: string;
  ticketTypeCode: string;
  sectorCode: string;
  grossAmount: string;
  status: string;
  qrCode: string;
  participantFirstName: string;
  participantLastName: string;
  emissionDateStr: string;
  eventName: string;
  eventStart: Date;
  locationName: string;
  sectorName: string;
}

function TicketCard({ ticket }: { ticket: TicketData }) {
  const { toast } = useToast();

  const copyCode = () => {
    navigator.clipboard.writeText(ticket.fiscalSealCode);
    toast({
      title: "Copiato!",
      description: "Codice biglietto copiato negli appunti.",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="bg-card border-border overflow-hidden" data-testid={`card-ticket-${ticket.id}`}>
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10" />
          <CardContent className="relative p-4 sm:p-6">
            <div className="flex gap-3 sm:gap-4">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-xl bg-white flex items-center justify-center shrink-0">
                <QrCode className="w-8 h-8 sm:w-12 sm:h-12 text-black" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-foreground text-sm sm:text-lg truncate" data-testid={`text-event-${ticket.id}`}>
                  {ticket.eventName}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {ticket.sectorName} - {ticket.ticketTypeCode === "INT" ? "Intero" : "Ridotto"}
                </p>
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(ticket.eventStart), "d MMMM yyyy", { locale: it })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {format(new Date(ticket.eventStart), "HH:mm")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {ticket.locationName}
                  </span>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xl font-bold text-primary" data-testid={`text-price-${ticket.id}`}>
                  €{Number(ticket.grossAmount).toFixed(2)}
                </p>
                <Badge
                  className={
                    ticket.status === "valid"
                      ? "mt-2 bg-teal-500/20 text-teal-400 border-teal-500/30"
                      : "mt-2 bg-red-500/20 text-red-400 border-red-500/30"
                  }
                  data-testid={`badge-status-${ticket.id}`}
                >
                  {ticket.status === "valid" ? "Valido" : ticket.status}
                </Badge>
              </div>
            </div>

            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
              <div className="flex sm:hidden items-center justify-between mb-2">
                <p className="text-base font-bold text-primary" data-testid={`text-price-mobile-${ticket.id}`}>
                  €{Number(ticket.grossAmount).toFixed(2)}
                </p>
                <Badge
                  className={
                    ticket.status === "valid"
                      ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }
                >
                  {ticket.status === "valid" ? "Valido" : ticket.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Intestatario</p>
                  <p className="text-xs sm:text-sm text-foreground" data-testid={`text-participant-${ticket.id}`}>
                    {ticket.participantFirstName} {ticket.participantLastName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground hidden sm:block">Codice Biglietto</p>
                    <p className="text-xs sm:text-sm font-mono text-foreground" data-testid={`text-code-${ticket.id}`}>
                      {ticket.fiscalSealCode.slice(0, 8)}...
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyCode}
                    className="text-muted-foreground hover:text-primary h-10 w-10"
                    data-testid={`button-copy-${ticket.id}`}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </motion.div>
  );
}

export default function PublicCheckoutSuccessPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const transactionCode = params.get("transaction");

  const { data: tickets, isLoading } = useQuery<TicketData[]>({
    queryKey: ["/api/public/tickets"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">Event4U</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-6 sm:mb-12"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 rounded-full bg-teal-500/20 flex items-center justify-center">
            <Check className="w-8 h-8 sm:w-10 sm:h-10 text-teal-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4" data-testid="text-success-title">
            Acquisto Completato!
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            I tuoi biglietti sono stati generati con successo.
            Li riceverai anche via email con il QR code per l'ingresso.
          </p>
          {transactionCode && (
            <Badge className="mt-4 bg-primary/20 text-primary border-primary/30 text-sm py-1 px-3">
              Transazione: {transactionCode}
            </Badge>
          )}
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-card border-border p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Email Inviata</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">I biglietti sono stati inviati alla tua email</p>
            </div>
          </Card>
          <Card className="bg-card border-border p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-foreground text-sm sm:text-base">Scarica PDF</h3>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Puoi scaricare i biglietti in formato PDF</p>
            </div>
          </Card>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4 flex items-center gap-2">
          <Ticket className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          I Tuoi Biglietti
        </h2>

        {isLoading ? (
          <div className="space-y-3 sm:space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-32 sm:h-40" />
            ))}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-3 sm:space-y-4" data-testid="list-tickets">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center bg-muted/50 border-border">
            <Ticket className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nessun biglietto trovato.</p>
          </Card>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/acquista">
            <Button
              variant="outline"
              data-testid="button-more-events"
            >
              Scopri Altri Eventi
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/i-miei-biglietti">
            <Button
              data-testid="button-my-tickets"
            >
              <Ticket className="w-4 h-4 mr-2" />
              I Miei Biglietti
            </Button>
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Hai bisogno di assistenza?{" "}
            <a href="#" className="text-primary hover:underline">
              Contattaci
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
