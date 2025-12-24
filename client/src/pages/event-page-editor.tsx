import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  Edit,
  Music,
  Clock,
  HelpCircle,
  Image,
  Settings,
  Eye,
} from "lucide-react";
import { useState, useEffect } from "react";

interface PageConfig {
  heroVideoUrl?: string;
  heroImageUrl?: string;
  heroOverlayOpacity?: number;
  showLiveViewers?: boolean;
  showRemainingTickets?: boolean;
  urgencyThreshold?: number;
  earlyBirdEndDate?: string;
  earlyBirdLabel?: string;
  themeKey?: string;
  dressCode?: string;
  minAge?: number;
  parkingInfo?: string;
}

interface Artist {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
  setTime?: string;
}

interface TimelineItem {
  id: string;
  time: string;
  label: string;
  description?: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export default function EventPageEditor() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const defaultConfig: PageConfig = {
    heroOverlayOpacity: 60,
    showLiveViewers: false,
    showRemainingTickets: true,
  };
  const [config, setConfig] = useState<PageConfig>(defaultConfig);

  const [artistDialogOpen, setArtistDialogOpen] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [newArtist, setNewArtist] = useState<Partial<Artist>>({});

  const [timelineDialogOpen, setTimelineDialogOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState<TimelineItem | null>(null);
  const [newTimeline, setNewTimeline] = useState<Partial<TimelineItem>>({});

  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [newFaq, setNewFaq] = useState<Partial<FaqItem>>({});

  const { data: pageData, isLoading } = useQuery<{
    config: PageConfig | null;
    blocks: any[];
    artists: Artist[];
    timeline: TimelineItem[];
    faq: FaqItem[];
  }>({
    queryKey: ['/api/siae/ticketed-events', id, 'page-config'],
    enabled: !!id,
  });

  useEffect(() => {
    if (pageData !== undefined) {
      setConfig(pageData.config ?? defaultConfig);
    }
  }, [pageData]);

  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: PageConfig) => {
      return apiRequest('PUT', `/api/siae/ticketed-events/${id}/page-config`, { config: newConfig });
    },
    onSuccess: () => {
      toast({ title: "Configurazione salvata" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare", variant: "destructive" });
    },
  });

  const addArtistMutation = useMutation({
    mutationFn: async (artist: Partial<Artist>) => {
      return apiRequest('POST', `/api/siae/ticketed-events/${id}/lineup`, artist);
    },
    onSuccess: () => {
      toast({ title: "Artista aggiunto" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
      setArtistDialogOpen(false);
      setNewArtist({});
    },
  });

  const updateArtistMutation = useMutation({
    mutationFn: async ({ artistId, data }: { artistId: string; data: Partial<Artist> }) => {
      return apiRequest('PUT', `/api/siae/ticketed-events/${id}/lineup/${artistId}`, data);
    },
    onSuccess: () => {
      toast({ title: "Artista aggiornato" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
      setArtistDialogOpen(false);
      setEditingArtist(null);
    },
  });

  const deleteArtistMutation = useMutation({
    mutationFn: async (artistId: string) => {
      return apiRequest('DELETE', `/api/siae/ticketed-events/${id}/lineup/${artistId}`);
    },
    onSuccess: () => {
      toast({ title: "Artista rimosso" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
    },
  });

  const addTimelineMutation = useMutation({
    mutationFn: async (item: Partial<TimelineItem>) => {
      return apiRequest('POST', `/api/siae/ticketed-events/${id}/timeline`, item);
    },
    onSuccess: () => {
      toast({ title: "Orario aggiunto" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
      setTimelineDialogOpen(false);
      setNewTimeline({});
    },
  });

  const updateTimelineMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<TimelineItem> }) => {
      return apiRequest('PUT', `/api/siae/ticketed-events/${id}/timeline/${itemId}`, data);
    },
    onSuccess: () => {
      toast({ title: "Orario aggiornato" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
      setTimelineDialogOpen(false);
      setEditingTimeline(null);
    },
  });

  const deleteTimelineMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest('DELETE', `/api/siae/ticketed-events/${id}/timeline/${itemId}`);
    },
    onSuccess: () => {
      toast({ title: "Orario rimosso" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
    },
  });

  const addFaqMutation = useMutation({
    mutationFn: async (item: Partial<FaqItem>) => {
      return apiRequest('POST', `/api/siae/ticketed-events/${id}/faq`, item);
    },
    onSuccess: () => {
      toast({ title: "FAQ aggiunta" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
      setFaqDialogOpen(false);
      setNewFaq({});
    },
  });

  const updateFaqMutation = useMutation({
    mutationFn: async ({ itemId, data }: { itemId: string; data: Partial<FaqItem> }) => {
      return apiRequest('PUT', `/api/siae/ticketed-events/${id}/faq/${itemId}`, data);
    },
    onSuccess: () => {
      toast({ title: "FAQ aggiornata" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
      setFaqDialogOpen(false);
      setEditingFaq(null);
    },
  });

  const deleteFaqMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return apiRequest('DELETE', `/api/siae/ticketed-events/${id}/faq/${itemId}`);
    },
    onSuccess: () => {
      toast({ title: "FAQ rimossa" });
      queryClient.invalidateQueries({ queryKey: ['/api/siae/ticketed-events', id, 'page-config'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/siae/eventi/${id}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Editor Pagina Evento</h1>
            <p className="text-gray-400 text-sm">Personalizza la pagina pubblica</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/acquista/evento/${id}`} target="_blank">
            <Button variant="outline" data-testid="button-preview">
              <Eye className="w-4 h-4 mr-2" />
              Anteprima
            </Button>
          </Link>
          <Button 
            onClick={() => saveConfigMutation.mutate(config)}
            disabled={saveConfigMutation.isPending}
            data-testid="button-save-config"
          >
            <Save className="w-4 h-4 mr-2" />
            Salva
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="hero" data-testid="tab-hero"><Image className="w-4 h-4 mr-2" />Hero</TabsTrigger>
          <TabsTrigger value="info" data-testid="tab-info"><Settings className="w-4 h-4 mr-2" />Info</TabsTrigger>
          <TabsTrigger value="lineup" data-testid="tab-lineup"><Music className="w-4 h-4 mr-2" />Line-up</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline"><Clock className="w-4 h-4 mr-2" />Orari</TabsTrigger>
          <TabsTrigger value="faq" data-testid="tab-faq"><HelpCircle className="w-4 h-4 mr-2" />FAQ</TabsTrigger>
        </TabsList>

        <TabsContent value="hero">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Sezione Hero</CardTitle>
              <CardDescription>Configura immagine o video di copertina</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>URL Video (MP4)</Label>
                  <Input placeholder="https://example.com/video.mp4" value={config.heroVideoUrl || ''} onChange={(e) => setConfig({ ...config, heroVideoUrl: e.target.value })} data-testid="input-hero-video" />
                  <p className="text-xs text-gray-400 mt-1">Video loop 3-6 secondi</p>
                </div>
                <div>
                  <Label>URL Immagine Fallback</Label>
                  <Input placeholder="https://example.com/image.jpg" value={config.heroImageUrl || ''} onChange={(e) => setConfig({ ...config, heroImageUrl: e.target.value })} data-testid="input-hero-image" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Opacità Overlay (%)</Label>
                  <Input type="number" min="0" max="100" value={config.heroOverlayOpacity || 60} onChange={(e) => setConfig({ ...config, heroOverlayOpacity: Number(e.target.value) })} data-testid="input-overlay-opacity" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Mostra "X persone stanno guardando"</Label>
                    <Switch checked={config.showLiveViewers || false} onCheckedChange={(v) => setConfig({ ...config, showLiveViewers: v })} data-testid="switch-live-viewers" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Mostra biglietti rimasti</Label>
                    <Switch checked={config.showRemainingTickets !== false} onCheckedChange={(v) => setConfig({ ...config, showRemainingTickets: v })} data-testid="switch-remaining-tickets" />
                  </div>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 mt-4">
                <h3 className="font-semibold text-white mb-3">Early Bird Countdown</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data Fine Early Bird</Label>
                    <Input type="datetime-local" value={config.earlyBirdEndDate ? config.earlyBirdEndDate.slice(0, 16) : ''} onChange={(e) => setConfig({ ...config, earlyBirdEndDate: e.target.value })} data-testid="input-early-bird-date" />
                  </div>
                  <div>
                    <Label>Label Countdown</Label>
                    <Input placeholder="Prezzo Early Bird termina tra:" value={config.earlyBirdLabel || ''} onChange={(e) => setConfig({ ...config, earlyBirdLabel: e.target.value })} data-testid="input-early-bird-label" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Informazioni Rapide</CardTitle>
              <CardDescription>Dettagli utili per i partecipanti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dress Code</Label>
                <Input placeholder="Elegante casual" value={config.dressCode || ''} onChange={(e) => setConfig({ ...config, dressCode: e.target.value })} data-testid="input-dress-code" />
              </div>
              <div>
                <Label>Età Minima</Label>
                <Input type="number" placeholder="18" value={config.minAge || ''} onChange={(e) => setConfig({ ...config, minAge: Number(e.target.value) || undefined })} data-testid="input-min-age" />
              </div>
              <div>
                <Label>Info Parcheggio</Label>
                <Textarea placeholder="Parcheggio gratuito disponibile..." value={config.parkingInfo || ''} onChange={(e) => setConfig({ ...config, parkingInfo: e.target.value })} data-testid="input-parking-info" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineup">
          <Card className="bg-black/40 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Line-up Artisti</CardTitle>
                <CardDescription>Aggiungi DJ e performer</CardDescription>
              </div>
              <Dialog open={artistDialogOpen} onOpenChange={setArtistDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingArtist(null); setNewArtist({}); }} data-testid="button-add-artist">
                    <Plus className="w-4 h-4 mr-2" />Aggiungi
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingArtist ? 'Modifica' : 'Nuovo'} Artista</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Nome *</Label><Input value={editingArtist?.name || newArtist.name || ''} onChange={(e) => editingArtist ? setEditingArtist({ ...editingArtist, name: e.target.value }) : setNewArtist({ ...newArtist, name: e.target.value })} data-testid="input-artist-name" /></div>
                    <div><Label>Ruolo</Label><Input placeholder="DJ, Live Act..." value={editingArtist?.role || newArtist.role || ''} onChange={(e) => editingArtist ? setEditingArtist({ ...editingArtist, role: e.target.value }) : setNewArtist({ ...newArtist, role: e.target.value })} data-testid="input-artist-role" /></div>
                    <div><Label>URL Foto</Label><Input placeholder="https://..." value={editingArtist?.photoUrl || newArtist.photoUrl || ''} onChange={(e) => editingArtist ? setEditingArtist({ ...editingArtist, photoUrl: e.target.value }) : setNewArtist({ ...newArtist, photoUrl: e.target.value })} data-testid="input-artist-photo" /></div>
                    <div><Label>Orario Set</Label><Input placeholder="00:00 - 02:00" value={editingArtist?.setTime || newArtist.setTime || ''} onChange={(e) => editingArtist ? setEditingArtist({ ...editingArtist, setTime: e.target.value }) : setNewArtist({ ...newArtist, setTime: e.target.value })} data-testid="input-artist-time" /></div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { if (editingArtist) { updateArtistMutation.mutate({ artistId: editingArtist.id, data: editingArtist }); } else if (newArtist.name) { addArtistMutation.mutate(newArtist); } }} disabled={addArtistMutation.isPending || updateArtistMutation.isPending} data-testid="button-save-artist">Salva</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {pageData?.artists?.length ? (
                <div className="space-y-2">
                  {pageData.artists.map((artist) => (
                    <div key={artist.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg" data-testid={`artist-row-${artist.id}`}>
                      <div className="flex items-center gap-3">
                        {artist.photoUrl ? <img src={artist.photoUrl} alt={artist.name} className="w-10 h-10 rounded-full object-cover" /> : <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"><Music className="w-5 h-5 text-amber-400" /></div>}
                        <div><div className="font-medium text-white">{artist.name}</div><div className="text-sm text-gray-400">{artist.role} {artist.setTime && `• ${artist.setTime}`}</div></div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingArtist(artist); setArtistDialogOpen(true); }} data-testid={`button-edit-artist-${artist.id}`}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteArtistMutation.mutate(artist.id)} data-testid={`button-delete-artist-${artist.id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8 text-gray-400">Nessun artista. Clicca "Aggiungi".</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="bg-black/40 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-white">Timeline Orari</CardTitle><CardDescription>Programma della serata</CardDescription></div>
              <Dialog open={timelineDialogOpen} onOpenChange={setTimelineDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingTimeline(null); setNewTimeline({}); }} data-testid="button-add-timeline"><Plus className="w-4 h-4 mr-2" />Aggiungi</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingTimeline ? 'Modifica' : 'Nuovo'} Orario</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Orario *</Label><Input placeholder="22:00" value={editingTimeline?.time || newTimeline.time || ''} onChange={(e) => editingTimeline ? setEditingTimeline({ ...editingTimeline, time: e.target.value }) : setNewTimeline({ ...newTimeline, time: e.target.value })} data-testid="input-timeline-time" /></div>
                    <div><Label>Evento *</Label><Input placeholder="Apertura Porte" value={editingTimeline?.label || newTimeline.label || ''} onChange={(e) => editingTimeline ? setEditingTimeline({ ...editingTimeline, label: e.target.value }) : setNewTimeline({ ...newTimeline, label: e.target.value })} data-testid="input-timeline-label" /></div>
                    <div><Label>Descrizione</Label><Textarea placeholder="Dettagli..." value={editingTimeline?.description || newTimeline.description || ''} onChange={(e) => editingTimeline ? setEditingTimeline({ ...editingTimeline, description: e.target.value }) : setNewTimeline({ ...newTimeline, description: e.target.value })} data-testid="input-timeline-description" /></div>
                  </div>
                  <DialogFooter><Button onClick={() => { if (editingTimeline) { updateTimelineMutation.mutate({ itemId: editingTimeline.id, data: editingTimeline }); } else if (newTimeline.time && newTimeline.label) { addTimelineMutation.mutate(newTimeline); } }} disabled={addTimelineMutation.isPending || updateTimelineMutation.isPending} data-testid="button-save-timeline">Salva</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {pageData?.timeline?.length ? (
                <div className="space-y-2">
                  {pageData.timeline.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-black/20 rounded-lg" data-testid={`timeline-row-${item.id}`}>
                      <div className="flex items-center gap-3"><div className="w-16 text-amber-400 font-bold">{item.time}</div><div><div className="font-medium text-white">{item.label}</div>{item.description && <div className="text-sm text-gray-400">{item.description}</div>}</div></div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => { setEditingTimeline(item); setTimelineDialogOpen(true); }} data-testid={`button-edit-timeline-${item.id}`}><Edit className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTimelineMutation.mutate(item.id)} data-testid={`button-delete-timeline-${item.id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8 text-gray-400">Nessun orario. Clicca "Aggiungi".</div>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq">
          <Card className="bg-black/40 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-white">FAQ</CardTitle><CardDescription>Domande frequenti</CardDescription></div>
              <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingFaq(null); setNewFaq({}); }} data-testid="button-add-faq"><Plus className="w-4 h-4 mr-2" />Aggiungi</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>{editingFaq ? 'Modifica' : 'Nuova'} FAQ</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div><Label>Domanda *</Label><Input placeholder="Come posso arrivare?" value={editingFaq?.question || newFaq.question || ''} onChange={(e) => editingFaq ? setEditingFaq({ ...editingFaq, question: e.target.value }) : setNewFaq({ ...newFaq, question: e.target.value })} data-testid="input-faq-question" /></div>
                    <div><Label>Risposta *</Label><Textarea rows={4} placeholder="Puoi raggiungere..." value={editingFaq?.answer || newFaq.answer || ''} onChange={(e) => editingFaq ? setEditingFaq({ ...editingFaq, answer: e.target.value }) : setNewFaq({ ...newFaq, answer: e.target.value })} data-testid="input-faq-answer" /></div>
                  </div>
                  <DialogFooter><Button onClick={() => { if (editingFaq) { updateFaqMutation.mutate({ itemId: editingFaq.id, data: editingFaq }); } else if (newFaq.question && newFaq.answer) { addFaqMutation.mutate(newFaq); } }} disabled={addFaqMutation.isPending || updateFaqMutation.isPending} data-testid="button-save-faq">Salva</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {pageData?.faq?.length ? (
                <div className="space-y-2">
                  {pageData.faq.map((item) => (
                    <div key={item.id} className="p-3 bg-black/20 rounded-lg" data-testid={`faq-row-${item.id}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1"><div className="font-medium text-white">{item.question}</div><div className="text-sm text-gray-400 mt-1">{item.answer}</div></div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingFaq(item); setFaqDialogOpen(true); }} data-testid={`button-edit-faq-${item.id}`}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteFaqMutation.mutate(item.id)} data-testid={`button-delete-faq-${item.id}`}><Trash2 className="w-4 h-4 text-red-400" /></Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8 text-gray-400">Nessuna FAQ. Clicca "Aggiungi".</div>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
