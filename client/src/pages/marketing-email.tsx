import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Mail, Send, Clock, Trash2, Edit, BarChart3, FileText, Eye, Calendar } from "lucide-react";
import type { MarketingEmailTemplate, MarketingEmailCampaign } from "@shared/schema";

interface CampaignWithTemplate extends MarketingEmailCampaign {
  template?: MarketingEmailTemplate;
}

interface Analytics {
  totalCampaigns: number;
  totalTemplates: number;
  totalEmailsSent: number;
  totalOpens: number;
  totalClicks: number;
  averageOpenRate: number;
  averageClickRate: number;
  campaignsByStatus: {
    draft: number;
    scheduled: number;
    sent: number;
  };
}

interface EventOption {
  id: string;
  name: string;
  date: string | null;
}

export default function MarketingEmailPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("templates");
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MarketingEmailTemplate | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<CampaignWithTemplate | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    htmlContent: "",
    type: "newsletter",
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    templateId: "",
    eventId: "",
    triggerType: "manual",
  });

  const [scheduleDate, setScheduleDate] = useState("");

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<MarketingEmailTemplate[]>({
    queryKey: ["/api/marketing/templates"],
  });

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery<CampaignWithTemplate[]>({
    queryKey: ["/api/marketing/campaigns"],
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<Analytics>({
    queryKey: ["/api/marketing/analytics"],
  });

  const { data: eventsOptions = [] } = useQuery<EventOption[]>({
    queryKey: ["/api/marketing/events"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof templateForm) =>
      apiRequest("/api/marketing/templates", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/analytics"] });
      setShowTemplateDialog(false);
      resetTemplateForm();
      toast({ title: "Template creato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione del template", variant: "destructive" });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof templateForm }) =>
      apiRequest(`/api/marketing/templates/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/templates"] });
      setShowTemplateDialog(false);
      setEditingTemplate(null);
      resetTemplateForm();
      toast({ title: "Template aggiornato con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento del template", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/marketing/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/templates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/analytics"] });
      toast({ title: "Template eliminato" });
    },
    onError: () => {
      toast({ title: "Errore nell'eliminazione del template", variant: "destructive" });
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: (data: typeof campaignForm) =>
      apiRequest("/api/marketing/campaigns", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/analytics"] });
      setShowCampaignDialog(false);
      resetCampaignForm();
      toast({ title: "Campagna creata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella creazione della campagna", variant: "destructive" });
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof campaignForm }) =>
      apiRequest(`/api/marketing/campaigns/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      setShowCampaignDialog(false);
      setEditingCampaign(null);
      resetCampaignForm();
      toast({ title: "Campagna aggiornata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'aggiornamento della campagna", variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/marketing/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/analytics"] });
      toast({ title: "Campagna eliminata" });
    },
    onError: () => {
      toast({ title: "Errore nell'eliminazione della campagna", variant: "destructive" });
    },
  });

  const scheduleCampaignMutation = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      apiRequest(`/api/marketing/campaigns/${id}/schedule`, { method: "POST", body: JSON.stringify({ scheduledAt }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      setShowScheduleDialog(false);
      setSelectedCampaignId(null);
      setScheduleDate("");
      toast({ title: "Campagna programmata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nella programmazione della campagna", variant: "destructive" });
    },
  });

  const sendCampaignMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/marketing/campaigns/${id}/send`, { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/marketing/analytics"] });
      toast({ title: data.message || "Campagna inviata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nell'invio della campagna", variant: "destructive" });
    },
  });

  const resetTemplateForm = () => {
    setTemplateForm({ name: "", subject: "", htmlContent: "", type: "newsletter" });
  };

  const resetCampaignForm = () => {
    setCampaignForm({ name: "", templateId: "", eventId: "", triggerType: "manual" });
  };

  const openEditTemplate = (template: MarketingEmailTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      type: template.type || "newsletter",
    });
    setShowTemplateDialog(true);
  };

  const openEditCampaign = (campaign: CampaignWithTemplate) => {
    setEditingCampaign(campaign);
    setCampaignForm({
      name: campaign.name,
      templateId: campaign.templateId || "",
      eventId: campaign.eventId || "",
      triggerType: campaign.triggerType || "manual",
    });
    setShowCampaignDialog(true);
  };

  const handleTemplateSubmit = () => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ id: editingTemplate.id, data: templateForm });
    } else {
      createTemplateMutation.mutate(templateForm);
    }
  };

  const handleCampaignSubmit = () => {
    if (editingCampaign) {
      updateCampaignMutation.mutate({ id: editingCampaign.id, data: campaignForm });
    } else {
      createCampaignMutation.mutate(campaignForm);
    }
  };

  const openPreview = (html: string) => {
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" data-testid="badge-status-draft">Bozza</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500" data-testid="badge-status-scheduled">Programmata</Badge>;
      case "sent":
        return <Badge className="bg-green-500" data-testid="badge-status-sent">Inviata</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Email Marketing</h1>
          <p className="text-muted-foreground mt-1">Gestisci template e campagne email</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList data-testid="tabs-marketing">
          <TabsTrigger value="templates" data-testid="tab-templates">
            <FileText className="w-4 h-4 mr-2" />
            Template
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <Mail className="w-4 h-4 mr-2" />
            Campagne
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Template Email</h2>
            <Dialog open={showTemplateDialog} onOpenChange={(open) => {
              setShowTemplateDialog(open);
              if (!open) {
                setEditingTemplate(null);
                resetTemplateForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-template">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuovo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle data-testid="text-dialog-title">
                    {editingTemplate ? "Modifica Template" : "Crea Template"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nome Template</Label>
                    <Input
                      id="template-name"
                      value={templateForm.name}
                      onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                      placeholder="Es: Newsletter Mensile"
                      data-testid="input-template-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-subject">Oggetto Email</Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                      placeholder="Es: Le novità di questo mese"
                      data-testid="input-template-subject"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-type">Tipo</Label>
                    <Select 
                      value={templateForm.type} 
                      onValueChange={(value) => setTemplateForm({ ...templateForm, type: value })}
                    >
                      <SelectTrigger data-testid="select-template-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newsletter">Newsletter</SelectItem>
                        <SelectItem value="reminder">Promemoria</SelectItem>
                        <SelectItem value="promotional">Promozionale</SelectItem>
                        <SelectItem value="transactional">Transazionale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-content">Contenuto HTML</Label>
                    <Textarea
                      id="template-content"
                      value={templateForm.htmlContent}
                      onChange={(e) => setTemplateForm({ ...templateForm, htmlContent: e.target.value })}
                      placeholder="<html>...</html>"
                      className="min-h-[200px] font-mono text-sm"
                      data-testid="textarea-template-content"
                    />
                    <p className="text-xs text-muted-foreground">
                      Usa {"{{firstName}}"} e {"{{email}}"} per personalizzare
                    </p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleTemplateSubmit}
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                      data-testid="button-save-template"
                    >
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending
                        ? "Salvataggio..."
                        : editingTemplate
                          ? "Aggiorna"
                          : "Crea Template"}
                    </Button>
                    {templateForm.htmlContent && (
                      <Button
                        variant="outline"
                        onClick={() => openPreview(templateForm.htmlContent)}
                        data-testid="button-preview-template"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Anteprima
                      </Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingTemplates ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessun template creato. Inizia creando il tuo primo template.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} data-testid={`card-template-${template.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-lg font-semibold truncate" data-testid={`text-template-name-${template.id}`}>
                      {template.name}
                    </CardTitle>
                    <Badge variant="outline">{template.type}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditTemplate(template)}
                        data-testid={`button-edit-template-${template.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Modifica
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPreview(template.htmlContent)}
                        data-testid={`button-preview-template-${template.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTemplateMutation.mutate(template.id)}
                        disabled={deleteTemplateMutation.isPending}
                        data-testid={`button-delete-template-${template.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Campagne</h2>
            <Dialog open={showCampaignDialog} onOpenChange={(open) => {
              setShowCampaignDialog(open);
              if (!open) {
                setEditingCampaign(null);
                resetCampaignForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-campaign">
                  <Plus className="w-4 h-4 mr-2" />
                  Nuova Campagna
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCampaign ? "Modifica Campagna" : "Crea Campagna"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="campaign-name">Nome Campagna</Label>
                    <Input
                      id="campaign-name"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      placeholder="Es: Promozione Estate 2024"
                      data-testid="input-campaign-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Template Email</Label>
                    <Select
                      value={campaignForm.templateId}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, templateId: value })}
                    >
                      <SelectTrigger data-testid="select-campaign-template">
                        <SelectValue placeholder="Seleziona un template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Evento (opzionale)</Label>
                    <Select
                      value={campaignForm.eventId}
                      onValueChange={(value) => setCampaignForm({ ...campaignForm, eventId: value })}
                    >
                      <SelectTrigger data-testid="select-campaign-event">
                        <SelectValue placeholder="Tutti i clienti" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Tutti i clienti</SelectItem>
                        {eventsOptions.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Se selezioni un evento, la campagna verrà inviata solo ai clienti con biglietti per quell&apos;evento
                    </p>
                  </div>
                  <Button
                    onClick={handleCampaignSubmit}
                    disabled={createCampaignMutation.isPending || updateCampaignMutation.isPending}
                    className="w-full mt-4"
                    data-testid="button-save-campaign"
                  >
                    {createCampaignMutation.isPending || updateCampaignMutation.isPending
                      ? "Salvataggio..."
                      : editingCampaign
                        ? "Aggiorna"
                        : "Crea Campagna"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingCampaigns ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessuna campagna creata. Inizia creando la tua prima campagna.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Stato</TableHead>
                    <TableHead>Inviati</TableHead>
                    <TableHead>Aperture</TableHead>
                    <TableHead>Data Invio</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => (
                    <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                      <TableCell className="font-medium" data-testid={`text-campaign-name-${campaign.id}`}>
                        {campaign.name}
                      </TableCell>
                      <TableCell>{campaign.template?.name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                      <TableCell>{campaign.recipientCount || 0}</TableCell>
                      <TableCell>{campaign.openCount || 0}</TableCell>
                      <TableCell>{formatDate(campaign.sentAt || campaign.scheduledAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {campaign.status === "draft" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => openEditCampaign(campaign)}
                                data-testid={`button-edit-campaign-${campaign.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedCampaignId(campaign.id);
                                  setShowScheduleDialog(true);
                                }}
                                data-testid={`button-schedule-campaign-${campaign.id}`}
                              >
                                <Clock className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => sendCampaignMutation.mutate(campaign.id)}
                                disabled={sendCampaignMutation.isPending}
                                data-testid={`button-send-campaign-${campaign.id}`}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                            disabled={deleteCampaignMutation.isPending}
                            data-testid={`button-delete-campaign-${campaign.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}

          <Dialog open={showScheduleDialog} onOpenChange={(open) => {
            setShowScheduleDialog(open);
            if (!open) {
              setSelectedCampaignId(null);
              setScheduleDate("");
            }
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programma Invio</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="schedule-date">Data e Ora Invio</Label>
                  <Input
                    id="schedule-date"
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    data-testid="input-schedule-date"
                  />
                </div>
                <Button
                  onClick={() => {
                    if (selectedCampaignId && scheduleDate) {
                      scheduleCampaignMutation.mutate({
                        id: selectedCampaignId,
                        scheduledAt: new Date(scheduleDate).toISOString(),
                      });
                    }
                  }}
                  disabled={!scheduleDate || scheduleCampaignMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-schedule"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  {scheduleCampaignMutation.isPending ? "Programmazione..." : "Conferma Programmazione"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <h2 className="text-xl font-semibold">Analytics (Ultimi 30 giorni)</h2>

          {loadingAnalytics ? (
            <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
          ) : !analytics ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessun dato disponibile
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card data-testid="card-stat-campaigns">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Campagne Totali</CardTitle>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-stat-campaigns">
                      {analytics.totalCampaigns}
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-stat-emails">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Email Inviate</CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-stat-emails">
                      {analytics.totalEmailsSent}
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-stat-open-rate">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasso Apertura</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-stat-open-rate">
                      {analytics.averageOpenRate}%
                    </div>
                  </CardContent>
                </Card>
                <Card data-testid="card-stat-click-rate">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tasso Click</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid="text-stat-click-rate">
                      {analytics.averageClickRate}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Stato Campagne</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold" data-testid="text-campaigns-draft">
                        {analytics.campaignsByStatus.draft}
                      </div>
                      <div className="text-sm text-muted-foreground">Bozze</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-500" data-testid="text-campaigns-scheduled">
                        {analytics.campaignsByStatus.scheduled}
                      </div>
                      <div className="text-sm text-muted-foreground">Programmate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-500" data-testid="text-campaigns-sent">
                        {analytics.campaignsByStatus.sent}
                      </div>
                      <div className="text-sm text-muted-foreground">Inviate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Riepilogo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Template Creati</span>
                    <span className="font-semibold">{analytics.totalTemplates}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Email Aperte</span>
                    <span className="font-semibold">{analytics.totalOpens}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Click Totali</span>
                    <span className="font-semibold">{analytics.totalClicks}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Anteprima Template</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[70vh]">
            <iframe
              srcDoc={previewHtml}
              title="Template Preview"
              className="w-full min-h-[500px] border-0"
              sandbox="allow-same-origin"
              data-testid="iframe-template-preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
