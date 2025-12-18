import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Cookie, FileText, Settings, Save, Loader2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SiteSettings {
  cookie_consent_enabled?: boolean;
  cookie_consent_text?: string;
  privacy_policy_url?: string;
  terms_of_service_url?: string;
  contact_email?: string;
  support_phone?: string;
}

export default function AdminSiteSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cookies");

  const { data: settings, isLoading, error } = useQuery<SiteSettings>({
    queryKey: ["/api/admin/site-settings"],
  });

  const [formData, setFormData] = useState<Partial<SiteSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({});
      setHasChanges(false);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => {
      return apiRequest("PATCH", "/api/admin/site-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/cookie-settings"] });
      setFormData({});
      setHasChanges(false);
      toast({
        title: "Impostazioni Salvate",
        description: "Le impostazioni del sito sono state aggiornate con successo.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare le impostazioni",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const getValue = (key: keyof SiteSettings, defaultValue: any = "") => {
    if (formData[key] !== undefined) return formData[key];
    if (settings?.[key] !== undefined) return settings[key];
    return defaultValue;
  };

  const setValue = (key: keyof SiteSettings, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (error) {
    return (
      <div className="p-6" data-testid="page-admin-site-settings">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Errore nel caricamento delle impostazioni. Verifica di avere i permessi necessari.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-admin-site-settings">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6" data-testid="page-admin-site-settings">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0" />
            Impostazioni Sito
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gestisci le impostazioni globali del sito, cookie e testi legali
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending || !hasChanges}
          data-testid="button-save-settings"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salva Modifiche
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cookies" className="gap-2" data-testid="tab-cookies">
            <Cookie className="w-4 h-4" />
            Cookie
          </TabsTrigger>
          <TabsTrigger value="legal" className="gap-2" data-testid="tab-legal">
            <FileText className="w-4 h-4" />
            Testi Legali
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-2" data-testid="tab-contact">
            <Settings className="w-4 h-4" />
            Contatti
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cookies" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5 text-primary" />
                Consenso Cookie
              </CardTitle>
              <CardDescription>
                Configura il banner dei cookie secondo la normativa GDPR
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div>
                  <Label className="text-base font-medium">Abilita Banner Cookie</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostra il banner di consenso cookie ai visitatori
                  </p>
                </div>
                <Switch
                  checked={getValue("cookie_consent_enabled", true)}
                  onCheckedChange={(checked) => setValue("cookie_consent_enabled", checked)}
                  data-testid="switch-cookie-enabled"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cookie_text">Testo del Banner</Label>
                <Textarea
                  id="cookie_text"
                  placeholder="Utilizziamo i cookie per migliorare la tua esperienza..."
                  value={getValue("cookie_consent_text", "")}
                  onChange={(e) => setValue("cookie_consent_text", e.target.value)}
                  rows={4}
                  data-testid="textarea-cookie-text"
                />
                <p className="text-xs text-muted-foreground">
                  Questo testo verrà mostrato nel banner dei cookie
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy_url">URL Privacy Policy</Label>
                <Input
                  id="privacy_url"
                  type="url"
                  placeholder="https://esempio.com/privacy"
                  value={getValue("privacy_policy_url", "")}
                  onChange={(e) => setValue("privacy_policy_url", e.target.value)}
                  data-testid="input-privacy-url"
                />
                <p className="text-xs text-muted-foreground">
                  Link alla pagina della privacy policy
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Documenti Legali
              </CardTitle>
              <CardDescription>
                Configura i link ai documenti legali del sito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="terms_url">URL Termini di Servizio</Label>
                <Input
                  id="terms_url"
                  type="url"
                  placeholder="https://esempio.com/termini"
                  value={getValue("terms_of_service_url", "")}
                  onChange={(e) => setValue("terms_of_service_url", e.target.value)}
                  data-testid="input-terms-url"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="privacy_url_legal">URL Privacy Policy</Label>
                <Input
                  id="privacy_url_legal"
                  type="url"
                  placeholder="https://esempio.com/privacy"
                  value={getValue("privacy_policy_url", "")}
                  onChange={(e) => setValue("privacy_policy_url", e.target.value)}
                  data-testid="input-privacy-url-legal"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contact" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Informazioni di Contatto
              </CardTitle>
              <CardDescription>
                Configura le informazioni di contatto del sito
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email di Contatto</Label>
                <Input
                  id="contact_email"
                  type="email"
                  placeholder="info@esempio.com"
                  value={getValue("contact_email", "")}
                  onChange={(e) => setValue("contact_email", e.target.value)}
                  data-testid="input-contact-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="support_phone">Telefono Supporto</Label>
                <Input
                  id="support_phone"
                  type="tel"
                  placeholder="+39 02 1234567"
                  value={getValue("support_phone", "")}
                  onChange={(e) => setValue("support_phone", e.target.value)}
                  data-testid="input-support-phone"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
