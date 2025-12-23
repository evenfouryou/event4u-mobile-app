import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  ChevronLeft,
  Plus,
  Trash2,
  Star,
} from "lucide-react";
import {
  MobileAppLayout,
  MobileHeader,
  HapticButton,
  triggerHaptic,
} from "@/components/mobile-primitives";
import type { User, Company } from "@shared/schema";

interface UserCompanyAssociation {
  id: string;
  userId: string;
  companyId: string;
  role: string | null;
  isDefault: boolean;
  createdAt: string | null;
  companyName: string;
  companyVatNumber?: string;
}

const springTransition = { type: "spring", stiffness: 400, damping: 30 };

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...springTransition,
      delay: i * 0.05,
    },
  }),
};

export default function AdminGestoreCompanies() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams<{ gestoreId: string }>();
  const gestoreId = params.gestoreId;
  const isMobile = useIsMobile();

  const [addCompanyDialogOpen, setAddCompanyDialogOpen] = useState(false);
  const [deleteAssociationId, setDeleteAssociationId] = useState<string | null>(null);
  const [newCompanyId, setNewCompanyId] = useState<string>("");
  const [newCompanyRole, setNewCompanyRole] = useState<string>("owner");
  const [newCompanyIsDefault, setNewCompanyIsDefault] = useState<boolean>(false);

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const gestore = useMemo(() => {
    return users?.find(u => u.id === gestoreId);
  }, [users, gestoreId]);

  const gestoreLoading = !users;

  const { data: companies } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  const { data: gestoreCompanies, isLoading: companiesLoading } = useQuery<UserCompanyAssociation[]>({
    queryKey: ["/api/users", gestoreId, "companies"],
    enabled: !!gestoreId,
  });

  const availableCompanies = useMemo(() => {
    if (!companies || !gestoreCompanies) return companies || [];
    const associatedIds = new Set(gestoreCompanies.map((gc) => gc.companyId));
    return companies.filter((c) => !associatedIds.has(c.id));
  }, [companies, gestoreCompanies]);

  const createAssociationMutation = useMutation({
    mutationFn: async (data: { userId: string; companyId: string; role: string; isDefault: boolean }) => {
      await apiRequest("POST", "/api/user-companies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", gestoreId, "companies"] });
      setAddCompanyDialogOpen(false);
      setNewCompanyId("");
      setNewCompanyRole("owner");
      setNewCompanyIsDefault(false);
      triggerHaptic("success");
      toast({
        title: "Successo",
        description: "Associazione azienda creata con successo",
      });
    },
    onError: () => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: "Impossibile creare l'associazione",
        variant: "destructive",
      });
    },
  });

  const deleteAssociationMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/user-companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", gestoreId, "companies"] });
      setDeleteAssociationId(null);
      triggerHaptic("success");
      toast({
        title: "Successo",
        description: "Associazione rimossa con successo",
      });
    },
    onError: () => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: "Impossibile rimuovere l'associazione",
        variant: "destructive",
      });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/user-companies/${id}`, { isDefault: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", gestoreId, "companies"] });
      triggerHaptic("success");
      toast({
        title: "Successo",
        description: "Azienda predefinita aggiornata",
      });
    },
    onError: () => {
      triggerHaptic("error");
      toast({
        title: "Errore",
        description: "Impossibile aggiornare l'azienda predefinita",
        variant: "destructive",
      });
    },
  });

  const handleAddCompany = () => {
    if (!gestoreId || !newCompanyId) return;
    createAssociationMutation.mutate({
      userId: gestoreId,
      companyId: newCompanyId,
      role: newCompanyRole,
      isDefault: newCompanyIsDefault,
    });
  };

  const renderCompanyCard = (assoc: UserCompanyAssociation, index: number) => (
    <motion.div
      key={assoc.id}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
    >
      <Card className="hover-elevate" data-testid={`card-company-${assoc.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{assoc.companyName}</h3>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary">{assoc.role || "owner"}</Badge>
                {assoc.isDefault && (
                  <Badge className="bg-amber-500/20 text-amber-600">
                    <Star className="h-3 w-3 mr-1" />
                    Predefinita
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!assoc.isDefault && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDefaultMutation.mutate(assoc.id)}
                  disabled={setDefaultMutation.isPending}
                  data-testid={`button-set-default-${assoc.id}`}
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteAssociationId(assoc.id)}
                data-testid={`button-delete-assoc-${assoc.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderDesktopContent = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Aziende Associate
          </CardTitle>
          <CardDescription>
            Gestisci le associazioni con le aziende per questo gestore
          </CardDescription>
        </div>
        <Button
          onClick={() => setAddCompanyDialogOpen(true)}
          disabled={availableCompanies.length === 0}
          data-testid="button-add-company"
        >
          <Plus className="h-4 w-4 mr-1" />
          Aggiungi Azienda
        </Button>
      </CardHeader>
      <CardContent>
        {companiesLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : gestoreCompanies && gestoreCompanies.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Azienda</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead>Predefinita</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestoreCompanies.map((assoc) => (
                <TableRow key={assoc.id} data-testid={`row-company-assoc-${assoc.id}`}>
                  <TableCell className="font-medium">{assoc.companyName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{assoc.role || "owner"}</Badge>
                  </TableCell>
                  <TableCell>
                    {assoc.isDefault ? (
                      <Badge className="bg-amber-500/20 text-amber-600">
                        <Star className="h-3 w-3 mr-1" />
                        Predefinita
                      </Badge>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(assoc.id)}
                        disabled={setDefaultMutation.isPending}
                        data-testid={`button-set-default-${assoc.id}`}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Imposta
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteAssociationId(assoc.id)}
                      data-testid={`button-delete-assoc-${assoc.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nessuna associazione trovata
          </div>
        )}
      </CardContent>
    </Card>
  );

  const addCompanyDialog = (
    <Dialog open={addCompanyDialogOpen} onOpenChange={setAddCompanyDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aggiungi Azienda</DialogTitle>
          <DialogDescription>
            Associa una nuova azienda a {gestore?.firstName} {gestore?.lastName}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium">Azienda</label>
            <Select value={newCompanyId} onValueChange={setNewCompanyId}>
              <SelectTrigger data-testid="select-company">
                <SelectValue placeholder="Seleziona azienda" />
              </SelectTrigger>
              <SelectContent>
                {availableCompanies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Ruolo</label>
            <Select value={newCompanyRole} onValueChange={setNewCompanyRole}>
              <SelectTrigger data-testid="select-role">
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={newCompanyIsDefault}
              onChange={(e) => setNewCompanyIsDefault(e.target.checked)}
              className="h-4 w-4"
              data-testid="checkbox-is-default"
            />
            <label htmlFor="isDefault" className="text-sm">
              Imposta come azienda predefinita
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAddCompanyDialogOpen(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleAddCompany}
            disabled={!newCompanyId || createAssociationMutation.isPending}
            data-testid="button-confirm-add-company"
          >
            {createAssociationMutation.isPending ? "Salvataggio..." : "Aggiungi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const deleteDialog = (
    <AlertDialog open={!!deleteAssociationId} onOpenChange={() => setDeleteAssociationId(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Rimuovi associazione</AlertDialogTitle>
          <AlertDialogDescription>
            Sei sicuro di voler rimuovere questa associazione? Il gestore non avrà più accesso a questa azienda.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteAssociationId && deleteAssociationMutation.mutate(deleteAssociationId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-delete"
          >
            Rimuovi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <MobileAppLayout
        header={
          <MobileHeader
            title={`Aziende di ${gestore?.firstName || ""}`}
            leftAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/admin/gestori")}
                data-testid="button-back"
              >
                <ChevronLeft className="h-5 w-5" />
              </HapticButton>
            }
            rightAction={
              <HapticButton
                variant="ghost"
                size="icon"
                onClick={() => setAddCompanyDialogOpen(true)}
                disabled={availableCompanies.length === 0}
                data-testid="button-add-company"
              >
                <Plus className="h-5 w-5" />
              </HapticButton>
            }
          />
        }
      >
        <div className="py-4 space-y-3">
          {companiesLoading || gestoreLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          ) : gestoreCompanies && gestoreCompanies.length > 0 ? (
            gestoreCompanies.map((assoc, index) => renderCompanyCard(assoc, index))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nessuna azienda associata
            </div>
          )}
        </div>
        {addCompanyDialog}
        {deleteDialog}
      </MobileAppLayout>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/gestori")}
          data-testid="button-back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Aziende di {gestore?.firstName} {gestore?.lastName}
          </h1>
          <p className="text-muted-foreground">
            Gestisci le associazioni con le aziende per questo gestore
          </p>
        </div>
      </div>

      {gestoreLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        renderDesktopContent()
      )}

      {addCompanyDialog}
      {deleteDialog}
    </div>
  );
}
