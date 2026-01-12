import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { useIsMobile } from "@/hooks/use-mobile";
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
  const { t } = useTranslation();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlEventId = urlParams.get('eventId');
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [selectedEventId, setSelectedEventId] = useState<string>(urlEventId || "");
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
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
      setCorrectionDialogOpen(false);
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
        title: t('reports.correctionSuccess'),
        description: t('reports.correctionSuccessDesc'),
      });
    },
    onError: (error: Error) => {
      triggerHaptic('error');
      if (isUnauthorizedError(error)) {
        toast({
          title: t('common.unauthorized'),
          description: t('reports.noPermission'),
          variant: "destructive",
        });
      } else {
        toast({
          title: t('common.error'),
          description: error.message || t('reports.correctionError'),
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
        title: t('common.error'),
        description: t('reports.invalidQuantity'),
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
    pdf.text(t('reports.pdfReportTitle'), pageWidth / 2, 20, { align: "center" });
    
    pdf.setFontSize(12);
    pdf.text(`${t('reports.event')}: ${event.name}`, 20, 35);
    pdf.text(`${t('common.date')}: ${new Date((event as any).startDatetime || (event as any).eventDate).toLocaleDateString('it-IT')}`, 20, 42);
    
    pdf.setFontSize(14);
    pdf.text(`${t('reports.totalCost')}: €${reportData.totalCost.toFixed(2)}`, 20, 55);

    let yPosition = 70;

    if (reportData.consumedProducts && reportData.consumedProducts.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(t('reports.beverageSummary'), 20, yPosition);
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
      pdf.text(`${t('reports.station')}: ${station.stationName}`, 20, yPosition);
      yPosition += 7;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${t('reports.cost')}: €${station.totalCost.toFixed(2)}`, 20, yPosition);
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
      title: t('reports.pdfExported'),
      description: t('reports.reportDownloaded'),
    });
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    triggerHaptic('medium');
    setShowExportSheet(false);

    const event = events.find(e => e.id === selectedEventId);
    if (!event) return;

    const wb = new ExcelJS.Workbook();

    const summaryWs = wb.addWorksheet(t('reports.summarySheet'));
    summaryWs.addRow([t('reports.pdfReportTitle')]);
    summaryWs.addRow([]);
    summaryWs.addRow([t('reports.event'), event.name]);
    summaryWs.addRow([t('common.date'), new Date((event as any).startDatetime || (event as any).eventDate).toLocaleDateString('it-IT')]);
    summaryWs.addRow([t('reports.totalCost'), `€${reportData.totalCost.toFixed(2)}`]);
    summaryWs.addRow([]);

    const detailedWs = wb.addWorksheet(t('reports.detailSheet'));
    detailedWs.addRow([t('reports.station'), t('reports.product'), t('common.quantity'), t('reports.unitPrice'), t('reports.totalCost')]);

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
      const beverageWs = wb.addWorksheet(t('reports.beverageConsumption'));
      beverageWs.addRow([t('reports.beverageSummary')]);
      beverageWs.addRow([]);
      beverageWs.addRow([t('reports.product'), t('reports.totalQuantity'), t('reports.unitPrice'), t('reports.totalCost')]);

      reportData.consumedProducts.forEach((product) => {
        beverageWs.addRow([
          product.productName,
          product.totalQuantity.toFixed(2),
          `€${parseFloat(product.costPrice).toFixed(2)}`,
          `€${product.totalCost.toFixed(2)}`,
        ]);
      });

      beverageWs.addRow(["", "", t('common.total'), `€${reportData.totalCost.toFixed(2)}`]);
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
      title: t('reports.excelExported'),
      description: t('reports.reportDownloaded'),
    });
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  const openCorrectionDialog = (productId: string, productName: string, currentQuantity: number, stationId?: string | null) => {
    setCorrectingProduct({ productId, productName, currentQuantity, stationId });
    setNewQuantity(currentQuantity.toString());
    setCorrectionReason("");
    setCorrectionDialogOpen(true);
  };

  const handleCorrectConsumptionDesktop = () => {
    if (!correctingProduct || !selectedEventId) return;
    
    const qty = parseFloat(newQuantity);
    if (isNaN(qty) || qty < 0) {
      toast({
        title: t('common.error'),
        description: t('reports.invalidQuantity'),
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

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-reports">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('reports.endOfNight')}</h1>
            <p className="text-muted-foreground">{t('reports.analysisSubtitle')}</p>
          </div>
          {reportData && selectedEventId && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf-desktop">
                <FileText className="w-4 h-4 mr-2" />
                {t('reports.exportPdf')}
              </Button>
              <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-excel-desktop">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {t('reports.exportExcel')}
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('reports.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[250px]">
                <label className="text-sm font-medium mb-2 block">{t('reports.event')}</label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger data-testid="select-event-desktop">
                    <SelectValue placeholder={t('reports.selectEvent')} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEvents.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{event.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date((event as any).startDatetime || (event as any).eventDate).toLocaleDateString('it-IT', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <label className="text-sm font-medium mb-2 block">{t('reports.startDate')}</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-start-date-desktop"
                />
              </div>
              <div className="w-[180px]">
                <label className="text-sm font-medium mb-2 block">{t('reports.endDate')}</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-end-date-desktop"
                />
              </div>
              {(startDate || endDate) && (
                <Button
                  variant="ghost"
                  onClick={() => { setStartDate(""); setEndDate(""); }}
                  data-testid="button-clear-dates-desktop"
                >
                  {t('reports.clear')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {eventsLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-muted-foreground mt-4">{t('reports.loadingEvents')}</p>
            </div>
          </div>
        )}

        {reportLoading && selectedEventId && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mx-auto" />
              <p className="text-muted-foreground mt-4">{t('reports.loadingReport')}</p>
            </div>
          </div>
        )}

        {!selectedEventId && !eventsLoading && (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="text-muted-foreground">
                {t('reports.selectEventPrompt')}
              </p>
            </CardContent>
          </Card>
        )}

        {reportData && !reportLoading && (
          <div className="space-y-6">
            {revenueAnalysis && revenueAnalysis.theoreticalRevenue > 0 && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <Card className={`bg-gradient-to-br ${cardColors.theoretical.bg} border-0`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl ${cardColors.theoretical.icon} flex items-center justify-center`}>
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">{t('reports.theoreticalRevenue')}</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="text-theoretical-revenue-desktop">
                        €{revenueAnalysis.theoreticalRevenue.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br ${cardColors.actual.bg} border-0`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl ${cardColors.actual.icon} flex items-center justify-center`}>
                          <CircleDollarSign className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">{t('reports.actualRevenue')}</span>
                      </div>
                      <div className="text-2xl font-bold" data-testid="text-actual-revenue-desktop">
                        €{revenueAnalysis.actualRevenue.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br ${revenueAnalysis.variance >= 0 ? 'from-green-500/20 to-green-600/10' : 'from-red-500/20 to-red-600/10'} border-0`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl ${revenueAnalysis.variance >= 0 ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center`}>
                          {revenueAnalysis.variance >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-white" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">{t('reports.variance')}</span>
                      </div>
                      <div className={`text-2xl font-bold ${revenueAnalysis.variance >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-variance-desktop">
                        €{revenueAnalysis.variance.toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`bg-gradient-to-br ${cardColors.percent.bg} border-0`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl ${cardColors.percent.icon} flex items-center justify-center`}>
                          <Percent className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm text-muted-foreground">{t('reports.variancePercent')}</span>
                      </div>
                      <div className={`text-2xl font-bold ${revenueAnalysis.variancePercent >= 0 ? 'text-green-500' : 'text-red-500'}`} data-testid="text-variance-percent-desktop">
                        {revenueAnalysis.variancePercent.toFixed(1)}%
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      {t('reports.revenueAnalysis')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { name: t('reports.theoreticalRevenue'), value: revenueAnalysis.theoreticalRevenue, fill: '#3B82F6' },
                          { name: t('reports.actualRevenue'), value: revenueAnalysis.actualRevenue, fill: '#10B981' },
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                        barSize={80}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                        <Tooltip
                          formatter={(value: number) => [`€${value.toFixed(2)}`, '']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            padding: '12px',
                          }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {[
                            { name: t('reports.theoreticalRevenue'), value: revenueAnalysis.theoreticalRevenue, fill: '#3B82F6' },
                            { name: t('reports.actualRevenue'), value: revenueAnalysis.actualRevenue, fill: '#10B981' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}

            {revenueAnalysis && revenueAnalysis.theoreticalRevenue === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {t('reports.noRevenueData')}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className={`bg-gradient-to-br ${cardColors.total.bg} border-0`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${cardColors.total.icon} flex items-center justify-center`}>
                      <DollarSign className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('reports.totalCost')}</p>
                      <div className="text-3xl font-bold" data-testid="text-total-cost-desktop">
                        €{reportData.totalCost.toFixed(2)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {reportData.stations.length} {t('reports.stations')}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {reportData.consumedProducts && reportData.consumedProducts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-500" />
                    {t('reports.beverageConsumption')}
                  </CardTitle>
                  <CardDescription>{reportData.consumedProducts.length} {t('reports.consumedProducts')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('reports.product')}</TableHead>
                        <TableHead className="text-right">{t('common.quantity')}</TableHead>
                        <TableHead className="text-right">{t('reports.unitPrice')}</TableHead>
                        <TableHead className="text-right">{t('reports.totalCost')}</TableHead>
                        {canCorrect && <TableHead className="w-[60px]"></TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.consumedProducts.map((product) => (
                        <TableRow key={product.productId} data-testid={`row-consumed-product-desktop-${product.productId}`}>
                          <TableCell className="font-medium">{product.productName}</TableCell>
                          <TableCell className="text-right">{product.totalQuantity.toFixed(2)}</TableCell>
                          <TableCell className="text-right">€{parseFloat(product.costPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">€{product.totalCost.toFixed(2)}</TableCell>
                          {canCorrect && (
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openCorrectionDialog(
                                  product.productId,
                                  product.productName,
                                  product.totalQuantity
                                )}
                                disabled={correctConsumptionMutation.isPending}
                                data-testid={`button-correct-desktop-${product.productId}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/10">
                        <TableCell className="font-bold" colSpan={3}>{t('reports.totalBeverage')}</TableCell>
                        <TableCell className="text-right font-bold text-lg" data-testid="text-total-beverage-cost-desktop">
                          €{reportData.totalCost.toFixed(2)}
                        </TableCell>
                        {canCorrect && <TableCell />}
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-teal-500" />
                  {t('reports.stationDetails')}
                </CardTitle>
                <CardDescription>{reportData.stations.length} {t('reports.stations')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.stations.map((station) => (
                    <div key={station.stationId} className="border rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleStation(station.stationId)}
                        className="w-full flex items-center justify-between p-4 bg-muted/30 hover-elevate transition-colors"
                        data-testid={`accordion-station-desktop-${station.stationId}`}
                      >
                        <div className="flex items-center gap-3">
                          <Store className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{station.stationName}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">€{station.totalCost.toFixed(2)}</span>
                          {expandedStations.has(station.stationId) ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {expandedStations.has(station.stationId) && (
                        <div className="p-4">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('reports.product')}</TableHead>
                                <TableHead className="text-right">{t('common.quantity')}</TableHead>
                                <TableHead className="text-right">{t('reports.unitPrice')}</TableHead>
                                <TableHead className="text-right">{t('reports.totalCost')}</TableHead>
                                {canCorrect && <TableHead className="w-[60px]"></TableHead>}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {station.items.map((item, idx) => (
                                <TableRow key={idx} data-testid={`row-product-desktop-${item.productId}`}>
                                  <TableCell className="font-medium">{item.productName}</TableCell>
                                  <TableCell className="text-right">{item.quantity.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">€{parseFloat(item.costPrice).toFixed(2)}</TableCell>
                                  <TableCell className="text-right font-semibold">€{item.totalCost.toFixed(2)}</TableCell>
                                  {canCorrect && (
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openCorrectionDialog(
                                          item.productId.toString(),
                                          item.productName,
                                          item.quantity,
                                          station.stationId.toString()
                                        )}
                                        disabled={correctConsumptionMutation.isPending}
                                        data-testid={`button-correct-station-desktop-${station.stationId}-${item.productId}`}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Dialog open={correctionDialogOpen} onOpenChange={setCorrectionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('reports.correctConsumption')}</DialogTitle>
              <DialogDescription>
                {t('reports.correctDescription')} {correctingProduct?.productName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('reports.product')}</p>
                <p className="font-semibold">{correctingProduct?.productName}</p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{t('reports.currentQuantity')}</p>
                <p className="font-bold text-xl text-amber-600">{correctingProduct?.currentQuantity.toFixed(2)}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('reports.newQuantity')}</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder={t('reports.enterNewQuantity')}
                  data-testid="input-correct-quantity-desktop"
                />
                <p className="text-xs text-muted-foreground">
                  {t('reports.stockWillUpdate')}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('reports.reasonOptional')}</label>
                <Textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder={t('reports.reasonPlaceholder')}
                  data-testid="input-correct-reason-desktop"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCorrectionDialogOpen(false)}
                data-testid="button-cancel-correct-desktop"
              >
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCorrectConsumptionDesktop}
                disabled={correctConsumptionMutation.isPending}
                data-testid="button-confirm-correct-desktop"
              >
                {correctConsumptionMutation.isPending ? t('reports.saving') : t('reports.saveCorrection')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (eventsLoading) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title={t('reports.title')}
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
            <p className="text-muted-foreground mt-4 text-base">{t('common.loading')}</p>
          </motion.div>
        </div>
      </MobileAppLayout>
    );
  }

  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title={t('reports.title')}
          subtitle={selectedEvent ? selectedEvent.name : t('reports.selectEventShort')}
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
                      <span className="font-semibold">{t('reports.filterByDate')}</span>
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
                        {t('reports.clear')}
                      </HapticButton>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">{t('reports.start')}</label>
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="min-h-[48px] text-base"
                        data-testid="input-start-date"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">{t('reports.end')}</label>
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
                <label className="text-sm font-medium">{t('reports.event')}</label>
              </div>
              <Select value={selectedEventId} onValueChange={(v) => {
                triggerHaptic('light');
                setSelectedEventId(v);
              }}>
                <SelectTrigger className="min-h-[52px] text-base rounded-xl" data-testid="select-event">
                  <SelectValue placeholder={t('reports.chooseEvent')} />
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
            <p className="text-muted-foreground mt-4">{t('reports.loadingReport')}</p>
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
                          <p className="text-sm text-muted-foreground">{t('reports.theoreticalRevenue')}</p>
                          <div className="text-2xl font-bold" data-testid="text-theoretical-revenue">
                            €{revenueAnalysis.theoreticalRevenue.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('reports.basedOnConsumption')}
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
                          <p className="text-sm text-muted-foreground">{t('reports.actualRevenue')}</p>
                          <div className="text-2xl font-bold" data-testid="text-actual-revenue">
                            €{revenueAnalysis.actualRevenue.toFixed(2)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {t('reports.actualCashIncome')}
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
                        <p className="text-xs text-muted-foreground mb-1">{t('reports.variance')}</p>
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
                        <p className="text-xs text-muted-foreground mb-1">{t('reports.variancePercent')}</p>
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
                        <CardTitle className="text-base">{t('reports.revenueAnalysis')}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart
                          data={[
                            { name: t('reports.theoretical'), value: revenueAnalysis.theoreticalRevenue, fill: '#3B82F6' },
                            { name: t('reports.actual'), value: revenueAnalysis.actualRevenue, fill: '#10B981' },
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
                              { name: t('reports.theoretical'), value: revenueAnalysis.theoreticalRevenue, fill: '#3B82F6' },
                              { name: t('reports.actual'), value: revenueAnalysis.actualRevenue, fill: '#10B981' },
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
                      {t('reports.noRevenueData')}
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
                        <p className="text-sm text-muted-foreground">{t('reports.totalCost')}</p>
                        <div className="text-3xl font-bold" data-testid="text-total-cost">
                          €{reportData.totalCost.toFixed(2)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {reportData.stations.length} {t('reports.stations')}
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
                        <CardTitle className="text-base">{t('reports.beverageConsumption')}</CardTitle>
                        <p className="text-xs text-muted-foreground">{reportData.consumedProducts.length} {t('reports.products')}</p>
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
                        <span className="font-bold">{t('reports.totalBeverage')}</span>
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
                      <CardTitle className="text-base">{t('reports.stationDetails')}</CardTitle>
                      <p className="text-xs text-muted-foreground">{reportData.stations.length} {t('reports.stations')}</p>
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
                    {t('reports.selectEventPrompt')}
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
        title={t('reports.exportReport')}
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
              <p className="font-semibold">{t('reports.exportPdf')}</p>
              <p className="text-sm text-muted-foreground">{t('reports.pdfDescription')}</p>
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
              <p className="font-semibold">{t('reports.exportExcel')}</p>
              <p className="text-sm text-muted-foreground">{t('reports.excelDescription')}</p>
            </div>
          </motion.button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={correctionSheetOpen}
        onClose={() => setCorrectionSheetOpen(false)}
        title={t('reports.correctConsumption')}
      >
        <div className="p-4 space-y-5">
          <div className="p-4 bg-muted/30 rounded-2xl">
            <p className="text-xs text-muted-foreground mb-1">{t('reports.product')}</p>
            <p className="font-semibold text-lg">{correctingProduct?.productName}</p>
          </div>
          
          <div className="p-4 bg-amber-500/10 rounded-2xl">
            <p className="text-xs text-muted-foreground mb-1">{t('reports.currentQuantity')}</p>
            <p className="font-bold text-2xl text-amber-600">{correctingProduct?.currentQuantity.toFixed(2)}</p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.newQuantity')}</label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder={t('reports.enterNewQuantity')}
              className="min-h-[52px] text-lg rounded-xl"
              data-testid="input-correct-quantity"
            />
            <p className="text-xs text-muted-foreground">
              {t('reports.stockWillUpdate')}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('reports.reasonOptional')}</label>
            <Textarea
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder={t('reports.reasonPlaceholder')}
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
              {t('common.cancel')}
            </HapticButton>
            <HapticButton
              className="flex-1 min-h-[52px] rounded-xl"
              onClick={handleCorrectConsumption}
              disabled={correctConsumptionMutation.isPending}
              hapticType="success"
              data-testid="button-confirm-correct"
            >
              {correctConsumptionMutation.isPending ? t('reports.saving') : t('common.save')}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
