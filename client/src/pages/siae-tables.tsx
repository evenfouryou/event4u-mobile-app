import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Music, MapPin, Ticket, Briefcase, XCircle, Loader2, Percent, Download, FileText, FileSpreadsheet } from "lucide-react";
import jsPDF from "jspdf";
import ExcelJS from "exceljs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";

type SiaeEventGenre = {
  id: string;
  code: string;
  name: string;
  description?: string;
  taxType: string;
  vatRate?: number;
  active: boolean;
};

type SiaeSectorCode = {
  id: string;
  code: string;
  name: string;
  description?: string;
  maxCapacity?: number;
  active: boolean;
};

type SiaeTicketType = {
  id: string;
  code: string;
  name: string;
  description?: string;
  isNominal: boolean;
  requiresDocument: boolean;
  active: boolean;
};

type SiaeServiceCode = {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  active: boolean;
};

type SiaeCancellationReason = {
  id: string;
  code: string;
  name: string;
  description?: string;
  requiresRefund: boolean;
  active: boolean;
};

function EventGenresTab() {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<SiaeEventGenre | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const form = useForm({
    defaultValues: {
      code: "",
      name: "",
      description: "",
      taxType: "S",
      vatRate: null as number | null,
      active: true,
    },
  });

  const { data: genres = [], isLoading } = useQuery<SiaeEventGenre[]>({
    queryKey: ['/api/siae/event-genres'],
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<SiaeEventGenre>) =>
      apiRequest('POST', '/api/siae/event-genres', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/event-genres'] });
      toast({ title: "Genere evento creato" });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, ...data }: Partial<SiaeEventGenre> & { code: string }) =>
      apiRequest('PATCH', `/api/siae/event-genres/${code}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/siae/event-genres'] });
      toast({ title: "Genere evento aggiornato" });
      setIsDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
  });

  const onSubmit = (data: any) => {
    if (editingItem) {
      updateMutation.mutate({ code: editingItem.code, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = (item: SiaeEventGenre) => {
    setEditingItem(item);
    form.reset({
      code: item.code,
      name: item.name,
      description: item.description || "",
      taxType: item.taxType,
      vatRate: item.vatRate ?? null,
      active: item.active,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingItem(null);
    form.reset({
      code: "",
      name: "",
      description: "",
      taxType: "S",
      vatRate: null,
      active: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return <div className="flex justify-center p-8" data-testid="loader-genres"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground" data-testid="text-genres-description">
          TAB.1 - Generi Manifestazione secondo normativa SIAE
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} data-testid="button-add-genre">
              <Plus className="w-4 h-4 mr-2" />
              Aggiungi Genere
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? "Modifica Genere" : "Nuovo Genere"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Codice</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="01" data-testid="input-genre-code" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Concerti musica classica" data-testid="input-genre-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="taxType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Imposta</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger data-testid="select-genre-taxtype">
                            <SelectValue placeholder="Seleziona tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="S">S - Spettacolo</SelectItem>
                            <SelectItem value="I">I - Intrattenimento</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vatRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aliquota IVA (%)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          max="100"
                          {...field} 
                          value={field.value ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            field.onChange(val === '' ? null : parseFloat(val));
                          }}
                          placeholder="10" 
                          data-testid="input-genre-vatrate" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-genre-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Attivo</FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" data-testid="button-save-genre">
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingItem ? "Salva Modifiche" : "Crea Genere"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border" data-testid="table-genres-container">
        <Table data-testid="table-genres">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20" data-testid="header-genre-code">Codice</TableHead>
              <TableHead data-testid="header-genre-name">Nome</TableHead>
              <TableHead className="w-24" data-testid="header-genre-tax">Tipo</TableHead>
              <TableHead className="w-20" data-testid="header-genre-vat">IVA</TableHead>
              <TableHead className="w-28" data-testid="header-genre-isi">ISI</TableHead>
              <TableHead className="w-24" data-testid="header-genre-status">Stato</TableHead>
              <TableHead className="w-16" data-testid="header-genre-actions"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {genres.map((genre) => (
              <TableRow key={genre.id} data-testid={`row-genre-${genre.id}`}>
                <TableCell className="font-mono" data-testid={`cell-genre-code-${genre.id}`}>{genre.code}</TableCell>
                <TableCell data-testid={`cell-genre-name-${genre.id}`}>{genre.name}</TableCell>
                <TableCell data-testid={`cell-genre-tax-${genre.id}`}>
                  <Badge variant="outline">
                    {genre.taxType === 'S' ? 'Spettacolo' : 'Intratt.'}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-genre-vat-${genre.id}`}>
                  <Badge variant="secondary">
                    {genre.vatRate !== null && genre.vatRate !== undefined 
                      ? `${Number(genre.vatRate)}%` 
                      : genre.taxType === 'S' ? '10%' : '22%'}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-genre-isi-${genre.id}`}>
                  <Badge 
                    variant="outline"
                    className={genre.taxType === 'I' 
                      ? 'border-amber-500 text-amber-600 dark:text-amber-400' 
                      : 'border-green-500 text-green-600 dark:text-green-400'}
                  >
                    {genre.taxType === 'I' ? 'ISI 16%' : 'Esente'}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-genre-status-${genre.id}`}>
                  <Badge variant={genre.active ? "default" : "secondary"} data-testid={`badge-genre-${genre.id}`}>
                    {genre.active ? "Attivo" : "Disattivo"}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-genre-actions-${genre.id}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(genre)}
                    data-testid={`button-edit-genre-${genre.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SectorCodesTab() {
  const { data: sectors = [], isLoading } = useQuery<SiaeSectorCode[]>({
    queryKey: ['/api/siae/sector-codes'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8" data-testid="loader-sectors"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" data-testid="text-sectors-description">
        TAB.2 - Codici Settore per configurazione venue
      </p>
      <div className="rounded-md border" data-testid="table-sectors-container">
        <Table data-testid="table-sectors">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20" data-testid="header-sector-code">Codice</TableHead>
              <TableHead data-testid="header-sector-name">Nome</TableHead>
              <TableHead className="w-32" data-testid="header-sector-capacity">Capienza Max</TableHead>
              <TableHead className="w-24" data-testid="header-sector-status">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectors.map((sector) => (
              <TableRow key={sector.id} data-testid={`row-sector-${sector.id}`}>
                <TableCell className="font-mono" data-testid={`cell-sector-code-${sector.id}`}>{sector.code}</TableCell>
                <TableCell data-testid={`cell-sector-name-${sector.id}`}>{sector.name}</TableCell>
                <TableCell data-testid={`cell-sector-capacity-${sector.id}`}>{sector.maxCapacity || '-'}</TableCell>
                <TableCell data-testid={`cell-sector-status-${sector.id}`}>
                  <Badge variant={sector.active ? "default" : "secondary"} data-testid={`badge-sector-${sector.id}`}>
                    {sector.active ? "Attivo" : "Disattivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TicketTypesTab() {
  const { data: types = [], isLoading } = useQuery<SiaeTicketType[]>({
    queryKey: ['/api/siae/ticket-types'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8" data-testid="loader-ticket-types"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" data-testid="text-ticket-types-description">
        TAB.3 - Tipologie Titolo di Accesso
      </p>
      <div className="rounded-md border" data-testid="table-ticket-types-container">
        <Table data-testid="table-ticket-types">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20" data-testid="header-tt-code">Codice</TableHead>
              <TableHead data-testid="header-tt-name">Nome</TableHead>
              <TableHead className="w-24" data-testid="header-tt-nominal">Nominativo</TableHead>
              <TableHead className="w-24" data-testid="header-tt-document">Documento</TableHead>
              <TableHead className="w-24" data-testid="header-tt-status">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {types.map((type) => (
              <TableRow key={type.id} data-testid={`row-ticket-type-${type.id}`}>
                <TableCell className="font-mono" data-testid={`cell-tt-code-${type.id}`}>{type.code}</TableCell>
                <TableCell data-testid={`cell-tt-name-${type.id}`}>{type.name}</TableCell>
                <TableCell data-testid={`cell-tt-nominal-${type.id}`}>
                  <Badge variant={type.isNominal ? "default" : "outline"} data-testid={`badge-tt-nominal-${type.id}`}>
                    {type.isNominal ? "Sì" : "No"}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-tt-document-${type.id}`}>
                  <Badge variant={type.requiresDocument ? "default" : "outline"} data-testid={`badge-tt-document-${type.id}`}>
                    {type.requiresDocument ? "Sì" : "No"}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-tt-status-${type.id}`}>
                  <Badge variant={type.active ? "default" : "secondary"} data-testid={`badge-tt-status-${type.id}`}>
                    {type.active ? "Attivo" : "Disattivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ServiceCodesTab() {
  const { data: services = [], isLoading } = useQuery<SiaeServiceCode[]>({
    queryKey: ['/api/siae/service-codes'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8" data-testid="loader-services"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" data-testid="text-services-description">
        TAB.4 - Codici Prestazione
      </p>
      <div className="rounded-md border" data-testid="table-services-container">
        <Table data-testid="table-services">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20" data-testid="header-service-code">Codice</TableHead>
              <TableHead data-testid="header-service-name">Nome</TableHead>
              <TableHead className="w-32" data-testid="header-service-category">Categoria</TableHead>
              <TableHead className="w-24" data-testid="header-service-status">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                <TableCell className="font-mono" data-testid={`cell-service-code-${service.id}`}>{service.code}</TableCell>
                <TableCell data-testid={`cell-service-name-${service.id}`}>{service.name}</TableCell>
                <TableCell data-testid={`cell-service-category-${service.id}`}>{service.category || '-'}</TableCell>
                <TableCell data-testid={`cell-service-status-${service.id}`}>
                  <Badge variant={service.active ? "default" : "secondary"} data-testid={`badge-service-${service.id}`}>
                    {service.active ? "Attivo" : "Disattivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CancellationReasonsTab() {
  const { data: reasons = [], isLoading } = useQuery<SiaeCancellationReason[]>({
    queryKey: ['/api/siae/cancellation-reasons'],
  });

  if (isLoading) {
    return <div className="flex justify-center p-8" data-testid="loader-cancellations"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" data-testid="text-cancellations-description">
        TAB.5 - Causali Annullamento Titolo
      </p>
      <div className="rounded-md border" data-testid="table-cancellations-container">
        <Table data-testid="table-cancellations">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20" data-testid="header-reason-code">Codice</TableHead>
              <TableHead data-testid="header-reason-name">Nome</TableHead>
              <TableHead className="w-24" data-testid="header-reason-refund">Rimborso</TableHead>
              <TableHead className="w-24" data-testid="header-reason-status">Stato</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reasons.map((reason) => (
              <TableRow key={reason.id} data-testid={`row-reason-${reason.id}`}>
                <TableCell className="font-mono" data-testid={`cell-reason-code-${reason.id}`}>{reason.code}</TableCell>
                <TableCell data-testid={`cell-reason-name-${reason.id}`}>{reason.name}</TableCell>
                <TableCell data-testid={`cell-reason-refund-${reason.id}`}>
                  <Badge variant={reason.requiresRefund ? "destructive" : "outline"} data-testid={`badge-reason-refund-${reason.id}`}>
                    {reason.requiresRefund ? "Sì" : "No"}
                  </Badge>
                </TableCell>
                <TableCell data-testid={`cell-reason-status-${reason.id}`}>
                  <Badge variant={reason.active ? "default" : "secondary"} data-testid={`badge-reason-status-${reason.id}`}>
                    {reason.active ? "Attivo" : "Disattivo"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Helper functions for export
function exportToCSV(data: any[], filename: string, columns: { key: string; label: string }[]) {
  const headers = columns.map(c => c.label).join(',');
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      // Handle special cases
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'Sì' : 'No';
      if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
      return value;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportToPDF(data: any[], title: string, filename: string, columns: { key: string; label: string }[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(16);
  doc.text(title, pageWidth / 2, 20, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Table
  const startY = 40;
  const cellPadding = 3;
  const colWidth = (pageWidth - 20) / columns.length;
  
  // Headers
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  columns.forEach((col, i) => {
    doc.text(col.label, 10 + i * colWidth + cellPadding, startY);
  });
  
  // Draw header line
  doc.line(10, startY + 3, pageWidth - 10, startY + 3);
  
  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  let y = startY + 10;
  
  data.forEach((item, rowIdx) => {
    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 20;
    }
    
    columns.forEach((col, i) => {
      let value = item[col.key];
      if (value === null || value === undefined) value = '-';
      else if (typeof value === 'boolean') value = value ? 'Sì' : 'No';
      else value = String(value);
      
      // Truncate long text
      if (value.length > 20) value = value.substring(0, 17) + '...';
      
      doc.text(value, 10 + i * colWidth + cellPadding, y);
    });
    y += 7;
  });
  
  doc.save(`${filename}.pdf`);
}

async function exportToExcel(data: any[], title: string, filename: string, columns: { key: string; label: string }[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Event4U';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet(title.substring(0, 31)); // Excel sheet name max 31 chars
  
  // Add title row
  worksheet.mergeCells('A1', String.fromCharCode(64 + columns.length) + '1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };
  
  // Add date row
  worksheet.mergeCells('A2', String.fromCharCode(64 + columns.length) + '2');
  const dateCell = worksheet.getCell('A2');
  dateCell.value = `Generato il: ${new Date().toLocaleDateString('it-IT')}`;
  dateCell.font = { size: 10, italic: true };
  dateCell.alignment = { horizontal: 'center' };
  
  // Add header row
  const headerRow = worksheet.addRow(columns.map(col => col.label));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Add data rows
  data.forEach((item) => {
    const rowData = columns.map(col => {
      let value = item[col.key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'boolean') return value ? 'Sì' : 'No';
      return value;
    });
    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });
  
  // Auto-fit columns
  worksheet.columns.forEach((column) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? String(cell.value) : '';
      maxLength = Math.max(maxLength, cellValue.length + 2);
    });
    column.width = Math.min(maxLength, 40);
  });
  
  // Generate and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function SiaeTablesPage() {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("genres");

  // Queries for all tables to enable export
  const { data: genres = [] } = useQuery<SiaeEventGenre[]>({ queryKey: ['/api/siae/event-genres'] });
  const { data: sectors = [] } = useQuery<SiaeSectorCode[]>({ queryKey: ['/api/siae/sector-codes'] });
  const { data: ticketTypes = [] } = useQuery<SiaeTicketType[]>({ queryKey: ['/api/siae/ticket-types'] });
  const { data: services = [] } = useQuery<SiaeServiceCode[]>({ queryKey: ['/api/siae/service-codes'] });
  const { data: cancellationReasons = [] } = useQuery<SiaeCancellationReason[]>({ queryKey: ['/api/siae/cancellation-reasons'] });

  const getExportData = () => {
    switch (activeTab) {
      case 'genres':
        // Trasforma i dati per includere IVA e ISI formattati
        const genresForExport = genres.map(g => {
          // Formatta IVA - usa valore specifico o default basato su taxType
          let ivaFormatted: string;
          if (g.vatRate !== null && g.vatRate !== undefined) {
            const vatNum = Number(g.vatRate);
            ivaFormatted = Number.isInteger(vatNum) ? `${vatNum}%` : `${vatNum.toFixed(2)}%`;
          } else {
            // Default: Spettacoli 10%, Intrattenimento 22%
            ivaFormatted = g.taxType === 'S' ? '10%' : '22%';
          }
          return {
            ...g,
            taxTypeFormatted: g.taxType === 'S' ? 'Spettacolo' : 'Intrattenimento',
            ivaFormatted,
            isiFormatted: g.taxType === 'I' ? 'ISI 16%' : 'Esente'
          };
        });
        return { 
          data: genresForExport, 
          title: 'TAB.1 - Generi Manifestazione', 
          filename: 'siae_generi_manifestazione',
          columns: [
            { key: 'code', label: 'Codice' },
            { key: 'name', label: 'Nome' },
            { key: 'taxTypeFormatted', label: 'Tipo Imposta' },
            { key: 'ivaFormatted', label: 'IVA' },
            { key: 'isiFormatted', label: 'ISI' },
            { key: 'active', label: 'Attivo' },
          ]
        };
      case 'sectors':
        return { 
          data: sectors, 
          title: 'TAB.2 - Codici Settore', 
          filename: 'siae_codici_settore',
          columns: [
            { key: 'code', label: 'Codice' },
            { key: 'name', label: 'Nome' },
            { key: 'maxCapacity', label: 'Capienza Max' },
            { key: 'active', label: 'Attivo' },
          ]
        };
      case 'ticket-types':
        return { 
          data: ticketTypes, 
          title: 'TAB.3 - Tipologie Titolo', 
          filename: 'siae_tipologie_titolo',
          columns: [
            { key: 'code', label: 'Codice' },
            { key: 'name', label: 'Nome' },
            { key: 'isNominal', label: 'Nominativo' },
            { key: 'requiresDocument', label: 'Documento' },
            { key: 'active', label: 'Attivo' },
          ]
        };
      case 'services':
        return { 
          data: services, 
          title: 'TAB.4 - Codici Prestazione', 
          filename: 'siae_codici_prestazione',
          columns: [
            { key: 'code', label: 'Codice' },
            { key: 'name', label: 'Nome' },
            { key: 'category', label: 'Categoria' },
            { key: 'active', label: 'Attivo' },
          ]
        };
      case 'cancellations':
        return { 
          data: cancellationReasons, 
          title: 'TAB.5 - Causali Annullamento', 
          filename: 'siae_causali_annullamento',
          columns: [
            { key: 'code', label: 'Codice' },
            { key: 'name', label: 'Nome' },
            { key: 'requiresRefund', label: 'Rimborso' },
            { key: 'active', label: 'Attivo' },
          ]
        };
      default:
        return { data: [], title: '', filename: '', columns: [] };
    }
  };

  const handleExportCSV = () => {
    const { data, filename, columns } = getExportData();
    if (data.length === 0) {
      toast({ title: "Nessun dato da esportare", variant: "destructive" });
      return;
    }
    exportToCSV(data, filename, columns);
    toast({ title: "Export CSV completato" });
  };

  const handleExportPDF = () => {
    const { data, title, filename, columns } = getExportData();
    if (data.length === 0) {
      toast({ title: "Nessun dato da esportare", variant: "destructive" });
      return;
    }
    exportToPDF(data, title, filename, columns);
    toast({ title: "Export PDF completato" });
  };

  const handleExportExcel = async () => {
    const { data, title, filename, columns } = getExportData();
    if (data.length === 0) {
      toast({ title: "Nessun dato da esportare", variant: "destructive" });
      return;
    }
    try {
      await exportToExcel(data, title, filename, columns);
      toast({ title: "Export Excel completato" });
    } catch (error) {
      toast({ title: "Errore nell'export Excel", variant: "destructive" });
    }
  };

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-siae-tables">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tabelle SIAE</h1>
            <p className="text-muted-foreground">
              Gestione tabelle di sistema secondo Decreto 23/07/2001 e Provvedimento 356768/2025
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-excel">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} data-testid="button-export-pdf">
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        <Card data-testid="card-tables">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="tabs-siae">
              <TabsList className="grid w-full grid-cols-5 mb-6" data-testid="tabs-list">
                <TabsTrigger value="genres" className="flex items-center gap-2" data-testid="tab-genres">
                  <Music className="w-4 h-4" />
                  <span>Generi</span>
                </TabsTrigger>
                <TabsTrigger value="sectors" className="flex items-center gap-2" data-testid="tab-sectors">
                  <MapPin className="w-4 h-4" />
                  <span>Settori</span>
                </TabsTrigger>
                <TabsTrigger value="ticket-types" className="flex items-center gap-2" data-testid="tab-ticket-types">
                  <Ticket className="w-4 h-4" />
                  <span>Tipi Titolo</span>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center gap-2" data-testid="tab-services">
                  <Briefcase className="w-4 h-4" />
                  <span>Prestazioni</span>
                </TabsTrigger>
                <TabsTrigger value="cancellations" className="flex items-center gap-2" data-testid="tab-cancellations">
                  <XCircle className="w-4 h-4" />
                  <span>Causali</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="genres" data-testid="tabcontent-genres">
                <EventGenresTab />
              </TabsContent>
              
              <TabsContent value="sectors" data-testid="tabcontent-sectors">
                <SectorCodesTab />
              </TabsContent>
              
              <TabsContent value="ticket-types" data-testid="tabcontent-ticket-types">
                <TicketTypesTab />
              </TabsContent>
              
              <TabsContent value="services" data-testid="tabcontent-services">
                <ServiceCodesTab />
              </TabsContent>
              
              <TabsContent value="cancellations" data-testid="tabcontent-cancellations">
                <CancellationReasonsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title="Tabelle SIAE" showBackButton showMenuButton showUserMenu />}
      contentClassName="pb-24"
    >
      <div className="p-4 md:p-6 space-y-6 overflow-auto h-full pb-24 md:pb-8" data-testid="page-siae-tables">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm flex-1" data-testid="description-page">
            Tabelle di sistema SIAE
          </p>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-export-csv-mobile">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="button-export-excel-mobile">
              <FileSpreadsheet className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} data-testid="button-export-pdf-mobile">
              <FileText className="w-4 h-4" />
            </Button>
          </div>
        </div>

      <Card className="glass-card" data-testid="card-tables">
        <CardContent className="p-4 md:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" data-testid="tabs-siae">
            <TabsList className="grid w-full grid-cols-5 mb-6" data-testid="tabs-list">
              <TabsTrigger value="genres" className="flex items-center gap-2" data-testid="tab-genres">
                <Music className="w-4 h-4" />
                <span className="hidden md:inline">Generi</span>
              </TabsTrigger>
              <TabsTrigger value="sectors" className="flex items-center gap-2" data-testid="tab-sectors">
                <MapPin className="w-4 h-4" />
                <span className="hidden md:inline">Settori</span>
              </TabsTrigger>
              <TabsTrigger value="ticket-types" className="flex items-center gap-2" data-testid="tab-ticket-types">
                <Ticket className="w-4 h-4" />
                <span className="hidden md:inline">Tipi Titolo</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="flex items-center gap-2" data-testid="tab-services">
                <Briefcase className="w-4 h-4" />
                <span className="hidden md:inline">Prestazioni</span>
              </TabsTrigger>
              <TabsTrigger value="cancellations" className="flex items-center gap-2" data-testid="tab-cancellations">
                <XCircle className="w-4 h-4" />
                <span className="hidden md:inline">Causali</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="genres" data-testid="tabcontent-genres">
              <EventGenresTab />
            </TabsContent>
            
            <TabsContent value="sectors" data-testid="tabcontent-sectors">
              <SectorCodesTab />
            </TabsContent>
            
            <TabsContent value="ticket-types" data-testid="tabcontent-ticket-types">
              <TicketTypesTab />
            </TabsContent>
            
            <TabsContent value="services" data-testid="tabcontent-services">
              <ServiceCodesTab />
            </TabsContent>
            
            <TabsContent value="cancellations" data-testid="tabcontent-cancellations">
              <CancellationReasonsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </MobileAppLayout>
  );
}
