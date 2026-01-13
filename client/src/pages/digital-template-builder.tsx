import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Save, Loader2, Palette, Image, QrCode, Layout, Type, Calendar, MapPin, Ticket, User, Upload, X, Check,
  RotateCcw, Building2, FileText, Store
} from 'lucide-react';
import { MobileAppLayout, MobileHeader } from "@/components/mobile-primitives";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DigitalTicketTemplate } from '@shared/schema';

const DEFAULT_LOGO_URL = '/logo.png';

type LogoSourceType = 'none' | 'default' | 'url' | 'file';

const templateFormSchema = z.object({
  name: z.string().min(1, "Nome obbligatorio"),
  description: z.string().optional(),
  companyId: z.string().optional(),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  primaryColor: z.string().default("#6366f1"),
  secondaryColor: z.string().default("#4f46e5"),
  backgroundColor: z.string().default("#1e1b4b"),
  textColor: z.string().default("#ffffff"),
  accentColor: z.string().default("#a855f7"),
  logoUrl: z.string().optional(),
  logoPosition: z.enum(["top-left", "top-center", "top-right"]).default("top-center"),
  logoSize: z.enum(["small", "medium", "large"]).default("medium"),
  qrSize: z.number().min(100).max(400).default(200),
  qrPosition: z.enum(["center", "bottom-center", "bottom-left"]).default("center"),
  qrStyle: z.enum(["square", "rounded", "dots"]).default("square"),
  qrForegroundColor: z.string().default("#000000"),
  qrBackgroundColor: z.string().default("#ffffff"),
  backgroundStyle: z.enum(["solid", "gradient", "pattern"]).default("gradient"),
  gradientDirection: z.enum(["to-bottom", "to-right", "radial"]).default("to-bottom"),
  showEventName: z.boolean().default(true),
  showEventDate: z.boolean().default(true),
  showEventTime: z.boolean().default(true),
  showVenue: z.boolean().default(true),
  showPrice: z.boolean().default(true),
  showTicketType: z.boolean().default(true),
  showSector: z.boolean().default(true),
  showSeat: z.boolean().default(false),
  showBuyerName: z.boolean().default(true),
  showFiscalSeal: z.boolean().default(true),
  showPerforatedEdge: z.boolean().default(true),
  fontFamily: z.string().default("Inter, system-ui, sans-serif"),
  titleFontSize: z.number().min(16).max(48).default(24),
  bodyFontSize: z.number().min(10).max(24).default(14),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const SAMPLE_DATA = {
  eventName: "Concerto Rock Festival",
  eventDate: "25 Dicembre 2024",
  eventTime: "21:00",
  venue: "Stadio San Siro",
  ticketType: "Intero",
  price: "€45,00",
  sector: "Tribuna A",
  seat: "Fila 12, Posto 45",
  buyerName: "Mario Rossi",
  fiscalSeal: "SIAE-2024-A1B2C3D4",
  ticketCode: "TKT-2024-001234",
  organizerCompany: "Eventi Italia S.r.l.",
  systemOwner: "Biglietteria Event4U",
  emissionDate: "15 Dicembre 2024 14:30"
};

const FONT_OPTIONS = [
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: "'Roboto', sans-serif", label: "Roboto" },
  { value: "'Open Sans', sans-serif", label: "Open Sans" },
  { value: "'Poppins', sans-serif", label: "Poppins" },
  { value: "'Montserrat', sans-serif", label: "Montserrat" },
  { value: "'Playfair Display', serif", label: "Playfair Display" },
  { value: "'Source Code Pro', monospace", label: "Source Code Pro" },
];

// Preview component that matches the actual PDF output layout
function DigitalTicketPreview({ config }: { config: TemplateFormData }) {
  // Generate header background style (gradient or solid)
  const getHeaderBackground = () => {
    if (config.backgroundStyle === 'solid') {
      return { backgroundColor: config.primaryColor };
    }
    if (config.backgroundStyle === 'gradient') {
      if (config.gradientDirection === 'radial') {
        return { background: `radial-gradient(circle at center, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` };
      }
      const direction = config.gradientDirection === 'to-right' ? '90deg' : '135deg';
      return { background: `linear-gradient(${direction}, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` };
    }
    return { background: `linear-gradient(135deg, ${config.primaryColor} 0%, ${config.secondaryColor} 100%)` };
  };

  const getLogoSize = () => {
    switch (config.logoSize) {
      case 'small': return 'h-6';
      case 'large': return 'h-12';
      default: return 'h-9';
    }
  };

  const getLogoPosition = () => {
    switch (config.logoPosition) {
      case 'top-left': return 'text-left';
      case 'top-right': return 'text-right';
      default: return 'text-center';
    }
  };

  const getQrSize = () => {
    const size = Math.min(config.qrSize * 0.6, 100); // Scale down for preview
    return { width: size, height: size };
  };

  const getQrStyle = () => {
    switch (config.qrStyle) {
      case 'rounded': return 'rounded-xl';
      case 'dots': return 'rounded-2xl';
      default: return 'rounded-lg';
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Main ticket container - matches PDF layout */}
      <div 
        className="w-full max-w-sm mx-auto bg-slate-100 rounded-xl p-3 shadow-lg"
        style={{ fontFamily: config.fontFamily }}
        data-testid="preview-container"
      >
        {/* Ticket card with white background */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Header section with gradient/color */}
          <div 
            className="px-4 py-4"
            style={{ ...getHeaderBackground(), color: config.textColor }}
          >
            {/* Logo */}
            {config.logoUrl && (
              <div className={`${getLogoPosition()} mb-2`}>
                <img 
                  src={config.logoUrl} 
                  alt="Logo" 
                  className={`${getLogoSize()} object-contain inline-block`}
                  style={{ maxWidth: '120px' }}
                />
              </div>
            )}
            
            {/* Event name */}
            {config.showEventName && (
              <h2 
                className="font-bold leading-tight"
                style={{ fontSize: Math.min(config.titleFontSize, 20) }}
                data-testid="preview-event-name"
              >
                {SAMPLE_DATA.eventName}
              </h2>
            )}
            
            {/* Venue */}
            {config.showVenue && (
              <p className="text-sm opacity-90 mt-1">{SAMPLE_DATA.venue}</p>
            )}
          </div>

          {/* Content section - white background like PDF */}
          <div className="p-4">
            {/* Info grid - 2 columns like PDF */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {(config.showEventDate || config.showEventTime) && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wide">Data</p>
                  <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                    {config.showEventDate && SAMPLE_DATA.eventDate}
                  </p>
                </div>
              )}
              
              {config.showEventTime && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wide">Ora</p>
                  <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                    {SAMPLE_DATA.eventTime}
                  </p>
                </div>
              )}
              
              {config.showTicketType && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wide">Biglietto</p>
                  <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                    {SAMPLE_DATA.ticketType}
                  </p>
                </div>
              )}
              
              {config.showSector && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wide">Settore</p>
                  <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                    {SAMPLE_DATA.sector}
                  </p>
                </div>
              )}
              
              {config.showPrice && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wide">Prezzo</p>
                  <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                    {SAMPLE_DATA.price}
                  </p>
                </div>
              )}
              
              {config.showSeat && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] uppercase text-slate-500 tracking-wide">Posto</p>
                  <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                    {SAMPLE_DATA.seat}
                  </p>
                </div>
              )}
            </div>

            {/* QR Section - matches PDF layout */}
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div 
                className={`mx-auto ${getQrStyle()} p-2 inline-block`}
                style={{ backgroundColor: config.qrBackgroundColor === 'transparent' ? '#ffffff' : config.qrBackgroundColor }}
              >
                {/* QR code representation */}
                <div 
                  style={{ 
                    ...getQrSize(),
                    backgroundColor: config.qrForegroundColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  className={getQrStyle()}
                >
                  <QrCode 
                    style={{ 
                      width: '75%', 
                      height: '75%',
                      color: config.qrBackgroundColor === 'transparent' ? '#ffffff' : config.qrBackgroundColor
                    }} 
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Inquadra per verificare</p>
              <p className="font-mono text-xs text-slate-600 font-semibold tracking-wide mt-1">
                {SAMPLE_DATA.ticketCode}
              </p>
            </div>

            {/* Holder section */}
            {config.showBuyerName && (
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-[10px] uppercase text-slate-500 tracking-wide">Intestatario</p>
                <p className="font-semibold text-slate-800" style={{ fontSize: config.bodyFontSize }}>
                  {SAMPLE_DATA.buyerName}
                </p>
              </div>
            )}
          </div>

          {/* Footer with perforated edge and fiscal seal */}
          <div 
            className="text-center py-3 px-4 text-[9px] text-slate-400"
            style={{ 
              borderTop: config.showPerforatedEdge ? '1px dashed #e2e8f0' : '1px solid #e2e8f0' 
            }}
          >
            <p>{SAMPLE_DATA.organizerCompany} • {SAMPLE_DATA.systemOwner}</p>
            {config.showFiscalSeal && (
              <p className="font-mono mt-1">Sigillo: {SAMPLE_DATA.fiscalSeal}</p>
            )}
          </div>
        </div>
      </div>

      {/* Label */}
      <p className="text-xs text-muted-foreground mt-3">Anteprima PDF</p>
    </div>
  );
}


export default function DigitalTemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const isEditing = !!id;
  const isSuperAdmin = user?.role === 'super_admin';

  const [logoSource, setLogoSource] = useState<LogoSourceType>('none');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: '',
      description: '',
      isDefault: false,
      isActive: true,
      primaryColor: '#6366f1',
      secondaryColor: '#4f46e5',
      backgroundColor: '#1e1b4b',
      textColor: '#ffffff',
      accentColor: '#a855f7',
      logoPosition: 'top-center',
      logoSize: 'medium',
      qrSize: 200,
      qrPosition: 'center',
      qrStyle: 'square',
      qrForegroundColor: '#000000',
      qrBackgroundColor: '#ffffff',
      backgroundStyle: 'gradient',
      gradientDirection: 'to-bottom',
      showEventName: true,
      showEventDate: true,
      showEventTime: true,
      showVenue: true,
      showPrice: true,
      showTicketType: true,
      showSector: true,
      showSeat: false,
      showBuyerName: true,
      showFiscalSeal: true,
      showPerforatedEdge: true,
      fontFamily: 'Inter, system-ui, sans-serif',
      titleFontSize: 24,
      bodyFontSize: 14,
    },
  });

  const watchedValues = form.watch();

  const { data: companies = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['/api/companies'],
    enabled: isSuperAdmin,
  });

  const { data: template, isLoading } = useQuery<DigitalTicketTemplate>({
    queryKey: ['/api/digital-templates', id],
    enabled: isEditing,
    staleTime: 0, // Always refetch to ensure fresh data after edits
  });

  useEffect(() => {
    if (template) {
      form.reset({
        name: template.name,
        description: template.description || '',
        companyId: template.companyId || undefined,
        isDefault: template.isDefault,
        isActive: template.isActive,
        primaryColor: template.primaryColor || '#6366f1',
        secondaryColor: template.secondaryColor || '#4f46e5',
        backgroundColor: template.backgroundColor || '#1e1b4b',
        textColor: template.textColor || '#ffffff',
        accentColor: template.accentColor || '#a855f7',
        logoUrl: template.logoUrl || undefined,
        logoPosition: (template.logoPosition as any) || 'top-center',
        logoSize: (template.logoSize as any) || 'medium',
        qrSize: template.qrSize || 200,
        qrPosition: (template.qrPosition as any) || 'center',
        qrStyle: (template.qrStyle as any) || 'square',
        qrForegroundColor: template.qrForegroundColor || '#000000',
        qrBackgroundColor: template.qrBackgroundColor || '#ffffff',
        backgroundStyle: (template.backgroundStyle as any) || 'gradient',
        gradientDirection: (template.gradientDirection as any) || 'to-bottom',
        showEventName: template.showEventName,
        showEventDate: template.showEventDate,
        showEventTime: template.showEventTime,
        showVenue: template.showVenue,
        showPrice: template.showPrice,
        showTicketType: template.showTicketType,
        showSector: template.showSector,
        showSeat: template.showSeat,
        showBuyerName: template.showBuyerName,
        showFiscalSeal: template.showFiscalSeal,
        showPerforatedEdge: template.showPerforatedEdge,
        fontFamily: template.fontFamily || 'Inter, system-ui, sans-serif',
        titleFontSize: template.titleFontSize || 24,
        bodyFontSize: template.bodyFontSize || 14,
      });

      if (template.logoUrl) {
        if (template.logoUrl === DEFAULT_LOGO_URL) {
          setLogoSource('default');
        } else if (template.logoUrl.startsWith('data:')) {
          setLogoSource('file');
        } else {
          setLogoSource('url');
        }
      } else {
        setLogoSource('none');
      }
    }
  }, [template, form]);

  const handleLogoSourceChange = (source: LogoSourceType) => {
    setLogoSource(source);
    if (source === 'none') {
      form.setValue('logoUrl', undefined);
    } else if (source === 'default') {
      form.setValue('logoUrl', DEFAULT_LOGO_URL);
    } else if (source === 'url') {
      const currentUrl = form.getValues('logoUrl');
      if (!currentUrl || currentUrl === DEFAULT_LOGO_URL || currentUrl.startsWith('data:')) {
        form.setValue('logoUrl', '');
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Errore',
        description: 'Per favore seleziona un file immagine',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Errore',
        description: 'Il file è troppo grande. Dimensione massima: 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        form.setValue('logoUrl', base64String);
        setLogoSource('file');
        setIsUploadingLogo(false);
      };
      reader.onerror = () => {
        toast({
          title: 'Errore',
          description: 'Errore durante la lettura del file',
          variant: 'destructive',
        });
        setIsUploadingLogo(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: 'Errore',
        description: 'Errore durante il caricamento del file',
        variant: 'destructive',
      });
      setIsUploadingLogo(false);
    }
  };

  const clearLogo = () => {
    form.setValue('logoUrl', undefined);
    setLogoSource('none');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const payload = {
        ...data,
        companyId: isSuperAdmin ? data.companyId : (user as any)?.companyId,
      };
      const res = await apiRequest('POST', '/api/digital-templates', payload);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Template creato', description: 'Il template è stato salvato correttamente' });
      queryClient.invalidateQueries({ queryKey: ['/api/digital-templates'] });
      navigate('/printer-settings');
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await apiRequest('PATCH', `/api/digital-templates/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Template aggiornato', description: 'Le modifiche sono state salvate' });
      queryClient.invalidateQueries({ queryKey: ['/api/digital-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/digital-templates', id] });
      navigate('/printer-settings');
    },
    onError: (error: Error) => {
      toast({ title: 'Errore', description: error.message, variant: 'destructive' });
    },
  });

  const onSubmit = (data: TemplateFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-digital-template-builder">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? 'Modifica Template Digitale' : 'Nuovo Template Digitale'}
            </h1>
            <p className="text-muted-foreground">
              Personalizza l'aspetto del biglietto digitale per telefono e PDF
            </p>
          </div>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={isPending}
            data-testid="button-save"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Salva Template
          </Button>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informazioni Base</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Template</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Es: Template Standard" data-testid="input-name" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Descrizione opzionale" data-testid="input-description" />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {isSuperAdmin && (
                      <FormField
                        control={form.control}
                        name="companyId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Azienda</FormLabel>
                            <Select 
                              onValueChange={(val) => field.onChange(val === '__global__' ? undefined : val)} 
                              value={field.value || '__global__'}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-company">
                                  <SelectValue placeholder="Seleziona azienda (globale se vuoto)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="__global__">Template Globale</SelectItem>
                                {companies.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    )}

                    <div className="flex items-center gap-6">
                      <FormField
                        control={form.control}
                        name="isDefault"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-default"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Predefinito</FormLabel>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isActive"
                        render={({ field }) => (
                          <FormItem className="flex items-center gap-2">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                data-testid="switch-active"
                              />
                            </FormControl>
                            <FormLabel className="!mt-0">Attivo</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Tabs defaultValue="colors" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="colors" data-testid="tab-colors">
                      <Palette className="w-4 h-4 mr-2" />
                      Colori
                    </TabsTrigger>
                    <TabsTrigger value="logo" data-testid="tab-logo">
                      <Image className="w-4 h-4 mr-2" />
                      Logo
                    </TabsTrigger>
                    <TabsTrigger value="qr" data-testid="tab-qr">
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </TabsTrigger>
                    <TabsTrigger value="layout" data-testid="tab-layout">
                      <Layout className="w-4 h-4 mr-2" />
                      Layout
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="colors">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Palette className="w-5 h-5" />
                          Colori
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="primaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Colore Primario</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-primary-color"
                                  />
                                  <Input {...field} className="flex-1" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="secondaryColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Colore Secondario</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-secondary-color"
                                  />
                                  <Input {...field} className="flex-1" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="backgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sfondo</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-background-color"
                                  />
                                  <Input {...field} className="flex-1" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="textColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Colore Testo</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-text-color"
                                  />
                                  <Input {...field} className="flex-1" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="accentColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Colore Accento</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-accent-color"
                                  />
                                  <Input {...field} className="flex-1" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="backgroundStyle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Stile Sfondo</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-background-style">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="solid">Solido</SelectItem>
                                  <SelectItem value="gradient">Gradiente</SelectItem>
                                  <SelectItem value="pattern">Pattern</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        {watchedValues.backgroundStyle === 'gradient' && (
                          <FormField
                            control={form.control}
                            name="gradientDirection"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Direzione Gradiente</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-gradient-direction">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="to-bottom">Verso il Basso</SelectItem>
                                    <SelectItem value="to-right">Verso Destra</SelectItem>
                                    <SelectItem value="radial">Radiale</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="logo">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Image className="w-5 h-5" />
                          Logo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <FormLabel>Sorgente Logo</FormLabel>
                          <RadioGroup
                            value={logoSource}
                            onValueChange={(value) => handleLogoSourceChange(value as LogoSourceType)}
                            className="flex flex-wrap gap-3"
                            data-testid="radio-logo-source"
                          >
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate cursor-pointer">
                              <RadioGroupItem value="none" id="desktop-logo-none" />
                              <Label htmlFor="desktop-logo-none" className="cursor-pointer">Nessun logo</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate cursor-pointer">
                              <RadioGroupItem value="default" id="desktop-logo-default" />
                              <Label htmlFor="desktop-logo-default" className="cursor-pointer">Event4U</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate cursor-pointer">
                              <RadioGroupItem value="file" id="desktop-logo-file" />
                              <Label htmlFor="desktop-logo-file" className="cursor-pointer">Carica file</Label>
                            </div>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover-elevate cursor-pointer">
                              <RadioGroupItem value="url" id="desktop-logo-url" />
                              <Label htmlFor="desktop-logo-url" className="cursor-pointer">URL</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        {logoSource === 'default' && (
                          <div className="p-4 border rounded-lg bg-muted/30">
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border">
                                <img 
                                  src={DEFAULT_LOGO_URL} 
                                  alt="Event4U Logo" 
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                              <div>
                                <p className="font-medium">Logo Event4U</p>
                                <p className="text-sm text-muted-foreground">Logo predefinito dell'applicazione</p>
                              </div>
                              <Check className="w-5 h-5 text-green-500 ml-auto" />
                            </div>
                          </div>
                        )}

                        {logoSource === 'file' && (
                          <div className="space-y-3">
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={handleFileUpload}
                              className="hidden"
                              data-testid="input-logo-file"
                            />
                            
                            {watchedValues.logoUrl && watchedValues.logoUrl.startsWith('data:') ? (
                              <div className="p-4 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                  <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border overflow-hidden">
                                    <img 
                                      src={watchedValues.logoUrl} 
                                      alt="Logo caricato" 
                                      className="max-w-full max-h-full object-contain"
                                    />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium">Logo caricato</p>
                                    <p className="text-sm text-muted-foreground truncate">Immagine in base64</p>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    data-testid="button-change-logo"
                                  >
                                    <Upload className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={clearLogo}
                                    data-testid="button-remove-logo"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingLogo}
                                className="w-full h-24 flex flex-col gap-2"
                                data-testid="button-upload-logo"
                              >
                                {isUploadingLogo ? (
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="w-6 h-6" />
                                    <span>Clicca per caricare un logo</span>
                                    <span className="text-xs text-muted-foreground">PNG, JPG, SVG (max 2MB)</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}

                        {logoSource === 'url' && (
                          <FormField
                            control={form.control}
                            name="logoUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>URL Logo</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field}
                                    value={field.value || ''}
                                    placeholder="https://example.com/logo.png"
                                    data-testid="input-logo-url"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Inserisci l'URL di un'immagine logo
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        )}

                        {watchedValues.logoUrl && logoSource !== 'none' && (
                          <>
                            <Separator />
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="logoPosition"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Posizione Logo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-logo-position">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="top-left">In alto a sinistra</SelectItem>
                                        <SelectItem value="top-center">In alto al centro</SelectItem>
                                        <SelectItem value="top-right">In alto a destra</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="logoSize"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Dimensione Logo</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-logo-size">
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="small">Piccolo</SelectItem>
                                        <SelectItem value="medium">Medio</SelectItem>
                                        <SelectItem value="large">Grande</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="qr">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <QrCode className="w-5 h-5" />
                          QR Code
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="qrSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Dimensione QR ({field.value}px)</FormLabel>
                              <FormControl>
                                <Slider
                                  min={100}
                                  max={400}
                                  step={10}
                                  value={[field.value]}
                                  onValueChange={(v) => field.onChange(v[0])}
                                  data-testid="slider-qr-size"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="qrPosition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Posizione QR</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-qr-position">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="center">Centro</SelectItem>
                                    <SelectItem value="bottom-center">In basso al centro</SelectItem>
                                    <SelectItem value="bottom-left">In basso a sinistra</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="qrStyle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Stile QR</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-qr-style">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="square">Quadrato</SelectItem>
                                    <SelectItem value="rounded">Arrotondato</SelectItem>
                                    <SelectItem value="dots">Punti</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="qrForegroundColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Colore QR</FormLabel>
                                <FormControl>
                                  <div className="flex gap-2">
                                    <Input 
                                      type="color" 
                                      {...field} 
                                      className="w-12 h-10 p-1 cursor-pointer"
                                      data-testid="input-qr-foreground"
                                    />
                                    <Input {...field} className="flex-1" />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="qrBackgroundColor"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sfondo QR</FormLabel>
                                <FormControl>
                                  <div className="flex gap-2">
                                    <Input 
                                      type="color" 
                                      value={field.value === 'transparent' ? '#ffffff' : field.value}
                                      onChange={(e) => field.onChange(e.target.value)}
                                      className="w-12 h-10 p-1 cursor-pointer"
                                      data-testid="input-qr-background"
                                    />
                                    <Input {...field} className="flex-1" placeholder="transparent" />
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="layout">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Layout className="w-5 h-5" />
                          Layout e Campi
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="showEventName"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Nome Evento</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-event-name" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showEventDate"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Data Evento</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-event-date" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showEventTime"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Ora Evento</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-event-time" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showVenue"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Luogo</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-venue" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showPrice"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Prezzo</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-price" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showTicketType"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Tipo Biglietto</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ticket-type" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showSector"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Settore</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-sector" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showSeat"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Posto</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-seat" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showBuyerName"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Nome Acquirente</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-buyer-name" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showFiscalSeal"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Sigillo Fiscale</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-fiscal-seal" />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="showPerforatedEdge"
                            render={({ field }) => (
                              <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                                <FormLabel className="!mt-0">Bordo Perforato</FormLabel>
                                <FormControl>
                                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-perforated" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                          <h4 className="font-medium flex items-center gap-2">
                            <Type className="w-4 h-4" />
                            Tipografia
                          </h4>

                          <FormField
                            control={form.control}
                            name="fontFamily"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Font</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-font">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {FONT_OPTIONS.map((font) => (
                                      <SelectItem key={font.value} value={font.value}>
                                        {font.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="titleFontSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dimensione Titoli ({field.value}px)</FormLabel>
                                  <FormControl>
                                    <Slider
                                      min={16}
                                      max={48}
                                      step={1}
                                      value={[field.value]}
                                      onValueChange={(v) => field.onChange(v[0])}
                                      data-testid="slider-title-size"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="bodyFontSize"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Dimensione Testo ({field.value}px)</FormLabel>
                                  <FormControl>
                                    <Slider
                                      min={10}
                                      max={24}
                                      step={1}
                                      value={[field.value]}
                                      onValueChange={(v) => field.onChange(v[0])}
                                      data-testid="slider-body-size"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="lg:sticky lg:top-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Anteprima Live</CardTitle>
                  </CardHeader>
                  <CardContent className="bg-muted/50 p-6 rounded-lg">
                    <DigitalTicketPreview config={watchedValues} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <MobileAppLayout
      header={<MobileHeader title="Template Digitali" showBackButton showMenuButton />}
      contentClassName="pb-24"
    >
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">
              {isEditing ? 'Modifica Template' : 'Nuovo Template'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
              Personalizza l'aspetto del biglietto digitale per telefono e PDF
            </p>
          </div>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending}
          className="w-full sm:w-auto"
          data-testid="button-save"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salva Template
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informazioni Base</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Template</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Es: Template Standard" data-testid="input-name" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrizione</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Descrizione opzionale" data-testid="input-description" />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isSuperAdmin && (
                    <FormField
                      control={form.control}
                      name="companyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Azienda</FormLabel>
                          <Select 
                            onValueChange={(val) => field.onChange(val === '__global__' ? undefined : val)} 
                            value={field.value || '__global__'}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-company">
                                <SelectValue placeholder="Seleziona azienda (globale se vuoto)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="__global__">Template Globale</SelectItem>
                              {companies.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex items-center gap-6">
                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-default"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Predefinito</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-active"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Attivo</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="colors" className="w-full">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="colors" data-testid="tab-colors">
                    <Palette className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Colori</span>
                  </TabsTrigger>
                  <TabsTrigger value="logo" data-testid="tab-logo">
                    <Image className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Logo</span>
                  </TabsTrigger>
                  <TabsTrigger value="qr" data-testid="tab-qr">
                    <QrCode className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">QR</span>
                  </TabsTrigger>
                  <TabsTrigger value="layout" data-testid="tab-layout">
                    <Layout className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Layout</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="colors">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Palette className="w-5 h-5" />
                        Colori
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colore Primario</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-primary-color"
                                />
                                <Input {...field} className="flex-1" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colore Secondario</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-secondary-color"
                                />
                                <Input {...field} className="flex-1" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sfondo</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-background-color"
                                />
                                <Input {...field} className="flex-1" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="textColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colore Testo</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-text-color"
                                />
                                <Input {...field} className="flex-1" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="accentColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Colore Accento</FormLabel>
                            <FormControl>
                              <div className="flex gap-2">
                                <Input 
                                  type="color" 
                                  {...field} 
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-accent-color"
                                />
                                <Input {...field} className="flex-1" />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="backgroundStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stile Sfondo</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-background-style">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="solid">Solido</SelectItem>
                                <SelectItem value="gradient">Gradiente</SelectItem>
                                <SelectItem value="pattern">Pattern</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      {watchedValues.backgroundStyle === 'gradient' && (
                        <FormField
                          control={form.control}
                          name="gradientDirection"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Direzione Gradiente</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-gradient-direction">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="to-bottom">Verso il Basso</SelectItem>
                                  <SelectItem value="to-right">Verso Destra</SelectItem>
                                  <SelectItem value="radial">Radiale</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="logo">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Image className="w-5 h-5" />
                        Logo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <FormLabel>Sorgente Logo</FormLabel>
                        <RadioGroup
                          value={logoSource}
                          onValueChange={(value) => handleLogoSourceChange(value as LogoSourceType)}
                          className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
                          data-testid="radio-logo-source"
                        >
                          <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover-elevate cursor-pointer">
                            <RadioGroupItem value="none" id="logo-none" />
                            <Label htmlFor="logo-none" className="cursor-pointer text-sm">Nessun logo</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover-elevate cursor-pointer">
                            <RadioGroupItem value="default" id="logo-default" />
                            <Label htmlFor="logo-default" className="cursor-pointer text-sm">Event4U</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover-elevate cursor-pointer">
                            <RadioGroupItem value="file" id="logo-file" />
                            <Label htmlFor="logo-file" className="cursor-pointer text-sm">Carica file</Label>
                          </div>
                          <div className="flex items-center space-x-2 p-2 sm:p-3 border rounded-lg hover-elevate cursor-pointer">
                            <RadioGroupItem value="url" id="logo-url" />
                            <Label htmlFor="logo-url" className="cursor-pointer text-sm">URL</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {logoSource === 'default' && (
                        <div className="p-4 border rounded-lg bg-muted/30">
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border">
                              <img 
                                src={DEFAULT_LOGO_URL} 
                                alt="Event4U Logo" 
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm">Logo Event4U</p>
                              <p className="text-xs text-muted-foreground">Logo predefinito dell'applicazione</p>
                            </div>
                            <Check className="w-5 h-5 text-green-500 ml-auto" />
                          </div>
                        </div>
                      )}

                      {logoSource === 'file' && (
                        <div className="space-y-3">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                            data-testid="input-logo-file"
                          />
                          
                          {watchedValues.logoUrl && watchedValues.logoUrl.startsWith('data:') ? (
                            <div className="p-4 border rounded-lg bg-muted/30">
                              <div className="flex items-center gap-3">
                                <div className="w-16 h-16 flex items-center justify-center bg-background rounded-lg border overflow-hidden">
                                  <img 
                                    src={watchedValues.logoUrl} 
                                    alt="Logo caricato" 
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm">Logo caricato</p>
                                  <p className="text-xs text-muted-foreground truncate">Immagine in base64</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => fileInputRef.current?.click()}
                                  data-testid="button-change-logo"
                                >
                                  <Upload className="w-4 h-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={clearLogo}
                                  data-testid="button-remove-logo"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingLogo}
                              className="w-full h-24 flex flex-col gap-2"
                              data-testid="button-upload-logo"
                            >
                              {isUploadingLogo ? (
                                <Loader2 className="w-6 h-6 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="w-6 h-6" />
                                  <span className="text-sm">Clicca per caricare un logo</span>
                                  <span className="text-xs text-muted-foreground">PNG, JPG, SVG (max 2MB)</span>
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                      {logoSource === 'url' && (
                        <FormField
                          control={form.control}
                          name="logoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>URL Logo</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  value={field.value || ''}
                                  placeholder="https://example.com/logo.png"
                                  data-testid="input-logo-url"
                                />
                              </FormControl>
                              <FormDescription>
                                Inserisci l'URL di un'immagine logo
                              </FormDescription>
                            </FormItem>
                          )}
                        />
                      )}

                      {watchedValues.logoUrl && logoSource !== 'none' && (
                        <Separator />
                      )}

                      {watchedValues.logoUrl && logoSource !== 'none' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="logoPosition"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Posizione Logo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-logo-position">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="top-left">In alto a sinistra</SelectItem>
                                    <SelectItem value="top-center">In alto al centro</SelectItem>
                                    <SelectItem value="top-right">In alto a destra</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="logoSize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dimensione Logo</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger data-testid="select-logo-size">
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="small">Piccolo</SelectItem>
                                    <SelectItem value="medium">Medio</SelectItem>
                                    <SelectItem value="large">Grande</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="qr">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <QrCode className="w-5 h-5" />
                        QR Code
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="qrSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dimensione QR ({field.value}px)</FormLabel>
                            <FormControl>
                              <Slider
                                min={100}
                                max={400}
                                step={10}
                                value={[field.value]}
                                onValueChange={(v) => field.onChange(v[0])}
                                data-testid="slider-qr-size"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="qrPosition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Posizione QR</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-qr-position">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="center">Centro</SelectItem>
                                <SelectItem value="bottom-center">In basso al centro</SelectItem>
                                <SelectItem value="bottom-left">In basso a sinistra</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="qrStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stile QR</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-qr-style">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="square">Quadrato</SelectItem>
                                <SelectItem value="rounded">Arrotondato</SelectItem>
                                <SelectItem value="dots">Punti</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="qrForegroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Colore QR</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    {...field} 
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-qr-foreground"
                                  />
                                  <Input {...field} className="flex-1" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="qrBackgroundColor"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sfondo QR</FormLabel>
                              <FormControl>
                                <div className="flex gap-2">
                                  <Input 
                                    type="color" 
                                    value={field.value === 'transparent' ? '#ffffff' : field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    className="w-12 h-10 p-1 cursor-pointer"
                                    data-testid="input-qr-background"
                                  />
                                  <Input {...field} className="flex-1" placeholder="transparent" />
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="layout">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Layout className="w-5 h-5" />
                        Layout e Campi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <FormField
                          control={form.control}
                          name="showEventName"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Nome Evento</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-event-name" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showEventDate"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Data Evento</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-event-date" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showEventTime"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Ora Evento</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-event-time" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showVenue"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Luogo</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-venue" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showPrice"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Prezzo</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-price" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showTicketType"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Tipo Biglietto</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ticket-type" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showSector"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Settore</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-sector" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showSeat"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Posto</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-seat" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showBuyerName"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Nome Acquirente</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-buyer-name" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showFiscalSeal"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Sigillo Fiscale</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-fiscal-seal" />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="showPerforatedEdge"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between p-3 border rounded-lg">
                              <FormLabel className="!mt-0">Bordo Perforato</FormLabel>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-perforated" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <Type className="w-4 h-4" />
                          Tipografia
                        </h4>

                        <FormField
                          control={form.control}
                          name="fontFamily"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Font</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-font">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {FONT_OPTIONS.map((font) => (
                                    <SelectItem key={font.value} value={font.value}>
                                      {font.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="titleFontSize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dimensione Titoli ({field.value}px)</FormLabel>
                                <FormControl>
                                  <Slider
                                    min={16}
                                    max={48}
                                    step={1}
                                    value={[field.value]}
                                    onValueChange={(v) => field.onChange(v[0])}
                                    data-testid="slider-title-size"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="bodyFontSize"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Dimensione Testo ({field.value}px)</FormLabel>
                                <FormControl>
                                  <Slider
                                    min={10}
                                    max={24}
                                    step={1}
                                    value={[field.value]}
                                    onValueChange={(v) => field.onChange(v[0])}
                                    data-testid="slider-body-size"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            <div className="lg:sticky lg:top-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Anteprima Live</CardTitle>
                </CardHeader>
                <CardContent className="bg-muted/50 p-6 rounded-lg">
                  <DigitalTicketPreview config={watchedValues} />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </MobileAppLayout>
  );
}
