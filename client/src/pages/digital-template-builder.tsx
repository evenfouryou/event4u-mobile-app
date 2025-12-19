import { useState, useEffect } from 'react';
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
import { 
  ArrowLeft, Save, Loader2, Palette, Image, QrCode, Layout, Type, Calendar, MapPin, Ticket, User 
} from 'lucide-react';
import type { DigitalTicketTemplate } from '@shared/schema';

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
  qrForegroundColor: z.string().default("#ffffff"),
  qrBackgroundColor: z.string().default("transparent"),
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
  ticketCode: "TKT-2024-001234"
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

function DigitalTicketPreview({ config }: { config: TemplateFormData }) {
  const getBackgroundStyle = () => {
    if (config.backgroundStyle === 'solid') {
      return { backgroundColor: config.backgroundColor };
    }
    if (config.backgroundStyle === 'gradient') {
      const direction = config.gradientDirection === 'radial' 
        ? 'radial-gradient' 
        : `linear-gradient(${config.gradientDirection === 'to-right' ? '90deg' : '180deg'}`;
      if (config.gradientDirection === 'radial') {
        return { background: `radial-gradient(circle, ${config.primaryColor} 0%, ${config.backgroundColor} 100%)` };
      }
      return { background: `linear-gradient(${config.gradientDirection === 'to-right' ? '90deg' : '180deg'}, ${config.primaryColor} 0%, ${config.backgroundColor} 100%)` };
    }
    return { backgroundColor: config.backgroundColor };
  };

  const getLogoSize = () => {
    switch (config.logoSize) {
      case 'small': return 'h-8';
      case 'large': return 'h-16';
      default: return 'h-12';
    }
  };

  const getLogoPosition = () => {
    switch (config.logoPosition) {
      case 'top-left': return 'justify-start';
      case 'top-right': return 'justify-end';
      default: return 'justify-center';
    }
  };

  const getQrSize = () => {
    const size = Math.min(config.qrSize, 150);
    return { width: size, height: size };
  };

  const getQrContainerPosition = () => {
    switch (config.qrPosition) {
      case 'bottom-left': return 'items-start';
      case 'bottom-center': return 'items-center';
      default: return 'items-center';
    }
  };

  const getQrStyle = () => {
    switch (config.qrStyle) {
      case 'rounded': return 'rounded-2xl';
      case 'dots': return 'rounded-3xl';
      default: return 'rounded-lg';
    }
  };

  return (
    <div 
      className="w-full max-w-md mx-auto rounded-2xl shadow-2xl overflow-hidden"
      style={{ fontFamily: config.fontFamily }}
      data-testid="preview-container"
    >
      <div 
        className="relative"
        style={getBackgroundStyle()}
      >
        {config.logoUrl && (
          <div className={`flex ${getLogoPosition()} p-4`}>
            <img 
              src={config.logoUrl} 
              alt="Logo" 
              className={`${getLogoSize()} object-contain`}
            />
          </div>
        )}

        <div className="p-5" style={{ color: config.textColor }}>
          <div 
            className="text-center p-4 rounded-xl mb-4"
            style={{ backgroundColor: `${config.primaryColor}20` }}
          >
            <p 
              className="text-xs font-medium uppercase tracking-wider mb-1"
              style={{ color: config.accentColor }}
            >
              Biglietto Evento
            </p>
            {config.showEventName && (
              <h2 
                className="font-bold"
                style={{ fontSize: config.titleFontSize }}
                data-testid="preview-event-name"
              >
                {SAMPLE_DATA.eventName}
              </h2>
            )}
          </div>

          <div className="space-y-3" style={{ fontSize: config.bodyFontSize }}>
            {(config.showEventDate || config.showEventTime) && (
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: config.accentColor }} />
                <div>
                  {config.showEventDate && <span>{SAMPLE_DATA.eventDate}</span>}
                  {config.showEventDate && config.showEventTime && <span> - </span>}
                  {config.showEventTime && <span>{SAMPLE_DATA.eventTime}</span>}
                </div>
              </div>
            )}

            {config.showVenue && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: config.accentColor }} />
                <span>{SAMPLE_DATA.venue}</span>
              </div>
            )}

            {(config.showTicketType || config.showSector) && (
              <div className="flex items-center gap-3">
                <Ticket className="w-5 h-5 flex-shrink-0" style={{ color: config.accentColor }} />
                <div>
                  {config.showTicketType && <span>{SAMPLE_DATA.ticketType}</span>}
                  {config.showTicketType && config.showSector && <span> - </span>}
                  {config.showSector && <span>{SAMPLE_DATA.sector}</span>}
                  {config.showSeat && <span> ({SAMPLE_DATA.seat})</span>}
                </div>
              </div>
            )}

            {config.showBuyerName && (
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 flex-shrink-0" style={{ color: config.accentColor }} />
                <span>{SAMPLE_DATA.buyerName}</span>
              </div>
            )}

            {config.showPrice && (
              <div 
                className="text-center py-2 rounded-lg font-bold"
                style={{ 
                  backgroundColor: config.accentColor,
                  color: config.backgroundColor,
                  fontSize: config.titleFontSize * 0.8
                }}
              >
                {SAMPLE_DATA.price}
              </div>
            )}
          </div>

          {config.showPerforatedEdge && (
            <div className="flex items-center gap-1 my-4">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 h-0.5 rounded-full"
                  style={{ backgroundColor: config.textColor, opacity: 0.3 }}
                />
              ))}
            </div>
          )}

          <div className={`flex flex-col ${getQrContainerPosition()} py-4`}>
            <div 
              className={`p-3 ${getQrStyle()}`}
              style={{ backgroundColor: config.qrBackgroundColor === 'transparent' ? 'white' : config.qrBackgroundColor }}
            >
              <div 
                style={{ 
                  ...getQrSize(),
                  backgroundColor: config.qrForegroundColor === '#ffffff' ? '#333' : config.qrForegroundColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                className={getQrStyle()}
              >
                <QrCode 
                  style={{ 
                    width: '80%', 
                    height: '80%',
                    color: config.qrBackgroundColor === 'transparent' ? 'white' : config.qrBackgroundColor
                  }} 
                />
              </div>
            </div>
            <p 
              className="text-xs mt-2 opacity-70"
              style={{ fontSize: config.bodyFontSize * 0.8 }}
            >
              {SAMPLE_DATA.ticketCode}
            </p>
          </div>

          {config.showFiscalSeal && (
            <div 
              className="text-center text-xs opacity-60 pt-2 border-t"
              style={{ borderColor: `${config.textColor}30` }}
            >
              Sigillo: {SAMPLE_DATA.fiscalSeal}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DigitalTemplateBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!id;
  const isSuperAdmin = user?.role === 'super_admin';

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
      qrForegroundColor: '#ffffff',
      qrBackgroundColor: 'transparent',
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
        qrForegroundColor: template.qrForegroundColor || '#ffffff',
        qrBackgroundColor: template.qrBackgroundColor || 'transparent',
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
    }
  }, [template, form]);

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

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/printer-settings')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Modifica Template Digitale' : 'Nuovo Template Digitale'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Personalizza l'aspetto del biglietto digitale per telefono e PDF
          </p>
        </div>
        <Button
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending}
          data-testid="button-save"
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salva
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
                    <CardHeader>
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
                      <FormField
                        control={form.control}
                        name="logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL Logo</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
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
                    <CardHeader>
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
