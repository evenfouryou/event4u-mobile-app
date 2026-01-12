import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Building2,
  CalendarDays,
  ChevronLeft,
  Mail,
  Settings,
  Wine,
  Calculator,
  UserCheck,
  Receipt,
  FileText,
  Ticket,
  Loader2,
  ScanLine,
  UserPlus,
  GraduationCap,
  Store,
  QrCode,
  ClipboardList,
  Armchair,
  Palette,
  RefreshCw,
  Megaphone,
  ShieldCheck,
  Euro,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Company, UserFeatures } from "@shared/schema";

interface FeatureConfig {
  key: keyof Omit<UserFeatures, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'canCreateProducts'>;
  label: string;
  description: string;
  icon: React.ReactNode;
  category?: 'general' | 'eventhub' | 'pr';
}

type FeatureCategory = 'general' | 'eventhub' | 'pr';

const categoryConfig: Record<FeatureCategory, { label: string; icon: React.ReactNode; description: string }> = {
  general: { 
    label: 'Moduli Generali', 
    icon: <Settings className="h-4 w-4" />,
    description: 'Funzionalità base del sistema'
  },
  eventhub: { 
    label: 'Event Hub', 
    icon: <CalendarDays className="h-4 w-4" />,
    description: 'Moduli per la gestione eventi'
  },
  pr: { 
    label: 'PR & Promoter', 
    icon: <UserPlus className="h-4 w-4" />,
    description: 'Gestione PR e prenotazioni'
  },
};

const featuresList: FeatureConfig[] = [
  // General modules
  { key: 'beverageEnabled', label: 'Beverage', description: 'Gestione stock bevande e consumi', icon: <Wine className="h-4 w-4" />, category: 'general' },
  { key: 'contabilitaEnabled', label: 'Contabilità', description: 'Costi fissi, extra e manutenzioni', icon: <Calculator className="h-4 w-4" />, category: 'general' },
  { key: 'personaleEnabled', label: 'Personale', description: 'Anagrafica staff e pagamenti', icon: <UserCheck className="h-4 w-4" />, category: 'general' },
  { key: 'cassaEnabled', label: 'Cassa', description: 'Settori, postazioni e fondi cassa', icon: <Receipt className="h-4 w-4" />, category: 'general' },
  { key: 'nightFileEnabled', label: 'File della Serata', description: 'Documento integrato per evento', icon: <FileText className="h-4 w-4" />, category: 'general' },
  { key: 'siaeEnabled', label: 'SIAE Biglietteria', description: 'Gestione biglietti, cassieri e lettore fiscale SIAE', icon: <Ticket className="h-4 w-4" />, category: 'general' },
  { key: 'scannerEnabled', label: 'Scanner', description: 'Gestione Scanner e Scanner QR', icon: <ScanLine className="h-4 w-4" />, category: 'general' },
  { key: 'badgesEnabled', label: 'Badge Scuola', description: 'Creazione badge digitali', icon: <GraduationCap className="h-4 w-4" />, category: 'general' },
  { key: 'cassaBigliettiEnabled', label: 'Cassa Biglietti', description: 'Vendita biglietti cassa', icon: <Store className="h-4 w-4" />, category: 'general' },
  { key: 'templateEnabled', label: 'Template Digitali', description: 'Creazione template QR e digitali', icon: <QrCode className="h-4 w-4" />, category: 'general' },
  // Event Hub modules
  { key: 'guestListEnabled', label: 'Liste Ospiti', description: 'Gestione liste ospiti e inviti', icon: <ClipboardList className="h-4 w-4" />, category: 'eventhub' },
  { key: 'tablesEnabled', label: 'Tavoli', description: 'Gestione prenotazioni tavoli VIP', icon: <Armchair className="h-4 w-4" />, category: 'eventhub' },
  { key: 'pageEditorEnabled', label: 'Editor Pagina', description: 'Personalizzazione pagina evento pubblica', icon: <Palette className="h-4 w-4" />, category: 'eventhub' },
  { key: 'resaleEnabled', label: 'Rivendita', description: 'Marketplace rivendita biglietti (Secondary Ticketing)', icon: <RefreshCw className="h-4 w-4" />, category: 'eventhub' },
  { key: 'marketingEnabled', label: 'Marketing', description: 'Campagne email e notifiche push', icon: <Megaphone className="h-4 w-4" />, category: 'eventhub' },
  { key: 'accessControlEnabled', label: 'Controllo Accessi', description: 'Gestione ingressi e permessi', icon: <ShieldCheck className="h-4 w-4" />, category: 'eventhub' },
  { key: 'financeEnabled', label: 'Finanza', description: 'Report finanziari e pagamenti', icon: <Euro className="h-4 w-4" />, category: 'eventhub' },
  // PR modules
  { key: 'prEnabled', label: 'Gestione PR', description: 'Abilita modulo PR e promoter', icon: <UserPlus className="h-4 w-4" />, category: 'pr' },
];

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.08,
    },
  }),
};

export default function AdminGestori() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const [featuresDialogOpen, setFeaturesDialogOpen] = useState(false);
  const [selectedGestore, setSelectedGestore] = useState<User | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FeatureCategory>('general');
  const [featureValues, setFeatureValues] = useState<Record<string, boolean>>({
    beverageEnabled: true,
    contabilitaEnabled: false,
    personaleEnabled: false,
    cassaEnabled: false,
    nightFileEnabled: false,
    siaeEnabled: false,
    scannerEnabled: true,
    prEnabled: true,
    badgesEnabled: true,
    cassaBigliettiEnabled: true,
    templateEnabled: true,
    // Event Hub modules
    guestListEnabled: true,
    tablesEnabled: true,
    pageEditorEnabled: true,
    resaleEnabled: true,
    marketingEnabled: true,
    accessControlEnabled: true,
    financeEnabled: true,
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: selectedUserFeatures, isLoading: featuresLoading } = useQuery<UserFeatures>({
    queryKey: ["/api/user-features", selectedGestore?.id],
    enabled: !!selectedGestore?.id && featuresDialogOpen,
  });

  const updateFeaturesMutation = useMutation({
    mutationFn: async (data: { userId: string; features: Record<string, boolean> }) => {
      return apiRequest("PATCH", `/api/user-features/${data.userId}`, data.features);
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Funzionalità aggiornate", description: "Le impostazioni sono state salvate." });
      // Invalidate all user-features related queries to ensure UI updates everywhere
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/user-features');
        }
      });
      // Also specifically invalidate the edited user's features
      queryClient.invalidateQueries({ queryKey: ["/api/user-features", variables.userId] });
      setFeaturesDialogOpen(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare le impostazioni.", variant: "destructive" });
    },
  });

  // Update feature values when fetched
  useMemo(() => {
    if (selectedUserFeatures) {
      setFeatureValues({
        beverageEnabled: selectedUserFeatures.beverageEnabled ?? true,
        contabilitaEnabled: selectedUserFeatures.contabilitaEnabled ?? false,
        personaleEnabled: selectedUserFeatures.personaleEnabled ?? false,
        cassaEnabled: selectedUserFeatures.cassaEnabled ?? false,
        nightFileEnabled: selectedUserFeatures.nightFileEnabled ?? false,
        siaeEnabled: selectedUserFeatures.siaeEnabled ?? false,
        scannerEnabled: selectedUserFeatures.scannerEnabled ?? true,
        prEnabled: selectedUserFeatures.prEnabled ?? true,
        badgesEnabled: selectedUserFeatures.badgesEnabled ?? true,
        cassaBigliettiEnabled: selectedUserFeatures.cassaBigliettiEnabled ?? true,
        templateEnabled: selectedUserFeatures.templateEnabled ?? true,
        // Event Hub modules
        guestListEnabled: selectedUserFeatures.guestListEnabled ?? true,
        tablesEnabled: selectedUserFeatures.tablesEnabled ?? true,
        pageEditorEnabled: selectedUserFeatures.pageEditorEnabled ?? true,
        resaleEnabled: selectedUserFeatures.resaleEnabled ?? true,
        marketingEnabled: selectedUserFeatures.marketingEnabled ?? true,
        accessControlEnabled: selectedUserFeatures.accessControlEnabled ?? true,
        financeEnabled: selectedUserFeatures.financeEnabled ?? true,
      });
    }
  }, [selectedUserFeatures]);

  const gestori = useMemo(() => {
    return users?.filter((user) => user.role === "gestore") || [];
  }, [users]);

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "Nessuna azienda";
    const company = companies?.find((c) => c.id === companyId);
    return company?.name || "Azienda sconosciuta";
  };

  const handleViewCompanies = (gestore: User) => {
    triggerHaptic("medium");
    setLocation(`/admin/gestori/${gestore.id}/companies`);
  };

  const handleViewEvents = (gestore: User) => {
    triggerHaptic("medium");
    setLocation(`/admin/gestori/${gestore.id}/events`);
  };

  const handleViewUsers = (gestore: User) => {
    triggerHaptic("medium");
    setLocation(`/admin/gestori/${gestore.id}/users`);
  };

  const handleOpenFeatures = (gestore: User) => {
    triggerHaptic("medium");
    setSelectedGestore(gestore);
    setFeaturesDialogOpen(true);
  };

  const handleSaveFeatures = () => {
    if (!selectedGestore) return;
    updateFeaturesMutation.mutate({
      userId: selectedGestore.id,
      features: featureValues,
    });
  };

  const renderGestoreCard = (gestore: User, index: number) => {
    const initials = `${gestore.firstName?.[0] || ""}${gestore.lastName?.[0] || ""}`.toUpperCase();
    return (
      <motion.div
        key={gestore.id}
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileTap={{ scale: 0.98 }}
      >
        <Card className="hover-elevate" data-testid={`card-gestore-${gestore.id}`}>
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
                  <Mail className="h-3 w-3" />
                  <span className="truncate" data-testid={`text-gestore-email-${gestore.id}`}>
                    {gestore.email}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <Building2 className="h-3 w-3" />
                  <span className="truncate" data-testid={`text-gestore-company-${gestore.id}`}>
                    {getCompanyName(gestore.companyId)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenFeatures(gestore)}
                data-testid={`button-features-${gestore.id}`}
              >
                <Settings className="h-4 w-4 mr-1" />
                Moduli
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewCompanies(gestore)}
                data-testid={`button-view-companies-${gestore.id}`}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Aziende
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewUsers(gestore)}
                data-testid={`button-view-users-${gestore.id}`}
              >
                <Users className="h-4 w-4 mr-1" />
                Utenti
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewEvents(gestore)}
                data-testid={`button-view-events-${gestore.id}`}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Eventi
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderDesktopTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestori
        </CardTitle>
        <CardDescription>
          Gestisci i gestori e le loro associazioni con le aziende
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Azienda Principale</TableHead>
              <TableHead>Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gestori.map((gestore) => (
              <TableRow key={gestore.id} data-testid={`row-gestore-${gestore.id}`}>
                <TableCell className="font-medium" data-testid={`text-gestore-name-${gestore.id}`}>
                  {gestore.firstName} {gestore.lastName}
                </TableCell>
                <TableCell data-testid={`text-gestore-email-${gestore.id}`}>
                  {gestore.email}
                </TableCell>
                <TableCell data-testid={`text-gestore-company-${gestore.id}`}>
                  {getCompanyName(gestore.companyId)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenFeatures(gestore)}
                      data-testid={`button-features-${gestore.id}`}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Moduli
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewCompanies(gestore)}
                      data-testid={`button-view-companies-${gestore.id}`}
                    >
                      <Building2 className="h-4 w-4 mr-1" />
                      Aziende
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewUsers(gestore)}
                      data-testid={`button-view-users-${gestore.id}`}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Utenti
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewEvents(gestore)}
                      data-testid={`button-view-events-${gestore.id}`}
                    >
                      <CalendarDays className="h-4 w-4 mr-1" />
                      Eventi
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {gestori.length === 0 && !usersLoading && (
          <div className="text-center py-8 text-muted-foreground">
            Nessun gestore trovato
          </div>
        )}
      </CardContent>
    </Card>
  );

  const categories: FeatureCategory[] = ['general', 'eventhub', 'pr'];
  const currentCategoryFeatures = featuresList.filter(f => f.category === selectedCategory);

  const featuresDialog = (
    <Dialog open={featuresDialogOpen} onOpenChange={(open) => {
      setFeaturesDialogOpen(open);
      if (!open) setSelectedCategory('general');
    }}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden p-0">
        <div className="flex h-full">
          <div className="w-48 border-r bg-muted/30 p-4 flex flex-col">
            <DialogHeader className="pb-4">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Moduli
              </DialogTitle>
            </DialogHeader>
            <nav className="space-y-1 flex-1">
              {categories.map((cat) => {
                const config = categoryConfig[cat];
                const isActive = selectedCategory === cat;
                const enabledCount = featuresList.filter(f => f.category === cat && featureValues[f.key]).length;
                const totalCount = featuresList.filter(f => f.category === cat).length;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`button-category-${cat}`}
                  >
                    <div className={`p-1.5 rounded-md ${isActive ? 'bg-primary-foreground/20' : 'bg-muted'}`}>
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{config.label}</p>
                      <p className="text-xs opacity-70">{enabledCount}/{totalCount} attivi</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b bg-background">
              <h3 className="font-semibold">{categoryConfig[selectedCategory].label}</h3>
              <p className="text-sm text-muted-foreground">{categoryConfig[selectedCategory].description}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Gestisci i moduli per {selectedGestore?.firstName} {selectedGestore?.lastName}
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
              {featuresLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {currentCategoryFeatures.map((feature) => (
                    <div 
                      key={feature.key} 
                      className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-md bg-primary/10 text-primary">
                          {feature.icon}
                        </div>
                        <div>
                          <Label htmlFor={feature.key} className="font-medium cursor-pointer">
                            {feature.label}
                          </Label>
                          <p className="text-xs text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                      <Switch
                        id={feature.key}
                        checked={featureValues[feature.key] ?? false}
                        onCheckedChange={(checked) => 
                          setFeatureValues(prev => ({ ...prev, [feature.key]: checked }))
                        }
                        data-testid={`switch-${feature.key}`}
                      />
                    </div>
                  ))}
                  {currentCategoryFeatures.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Nessun modulo in questa categoria
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <DialogFooter className="p-4 border-t bg-background">
              <Button variant="outline" onClick={() => setFeaturesDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={handleSaveFeatures} 
                disabled={updateFeaturesMutation.isPending}
                data-testid="button-save-features"
              >
                {updateFeaturesMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Salva
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isMobile) {
    return (
      <>
        <MobileAppLayout
          header={
            <MobileHeader
              title="Gestori"
              leftAction={
                <HapticButton
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/")}
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-5 w-5" />
                </HapticButton>
              }
            />
          }
        >
          <div className="py-4 space-y-3">
            {usersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))
            ) : gestori.length > 0 ? (
              gestori.map((gestore, index) => renderGestoreCard(gestore, index))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Nessun gestore trovato
              </div>
            )}
          </div>
        </MobileAppLayout>
        {featuresDialog}
      </>
    );
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Gestione Gestori</h1>
            <p className="text-muted-foreground">
              Gestisci i gestori e le loro associazioni con le aziende
            </p>
          </div>
        </div>

        {usersLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          renderDesktopTable()
        )}
      </div>
      {featuresDialog}
    </>
  );
}
