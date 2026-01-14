import { useState, useRef, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Save, Eye, Trash2, Plus, Move, 
  Type, Calendar, Hash, QrCode, Image, 
  AlignLeft, AlignCenter, AlignRight, 
  GripVertical, Settings2, Layers,
  ZoomIn, ZoomOut, RotateCw, RotateCcw, Shield, Printer,
  Minus, Square, Scissors, Monitor
} from 'lucide-react';
import { MobileAppLayout, MobileHeader } from '@/components/mobile-primitives';
import type { TicketTemplate, TicketTemplateElement } from '@shared/schema';

// Element types for TICKET templates - SIAE compliant fields
const TICKET_ELEMENT_TYPES = [
  // Testo generico
  { type: 'text', label: 'Testo Statico', icon: Type, fieldKey: null, category: 'general' },
  
  // Elementi grafici
  { type: 'line', label: 'Linea', icon: Minus, fieldKey: null, category: 'graphics' },
  { type: 'cutline', label: 'Linea di Taglio', icon: Scissors, fieldKey: null, category: 'graphics' },
  { type: 'rectangle', label: 'Rettangolo', icon: Square, fieldKey: null, category: 'graphics' },
  
  // Campi evento
  { type: 'dynamic', label: 'Nome Evento', icon: Type, fieldKey: 'event_name', category: 'event' },
  { type: 'dynamic', label: 'Data Evento', icon: Calendar, fieldKey: 'event_date', category: 'event' },
  { type: 'dynamic', label: 'Ora Evento', icon: Calendar, fieldKey: 'event_time', category: 'event' },
  { type: 'dynamic', label: 'Luogo', icon: Type, fieldKey: 'venue_name', category: 'event' },
  { type: 'dynamic', label: 'Prezzo', icon: Hash, fieldKey: 'price', category: 'event' },
  
  // Campi biglietto
  { type: 'dynamic', label: 'Numero Biglietto', icon: Hash, fieldKey: 'ticket_number', category: 'ticket' },
  { type: 'dynamic', label: 'Numero Progressivo', icon: Hash, fieldKey: 'progressive_number', category: 'ticket' },
  { type: 'dynamic', label: 'Tipo Biglietto', icon: Type, fieldKey: 'ticket_type', category: 'ticket' },
  { type: 'dynamic', label: 'Settore', icon: Type, fieldKey: 'sector', category: 'ticket' },
  { type: 'dynamic', label: 'Fila', icon: Type, fieldKey: 'row', category: 'ticket' },
  { type: 'dynamic', label: 'Posto', icon: Type, fieldKey: 'seat', category: 'ticket' },
  { type: 'dynamic', label: 'Acquirente', icon: Type, fieldKey: 'buyer_name', category: 'ticket' },
  { type: 'dynamic', label: 'Testo Libero', icon: Type, fieldKey: 'custom_text', category: 'ticket' },
  
  // CAMPI OBBLIGATORI SIAE
  { type: 'dynamic', label: 'Ditta Organizzatrice', icon: Type, fieldKey: 'organizer_company', category: 'siae', required: true },
  { type: 'dynamic', label: 'Gestore Biglietteria', icon: Type, fieldKey: 'ticketing_manager', category: 'siae', required: true },
  { type: 'dynamic', label: 'Data/Ora Emissione', icon: Calendar, fieldKey: 'emission_datetime', category: 'siae', required: true },
  { type: 'dynamic', label: 'Sigillo Fiscale', icon: Hash, fieldKey: 'fiscal_seal', category: 'siae', required: true },
  
  // QR Code (obbligatorio per validazione)
  { type: 'qrcode', label: 'QR Code', icon: QrCode, fieldKey: 'qr_code', category: 'siae', required: true },
];

// Element types for SUBSCRIPTION templates - SIAE compliant fields
const SUBSCRIPTION_ELEMENT_TYPES = [
  // Testo generico
  { type: 'text', label: 'Testo Statico', icon: Type, fieldKey: null, category: 'general' },
  
  // Elementi grafici
  { type: 'line', label: 'Linea', icon: Minus, fieldKey: null, category: 'graphics' },
  { type: 'cutline', label: 'Linea di Taglio', icon: Scissors, fieldKey: null, category: 'graphics' },
  { type: 'rectangle', label: 'Rettangolo', icon: Square, fieldKey: null, category: 'graphics' },
  
  // Campi abbonamento
  { type: 'dynamic', label: 'Codice Abbonamento', icon: Hash, fieldKey: 'subscription_code', category: 'subscription' },
  { type: 'dynamic', label: 'Nome Abbonato', icon: Type, fieldKey: 'subscriber_name', category: 'subscription' },
  { type: 'dynamic', label: 'Tipo Abbonamento', icon: Type, fieldKey: 'subscription_type', category: 'subscription' },
  { type: 'dynamic', label: 'Numero Ingressi', icon: Hash, fieldKey: 'total_entries', category: 'subscription' },
  { type: 'dynamic', label: 'Ingressi Usati', icon: Hash, fieldKey: 'used_entries', category: 'subscription' },
  { type: 'dynamic', label: 'Ingressi Rimanenti', icon: Hash, fieldKey: 'remaining_entries', category: 'subscription' },
  { type: 'dynamic', label: 'Valido Dal', icon: Calendar, fieldKey: 'valid_from', category: 'subscription' },
  { type: 'dynamic', label: 'Valido Al', icon: Calendar, fieldKey: 'valid_to', category: 'subscription' },
  { type: 'dynamic', label: 'Prezzo', icon: Hash, fieldKey: 'price', category: 'subscription' },
  { type: 'dynamic', label: 'Luogo', icon: Type, fieldKey: 'venue_name', category: 'subscription' },
  { type: 'dynamic', label: 'Testo Libero', icon: Type, fieldKey: 'custom_text', category: 'subscription' },
  
  // CAMPI OBBLIGATORI SIAE
  { type: 'dynamic', label: 'Ditta Organizzatrice', icon: Type, fieldKey: 'organizer_company', category: 'siae', required: true },
  { type: 'dynamic', label: 'Gestore Biglietteria', icon: Type, fieldKey: 'ticketing_manager', category: 'siae', required: true },
  { type: 'dynamic', label: 'Data/Ora Emissione', icon: Calendar, fieldKey: 'emission_datetime', category: 'siae', required: true },
  { type: 'dynamic', label: 'Sigillo Fiscale', icon: Hash, fieldKey: 'fiscal_seal', category: 'siae', required: true },
  { type: 'dynamic', label: 'Contatore Sigillo', icon: Hash, fieldKey: 'fiscal_counter', category: 'siae', required: true },
  { type: 'dynamic', label: 'Carta Attivazione', icon: Hash, fieldKey: 'card_code', category: 'siae', required: true },
  
  // QR Code (obbligatorio per validazione)
  { type: 'qrcode', label: 'QR Code', icon: QrCode, fieldKey: 'qr_code', category: 'siae', required: true },
];

// Sample data for TICKET preview - includes all SIAE required fields
const TICKET_SAMPLE_DATA: Record<string, string> = {
  event_name: 'Concerto Rock Festival',
  event_date: '25/12/2024',
  event_time: '21:00',
  venue_name: 'Stadio San Siro',
  price: '€ 45,00',
  ticket_number: 'TKT-2024-001234',
  progressive_number: '1',
  ticket_type: 'Intero',
  sector: 'Tribuna A',
  row: '12',
  seat: '45',
  buyer_name: 'Mario Rossi',
  custom_text: 'Testo personalizzato',
  // SIAE required fields
  organizer_company: 'Eventi SpA',
  ticketing_manager: 'Biglietteria Centrale Srl',
  emission_datetime: '20/12/2024 15:30',
  fiscal_seal: 'SIAE-2024-A1B2C3D4',
  qr_code: 'QR-VALIDATION-CODE',
};

// Sample data for SUBSCRIPTION preview - includes all SIAE required fields
const SUBSCRIPTION_SAMPLE_DATA: Record<string, string> = {
  subscription_code: 'ABB-2024-001234',
  subscriber_name: 'Mario Rossi',
  subscription_type: 'Abbonamento Stagionale',
  total_entries: '10',
  used_entries: '0',
  remaining_entries: '10',
  valid_from: '01/01/2024',
  valid_to: '31/12/2024',
  price: '€ 150,00',
  venue_name: 'Club Paradise',
  custom_text: 'Testo personalizzato',
  // SIAE required fields
  organizer_company: 'Eventi SpA',
  ticketing_manager: 'Biglietteria Centrale Srl',
  emission_datetime: '20/12/2024 15:30',
  fiscal_seal: 'SIAE-2024-A1B2C3D4',
  fiscal_counter: '1234',
  card_code: '4130313238343837',
  qr_code: 'QR-VALIDATION-CODE',
};

// mm to px conversion (approximate, 96 DPI screen)
const MM_TO_PX = 3.78;

interface CanvasElement {
  id: string;
  type: string;
  fieldKey: string | null;
  staticValue: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  textAlign: string;
  color: string;
  barcodeFormat: string | null;
  zIndex: number;
}

export default function TemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);
  const isSuperAdmin = user?.role === 'super_admin';
  
  // Canvas state
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const [zoom, setZoom] = useState(1); // Zoom level (0.5 to 2)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [showTestPrintDialog, setShowTestPrintDialog] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  
  // Template metadata
  const [templateName, setTemplateName] = useState('Nuovo Template');
  const [templateType, setTemplateType] = useState<'ticket' | 'subscription'>('ticket');
  const [paperWidth, setPaperWidth] = useState(80);
  const [paperHeight, setPaperHeight] = useState(50);
  const [printOrientation, setPrintOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  
  // Get element types and sample data based on template type
  const ELEMENT_TYPES = templateType === 'subscription' ? SUBSCRIPTION_ELEMENT_TYPES : TICKET_ELEMENT_TYPES;
  const SAMPLE_DATA = templateType === 'subscription' ? SUBSCRIPTION_SAMPLE_DATA : TICKET_SAMPLE_DATA;
  
  // Load companies for super_admin
  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin && !id, // Only for new templates
  });

  // Fetch template if editing
  const { data: template, isLoading } = useQuery<TicketTemplate & { elements: TicketTemplateElement[] }>({
    queryKey: ['/api/ticket/templates', id],
    enabled: !!id,
    staleTime: 0, // Always refetch to ensure fresh data after edits
  });

  // Fetch connected print agents (only when dialog is open)
  const { data: connectedAgents = [], isLoading: agentsLoading } = useQuery<{ agentId: string; deviceName: string }[]>({
    queryKey: ['/api/ticket/templates', id, 'agents'],
    enabled: !!id && showTestPrintDialog,
  });


  // Load template data when fetched
  useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateType(((template as any).templateType as 'ticket' | 'subscription') || 'ticket');
      setPaperWidth(template.paperWidthMm || 80);
      setPaperHeight(template.paperHeightMm || 50);
      setPrintOrientation((template as any).printOrientation || 'auto');
      setBackgroundImage(template.backgroundImageUrl || null);
      
      if (template.elements) {
        setElements(template.elements.map((el: TicketTemplateElement) => ({
          id: el.id,
          type: el.type,
          fieldKey: el.fieldKey || null,
          staticValue: el.staticValue || '',
          x: parseFloat(el.x as any) || 0,
          y: parseFloat(el.y as any) || 0,
          width: parseFloat(el.width as any) || 20,
          height: parseFloat(el.height as any) || 5,
          rotation: el.rotation || 0,
          fontFamily: el.fontFamily || 'Arial',
          fontSize: el.fontSize || 12,
          fontWeight: el.fontWeight || 'normal',
          textAlign: el.textAlign || 'left',
          color: el.color || '#000000',
          barcodeFormat: el.barcodeFormat || null,
          zIndex: el.zIndex || 0,
        })));
      }
    }
  }, [template]);

  // Filter elements when template type changes (only for user-initiated changes, not initial load)
  const [initialTypeLoaded, setInitialTypeLoaded] = useState(false);
  const prevTemplateType = useRef(templateType);
  
  useEffect(() => {
    // Skip on initial load from database
    if (template && !initialTypeLoaded) {
      setInitialTypeLoaded(true);
      prevTemplateType.current = templateType;
      return;
    }
    
    // Only filter if type actually changed by user action
    if (prevTemplateType.current !== templateType && elements.length > 0) {
      // Get valid fieldKeys for the new type
      const validFieldKeys = new Set(
        (templateType === 'subscription' ? SUBSCRIPTION_ELEMENT_TYPES : TICKET_ELEMENT_TYPES)
          .map(t => t.fieldKey)
          .filter(Boolean)
      );
      
      // Elements without fieldKey (static text, graphics, qr_code) are always kept
      const filteredElements = elements.filter(el => {
        if (!el.fieldKey) return true; // Static elements
        if (el.type === 'qr_code' || el.type === 'barcode') return true; // QR/barcode always kept
        return validFieldKeys.has(el.fieldKey);
      });
      
      if (filteredElements.length !== elements.length) {
        setElements(filteredElements);
        toast({
          title: 'Elementi aggiornati',
          description: `Rimossi ${elements.length - filteredElements.length} elementi incompatibili con il tipo ${templateType === 'subscription' ? 'Abbonamento' : 'Biglietto'}`,
        });
      }
      
      prevTemplateType.current = templateType;
    }
  }, [templateType, elements.length, initialTypeLoaded]);

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const templateData: any = {
        name: templateName,
        templateType: templateType,
        paperWidthMm: paperWidth,
        paperHeightMm: paperHeight,
        printOrientation: printOrientation,
        backgroundImageUrl: backgroundImage,
        isActive: true,
      };
      
      // Super admin must provide companyId for new templates (or __GLOBAL__ for system templates)
      if (isSuperAdmin && !id && selectedCompanyId) {
        // If __GLOBAL__, set companyId to null for system-wide template
        if (selectedCompanyId === '__GLOBAL__') {
          templateData.companyId = null;
          templateData.isGlobal = true;
        } else {
          templateData.companyId = selectedCompanyId;
        }
      }

      let templateId = id;
      
      if (id) {
        // Update existing template
        await apiRequest('PATCH', `/api/ticket/templates/${id}`, templateData);
      } else {
        // Create new template - check companyId for super_admin
        if (isSuperAdmin && !selectedCompanyId) {
          throw new Error('Seleziona un tipo (Sistema o Azienda)');
        }
        const res = await apiRequest('POST', '/api/ticket/templates', templateData);
        const newTemplate = await res.json();
        templateId = newTemplate.id;
      }
      
      // Bulk save elements
      const bulkRes = await apiRequest('POST', `/api/ticket/templates/${templateId}/elements/bulk`, {
        elements: elements.map((el, index) => ({
          type: el.type,
          fieldKey: el.fieldKey,
          staticValue: el.staticValue,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          fontFamily: el.fontFamily,
          fontSize: el.fontSize,
          fontWeight: el.fontWeight,
          textAlign: el.textAlign,
          color: el.color,
          barcodeFormat: el.barcodeFormat,
          zIndex: index,
        })),
      });
      
      const bulkData = await bulkRes.json();
      
      return { templateId, savedElements: bulkData.elements };
    },
    onSuccess: ({ templateId, savedElements }) => {
      // Always update local elements with database IDs (even if empty array)
      const updatedElements = (savedElements || []).map((el: any) => ({
        id: el.id,
        type: el.type,
        fieldKey: el.fieldKey || null,
        staticValue: el.staticValue || '',
        x: parseFloat(el.x) || 0,
        y: parseFloat(el.y) || 0,
        width: parseFloat(el.width) || 20,
        height: parseFloat(el.height) || 5,
        rotation: el.rotation || 0,
        fontFamily: el.fontFamily || 'Arial',
        fontSize: el.fontSize || 12,
        fontWeight: el.fontWeight || 'normal',
        textAlign: el.textAlign || 'left',
        color: el.color || '#000000',
        barcodeFormat: el.barcodeFormat || null,
        zIndex: el.zIndex || 0,
      }));
      setElements(updatedElements);
      
      queryClient.invalidateQueries({ queryKey: ['/api/ticket/templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/ticket/templates', templateId] });
      toast({ title: 'Template salvato', description: 'Il template è stato salvato con successo' });
      if (!id) {
        navigate(`/template-builder/${templateId}`);
      }
    },
    onError: (error: any) => {
      console.error('Template save error:', error);
      const message = error?.message || 'Impossibile salvare il template';
      toast({ title: 'Errore', description: message, variant: 'destructive' });
    },
  });

  // Test print mutation - uses template dimensions directly, no profile needed
  const testPrintMutation = useMutation({
    mutationFn: async ({ agentId }: { agentId: string }) => {
      const res = await apiRequest('POST', `/api/ticket/templates/${id}/test-print`, { agentId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Stampa di prova inviata', description: 'Verifica la stampante' });
      setShowTestPrintDialog(false);
      setSelectedAgentId('');
    },
    onError: (error: any) => {
      toast({ title: 'Errore', description: error?.message || 'Impossibile inviare la stampa di prova', variant: 'destructive' });
    },
  });

  // Add new element
  const addElement = (elementType: typeof ELEMENT_TYPES[0]) => {
    // Determine default dimensions based on element type
    let defaultWidth = 30;
    let defaultHeight = 5;
    
    if (elementType.type === 'qrcode') {
      defaultWidth = 15;
      defaultHeight = 15;
    } else if (elementType.type === 'line' || elementType.type === 'cutline') {
      defaultWidth = 60;
      defaultHeight = 1;
    } else if (elementType.type === 'rectangle') {
      defaultWidth = 30;
      defaultHeight = 20;
    }
    
    const newElement: CanvasElement = {
      id: `temp-${Date.now()}`,
      type: elementType.type,
      fieldKey: elementType.fieldKey,
      staticValue: elementType.type === 'text' ? 'Testo' : '',
      x: 10,
      y: 10,
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#000000',
      barcodeFormat: elementType.type === 'barcode' ? 'CODE128' : null,
      zIndex: elements.length,
    };
    setElements([...elements, newElement]);
    setSelectedElement(newElement.id);
  };

  // Delete selected element
  const deleteSelected = () => {
    if (selectedElement) {
      setElements(elements.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  // Update element property
  const updateElement = (id: string, updates: Partial<CanvasElement>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  // Handle mouse down on element
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setIsDragging(true);
    
    const element = elements.find(el => el.id === elementId);
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - (element.x * MM_TO_PX * zoom),
        y: e.clientY - rect.top - (element.y * MM_TO_PX * zoom),
      });
    }
  };

  // Handle mouse move (zoom-aware)
  // Extended limits to allow positioning rotated elements properly
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && selectedElement && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - rect.left - dragOffset.x) / (MM_TO_PX * zoom);
      const newY = (e.clientY - rect.top - dragOffset.y) / (MM_TO_PX * zoom);
      
      const element = elements.find(el => el.id === selectedElement);
      const maxDim = element ? Math.max(element.width, element.height) : 30;
      
      updateElement(selectedElement, {
        x: Math.max(-maxDim, Math.min(newX, paperWidth + maxDim)),
        y: Math.max(-maxDim, Math.min(newY, paperHeight + maxDim)),
      });
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Get display value for element
  const getDisplayValue = (element: CanvasElement) => {
    if (element.type === 'text') return element.staticValue;
    if (element.fieldKey && SAMPLE_DATA[element.fieldKey as keyof typeof SAMPLE_DATA]) {
      return SAMPLE_DATA[element.fieldKey as keyof typeof SAMPLE_DATA];
    }
    return `{${element.fieldKey}}`;
  };

  const selected = elements.find(el => el.id === selectedElement);

  // Handle background image upload
  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Block access for non-super_admin users
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Shield className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Accesso non autorizzato</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Solo i Super Admin possono creare e modificare i template di stampa.
          Contatta un amministratore per richiedere modifiche.
        </p>
        <Button variant="outline" onClick={() => navigate('/printer-settings')} data-testid="button-back-unauthorized">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alle Impostazioni
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Desktop version
  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 h-full" data-testid="page-template-builder-desktop">
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="border-b p-2 sm:p-3 md:p-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4 bg-card rounded-t-lg">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/printer-settings')} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0"
              data-testid="input-template-name"
            />
            <p className="text-sm text-muted-foreground">
              {paperWidth}mm × {paperHeight}mm
            </p>
          </div>
          {/* Template type selector */}
          <Select value={templateType} onValueChange={(v) => setTemplateType(v as 'ticket' | 'subscription')}>
            <SelectTrigger className="w-40" data-testid="select-template-type">
              <SelectValue placeholder="Tipo..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ticket">
                <span className="flex items-center gap-2">🎫 Biglietto</span>
              </SelectItem>
              <SelectItem value="subscription">
                <span className="flex items-center gap-2">📅 Abbonamento</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {/* Company selector for super_admin creating new template */}
          {isSuperAdmin && !id && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-56" data-testid="select-company-template">
                <SelectValue placeholder="Seleziona azienda..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__GLOBAL__">
                  <span className="font-semibold text-purple-600">Template di Sistema</span>
                </SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 border rounded-md px-2 py-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              disabled={zoom <= 0.5}
              data-testid="button-zoom-out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setZoom(z => Math.min(2, z + 0.25))}
              disabled={zoom >= 2}
              data-testid="button-zoom-in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)} data-testid="button-preview">
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Editor' : 'Anteprima'}
          </Button>
          {id && (
            <Button variant="outline" onClick={() => setShowTestPrintDialog(true)} data-testid="button-test-print">
              <Printer className="h-4 w-4 mr-2" />
              Prova Stampa
            </Button>
          )}
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Salvataggio...' : 'Salva'}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Toolbox Sidebar */}
        <div className="w-64 border-r bg-card overflow-y-auto">
          <Tabs defaultValue="elements" className="h-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="elements" data-testid="tab-elements">
                <Layers className="h-4 w-4 mr-2" />
                Elementi
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings2 className="h-4 w-4 mr-2" />
                Impostazioni
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="elements" className="p-4 space-y-4 m-0">
              {/* SIAE Required Fields */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Campi SIAE Obbligatori
                </Label>
                {ELEMENT_TYPES.filter(el => (el as any).category === 'siae').map((elType, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start gap-2 border-amber-500/50 bg-amber-500/10"
                    onClick={() => addElement(elType)}
                    data-testid={`button-add-${elType.fieldKey || elType.type}`}
                  >
                    <elType.icon className="h-4 w-4 text-amber-600" />
                    {elType.label}
                  </Button>
                ))}
              </div>
              
              {/* Event Fields - only for ticket templates */}
              {templateType === 'ticket' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">Campi Evento</Label>
                  {ELEMENT_TYPES.filter(el => (el as any).category === 'event').map((elType, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addElement(elType)}
                      data-testid={`button-add-${elType.fieldKey || elType.type}`}
                    >
                      <elType.icon className="h-4 w-4" />
                      {elType.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Ticket Fields - only for ticket templates */}
              {templateType === 'ticket' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">Campi Biglietto</Label>
                  {ELEMENT_TYPES.filter(el => (el as any).category === 'ticket').map((elType, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addElement(elType)}
                      data-testid={`button-add-${elType.fieldKey || elType.type}`}
                    >
                      <elType.icon className="h-4 w-4" />
                      {elType.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Subscription Fields - only for subscription templates */}
              {templateType === 'subscription' && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase">Campi Abbonamento</Label>
                  {ELEMENT_TYPES.filter(el => (el as any).category === 'subscription').map((elType, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => addElement(elType)}
                      data-testid={`button-add-${elType.fieldKey || elType.type}`}
                    >
                      <elType.icon className="h-4 w-4" />
                      {elType.label}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* General Fields */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Altri Elementi</Label>
                {ELEMENT_TYPES.filter(el => (el as any).category === 'general' || !(el as any).category).map((elType, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => addElement(elType)}
                    data-testid={`button-add-${elType.fieldKey || elType.type}`}
                  >
                    <elType.icon className="h-4 w-4" />
                    {elType.label}
                  </Button>
                ))}
              </div>
              
              {/* Graphics Elements */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase">Elementi Grafici</Label>
                {ELEMENT_TYPES.filter(el => (el as any).category === 'graphics').map((elType, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => addElement(elType)}
                    data-testid={`button-add-${elType.fieldKey || elType.type}`}
                  >
                    <elType.icon className="h-4 w-4" />
                    {elType.label}
                  </Button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="p-4 space-y-4 m-0">
              <div className="space-y-3">
                <div>
                  <Label>Larghezza (mm)</Label>
                  <Input
                    type="number"
                    value={paperWidth}
                    onChange={(e) => setPaperWidth(parseInt(e.target.value) || 80)}
                    data-testid="input-paper-width"
                  />
                </div>
                <div>
                  <Label>Altezza (mm)</Label>
                  <Input
                    type="number"
                    value={paperHeight}
                    onChange={(e) => setPaperHeight(parseInt(e.target.value) || 50)}
                    data-testid="input-paper-height"
                  />
                </div>
                <div>
                  <Label>Orientamento Stampa</Label>
                  <Select
                    value={printOrientation}
                    onValueChange={(value: 'auto' | 'portrait' | 'landscape') => setPrintOrientation(value)}
                  >
                    <SelectTrigger data-testid="select-print-orientation">
                      <SelectValue placeholder="Seleziona orientamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatico</SelectItem>
                      <SelectItem value="portrait">Verticale (Portrait)</SelectItem>
                      <SelectItem value="landscape">Orizzontale (Landscape)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatico: basato sulle dimensioni del foglio
                  </p>
                </div>
                <Separator />
                <div>
                  <Label>Immagine di sfondo</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleBackgroundUpload}
                    data-testid="input-background-image"
                  />
                  {backgroundImage && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-destructive"
                      onClick={() => setBackgroundImage(null)}
                      data-testid="button-remove-background"
                    >
                      Rimuovi sfondo
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-muted/30 p-8 overflow-auto flex items-center justify-center">
          <div
            ref={canvasRef}
            className="bg-white shadow-lg relative overflow-hidden"
            style={{
              width: paperWidth * MM_TO_PX * zoom,
              height: paperHeight * MM_TO_PX * zoom,
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(1)`,
              transformOrigin: 'center center',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedElement(null)}
            data-testid="canvas-area"
          >
            {/* Grid overlay for positioning (zoom-aware) */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)',
                backgroundSize: `${5 * MM_TO_PX * zoom}px ${5 * MM_TO_PX * zoom}px`,
              }}
            />
            
            {/* Elements */}
            {elements.map((element) => (
              <div
                key={element.id}
                className={`absolute cursor-move transition-shadow ${
                  selectedElement === element.id 
                    ? 'ring-2 ring-primary ring-offset-1' 
                    : 'hover:ring-1 hover:ring-muted-foreground'
                }`}
                style={{
                  left: element.x * MM_TO_PX * zoom,
                  top: element.y * MM_TO_PX * zoom,
                  width: element.width * MM_TO_PX * zoom,
                  height: element.height * MM_TO_PX * zoom,
                  transform: `rotate(${element.rotation}deg)`,
                  transformOrigin: 'center center',
                  zIndex: element.zIndex,
                }}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
                data-testid={`element-${element.id}`}
              >
                {element.type === 'qrcode' ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 border border-dashed">
                    QR
                  </div>
                ) : element.type === 'barcode' ? (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-500 border border-dashed">
                    |||||||
                  </div>
                ) : element.type === 'line' ? (
                  <div
                    className="w-full"
                    style={{
                      borderTop: `1px solid ${element.color}`,
                      height: 0,
                    }}
                  />
                ) : element.type === 'cutline' ? (
                  <div
                    className="w-full"
                    style={{
                      borderTop: `1px dashed ${element.color}`,
                      height: 0,
                    }}
                  />
                ) : element.type === 'rectangle' ? (
                  <div
                    className="w-full h-full"
                    style={{
                      border: `1px solid ${element.color}`,
                    }}
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center overflow-hidden whitespace-nowrap"
                    style={{
                      fontFamily: element.fontFamily,
                      fontSize: element.fontSize * zoom,
                      fontWeight: element.fontWeight as any,
                      textAlign: element.textAlign as any,
                      color: element.color,
                      justifyContent: element.textAlign === 'center' ? 'center' : element.textAlign === 'right' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {getDisplayValue(element)}
                  </div>
                )}
                
                {/* Drag handle */}
                {selectedElement === element.id && (
                  <div className="absolute -top-3 -left-3 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white cursor-grab">
                    <Move className="h-3 w-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Properties Panel */}
        <div className="w-72 border-l bg-card overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Proprietà</h3>
            
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {ELEMENT_TYPES.find(t => t.fieldKey === selected.fieldKey)?.label || 
                     (selected.type === 'text' ? 'Testo Statico' : selected.type)}
                  </span>
                  <Button variant="ghost" size="icon" onClick={deleteSelected} data-testid="button-delete-element">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                
                <Separator />
                
                {selected.type === 'text' && (
                  <div>
                    <Label>Testo</Label>
                    <Input
                      value={selected.staticValue}
                      onChange={(e) => updateElement(selected.id, { staticValue: e.target.value })}
                      data-testid="input-static-value"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>X (mm)</Label>
                    <Input
                      type="number"
                      value={Math.round(selected.x * 10) / 10}
                      onChange={(e) => updateElement(selected.id, { x: parseFloat(e.target.value) || 0 })}
                      data-testid="input-x"
                    />
                  </div>
                  <div>
                    <Label>Y (mm)</Label>
                    <Input
                      type="number"
                      value={Math.round(selected.y * 10) / 10}
                      onChange={(e) => updateElement(selected.id, { y: parseFloat(e.target.value) || 0 })}
                      data-testid="input-y"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Larghezza (mm)</Label>
                    <Input
                      type="number"
                      value={Math.round(selected.width * 10) / 10}
                      onChange={(e) => updateElement(selected.id, { width: parseFloat(e.target.value) || 10 })}
                      data-testid="input-width"
                    />
                  </div>
                  <div>
                    <Label>Altezza (mm)</Label>
                    <Input
                      type="number"
                      value={Math.round(selected.height * 10) / 10}
                      onChange={(e) => updateElement(selected.id, { height: parseFloat(e.target.value) || 5 })}
                      data-testid="input-height"
                    />
                  </div>
                </div>
                
                {/* Rotation Controls */}
                <div>
                  <Label>Rotazione</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateElement(selected.id, { rotation: (selected.rotation - 90 + 360) % 360 })}
                      data-testid="button-rotate-ccw"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={selected.rotation}
                      onChange={(e) => updateElement(selected.id, { rotation: parseInt(e.target.value) || 0 })}
                      className="w-20 text-center"
                      data-testid="input-rotation"
                    />
                    <span className="text-sm text-muted-foreground">°</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateElement(selected.id, { rotation: (selected.rotation + 90) % 360 })}
                      data-testid="button-rotate-cw"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {(selected.type === 'text' || selected.type === 'dynamic') && (
                  <>
                    <Separator />
                    
                    <div>
                      <Label>Font</Label>
                      <Select
                        value={selected.fontFamily}
                        onValueChange={(v) => updateElement(selected.id, { fontFamily: v })}
                      >
                        <SelectTrigger data-testid="select-font">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Arial">Arial</SelectItem>
                          <SelectItem value="Helvetica">Helvetica</SelectItem>
                          <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                          <SelectItem value="Courier New">Courier New</SelectItem>
                          <SelectItem value="Georgia">Georgia</SelectItem>
                          <SelectItem value="Verdana">Verdana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Dimensione</Label>
                        <Input
                          type="number"
                          value={selected.fontSize}
                          onChange={(e) => updateElement(selected.id, { fontSize: parseInt(e.target.value) || 12 })}
                          data-testid="input-font-size"
                        />
                      </div>
                      <div>
                        <Label>Peso</Label>
                        <Select
                          value={selected.fontWeight}
                          onValueChange={(v) => updateElement(selected.id, { fontWeight: v })}
                        >
                          <SelectTrigger data-testid="select-font-weight">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">Normale</SelectItem>
                            <SelectItem value="bold">Grassetto</SelectItem>
                            <SelectItem value="lighter">Leggero</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Allineamento</Label>
                      <div className="flex gap-1 mt-1">
                        <Button
                          variant={selected.textAlign === 'left' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => updateElement(selected.id, { textAlign: 'left' })}
                          data-testid="button-align-left"
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selected.textAlign === 'center' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => updateElement(selected.id, { textAlign: 'center' })}
                          data-testid="button-align-center"
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={selected.textAlign === 'right' ? 'default' : 'outline'}
                          size="icon"
                          onClick={() => updateElement(selected.id, { textAlign: 'right' })}
                          data-testid="button-align-right"
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Colore</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="color"
                          value={selected.color}
                          onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                          className="w-12 h-9 p-1"
                          data-testid="input-color"
                        />
                        <Input
                          value={selected.color}
                          onChange={(e) => updateElement(selected.id, { color: e.target.value })}
                          className="flex-1"
                          data-testid="input-color-hex"
                        />
                      </div>
                    </div>
                  </>
                )}
                
                {selected.type === 'barcode' && (
                  <div>
                    <Label>Formato Barcode</Label>
                    <Select
                      value={selected.barcodeFormat || 'CODE128'}
                      onValueChange={(v) => updateElement(selected.id, { barcodeFormat: v })}
                    >
                      <SelectTrigger data-testid="select-barcode-format">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CODE128">CODE128</SelectItem>
                        <SelectItem value="CODE39">CODE39</SelectItem>
                        <SelectItem value="EAN13">EAN13</SelectItem>
                        <SelectItem value="EAN8">EAN8</SelectItem>
                        <SelectItem value="UPC">UPC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Move className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Seleziona un elemento per modificarne le proprietà</p>
              </div>
            )}
          </div>
        </div>
      </div>

          <Dialog open={showTestPrintDialog} onOpenChange={setShowTestPrintDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Prova di Stampa</DialogTitle>
                <DialogDescription>
                  Seleziona un agente di stampa connesso per inviare una stampa di prova con dati di esempio.
                </DialogDescription>
              </DialogHeader>
              
              {agentsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : connectedAgents.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Printer className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nessun agente di stampa connesso.</p>
                  <p className="text-sm">Avvia l'app desktop Event4U su un computer con stampante.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Seleziona Agente</Label>
                    <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                      <SelectTrigger data-testid="select-agent-test-print">
                        <SelectValue placeholder="Seleziona agente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {connectedAgents.map((agent) => (
                          <SelectItem key={agent.agentId} value={agent.agentId}>
                            {agent.deviceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    La stampa userà le dimensioni del template: {paperWidth}mm × {paperHeight}mm
                  </p>
                </div>
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setShowTestPrintDialog(false);
                  setSelectedAgentId('');
                }} data-testid="button-cancel-test-print">
                  Annulla
                </Button>
                <Button 
                  onClick={() => selectedAgentId && testPrintMutation.mutate({ agentId: selectedAgentId })}
                  disabled={!selectedAgentId || testPrintMutation.isPending || connectedAgents.length === 0}
                  data-testid="button-confirm-test-print"
                >
                  {testPrintMutation.isPending ? 'Invio...' : 'Stampa Prova'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Mobile version - editor not available on mobile
  return (
    <MobileAppLayout
      header={
        <MobileHeader
          title="Template Builder"
          showBackButton
          onBack={() => navigate('/printer-settings')}
        />
      }
    >
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center" data-testid="page-template-builder-mobile">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Monitor className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Editor disponibile solo su Desktop</h2>
          <p className="text-muted-foreground max-w-sm">
            L'editor di template richiede uno schermo più grande per l'editing drag-and-drop. 
            Apri questa pagina da un computer per modificare i template.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/printer-settings')} data-testid="button-back-mobile">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alle Impostazioni
        </Button>
      </div>
    </MobileAppLayout>
  );
}
