import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  MobileAppLayout,
  MobileHeader,
  FloatingActionButton,
  HapticButton,
  BottomSheet,
  triggerHaptic,
} from "@/components/mobile-primitives";
import {
  Users,
  Plus,
  Phone,
  Mail,
  Euro,
  ChevronLeft,
  Search,
  X,
  UserCheck,
  Edit2,
  Trash2,
} from "lucide-react";
import type { Staff } from "@shared/schema";

const roleKeys = ["pr", "barista", "sicurezza", "fotografo", "dj", "tecnico", "altro"] as const;

const roleColors: Record<string, string> = {
  pr: "from-pink-500 to-rose-600",
  barista: "from-amber-500 to-orange-600",
  sicurezza: "from-blue-500 to-indigo-600",
  fotografo: "from-purple-500 to-violet-600",
  dj: "from-cyan-500 to-teal-600",
  tecnico: "from-slate-500 to-zinc-600",
  altro: "from-gray-500 to-slate-600",
};

function StaffCard({
  staff,
  index,
  onEdit,
  onDelete,
  isAdmin,
}: {
  staff: Staff;
  index: number;
  onEdit: (staff: Staff) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}) {
  const { t } = useTranslation();
  const initials = `${staff.firstName?.[0] || ""}${staff.lastName?.[0] || ""}`.toUpperCase();
  const gradient = roleColors[staff.role] || roleColors.altro;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 25,
        delay: index * 0.05,
      }}
      className="glass-card p-4 active:scale-[0.98] transition-transform"
      data-testid={`card-staff-${staff.id}`}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-lg font-semibold`}>
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-base truncate" data-testid={`text-staff-name-${staff.id}`}>
                {staff.firstName} {staff.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="shrink-0 text-xs">
                  {t(`staff.roles.${staff.role}`, staff.role)}
                </Badge>
                {staff.active ? (
                  <span className="flex items-center gap-1 text-xs text-teal">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
                    {t("common.active")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t("common.inactive")}</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            {staff.phone && (
              <a
                href={`tel:${staff.phone}`}
                className="flex items-center gap-2 text-sm text-muted-foreground min-h-[44px] -my-2"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-phone-${staff.id}`}
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span className="truncate">{staff.phone}</span>
              </a>
            )}
            {staff.email && (
              <a
                href={`mailto:${staff.email}`}
                className="flex items-center gap-2 text-sm text-muted-foreground min-h-[44px] -my-2"
                onClick={(e) => e.stopPropagation()}
                data-testid={`link-email-${staff.id}`}
              >
                <Mail className="h-4 w-4 shrink-0" />
                <span className="truncate">{staff.email}</span>
              </a>
            )}
            {(staff.hourlyRate || staff.fixedRate) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Euro className="h-4 w-4 shrink-0" />
                <span>
                  {staff.hourlyRate && `€${parseFloat(staff.hourlyRate).toFixed(0)}/h`}
                  {staff.hourlyRate && staff.fixedRate && " · "}
                  {staff.fixedRate && `€${parseFloat(staff.fixedRate).toFixed(0)} ${t("staff.fixed")}`}
                </span>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
              <HapticButton
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl"
                onClick={() => onEdit(staff)}
                data-testid={`button-edit-staff-${staff.id}`}
              >
                <Edit2 className="h-4 w-4" />
              </HapticButton>
              <HapticButton
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-xl text-destructive"
                hapticType="medium"
                onClick={() => onDelete(staff.id)}
                data-testid={`button-delete-staff-${staff.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </HapticButton>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RoleFilter({
  selected,
  onChange,
}: {
  selected: string | null;
  onChange: (role: string | null) => void;
}) {
  const { t } = useTranslation();
  const roles = ["all", "pr", "barista", "sicurezza", "fotografo", "dj", "tecnico", "altro"];

  return (
    <div className="flex gap-2 overflow-x-auto py-2 px-1 -mx-1 scrollbar-hide">
      {roles.map((role) => (
        <motion.button
          key={role}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            triggerHaptic("light");
            onChange(role === "all" ? null : role);
          }}
          className={`
            shrink-0 px-4 py-2.5 rounded-full text-sm font-medium min-h-[44px]
            transition-colors
            ${
              (role === "all" && selected === null) || selected === role
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }
          `}
          data-testid={`filter-role-${role}`}
        >
          {role === "all" ? t("staff.all") : t(`staff.roles.${role}`, role)}
        </motion.button>
      ))}
    </div>
  );
}

export default function StaffPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isAdmin = user?.role === "super_admin" || user?.role === "gestore";

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setIsDialogOpen(false);
      triggerHaptic("success");
      toast({ title: t("staff.createSuccess") });
    },
    onError: (err: any) => {
      triggerHaptic("error");
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiRequest("PATCH", `/api/staff/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setEditingStaff(null);
      setIsDialogOpen(false);
      triggerHaptic("success");
      toast({ title: t("staff.updateSuccess") });
    },
    onError: (err: any) => {
      triggerHaptic("error");
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      setDeleteConfirmId(null);
      triggerHaptic("success");
      toast({ title: t("staff.deleteSuccess") });
    },
    onError: (err: any) => {
      triggerHaptic("error");
      toast({ title: t("common.error"), description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      fiscalCode: (formData.get("fiscalCode") as string) || null,
      email: (formData.get("email") as string) || null,
      phone: (formData.get("phone") as string) || null,
      role: formData.get("role") as string,
      hourlyRate: (formData.get("hourlyRate") as string) || null,
      fixedRate: (formData.get("fixedRate") as string) || null,
      bankIban: (formData.get("bankIban") as string) || null,
      address: (formData.get("address") as string) || null,
      notes: (formData.get("notes") as string) || null,
      active: formData.get("active") === "on",
    };

    if (editingStaff) {
      updateMutation.mutate({ id: editingStaff.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchesRole = !selectedRole || s.role === selectedRole;
    const matchesSearch =
      !searchQuery ||
      s.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.lastName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const activeCount = staffList.filter((s) => s.active).length;

  const header = (
    <MobileHeader
      title={t("staff.title")}
      subtitle={`${t("staff.membersCount", { count: staffList.length })} · ${t("staff.activeCount", { count: activeCount })}`}
      showBackButton showMenuButton
      rightAction={
        <HapticButton
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-xl"
          onClick={() => {}}
          data-testid="button-search-toggle"
        >
          <Search className="h-5 w-5" />
        </HapticButton>
      }
    />
  );

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">{t("staff.firstName")} *</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={editingStaff?.firstName || ""}
            required
            className="h-12"
            data-testid="input-staff-first-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">{t("staff.lastName")} *</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={editingStaff?.lastName || ""}
            required
            className="h-12"
            data-testid="input-staff-last-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">{t("staff.role")} *</Label>
        <Select name="role" defaultValue={editingStaff?.role || "altro"}>
          <SelectTrigger className="h-12" data-testid="select-staff-role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleKeys.map((role) => (
              <SelectItem key={role} value={role}>{t(`staff.roles.${role}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t("staff.phone")}</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={editingStaff?.phone || ""}
            className="h-12"
            data-testid="input-staff-phone"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("staff.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={editingStaff?.email || ""}
            className="h-12"
            data-testid="input-staff-email"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hourlyRate">{t("staff.hourlyRate")}</Label>
          <Input
            id="hourlyRate"
            name="hourlyRate"
            type="number"
            step="0.01"
            defaultValue={editingStaff?.hourlyRate || ""}
            placeholder="0.00"
            className="h-12"
            data-testid="input-staff-hourly-rate"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="fixedRate">{t("staff.fixedRate")}</Label>
          <Input
            id="fixedRate"
            name="fixedRate"
            type="number"
            step="0.01"
            defaultValue={editingStaff?.fixedRate || ""}
            placeholder="0.00"
            className="h-12"
            data-testid="input-staff-fixed-rate"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fiscalCode">{t("staff.fiscalCode")}</Label>
        <Input
          id="fiscalCode"
          name="fiscalCode"
          defaultValue={editingStaff?.fiscalCode || ""}
          maxLength={16}
          className="h-12"
          data-testid="input-staff-fiscal-code"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankIban">{t("staff.iban")}</Label>
        <Input
          id="bankIban"
          name="bankIban"
          defaultValue={editingStaff?.bankIban || ""}
          maxLength={34}
          className="h-12"
          data-testid="input-staff-iban"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t("staff.address")}</Label>
        <Input
          id="address"
          name="address"
          defaultValue={editingStaff?.address || ""}
          className="h-12"
          data-testid="input-staff-address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("staff.notes")}</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={editingStaff?.notes || ""}
          className="min-h-[100px]"
          data-testid="input-staff-notes"
        />
      </div>

      <div className="flex items-center gap-3 py-2">
        <Switch
          id="active"
          name="active"
          defaultChecked={editingStaff?.active !== false}
          data-testid="switch-staff-active"
        />
        <Label htmlFor="active" className="cursor-pointer">
          {t("staff.staffActive")}
        </Label>
      </div>

      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsDialogOpen(false)}
          className="flex-1 h-12"
        >
          {t("common.cancel")}
        </Button>
        <Button
          type="submit"
          className="flex-1 h-12 gradient-golden text-black font-semibold"
          disabled={createMutation.isPending || updateMutation.isPending}
          data-testid="button-save-staff"
        >
          {editingStaff ? t("staff.update") : t("common.add")}
        </Button>
      </DialogFooter>
    </form>
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-staff">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">{t("staff.title")}</h1>
            <p className="text-muted-foreground">{t("staff.membersCount", { count: staffList.length })} · {t("staff.activeCount", { count: activeCount })}</p>
          </div>
          {isAdmin && (
            <Button
              onClick={() => {
                setEditingStaff(null);
                setIsDialogOpen(true);
              }}
              data-testid="button-add-staff"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t("staff.addStaff")}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{staffList.length}</div>
              <p className="text-sm text-muted-foreground">{t("staff.totalStaff")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">{activeCount}</div>
              <p className="text-sm text-muted-foreground">{t("staff.activeStaff")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">{staffList.length - activeCount}</div>
              <p className="text-sm text-muted-foreground">{t("staff.inactiveStaff")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-pink-500">{staffList.filter(s => s.role === 'pr').length}</div>
              <p className="text-sm text-muted-foreground">{t("staff.prCount")}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
            <div>
              <CardTitle>{t("staff.staffList")}</CardTitle>
              <CardDescription>{t("staff.manageStaff")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("staff.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64"
                  data-testid="input-search-staff-desktop"
                />
              </div>
              <Select value={selectedRole || "all"} onValueChange={(v) => setSelectedRole(v === "all" ? null : v)}>
                <SelectTrigger className="w-40" data-testid="select-filter-role">
                  <SelectValue placeholder={t("staff.allRoles")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("staff.allRoles")}</SelectItem>
                  {roleKeys.map((role) => (
                    <SelectItem key={role} value={role}>{t(`staff.roles.${role}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">
                  {searchQuery || selectedRole ? t("staff.noResults") : t("staff.noStaff")}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery || selectedRole
                    ? t("staff.modifyFilters")
                    : t("staff.addFirstMember")}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("staff.title")}</TableHead>
                    <TableHead>{t("staff.role")}</TableHead>
                    <TableHead>{t("staff.contacts")}</TableHead>
                    <TableHead>{t("staff.compensation")}</TableHead>
                    <TableHead>{t("common.status")}</TableHead>
                    {isAdmin && <TableHead className="text-right">{t("common.actions")}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((staff) => {
                    const initials = `${staff.firstName?.[0] || ""}${staff.lastName?.[0] || ""}`.toUpperCase();
                    const gradient = roleColors[staff.role] || roleColors.altro;
                    return (
                      <TableRow key={staff.id} data-testid={`row-staff-${staff.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white text-sm font-semibold`}>
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium" data-testid={`text-staff-name-${staff.id}`}>
                                {staff.firstName} {staff.lastName}
                              </div>
                              {staff.fiscalCode && (
                                <div className="text-xs text-muted-foreground">{staff.fiscalCode}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {t(`staff.roles.${staff.role}`, staff.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {staff.phone && (
                              <div className="flex items-center gap-1 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span>{staff.phone}</span>
                              </div>
                            )}
                            {staff.email && (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-[200px]">{staff.email}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Euro className="h-3 w-3 text-muted-foreground" />
                            <span>
                              {staff.hourlyRate && `€${parseFloat(staff.hourlyRate).toFixed(0)}/h`}
                              {staff.hourlyRate && staff.fixedRate && " · "}
                              {staff.fixedRate && `€${parseFloat(staff.fixedRate).toFixed(0)} ${t("staff.fixed")}`}
                              {!staff.hourlyRate && !staff.fixedRate && "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {staff.active ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <UserCheck className="h-3 w-3 mr-1" />
                              {t("common.active")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">{t("common.inactive")}</Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(staff)}
                                data-testid={`button-edit-staff-${staff.id}`}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDelete(staff.id)}
                                data-testid={`button-delete-staff-${staff.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingStaff(null);
          }}
        >
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingStaff ? t("staff.editStaff") : t("staff.newStaff")}
              </DialogTitle>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => {
            if (!open) setDeleteConfirmId(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("staff.confirmDelete")}</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              {t("staff.deleteMessage")}
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {t("common.delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <MobileAppLayout header={header} className="bg-background">
      <div className="pb-24">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="py-3"
        >
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("staff.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-card border-border"
              data-testid="input-search-staff"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <RoleFilter selected={selectedRole} onChange={setSelectedRole} />
        </motion.div>

        {isLoading ? (
          <div className="space-y-3 pt-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">
              {searchQuery || selectedRole ? t("staff.noResults") : t("staff.noStaff")}
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery || selectedRole
                ? t("staff.modifyFilters")
                : t("staff.addFirstMember")}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3 pt-2"
          >
            <AnimatePresence mode="popLayout">
              {filteredStaff.map((staff, index) => (
                <StaffCard
                  key={staff.id}
                  staff={staff}
                  index={index}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {isAdmin && (
        <FloatingActionButton
          onClick={() => {
            setEditingStaff(null);
            setIsDialogOpen(true);
          }}
          data-testid="fab-add-staff"
        >
          <Plus className="h-6 w-6" />
        </FloatingActionButton>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setEditingStaff(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? t("staff.editStaff") : t("staff.newStaff")}
            </DialogTitle>
          </DialogHeader>
          {formContent}
        </DialogContent>
      </Dialog>

      <BottomSheet
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title={t("staff.confirmDelete")}
      >
        <div className="p-4 space-y-4">
          <p className="text-muted-foreground">
            {t("staff.deleteMessage")}
          </p>
          <div className="flex gap-3">
            <HapticButton
              variant="outline"
              className="flex-1 h-12"
              onClick={() => setDeleteConfirmId(null)}
            >
              {t("common.cancel")}
            </HapticButton>
            <HapticButton
              variant="destructive"
              className="flex-1 h-12"
              hapticType="heavy"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {t("common.delete")}
            </HapticButton>
          </div>
        </div>
      </BottomSheet>
    </MobileAppLayout>
  );
}
