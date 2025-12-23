import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  XCircle,
  RefreshCw,
  CreditCard,
  Mail,
  Clock,
  Loader2,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { 
  User, 
  Company, 
  Event,
  SiaeTicketedEvent, 
  SiaeEventSector, 
  SiaeTicket,
  SiaeActivationCard,
  SiaeFiscalSeal,
} from "@shared/schema";

interface UserCompanyAssociation {
  id: string;
  userId: string;
  companyId: string;
  role: string | null;
  isDefault: boolean;
  createdAt: string | null;
  companyName: string;
  companyVatNumber?: string;
}

interface TicketedEventWithEvent extends SiaeTicketedEvent {
  event?: Event;
  eventName?: string;
  eventDate?: string;
}

type NavigationLevel = "gestori" | "events" | "sectors" | "tickets";

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.06,
    },
  }),
};

export default function SiaeTicketingConsole() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>("gestori");
  const [selectedGestore, setSelectedGestore] = useState<User | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TicketedEventWithEvent | null>(null);
  const [selectedSector, setSelectedSector] = useState<SiaeEventSector | null>(null);
  
  const [gestoreSearch, setGestoreSearch] = useState("");
  const [eventStatusFilter, setEventStatusFilter] = useState<string>("all");
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>("all");
  
  const [cancelTicketId, setCancelTicketId] = useState<string | null>(null);
  const [refundTicketId, setRefundTicketId] = useState<string | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: gestoreCompanies } = useQuery<UserCompanyAssociation[]>({
    queryKey: ["/api/users", selectedGestore?.id, "companies"],
    enabled: !!selectedGestore,
  });

  const { data: allTicketedEvents } = useQuery<TicketedEventWithEvent[]>({
    queryKey: ["/api/siae/admin/ticketed-events"],
    enabled: currentLevel === "events" && !!selectedGestore,
  });

  const { data: allEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: currentLevel === "events" && !!selectedGestore,
  });

  const { data: sectors, isLoading: sectorsLoading } = useQuery<SiaeEventSector[]>({
    queryKey: ["/api/siae/ticketed-events", selectedEvent?.id, "sectors"],
    enabled: currentLevel === "sectors" && !!selectedEvent,
  });

  const { data: tickets, isLoading: ticketsLoading } = useQuery<SiaeTicket[]>({
    queryKey: ["/api/siae/ticketed-events", selectedEvent?.id, "tickets"],
    enabled: currentLevel === "tickets" && !!selectedEvent,
  });

  const { data: activationCards } = useQuery<SiaeActivationCard[]>({
    queryKey: ["/api/siae/activation-cards"],
    enabled: currentLevel === "tickets",
  });

  const gestori = useMemo(() => {
    const all = users?.filter((u) => u.role === "gestore") || [];
    if (!gestoreSearch.trim()) return all;
    const search = gestoreSearch.toLowerCase();
    return all.filter(
      (g) =>
        g.firstName?.toLowerCase().includes(search) ||
        g.lastName?.toLowerCase().includes(search) ||
        g.email?.toLowerCase().includes(search)
    );
  }, [users, gestoreSearch]);

  const gestoreCompanyIds = useMemo(() => {
    if (!selectedGestore || !gestoreCompanies) return [];
    const companyIds = gestoreCompanies.map((gc) => gc.companyId);
    if (selectedGestore.companyId && !companyIds.includes(selectedGestore.companyId)) {
      companyIds.push(selectedGestore.companyId);
    }
    return companyIds;
  }, [selectedGestore, gestoreCompanies]);

  const gestoreEvents = useMemo(() => {
    if (!allTicketedEvents || gestoreCompanyIds.length === 0) return [];
    let events = allTicketedEvents.filter((te) => gestoreCompanyIds.includes(te.companyId));
    
    if (allEvents) {
      events = events.map((te) => {
        const baseEvent = allEvents.find((e) => e.id === te.eventId);
        return {
          ...te,
          event: baseEvent,
          eventName: baseEvent?.name || "Evento sconosciuto",
          eventDate: baseEvent?.startDatetime ? format(new Date(baseEvent.startDatetime), "d MMM yyyy, HH:mm", { locale: it }) : "",
        };
      });
    }
    
    if (eventStatusFilter !== "all") {
      events = events.filter((e) => e.ticketingStatus === eventStatusFilter);
    }
    
    return events;
  }, [allTicketedEvents, allEvents, gestoreCompanyIds, eventStatusFilter]);

  const filteredTickets = useMemo(() => {
    if (!tickets || !selectedSector) return [];
    let filtered = tickets.filter((t) => t.sectorId === selectedSector.id);
    if (ticketStatusFilter !== "all") {
      filtered = filtered.filter((t) => t.status === ticketStatusFilter);
    }
    return filtered.sort((a, b) => b.progressiveNumber - a.progressiveNumber);
  }, [tickets, selectedSector, ticketStatusFilter]);

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "Nessuna azienda";
    const company = companies?.find((c) => c.id === companyId);
    return company?.name || "Azienda sconosciuta";
  };

  const getCardName = (cardCode: string | null) => {
    if (!cardCode) return "-";
    const card = activationCards?.find((c) => c.cardCode === cardCode);
    return card ? `${card.cardCode.substring(0, 8)}...` : cardCode;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "valid":
        return <Badge className="bg-green-500/20 text-green-600">Valido</Badge>;
      case "used":
        return <Badge className="bg-blue-500/20 text-blue-600">Usato</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Annullato</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEventStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-600">Attivo</Badge>;
      case "draft":
        return <Badge variant="secondary">Bozza</Badge>;
      case "suspended":
        return <Badge className="bg-amber-500/20 text-amber-600">Sospeso</Badge>;
      case "closed":
        return <Badge variant="outline">Chiuso</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const cancelTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      await apiRequest("POST", `/api/siae/tickets/${ticketId}/cancel`, {
        cancellationReasonCode: "ANN",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", selectedEvent?.id, "tickets"] });
      setCancelTicketId(null);
      triggerHaptic("success");
      toast({
        title: "Biglietto annullato",
        description: "Il biglietto è stato annullato con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: error.message || "Impossibile annullare il biglietto",
        variant: "destructive",
      });
    },
  });

  const refundTicketMutation = useMutation({
    mutationFn: async (ticketId: string) => {
      await apiRequest("POST", `/api/siae/tickets/${ticketId}/refund`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/siae/ticketed-events", selectedEvent?.id, "tickets"] });
      setRefundTicketId(null);
      triggerHaptic("success");
      toast({
        title: "Rimborso effettuato",
        description: "Il biglietto è stato rimborsato con successo",
      });
    },
    onError: (error: any) => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: error.message || "Impossibile effettuare il rimborso",
        variant: "destructive",
      });
    },
  });

  const handleSelectGestore = (gestore: User) => {
    triggerHaptic("medium");
    setSelectedGestore(gestore);
    setCurrentLevel("events");
  };

  const handleSelectEvent = (event: TicketedEventWithEvent) => {
    triggerHaptic("medium");
    setSelectedEvent(event);
    setCurrentLevel("sectors");
  };

  const handleSelectSector = (sector: SiaeEventSector) => {
    triggerHaptic("medium");
    setSelectedSector(sector);
    setCurrentLevel("tickets");
  };

  const handleBack = () => {
    triggerHaptic("light");
    if (currentLevel === "tickets") {
      setSelectedSector(null);
      setCurrentLevel("sectors");
    } else if (currentLevel === "sectors") {
      setSelectedEvent(null);
      setCurrentLevel("events");
    } else if (currentLevel === "events") {
      setSelectedGestore(null);
      setCurrentLevel("gestori");
    }
  };

  const handleBreadcrumbClick = (level: NavigationLevel) => {
    triggerHaptic("light");
    if (level === "gestori") {
      setSelectedGestore(null);
      setSelectedEvent(null);
      setSelectedSector(null);
    } else if (level === "events") {
      setSelectedEvent(null);
      setSelectedSector(null);
    } else if (level === "sectors") {
      setSelectedSector(null);
    }
    setCurrentLevel(level);
  };

  const handleExportExcel = async () => {
    triggerHaptic("medium");
    if (!filteredTickets || filteredTickets.length === 0) {
      toast({
        title: "Nessun dato",
        description: "Non ci sono biglietti da esportare",
        variant: "destructive",
      });
      return;
    }

    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Event Four You";
      wb.created = new Date();

      const ws = wb.addWorksheet("Biglietti SIAE");

      ws.addRow(["Console Biglietteria SIAE - Export Biglietti"]);
      ws.mergeCells("A1:I1");
      ws.getCell("A1").font = { bold: true, size: 16 };
      ws.getCell("A1").alignment = { horizontal: "center" };
      ws.addRow([]);

      if (selectedGestore) {
        ws.addRow(["Gestore:", `${selectedGestore.firstName} ${selectedGestore.lastName}`]);
      }
      if (selectedEvent) {
        ws.addRow(["Evento:", selectedEvent.eventName]);
        if (selectedEvent.eventDate) {
          ws.addRow(["Data Evento:", format(new Date(selectedEvent.eventDate), "dd/MM/yyyy", { locale: it })]);
        }
      }
      if (selectedSector) {
        ws.addRow(["Settore:", selectedSector.name]);
      }
      ws.addRow(["Data Export:", format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })]);
      ws.addRow(["Totale Biglietti:", filteredTickets.length.toString()]);
      ws.addRow([]);

      const headerRow = ws.addRow([
        "Sistema Emissione",
        "Progressivo",
        "Carta Attivazione",
        "Sigillo Fiscale",
        "Codice Ordine",
        "Tipo",
        "Data Emissione",
        "Stato",
        "Prezzo"
      ]);
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF000000" } },
        };
      });

      filteredTickets.forEach((ticket) => {
        const statusText = ticket.status === "valid" ? "Valido" : ticket.status === "used" ? "Usato" : "Annullato";
        ws.addRow([
          ticket.emissionChannelCode || (ticket.cardCode ? "Automatico" : "Manuale"),
          ticket.progressiveNumber,
          getCardName(ticket.cardCode),
          ticket.fiscalSealCode || "-",
          ticket.transactionId ? ticket.transactionId.substring(0, 8) : "-",
          ticket.ticketTypeCode,
          ticket.emissionDate ? format(new Date(ticket.emissionDate), "dd/MM/yyyy HH:mm") : "-",
          statusText,
          ticket.price ? `€${Number(ticket.price).toFixed(2)}` : "-"
        ]);
      });

      ws.columns.forEach((col, index) => {
        col.width = index === 0 ? 18 : index === 2 || index === 3 ? 20 : 15;
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `biglietti_siae_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Esportazione completata",
        description: `${filteredTickets.length} biglietti esportati in Excel`,
      });
    } catch (error) {
      console.error("Excel export error:", error);
      toast({
        title: "Errore esportazione",
        description: "Si è verificato un errore durante l'esportazione",
        variant: "destructive",
      });
    }
  };

  const handleExportPdf = () => {
    triggerHaptic("medium");
    if (!filteredTickets || filteredTickets.length === 0) {
      toast({
        title: "Nessun dato",
        description: "Non ci sono biglietti da esportare",
        variant: "destructive",
      });
      return;
    }

    try {
      const pdf = new jsPDF({ orientation: "landscape" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 14;
      let yPos = margin;

      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Console Biglietteria SIAE", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      
      if (selectedGestore) {
        pdf.text(`Gestore: ${selectedGestore.firstName} ${selectedGestore.lastName}`, margin, yPos);
        yPos += 6;
      }
      if (selectedEvent) {
        pdf.text(`Evento: ${selectedEvent.eventName}`, margin, yPos);
        yPos += 6;
        if (selectedEvent.eventDate) {
          pdf.text(`Data Evento: ${format(new Date(selectedEvent.eventDate), "dd/MM/yyyy", { locale: it })}`, margin, yPos);
          yPos += 6;
        }
      }
      if (selectedSector) {
        pdf.text(`Settore: ${selectedSector.name}`, margin, yPos);
        yPos += 6;
      }
      pdf.text(`Data Export: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: it })}`, margin, yPos);
      yPos += 6;
      pdf.text(`Totale Biglietti: ${filteredTickets.length}`, margin, yPos);
      yPos += 10;

      const headers = ["Sistema", "Progr.", "Carta", "Sigillo", "Ordine", "Tipo", "Data", "Stato", "Prezzo"];
      const colWidths = [28, 18, 35, 35, 25, 18, 40, 22, 20];
      
      pdf.setFillColor(68, 114, 196);
      pdf.rect(margin, yPos, pageWidth - margin * 2, 8, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      
      let xPos = margin + 2;
      headers.forEach((header, i) => {
        pdf.text(header, xPos, yPos + 5.5);
        xPos += colWidths[i];
      });
      yPos += 10;

      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);

      filteredTickets.forEach((ticket, index) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = margin;
        }

        if (index % 2 === 0) {
          pdf.setFillColor(245, 245, 245);
          pdf.rect(margin, yPos - 4, pageWidth - margin * 2, 7, "F");
        }

        const statusText = ticket.status === "valid" ? "Valido" : ticket.status === "used" ? "Usato" : "Annullato";
        const row = [
          (ticket.emissionChannelCode || (ticket.cardCode ? "Auto" : "Man")).substring(0, 8),
          String(ticket.progressiveNumber),
          getCardName(ticket.cardCode).substring(0, 12),
          (ticket.fiscalSealCode || "-").substring(0, 12),
          ticket.transactionId ? ticket.transactionId.substring(0, 8) : "-",
          ticket.ticketTypeCode,
          ticket.emissionDate ? format(new Date(ticket.emissionDate), "dd/MM/yy HH:mm") : "-",
          statusText,
          ticket.price ? `€${Number(ticket.price).toFixed(2)}` : "-"
        ];

        xPos = margin + 2;
        row.forEach((cell, i) => {
          pdf.text(cell, xPos, yPos);
          xPos += colWidths[i];
        });
        yPos += 7;
      });

      yPos += 10;
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(`Generato da Event Four You - ${format(new Date(), "dd/MM/yyyy HH:mm")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

      pdf.save(`biglietti_siae_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);

      toast({
        title: "Esportazione completata",
        description: `${filteredTickets.length} biglietti esportati in PDF`,
      });
    } catch (error) {
      console.error("PDF export error:", error);
      toast({
        title: "Errore esportazione",
        description: "Si è verificato un errore durante l'esportazione",
        variant: "destructive",
      });
    }
  };

  const ticketCountBySector = useMemo(() => {
    if (!tickets || !sectors) return {};
    const counts: Record<string, number> = {};
    sectors.forEach((s) => {
      counts[s.id] = tickets.filter((t) => t.sectorId === s.id).length;
    });
    return counts;
  }, [tickets, sectors]);

  const renderBreadcrumb = () => (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          {currentLevel === "gestori" ? (
            <BreadcrumbPage data-testid="breadcrumb-gestori">Gestori</BreadcrumbPage>
          ) : (
            <BreadcrumbLink 
              className="cursor-pointer" 
              onClick={() => handleBreadcrumbClick("gestori")}
              data-testid="breadcrumb-gestori-link"
            >
              Gestori
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {(currentLevel === "events" || currentLevel === "sectors" || currentLevel === "tickets") && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {currentLevel === "events" ? (
                <BreadcrumbPage data-testid="breadcrumb-events">
                  {selectedGestore?.firstName} {selectedGestore?.lastName}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  className="cursor-pointer" 
                  onClick={() => handleBreadcrumbClick("events")}
                  data-testid="breadcrumb-events-link"
                >
                  {selectedGestore?.firstName} {selectedGestore?.lastName}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {(currentLevel === "sectors" || currentLevel === "tickets") && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {currentLevel === "sectors" ? (
                <BreadcrumbPage data-testid="breadcrumb-sectors">
                  {selectedEvent?.eventName}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  className="cursor-pointer" 
                  onClick={() => handleBreadcrumbClick("sectors")}
                  data-testid="breadcrumb-sectors-link"
                >
                  {selectedEvent?.eventName}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </>
        )}
        {currentLevel === "tickets" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="breadcrumb-tickets">
                {selectedSector?.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );

  const renderGestoriLevel = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca gestore..."
            value={gestoreSearch}
            onChange={(e) => setGestoreSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-gestore"
          />
        </div>
      </div>

      {usersLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : gestori.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mb-4" />
            <p>Nessun gestore trovato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gestori.map((gestore, index) => {
            const initials = `${gestore.firstName?.[0] || ""}${gestore.lastName?.[0] || ""}`.toUpperCase();
            return (
              <motion.div
                key={gestore.id}
                custom={index}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
              >
                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSelectGestore(gestore)}
                  data-testid={`card-gestore-${gestore.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {initials || "G"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate" data-testid={`text-gestore-name-${gestore.id}`}>
                          {gestore.firstName} {gestore.lastName}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate" data-testid={`text-gestore-email-${gestore.id}`}>
                            {gestore.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate" data-testid={`text-gestore-company-${gestore.id}`}>
                            {getCompanyName(gestore.companyId)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderEventsLevel = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back-events">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>
        <div className="flex-1" />
        <Select value={eventStatusFilter} onValueChange={setEventStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-event-status">
            <SelectValue placeholder="Stato evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti gli stati</SelectItem>
            <SelectItem value="active">Attivo</SelectItem>
            <SelectItem value="draft">Bozza</SelectItem>
            <SelectItem value="suspended">Sospeso</SelectItem>
            <SelectItem value="closed">Chiuso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!allTicketedEvents ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : gestoreEvents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mb-4" />
            <p>Nessun evento biglietteria trovato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {gestoreEvents.map((event, index) => (
            <motion.div
              key={event.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => handleSelectEvent(event)}
                data-testid={`card-event-${event.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold line-clamp-2" data-testid={`text-event-name-${event.id}`}>
                      {event.eventName}
                    </h3>
                    {getEventStatusBadge(event.ticketingStatus)}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                    <Clock className="h-3 w-3" />
                    <span data-testid={`text-event-date-${event.id}`}>{event.eventDate}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <Building2 className="h-3 w-3" />
                    <span>{getCompanyName(event.companyId)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Biglietti venduti:</span>
                    <span className="font-medium" data-testid={`text-event-sold-${event.id}`}>
                      {event.ticketsSold} / {event.totalCapacity}
                    </span>
                  </div>
                  <div className="flex items-center justify-end mt-2">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderSectorsLevel = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back-sectors">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>
      </div>

      {sectorsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : !sectors || sectors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Ticket className="h-12 w-12 mb-4" />
            <p>Nessun settore/tipologia trovato</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sectors.map((sector, index) => (
            <motion.div
              key={sector.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card
                className="hover-elevate cursor-pointer"
                onClick={() => handleSelectSector(sector)}
                data-testid={`card-sector-${sector.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold" data-testid={`text-sector-name-${sector.id}`}>
                      {sector.name}
                    </h3>
                    <Badge variant="secondary">{sector.sectorCode}</Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Capienza:</span>
                      <span>{sector.capacity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Disponibili:</span>
                      <span>{sector.availableSeats}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Biglietti emessi:</span>
                      <span className="font-medium" data-testid={`text-sector-tickets-${sector.id}`}>
                        {ticketCountBySector[sector.id] || sector.ticketsSold || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prezzo intero:</span>
                      <span>€{Number(sector.priceIntero).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-end mt-3">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTicketsLevel = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-wrap">
        <Button variant="ghost" size="sm" onClick={handleBack} data-testid="button-back-tickets">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-2">
          <Select value={ticketStatusFilter} onValueChange={setTicketStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-ticket-status">
              <SelectValue placeholder="Stato biglietto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutti gli stati</SelectItem>
              <SelectItem value="valid">Valido</SelectItem>
              <SelectItem value="used">Usato</SelectItem>
              <SelectItem value="cancelled">Annullato</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-export-excel">
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPdf} data-testid="button-export-pdf">
            <FileText className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      {ticketsLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Ticket className="h-12 w-12 mb-4" />
            <p>Nessun biglietto trovato per questo settore</p>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredTickets.map((ticket, index) => (
            <motion.div
              key={ticket.id}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
            >
              <Card data-testid={`card-ticket-${ticket.id}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-semibold" data-testid={`text-ticket-progressive-${ticket.id}`}>
                      #{ticket.progressiveNumber}
                    </span>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="ml-1">{ticket.ticketTypeCode}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Emissione:</span>
                      <span className="ml-1">
                        {ticket.emissionDate ? format(new Date(ticket.emissionDate), "dd/MM/yy HH:mm") : "-"}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Carta:</span>
                      <span className="ml-1 font-mono text-xs">{getCardName(ticket.cardCode)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sigillo:</span>
                      <span className="ml-1 font-mono text-xs">{ticket.fiscalSealCode || "-"}</span>
                    </div>
                  </div>
                  {ticket.status === "valid" && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setCancelTicketId(ticket.id)}
                        data-testid={`button-cancel-${ticket.id}`}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Annulla
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setRefundTicketId(ticket.id)}
                        data-testid={`button-refund-${ticket.id}`}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Rimborsa
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema emissione</TableHead>
                  <TableHead>Progressivo</TableHead>
                  <TableHead>Carta attivazione</TableHead>
                  <TableHead>Sigillo fiscale</TableHead>
                  <TableHead>Codice ordine</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data emissione</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id} data-testid={`row-ticket-${ticket.id}`}>
                    <TableCell data-testid={`text-ticket-system-${ticket.id}`}>
                      {ticket.emissionChannelCode || (ticket.cardCode ? "Automatico" : "Manuale")}
                    </TableCell>
                    <TableCell className="font-mono" data-testid={`text-ticket-progressive-${ticket.id}`}>
                      {ticket.progressiveNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs" data-testid={`text-ticket-card-${ticket.id}`}>
                      {getCardName(ticket.cardCode)}
                    </TableCell>
                    <TableCell className="font-mono text-xs" data-testid={`text-ticket-seal-${ticket.id}`}>
                      {ticket.fiscalSealCode || "-"}
                    </TableCell>
                    <TableCell data-testid={`text-ticket-order-${ticket.id}`}>
                      {ticket.transactionId ? ticket.transactionId.substring(0, 8) : "-"}
                    </TableCell>
                    <TableCell data-testid={`text-ticket-type-${ticket.id}`}>
                      {ticket.ticketTypeCode}
                    </TableCell>
                    <TableCell data-testid={`text-ticket-date-${ticket.id}`}>
                      {ticket.emissionDate ? format(new Date(ticket.emissionDate), "dd/MM/yyyy HH:mm") : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(ticket.status)}
                    </TableCell>
                    <TableCell>
                      {ticket.status === "valid" && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCancelTicketId(ticket.id)}
                            data-testid={`button-cancel-${ticket.id}`}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setRefundTicketId(ticket.id)}
                            data-testid={`button-refund-${ticket.id}`}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        Totale biglietti: <strong>{filteredTickets.length}</strong>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (currentLevel) {
      case "gestori":
        return renderGestoriLevel();
      case "events":
        return renderEventsLevel();
      case "sectors":
        return renderSectorsLevel();
      case "tickets":
        return renderTicketsLevel();
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Accesso non autorizzato</h2>
            <p className="text-muted-foreground">
              Questa sezione è riservata ai Super Admin
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Console Biglietteria SIAE
          </CardTitle>
          <CardDescription>
            Esplora e gestisci i biglietti per gestore, evento e tipologia
          </CardDescription>
        </CardHeader>
      </Card>

      {renderBreadcrumb()}
      {renderContent()}

      <AlertDialog open={!!cancelTicketId} onOpenChange={() => setCancelTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annullare il biglietto?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione annullerà il biglietto. Il sigillo fiscale verrà invalidato.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-dialog-cancel">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelTicketId && cancelTicketMutation.mutate(cancelTicketId)}
              disabled={cancelTicketMutation.isPending}
              data-testid="button-cancel-dialog-confirm"
            >
              {cancelTicketMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma annullamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!refundTicketId} onOpenChange={() => setRefundTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimborsare il biglietto?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione effettuerà il rimborso del biglietto al cliente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-refund-dialog-cancel">Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => refundTicketId && refundTicketMutation.mutate(refundTicketId)}
              disabled={refundTicketMutation.isPending}
              data-testid="button-refund-dialog-confirm"
            >
              {refundTicketMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Conferma rimborso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
