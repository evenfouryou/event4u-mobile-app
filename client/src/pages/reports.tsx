import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  ArrowLeft, 
  Pencil, 
  ChevronDown, 
  ChevronUp,
  BarChart3,
  Package,
  Store,
  Percent,
  CircleDollarSign,
  Sparkles
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { MobileAppLayout, MobileHeader, HapticButton, BottomSheet, triggerHaptic } from "@/components/mobile-primitives";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";

type Event = {
  id: string;
  name: string;
  eventDate: string;
  status: string;
  locationId: string;
};

type ReportData = {
  eventId: string;
  stations: Array<{
    stationId: number;
    stationName: string;
    items: Array<{
      productId: number;
      productName: string;
      quantity: number;
      costPrice: string;
      totalCost: number;
    }>;
    totalCost: number;
  }>;
  consumedProducts: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    costPrice: string;
    totalCost: number;
  }>;
  totalCost: number;
};

type RevenueAnalysis = {
  theoreticalRevenue: number;
  actualRevenue: number;
  variance: number;
  variancePercent: number;
};

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 24, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: springTransition,
  },
};

const cardColors = {
  theoretical: {
    bg: "from-blue-500/20 to-blue-600/10",
    icon: "bg-blue-500",
    iconColor: "text-white",
  },
  actual: {
    bg: "from-emerald-500/20 to-emerald-600/10",
    icon: "bg-emerald-500",
    iconColor: "text-white",
  },
  variance: {
    bg: "from-amber-500/20 to-amber-600/10",
    icon: "bg-amber-500",
    iconColor: "text-white",
  },
  percent: {
    bg: "from-purple-500/20 to-purple-600/10",
    icon: "bg-purple-500",
    iconColor: "text-white",
  },
  total: {
    bg: "from-primary/20 to-primary/5",
    icon: "bg-primary",
    iconColor: "text-primary-foreground",
  },
};

export default function Reports() {
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlEventId = urlParams.get('eventId');
  const { toast } = useToast();
  const { user } = useAuth();

  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId || "");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [expandedStations, setExpandedStations] = useState<Set<number>>(new Set());
  const [showExportSheet, setShowExportSheet] = useState(false);

  const [correctionSheetOpen, setCorrectionSheetOpen] = useState(false);
  const [correctingProduct, setCorrectingProduct] = useState<{
    productId: string;
    productName: string;
    currentQuantity: number;
    stationId?: string | null;
  } | null>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const canCorrect = !!user && (user.role === 'gestore' || user.role === 'organizer' || user.role === 'super_admin');

  const { data: events = [], isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ['/api/events'],
  });

  useEffect(() => {
    if (urlEventId && !selectedEventId) {
      setSelectedEventId(urlEventId);
    }
  }, [urlEventId, selectedEventId]);

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (!startDate && !endDate) return events;
    
    return events.filter((event) => {
      const eventDate = new Date((event as any).startDatetime || (event as any).eventDate);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      
      if (start && eventDate < start) return false;
      if (end && eventDate > end) return false;
      return true;
    });
  }, [events, startDate, endDate]);

  const { data: reportData, isLoading: reportLoading } = useQuery<ReportData>({
    queryKey: ['/api/reports/end-of-night', selectedEventId],
    enabled: !!selectedEventId,
  });

  const { data: revenueAnalysis } = useQuery<RevenueAnalysis>({
    queryKey: ['/api/events', selectedEventId, 'revenue-analysis'],
    enabled: !!selectedEventId,
  });

  const correctConsumptionMutation = useMutation({
    mutationFn: async (data: { 
      eventId: string; 
      productId: string; 
      newQuantity: number; 
      stationId?: string | null;
      reason?: string;
    }) => {
      await apiRequest('POST', '/api/reports/correct-consumption', data);
    },
    onSuccess: async (_, variables) => {
      setCorrectionSheetOpen(false);
      setCorrectingProduct(null);
      setNewQuantity("");
      setCorrectionReason("");
      triggerHaptic('success');
      
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/reports/end-of-night', variables.eventId]
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/events', variables.eventId, 'revenue-analysis']
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/events', variables.eventId, 'stocks']
      });
      await queryClient.invalidateQueries({ 
        queryKey: ['/api/stock/general']
      });
      
      await queryClient.refetchQueries({ 
        queryKey: ['/api/reports/end-of-night', variables.eventId]
      });
      await queryClient.refetchQueries({ 
        queryKey: ['/api/events', variables.eventId, 'revenue-analysis']
      });
      
      toast({
        title: "Correzione effettuata",
        description: "Il consumo è stato corretto e la giacenza aggiornata",
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Non hai i permessi per correggere i consumi",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Errore",
          description: error.message || "Impossibile correggere il consumo",
          variant: "destructive",
        });
      }
    },
  });

  const openCorrectionSheet = (productId: string, productName: string, currentQuantity: number, stationId?: string | null) => {
    triggerHaptic('medium');
    setCorrectingProduct({ productId, productName, currentQuantity, stationId });
    setNewQuantity(currentQuantity.toString());
    setCorrectionReason("");
    setCorrectionSheetOpen(true);
  };

  const handleCorrectConsumption = () => {
    if (!correctingProduct || !selectedEventId) return;
    
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      triggerHaptic('error');
      toast({
        title: "Errore",
        description: "Inserisci una quantità valida",
        variant: "destructive",
      });
      return;
    }

    correctConsumptionMutation.mutate({
      eventId: selectedEventId,
      productId: correctingProduct.productId,
      newQuantity: qty,
      stationId: correctingProduct.stationId,
      reason: correctionReason || undefined,
    });
  };

  const toggleStation = (stationId: number) => {
    triggerHaptic('light');
    setExpandedStations(prev => {
      const next = new Set(prev);
      if (next.has(stationId)) {
        next.delete(stationId);
      } else {
        next.add(stationId);
      }
      return next;
    });
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    triggerHaptic('medium');
    setShowExportSheet(false);

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFontSize(20);
    pdf.text("Event Four You - Report Fine Serata", pageWidth / 2, 20, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.text(`Evento: ${event.name}`, 20, 35);
    pdf.text(`Data: ${new Date((event as any).startDatetime || (event as any).eventDate).toLocaleDateString('it-IT')}`, 20, 42);
    
    pdf.setFontSize(14);
    pdf.text(`Costo Totale: €${reportData.totalCost.toFixed(2)}`, 20, 55);

    let yPosition = 70;

    if (reportData.consumedProducts && reportData.consumedProducts.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text("Riepilogo Consumo Beverage", 20, yPosition);
      yPosition += 10;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      reportData.consumedProducts.forEach((product) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.text(
          `${product.productName}: ${product.totalQuantity.toFixed(2)} x €${parseFloat(product.costPrice).toFixed(2)} = €${product.totalCost.toFixed(2)}`,
          20,
          yPosition
        );
        yPosition += 6;
      });
      
      yPosition += 15;
    }

    reportData.stations.forEach((station) => {
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Postazione: ${station.stationName}`, 20, yPosition);
      yPosition += 7;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Costo: €${station.totalCost.toFixed(2)}`, 20, yPosition);
      yPosition += 10;

      station.items.forEach((item) => {
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        
        pdf.setFontSize(10);
        pdf.text(
          `- ${item.productName}: ${item.quantity.toFixed(2)} x €${parseFloat(item.costPrice).toFixed(2)} = €${item.totalCost.toFixed(2)}`,
          25,
          yPosition
        );
        yPosition += 6;
      });

      yPosition += 5;
    });

    pdf.save(`report-${event.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`);
    toast({
      title: "PDF Esportato",
      description: "Il report è stato scaricato",
    });
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    triggerHaptic('medium');
    setShowExportSheet(false);

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const wb = new ExcelJS.Workbook();

    const summaryWs = wb.addWorksheet("Riepilogo");
    summaryWs.addRow(["Event Four You - Report Fine Serata"]);
    summaryWs.addRow([]);
    summaryWs.addRow(["Evento", event.name]);
    summaryWs.addRow(["Data", new Date((event as any).startDatetime || (event as any).eventDate).toLocaleDateString('it-IT')]);
    summaryWs.addRow(["Costo Totale", `€${reportData.totalCost.toFixed(2)}`]);
    summaryWs.addRow([]);

    const detailedWs = wb.addWorksheet("Dettaglio");
    detailedWs.addRow(["Postazione", "Prodotto", "Quantità", "Prezzo Unitario", "Costo Totale"]);

    reportData.stations.forEach((station) => {
      station.items.forEach((item) => {
        detailedWs.addRow([
          station.stationName,
          item.productName,
          item.quantity.toFixed(2),
          `€${parseFloat(item.costPrice).toFixed(2)}`,
          `€${item.totalCost.toFixed(2)}`,
        ]);
      });
    });

    if (reportData.consumedProducts && reportData.consumedProducts.length > 0) {
      const beverageWs = wb.addWorksheet("Consumo Beverage");
      beverageWs.addRow(["Riepilogo Consumo Beverage"]);
      beverageWs.addRow([]);
      beverageWs.addRow(["Prodotto", "Quantità Totale", "Prezzo Unitario", "Costo Totale"]);

      reportData.consumedProducts.forEach((product) => {
        beverageWs.addRow([
          product.productName,
          product.totalQuantity.toFixed(2),
          `€${parseFloat(product.costPrice).toFixed(2)}`,
          `€${product.totalCost.toFixed(2)}`,
        ]);
      });

      beverageWs.addRow(["", "", "TOTALE", `€${reportData.totalCost.toFixed(2)}`]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${event.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Excel Esportato",
      description: "Il report è stato scaricato",
    });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  if (eventsLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title="Report"
            showBackButton showMenuButton
          />
        }
      >
        <div className="flex items-center justify-center h-full pb-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={springTransition}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 rounded-full border-4 border-primary/20 border-t-primary mx-auto"
            />
            <p className="text-muted-foreground mt-4 text-base">Caricamento...</p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Report"
          subtitle={selectedEvent ? selectedEvent.name : "Seleziona evento"}
          showBackButton showMenuButton
          rightAction={
            <HapticButton
              variant="ghost"
              size="icon"
              onClick={() => {
                triggerHaptic('light');
                setShowDateFilter(!showDateFilter);
              }}
              data-testid="button-toggle-date-filter"
            >
              <Calendar className="h-5 w-5" />
            </HapticButton>
          }
        />
      }
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4 pb-24 pt-2"
      >
        <AnimatePresence>
          {showDateFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={springTransition}
            >
              <Card className="overflow-hidden border-primary/20">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-semibold">Filtra per Data</span>
                    </div>
                    {(startDate || endDate) && (
                      <HapticButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="text-primary"
                        data-testid="button-clear-dates"
                      >
                        Azzera
                      </HapticButton>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Inizio</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="min-h-[48px] text-base"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Fine</label>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="min-h-[48px] text-base"
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div variants={staggerItem}>
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-accent" />
                </div>
                <label className="text-sm font-medium">Seleziona Evento</label>
              </div>
              <Select value={selectedEventId} onValueChange={(v) => {
                triggerHaptic('light');
                setSelectedEventId(v);
              }}>
                <SelectTrigger className="min-h-[52px] text-base rounded-xl" data-testid="select-event">
                  <SelectValue placeholder="Scegli un evento..." />
                </SelectTrigger>
                <SelectContent>
                  {filteredEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id} className="min-h-[48px] py-3">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{event.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date((event as any).startDatetime || (event as any).eventDate).toLocaleDateString('it-IT', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {reportLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary mx-auto"
            />
            <p className="text-muted-foreground mt-4">Caricamento report...</p>
          </motion.div>
        )}

        {reportData && !reportLoading && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {revenueAnalysis && revenueAnalysis.theoreticalRevenue > 0 && (
              <>
                <motion.div variants={staggerItem}>
                  <Card className={`overflow-hidden bg-gradient-to-br ${cardColors.theoretical.bg} border-0`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${cardColors.theoretical.icon} flex items-center justify-center shadow-lg`}>
                          <DollarSign className={`w-7 h-7 ${cardColors.theoretical.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Ricavo Teorico</p>
                          <div className="text-2xl font-bold" data-testid="text-theoretical-revenue">
                            €{revenueAnalysis.theoreticalRevenue.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Basato sui consumi registrati
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={staggerItem}>
                  <Card className={`overflow-hidden bg-gradient-to-br ${cardColors.actual.bg} border-0`}>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl ${cardColors.actual.icon} flex items-center justify-center shadow-lg`}>
                          <CircleDollarSign className={`w-7 h-7 ${cardColors.actual.iconColor}`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Ricavo Effettivo</p>
                          <div className="text-2xl font-bold" data-testid="text-actual-revenue">
                            €{revenueAnalysis.actualRevenue.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Incasso reale dalla cassa
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <div className="grid grid-cols-2 gap-3">
                  <motion.div variants={staggerItem}>
                    <Card className={`h-full overflow-hidden bg-gradient-to-br ${revenueAnalysis.variance >= 0 ? 'from-green-500/20 to-green-600/10' : 'from-red-500/20 to-red-600/10'} border-0`}>
                      <CardContent className="p-4">
                        <div className={`w-12 h-12 rounded-xl ${revenueAnalysis.variance >= 0 ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center mb-3 shadow-lg`}>
                          {revenueAnalysis.variance >= 0 ? (
                            <TrendingUp className="w-6 h-6 text-white" />
                          ) : (
                            <TrendingDown className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">Varianza</p>
                        <div className={`text-xl font-bold ${revenueAnalysis.variance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-variance">
                          €{revenueAnalysis.variance.toFixed(2)}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div variants={staggerItem}>
                    <Card className={`h-full overflow-hidden bg-gradient-to-br ${cardColors.percent.bg} border-0`}>
                      <CardContent className="p-4">
                        <div className={`w-12 h-12 rounded-xl ${cardColors.percent.icon} flex items-center justify-center mb-3 shadow-lg`}>
                          <Percent className={`w-6 h-6 ${cardColors.percent.iconColor}`} />
                        </div>
                        <p className="text-xs text-muted-foreground mb-1">Varianza %</p>
                        <div className={`text-xl font-bold ${revenueAnalysis.variancePercent >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-variance-percent">
                          {revenueAnalysis.variancePercent.toFixed(1)}%
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                <motion.div variants={staggerItem}>
                  <Card className="overflow-hidden">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BarChart3 className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-base">Analisi Ricavi</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={[
                            { name: 'Teorico', value: revenueAnalysis.theoreticalRevenue, fill: '#3B82F6' },
                            { name: 'Effettivo', value: revenueAnalysis.actualRevenue, fill: '#10B981' },
                          ]}
                          margin={{ top: 10, right: 10, left: -15, bottom: 10 }}
                          barSize={60}
                        >
                          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                          <XAxis 
                            dataKey="name" 
                            fontSize={13} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            fontSize={11} 
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `€${value}`}
                          />
                          <Tooltip 
                            formatter={(value: number) => [`€${value.toFixed(2)}`, '']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '12px',
                              padding: '12px',
                            }}
                          />
                          <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {[
                              { name: 'Teorico', value: revenueAnalysis.theoreticalRevenue, fill: '#3B82F6' },
                              { name: 'Effettivo', value: revenueAnalysis.actualRevenue, fill: '#10B981' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </>
            )}

            {revenueAnalysis && revenueAnalysis.theoreticalRevenue === 0 && (
              <motion.div variants={staggerItem}>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <BarChart3 className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Nessun dato ricavi disponibile. Assicurati di aver assegnato un listino prezzi e registrato dei consumi.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div variants={staggerItem}>
              <Card className={`overflow-hidden bg-gradient-to-br ${cardColors.total.bg} border-0`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${cardColors.total.icon} flex items-center justify-center shadow-lg`}>
                        <DollarSign className={`w-7 h-7 ${cardColors.total.iconColor}`} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Costo Totale</p>
                        <div className="text-3xl font-bold" data-testid="text-total-cost">
                          €{reportData.totalCost.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {reportData.stations.length} postazioni
                        </p>
                      </div>
                    </div>
                    <HapticButton
                      variant="secondary"
                      size="icon"
                      onClick={() => {
                        triggerHaptic('light');
                        setShowExportSheet(true);
                      }}
                      className="h-12 w-12 rounded-xl"
                      data-testid="button-open-export"
                    >
                      <FileText className="w-5 h-5" />
                    </HapticButton>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {reportData.consumedProducts && reportData.consumedProducts.length > 0 && (
              <motion.div variants={staggerItem}>
                <Card className="overflow-hidden">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Consumo Beverage</CardTitle>
                        <p className="text-xs text-muted-foreground">{reportData.consumedProducts.length} prodotti</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="space-y-2">
                      {reportData.consumedProducts.map((product, index) => (
                        <motion.div
                          key={product.productId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...springTransition, delay: index * 0.04 }}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-xl active:bg-muted/50 transition-colors"
                          data-testid={`row-consumed-product-${product.productId}`}
                        >
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="font-medium truncate" data-testid={`text-consumed-product-name-${product.productId}`}>
                              {product.productName}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {product.totalQuantity.toFixed(2)} × €{parseFloat(product.costPrice).toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base">
                              €{product.totalCost.toFixed(2)}
                            </span>
                            {canCorrect && (
                              <HapticButton
                                variant="ghost"
                                size="icon"
                                disabled={correctConsumptionMutation.isPending}
                                onClick={() => openCorrectionSheet(
                                  product.productId, 
                                  product.productName, 
                                  product.totalQuantity
                                )}
                                className="h-11 w-11"
                                data-testid={`button-correct-${product.productId}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </HapticButton>
                            )}
                          </div>
                        </motion.div>
                      ))}
                      <div className="flex items-center justify-between p-4 bg-primary/10 rounded-xl border-2 border-primary/20 mt-3">
                        <span className="font-bold">TOTALE BEVERAGE</span>
                        <span className="font-bold text-xl" data-testid="text-total-beverage-cost">
                          €{reportData.totalCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div variants={staggerItem}>
              <Card className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                      <Store className="w-5 h-5 text-teal-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Dettaglio Postazioni</CardTitle>
                      <p className="text-xs text-muted-foreground">{reportData.stations.length} postazioni</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <div className="space-y-3">
                    {reportData.stations.map((station, stationIndex) => (
                      <motion.div
                        key={station.stationId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...springTransition, delay: stationIndex * 0.05 }}
                        className="rounded-2xl border border-border overflow-hidden"
                      >
                        <button
                          onClick={() => toggleStation(station.stationId)}
                          className="w-full flex items-center justify-between p-4 bg-muted/20 min-h-[60px] active:bg-muted/40 transition-colors"
                          data-testid={`accordion-station-${station.stationId}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                              <Store className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium">{station.stationName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              €{station.totalCost.toFixed(2)}
                            </span>
                            <motion.div
                              animate={{ rotate: expandedStations.has(station.stationId) ? 180 : 0 }}
                              transition={springTransition}
                            >
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </button>
                        
                        <AnimatePresence>
                          {expandedStations.has(station.stationId) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={springTransition}
                              className="overflow-hidden"
                            >
                              <div className="p-3 space-y-2 bg-background">
                                {station.items.map((item, idx) => (
                                  <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ ...springTransition, delay: idx * 0.03 }}
                                    className="flex items-center justify-between p-3 bg-muted/20 rounded-xl"
                                    data-testid={`row-product-${item.productId}`}
                                  >
                                    <div className="flex-1 min-w-0 mr-3">
                                      <p className="font-medium truncate" data-testid={`text-product-name-${item.productId}`}>
                                        {item.productName}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {item.quantity.toFixed(2)} × €{parseFloat(item.costPrice).toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold">
                                        €{item.totalCost.toFixed(2)}
                                      </span>
                                      {canCorrect && (
                                        <HapticButton
                                          variant="ghost"
                                          size="icon"
                                          disabled={correctConsumptionMutation.isPending}
                                          onClick={() => openCorrectionSheet(
                                            item.productId.toString(), 
                                            item.productName, 
                                            item.quantity,
                                            station.stationId.toString()
                                          )}
                                          className="h-11 w-11"
                                          data-testid={`button-correct-station-${station.stationId}-${item.productId}`}
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </HapticButton>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}

        {!selectedEventId && !reportLoading && (
          <motion.div
            variants={staggerItem}
            initial="hidden"
            animate="show"
          >
            <Card className="border-dashed">
              <CardContent className="py-20 text-center">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springTransition}
                >
                  <div className="w-20 h-20 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                    <FileText className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-base">
                    Seleziona un evento per visualizzare il report
                  </p>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>

      <BottomSheet
        open={showExportSheet}
        onClose={() => setShowExportSheet(false)}
        title="Esporta Report"
      >
        <div className="p-4 space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleExportPDF}
            className="w-full flex items-center gap-4 p-4 bg-red-500/10 rounded-2xl active:bg-red-500/20 transition-colors"
            data-testid="button-export-pdf"
          >
            <div className="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Esporta PDF</p>
              <p className="text-sm text-muted-foreground">Documento formattato per stampa</p>
            </div>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleExportExcel}
            className="w-full flex items-center gap-4 p-4 bg-green-500/10 rounded-2xl active:bg-green-500/20 transition-colors"
            data-testid="button-export-excel"
          >
            <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Esporta Excel</p>
              <p className="text-sm text-muted-foreground">Foglio di calcolo modificabile</p>
            </div>
          </motion.button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={correctionSheetOpen}
        onClose={() => setCorrectionSheetOpen(false)}
        title="Correggi Consumo"
      >
        <div className="p-4 space-y-5">
          <div className="p-4 bg-muted/30 rounded-2xl">
            <p className="text-xs text-muted-foreground mb-1">Prodotto</p>
            <p className="font-semibold text-lg">{correctingProduct?.productName}</p>
          </div>
          
          <div className="p-4 bg-amber-500/10 rounded-2xl">
            <p className="text-xs text-muted-foreground mb-1">Quantità attuale</p>
            <p className="font-bold text-2xl text-amber-600">{correctingProduct?.currentQuantity.toFixed(2)}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Nuova Quantità</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="Inserisci nuova quantità"
              className="min-h-[52px] text-lg rounded-xl"
              data-testid="input-correct-quantity"
            />
            <p className="text-xs text-muted-foreground">
              La giacenza verrà aggiornata automaticamente
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo (opzionale)</label>
            <Textarea
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Es: Errore di conteggio..."
              className="min-h-[100px] rounded-xl"
              data-testid="input-correct-reason"
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <HapticButton
              variant="outline"
              className="flex-1 min-h-[52px] rounded-xl"
              onClick={() => setCorrectionSheetOpen(false)}
              data-testid="button-cancel-correct"
            >
              Annulla
            </HapticButton>
            <HapticButton
              className="flex-1 min-h-[52px] rounded-xl"
              onClick={handleCorrectConsumption}
              disabled={correctConsumptionMutation.isPending}
              hapticType="success"
              data-testid="button-confirm-correct"
            >
              {correctConsumptionMutation.isPending ? 'Salvataggio...' : 'Salva'}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
