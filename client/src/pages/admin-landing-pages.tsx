import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  ExternalLink,
  Eye,
  Trash2,
  Edit,
  Download,
  Users,
  Building2,
  Loader2,
  Check,
  X,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface LandingPage {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  isActive: boolean;
  venueSpots: number;
  promoterSpots: number;
  targetCity: string;
  accentColor: string;
  leadCount: number;
  createdAt: string;
}

interface LandingLead {
  id: string;
  role: string;
  fullName: string;
  instagram: string;
  phoneOrEmail: string;
  venueName: string | null;
  venueRole: string | null;
  avgTables: string | null;
  avgGuests: string | null;
  city: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  landingPage?: { id: string; slug: string; title: string };
}

interface LeadStats {
  byStatus: Record<string, number>;
  byRole: Record<string, number>;
  byPage: Array<{ pageId: string; slug: string; title: string; count: number }>;
  recentLeads: number;
}

interface FullLandingPage extends LandingPage {
  heroText: string | null;
  painPoints: Array<{ icon: string; text: string }>;
  valueProps: Array<{ title: string; description: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

export default function AdminLandingPages() {
  const { toast } = useToast();
  const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState("content");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const [editData, setEditData] = useState<{
    slug: string;
    title: string;
    subtitle: string;
    heroText: string;
    targetCity: string;
    accentColor: string;
    venueSpots: number;
    promoterSpots: number;
    painPoints: Array<{ icon: string; text: string }>;
    valueProps: Array<{ title: string; description: string }>;
    faqs: Array<{ question: string; answer: string }>;
  }>({
    slug: "",
    title: "",
    subtitle: "",
    heroText: "",
    targetCity: "Miami",
    accentColor: "#77f2b4",
    venueSpots: 2,
    promoterSpots: 10,
    painPoints: [],
    valueProps: [],
    faqs: [],
  });

  const { data: pages, isLoading: pagesLoading } = useQuery<LandingPage[]>({
    queryKey: ["/api/admin/landing-pages"],
  });

  const { data: editingPage, isLoading: editingPageLoading } = useQuery<FullLandingPage>({
    queryKey: ["/api/admin/landing-pages", editingPageId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/landing-pages/${editingPageId}`);
      return res.json();
    },
    enabled: !!editingPageId,
  });

  const { data: pageLeads, isLoading: pageLeadsLoading, refetch: refetchPageLeads } = useQuery<{ leads: LandingLead[]; total: number }>({
    queryKey: ["/api/admin/landing-pages", editingPageId, "leads"],
    queryFn: async () => {
      const res = await fetch(`/api/admin/landing-pages/${editingPageId}/leads`);
      return res.json();
    },
    enabled: !!editingPageId && isEditorOpen,
  });

  const { data: allLeads, isLoading: leadsLoading, refetch: refetchLeads } = useQuery<{ leads: LandingLead[]; total: number }>({
    queryKey: ["/api/admin/landing-leads", statusFilter, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (roleFilter !== "all") params.set("role", roleFilter);
      const res = await fetch(`/api/admin/landing-leads?${params}`);
      return res.json();
    },
  });

  const { data: stats } = useQuery<LeadStats>({
    queryKey: ["/api/admin/landing-stats"],
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/landing-pages", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      setIsCreateOpen(false);
      toast({ title: "Success", description: "Landing page created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/landing-pages/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/landing-pages/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-stats"] });
      toast({ title: "Landing page deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updatePageMutation = useMutation({
    mutationFn: async (data: typeof editData) => {
      const res = await apiRequest("PATCH", `/api/admin/landing-pages/${editingPageId}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-pages"] });
      toast({ title: "Landing page updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditor = (pageId: string) => {
    setEditingPageId(pageId);
    setEditorTab("content");
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setIsEditorOpen(false);
    setEditingPageId(null);
  };

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/landing-leads/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-stats"] });
      toast({ title: "Status updated" });
    },
  });

  const deleteLeadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/landing-leads/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/landing-stats"] });
      toast({ title: "Lead deleted" });
    },
  });

  const statusColors: Record<string, string> = {
    new: "bg-blue-500/20 text-blue-400",
    contacted: "bg-yellow-500/20 text-yellow-400",
    qualified: "bg-purple-500/20 text-purple-400",
    converted: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
  };

  const loadEditData = () => {
    if (editingPage) {
      setEditData({
        slug: editingPage.slug || "",
        title: editingPage.title || "",
        subtitle: editingPage.subtitle || "",
        heroText: editingPage.heroText || "",
        targetCity: editingPage.targetCity || "Miami",
        accentColor: editingPage.accentColor || "#77f2b4",
        venueSpots: editingPage.venueSpots || 2,
        promoterSpots: editingPage.promoterSpots || 10,
        painPoints: editingPage.painPoints || [],
        valueProps: editingPage.valueProps || [],
        faqs: editingPage.faqs || [],
      });
    }
  };

  const [newPageData, setNewPageData] = useState({
    slug: "",
    title: "",
    subtitle: "",
    targetCity: "Miami",
    venueSpots: 2,
    promoterSpots: 10,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Landing Pages</h1>
          <p className="text-muted-foreground">Manage market landing pages and leads</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-page">
              <Plus className="w-4 h-4 mr-2" />
              New Landing Page
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Landing Page</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              createPageMutation.mutate(newPageData);
            }} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Slug (URL path)</label>
                <Input
                  value={newPageData.slug}
                  onChange={(e) => setNewPageData({ ...newPageData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="usa, miami, nyc"
                  required
                  data-testid="input-slug"
                />
                <p className="text-xs text-muted-foreground mt-1">URL: /{"<slug>"}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newPageData.title}
                  onChange={(e) => setNewPageData({ ...newPageData, title: e.target.value })}
                  placeholder="Miami Nightlife System"
                  required
                  data-testid="input-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Subtitle</label>
                <Textarea
                  value={newPageData.subtitle}
                  onChange={(e) => setNewPageData({ ...newPageData, subtitle: e.target.value })}
                  placeholder="Tables, tickets, promoters — tracked in real time."
                  data-testid="input-subtitle"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Target City</label>
                  <Input
                    value={newPageData.targetCity}
                    onChange={(e) => setNewPageData({ ...newPageData, targetCity: e.target.value })}
                    placeholder="Miami"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Venue Spots</label>
                  <Input
                    type="number"
                    value={newPageData.venueSpots}
                    onChange={(e) => setNewPageData({ ...newPageData, venueSpots: parseInt(e.target.value) || 2 })}
                    data-testid="input-venue-spots"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Promoter Spots</label>
                  <Input
                    type="number"
                    value={newPageData.promoterSpots}
                    onChange={(e) => setNewPageData({ ...newPageData, promoterSpots: parseInt(e.target.value) || 10 })}
                    data-testid="input-promoter-spots"
                  />
                </div>
              </div>
              <Button type="submit" disabled={createPageMutation.isPending} className="w-full" data-testid="button-submit-create">
                {createPageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Page"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.recentLeads || 0}</div>
            <p className="text-sm text-muted-foreground">Leads this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.byStatus?.new || 0}</div>
            <p className="text-sm text-muted-foreground">New leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.byRole?.venue || 0}</div>
            <p className="text-sm text-muted-foreground">Venue applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.byRole?.promoter || 0}</div>
            <p className="text-sm text-muted-foreground">Promoter applications</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pages">
        <TabsList>
          <TabsTrigger value="pages" data-testid="tab-pages">Landing Pages</TabsTrigger>
          <TabsTrigger value="leads" data-testid="tab-leads">All Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="pages" className="space-y-4">
          {pagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4">
              {pages?.map((page) => (
                <Card key={page.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{page.title}</h3>
                          <Badge variant={page.isActive ? "default" : "secondary"}>
                            {page.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">/{page.slug}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Target: {page.targetCity} • {page.venueSpots} venue spots • {page.promoterSpots} promoter spots
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {page.leadCount} leads
                          </span>
                          <span className="text-muted-foreground">
                            Created {format(new Date(page.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditor(page.id)}
                          data-testid={`button-edit-${page.slug}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/${page.slug}`, '_blank')}
                          data-testid={`button-view-${page.slug}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ id: page.id, isActive: !page.isActive })}
                          data-testid={`button-toggle-${page.slug}`}
                        >
                          {page.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/admin/landing-pages/${page.id}/leads/export`, '_blank')}
                          data-testid={`button-export-${page.slug}`}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            if (confirm(`Delete "${page.title}" and all its leads? This cannot be undone.`)) {
                              deletePageMutation.mutate(page.id);
                            }
                          }}
                          data-testid={`button-delete-${page.slug}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pages?.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No landing pages created yet. Click "New Landing Page" to create one.
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <div className="flex gap-4 items-center">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-role-filter">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="venue">Venue</SelectItem>
                <SelectItem value="promoter">Promoter</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetchLeads()} data-testid="button-refresh-leads">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground ml-auto">
              {allLeads?.total || 0} leads found
            </span>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : allLeads?.leads?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : (
                  allLeads?.leads?.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="font-medium">{lead.fullName}</div>
                        <div className="text-sm text-muted-foreground">@{lead.instagram}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {lead.role === "venue" ? <Building2 className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                          {lead.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{lead.phoneOrEmail}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {lead.role === "venue" ? (
                            <>
                              {lead.venueName && <div>{lead.venueName}</div>}
                              {lead.venueRole && <div className="text-muted-foreground">{lead.venueRole}</div>}
                              {lead.avgTables && <div className="text-muted-foreground">{lead.avgTables} tables/wk</div>}
                            </>
                          ) : (
                            <>
                              {lead.city && <div>{lead.city}</div>}
                              {lead.avgGuests && <div className="text-muted-foreground">{lead.avgGuests} guests/wk</div>}
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(status) => updateLeadStatusMutation.mutate({ id: lead.id, status })}
                        >
                          <SelectTrigger className="w-[120px] h-8" data-testid={`select-status-${lead.id}`}>
                            <Badge className={statusColors[lead.status] || ""} variant="secondary">
                              {lead.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(lead.createdAt), "MMM d")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this lead?")) {
                              deleteLeadMutation.mutate(lead.id);
                            }
                          }}
                          data-testid={`button-delete-${lead.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditorOpen} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Landing Page</DialogTitle>
          </DialogHeader>
          
          {editingPageLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : editingPage ? (
            <Tabs value={editorTab} onValueChange={setEditorTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="content" data-testid="editor-tab-content">Content</TabsTrigger>
                <TabsTrigger value="sections" data-testid="editor-tab-sections">Sections</TabsTrigger>
                <TabsTrigger value="leads" data-testid="editor-tab-leads">
                  Leads ({pageLeads?.total || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadEditData}
                  data-testid="button-reload-data"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload from server
                </Button>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Slug</label>
                    <Input
                      value={editData.slug || editingPage.slug}
                      onChange={(e) => setEditData({ ...editData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      data-testid="editor-input-slug"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target City</label>
                    <Input
                      value={editData.targetCity || editingPage.targetCity}
                      onChange={(e) => setEditData({ ...editData, targetCity: e.target.value })}
                      data-testid="editor-input-city"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Title (headline)</label>
                  <Input
                    value={editData.title || editingPage.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    placeholder="The door runs on chaos. We run it on numbers."
                    data-testid="editor-input-title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Subtitle (hero text)</label>
                  <Textarea
                    value={editData.subtitle || editingPage.subtitle || ""}
                    onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
                    placeholder="Tables, tickets, promoters — tracked in real time."
                    data-testid="editor-input-subtitle"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Hero Text (secondary line)</label>
                  <Input
                    value={editData.heroText || editingPage.heroText || ""}
                    onChange={(e) => setEditData({ ...editData, heroText: e.target.value })}
                    placeholder="If you don't control the numbers, you don't control the deal."
                    data-testid="editor-input-herotext"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Accent Color</label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={editData.accentColor || editingPage.accentColor}
                        onChange={(e) => setEditData({ ...editData, accentColor: e.target.value })}
                        className="w-12 h-9 p-1"
                        data-testid="editor-input-color"
                      />
                      <Input
                        value={editData.accentColor || editingPage.accentColor}
                        onChange={(e) => setEditData({ ...editData, accentColor: e.target.value })}
                        placeholder="#77f2b4"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Venue Spots</label>
                    <Input
                      type="number"
                      value={editData.venueSpots ?? editingPage.venueSpots}
                      onChange={(e) => setEditData({ ...editData, venueSpots: parseInt(e.target.value) || 2 })}
                      data-testid="editor-input-venue-spots"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Promoter Spots</label>
                    <Input
                      type="number"
                      value={editData.promoterSpots ?? editingPage.promoterSpots}
                      onChange={(e) => setEditData({ ...editData, promoterSpots: parseInt(e.target.value) || 10 })}
                      data-testid="editor-input-promoter-spots"
                    />
                  </div>
                </div>

                <Button 
                  onClick={() => updatePageMutation.mutate(editData)}
                  disabled={updatePageMutation.isPending}
                  className="w-full"
                  data-testid="button-save-content"
                >
                  {updatePageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
                </Button>
              </TabsContent>

              <TabsContent value="sections" className="space-y-6">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadEditData}
                  data-testid="button-reload-sections"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload from server
                </Button>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Pain Points (what's costing them money)</label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditData({
                        ...editData,
                        painPoints: [...(editData.painPoints || editingPage.painPoints || []), { icon: "❌", text: "" }]
                      })}
                      data-testid="button-add-pain"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(editData.painPoints?.length ? editData.painPoints : editingPage.painPoints || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          value={item.icon}
                          onChange={(e) => {
                            const newPoints = [...(editData.painPoints || editingPage.painPoints || [])];
                            newPoints[idx] = { ...newPoints[idx], icon: e.target.value };
                            setEditData({ ...editData, painPoints: newPoints });
                          }}
                          className="w-16"
                          placeholder="❌"
                        />
                        <Input
                          value={item.text}
                          onChange={(e) => {
                            const newPoints = [...(editData.painPoints || editingPage.painPoints || [])];
                            newPoints[idx] = { ...newPoints[idx], text: e.target.value };
                            setEditData({ ...editData, painPoints: newPoints });
                          }}
                          className="flex-1"
                          placeholder="Guestlists aren't tracked → you can't prove performance"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newPoints = (editData.painPoints || editingPage.painPoints || []).filter((_, i) => i !== idx);
                            setEditData({ ...editData, painPoints: newPoints });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Value Props (what you get)</label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditData({
                        ...editData,
                        valueProps: [...(editData.valueProps || editingPage.valueProps || []), { title: "", description: "" }]
                      })}
                      data-testid="button-add-value"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(editData.valueProps?.length ? editData.valueProps : editingPage.valueProps || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-1">
                          <Input
                            value={item.title}
                            onChange={(e) => {
                              const newProps = [...(editData.valueProps || editingPage.valueProps || [])];
                              newProps[idx] = { ...newProps[idx], title: e.target.value };
                              setEditData({ ...editData, valueProps: newProps });
                            }}
                            placeholder="Venue Control"
                          />
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              const newProps = [...(editData.valueProps || editingPage.valueProps || [])];
                              newProps[idx] = { ...newProps[idx], description: e.target.value };
                              setEditData({ ...editData, valueProps: newProps });
                            }}
                            placeholder="Deposits, table inventory, live revenue, promoter performance"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newProps = (editData.valueProps || editingPage.valueProps || []).filter((_, i) => i !== idx);
                            setEditData({ ...editData, valueProps: newProps });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">FAQs</label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setEditData({
                        ...editData,
                        faqs: [...(editData.faqs || editingPage.faqs || []), { question: "", answer: "" }]
                      })}
                      data-testid="button-add-faq"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {(editData.faqs?.length ? editData.faqs : editingPage.faqs || []).map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-start">
                        <div className="flex-1 space-y-1">
                          <Input
                            value={item.question}
                            onChange={(e) => {
                              const newFaqs = [...(editData.faqs || editingPage.faqs || [])];
                              newFaqs[idx] = { ...newFaqs[idx], question: e.target.value };
                              setEditData({ ...editData, faqs: newFaqs });
                            }}
                            placeholder="Is it live?"
                          />
                          <Textarea
                            value={item.answer}
                            onChange={(e) => {
                              const newFaqs = [...(editData.faqs || editingPage.faqs || [])];
                              newFaqs[idx] = { ...newFaqs[idx], answer: e.target.value };
                              setEditData({ ...editData, faqs: newFaqs });
                            }}
                            placeholder="We're in pilot mode, testing with select partners..."
                            rows={2}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newFaqs = (editData.faqs || editingPage.faqs || []).filter((_, i) => i !== idx);
                            setEditData({ ...editData, faqs: newFaqs });
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={() => updatePageMutation.mutate(editData)}
                  disabled={updatePageMutation.isPending}
                  className="w-full"
                  data-testid="button-save-sections"
                >
                  {updatePageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Sections"}
                </Button>
              </TabsContent>

              <TabsContent value="leads" className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Leads for this page ({pageLeads?.total || 0})</h3>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => refetchPageLeads()}
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(`/api/admin/landing-pages/${editingPageId}/leads/export`, '_blank')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </div>

                {pageLeadsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : pageLeads?.leads?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No leads yet for this page
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Role</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pageLeads?.leads?.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <Badge variant={lead.role === "venue" ? "default" : "secondary"}>
                              {lead.role === "venue" ? <Building2 className="w-3 h-3 mr-1" /> : <Users className="w-3 h-3 mr-1" />}
                              {lead.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{lead.fullName}</div>
                            <div className="text-sm text-muted-foreground">@{lead.instagram}</div>
                          </TableCell>
                          <TableCell className="text-sm">{lead.phoneOrEmail}</TableCell>
                          <TableCell className="text-sm">
                            {lead.role === "venue" ? (
                              <>
                                {lead.venueName && <div>{lead.venueName}</div>}
                                {lead.avgTables && <div className="text-muted-foreground">{lead.avgTables} tables/wk</div>}
                              </>
                            ) : (
                              <>
                                {lead.city && <div>{lead.city}</div>}
                                {lead.avgGuests && <div className="text-muted-foreground">{lead.avgGuests} guests/wk</div>}
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={lead.status}
                              onValueChange={(status) => {
                                updateLeadStatusMutation.mutate({ id: lead.id, status });
                                refetchPageLeads();
                              }}
                            >
                              <SelectTrigger className="w-[110px] h-8">
                                <Badge className={statusColors[lead.status] || ""} variant="secondary">
                                  {lead.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="new">New</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="qualified">Qualified</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(lead.createdAt), "MMM d")}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Delete this lead?")) {
                                  deleteLeadMutation.mutate(lead.id);
                                  setTimeout(() => refetchPageLeads(), 500);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Page not found
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
