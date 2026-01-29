import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { PrLayout, PrPageContainer } from "@/components/pr-layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePrAuth } from "@/hooks/usePrAuth";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  Lock,
  Building2,
  ChevronRight,
  LogOut,
  Star,
  Edit2,
  Check,
  X,
  RefreshCcw,
  Eye,
  EyeOff,
} from "lucide-react";

const profileFormSchema = z.object({
  displayName: z.string().min(2, "Nome troppo corto").max(50, "Nome troppo lungo").optional(),
  email: z.string().email("Email non valida").optional(),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, "Password attuale richiesta"),
  newPassword: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  confirmPassword: z.string().min(1, "Conferma password richiesta"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Le password non coincidono",
  path: ["confirmPassword"],
});

const phoneChangeSchema = z.object({
  newPhonePrefix: z.string().min(2, "Prefisso richiesto"),
  newPhone: z.string().min(9, "Numero troppo corto (min 9 cifre)").regex(/^[0-9]+$/, "Solo numeri"),
  otp: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;
type PhoneChangeValues = z.infer<typeof phoneChangeSchema>;

const PHONE_PREFIXES = [
  { value: '+39', label: '+39 (Italia)' },
  { value: '+1', label: '+1 (USA/Canada)' },
  { value: '+44', label: '+44 (UK)' },
  { value: '+33', label: '+33 (Francia)' },
  { value: '+49', label: '+49 (Germania)' },
  { value: '+34', label: '+34 (Spagna)' },
  { value: '+41', label: '+41 (Svizzera)' },
];

export default function PrProfile() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { 
    prProfile, 
    isLoading, 
    logout, 
    isLoggingOut,
    updateProfile,
    isUpdatingProfile,
    changePassword,
    isChangingPassword,
    myCompanies,
    hasMultipleCompanies,
    switchCompany,
    isSwitchingCompany,
  } = usePrAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const phoneForm = useForm<PhoneChangeValues>({
    resolver: zodResolver(phoneChangeSchema),
    defaultValues: {
      newPhonePrefix: '+39',
      newPhone: '',
      otp: '',
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      displayName: prProfile?.displayName || "",
      email: prProfile?.email || "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = (values: ProfileFormValues) => {
    updateProfile(values, {
      onSuccess: () => {
        toast({ title: "Profilo aggiornato!", description: "Le modifiche sono state salvate." });
        setIsEditing(false);
      },
      onError: () => {
        toast({ title: "Errore", description: "Impossibile aggiornare il profilo.", variant: "destructive" });
      },
    });
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      toast({ title: "Password aggiornata!", description: "La tua password è stata cambiata." });
      setShowPasswordDialog(false);
      passwordForm.reset();
    } catch (error) {
      toast({ title: "Errore", description: "Password attuale non corretta.", variant: "destructive" });
    }
  };

  const requestPhoneOtp = async () => {
    const values = phoneForm.getValues();
    if (!values.newPhone || values.newPhone.length < 9) {
      toast({ title: "Errore", description: "Inserisci un numero valido (min 9 cifre)", variant: "destructive" });
      return;
    }
    
    setIsRequestingOtp(true);
    try {
      const res = await fetch("/api/pr/phone/request-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          newPhone: values.newPhone,
          newPhonePrefix: values.newPhonePrefix,
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Errore nell'invio OTP");
      }
      
      toast({ title: "OTP Inviato", description: "Controlla il tuo nuovo numero per il codice" });
      setPhoneStep('otp');
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const verifyPhoneOtp = async () => {
    const values = phoneForm.getValues();
    if (!values.otp || values.otp.length < 4) {
      toast({ title: "Errore", description: "Inserisci il codice OTP", variant: "destructive" });
      return;
    }
    
    setIsVerifyingOtp(true);
    try {
      const res = await fetch("/api/pr/phone/verify-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ otp: values.otp }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Codice OTP non valido");
      }
      
      toast({ title: "Numero aggiornato!", description: "Il tuo numero di telefono è stato verificato" });
      setShowPhoneDialog(false);
      setPhoneStep('input');
      phoneForm.reset();
      // Refresh profile data
      window.location.reload();
    } catch (error: any) {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const getInitials = () => {
    if (prProfile?.firstName && prProfile?.lastName) {
      return `${prProfile.firstName[0]}${prProfile.lastName[0]}`.toUpperCase();
    }
    return "PR";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PrLayout>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/pr/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Profilo</h1>
              <p className="text-sm text-muted-foreground">Gestisci il tuo account</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar className="h-24 w-24 mb-4 ring-4 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-amber-500 text-primary-foreground text-2xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-bold text-foreground">
                  {prProfile?.displayName || `${prProfile?.firstName} ${prProfile?.lastName}`}
                </h2>
                <Badge className="mt-2 bg-primary/10 text-primary border-primary/20">
                  <Star className="h-3 w-3 mr-1 fill-primary" />
                  {prProfile?.prCode}
                </Badge>
              </div>

              <Separator className="my-6" />

              {/* Profile Info */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nome completo</p>
                      <p className="font-medium text-foreground">{prProfile?.firstName} {prProfile?.lastName}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Telefono</p>
                      <p className="font-medium text-foreground">{prProfile?.phonePrefix || '+39'}{prProfile?.phone || "Non impostato"}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPhoneDialog(true)}
                    data-testid="button-edit-phone"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">{prProfile?.email || "Non impostata"}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    data-testid="button-edit-email"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Stato</p>
                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                        {prProfile?.status === "active" ? "Attivo" : prProfile?.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Profile Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Profilo</DialogTitle>
              <DialogDescription>Aggiorna le tue informazioni</DialogDescription>
            </DialogHeader>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome visualizzato</FormLabel>
                      <FormControl>
                        <Input placeholder="Il tuo nome" {...field} data-testid="input-display-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@esempio.com" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={isUpdatingProfile} data-testid="button-save-profile">
                    {isUpdatingProfile ? "Salvataggio..." : "Salva"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Company Switcher */}
        {hasMultipleCompanies && myCompanies && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Azienda
                </CardTitle>
                <CardDescription>Cambia azienda di riferimento</CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={myCompanies.currentProfileId}
                  onValueChange={(value) => switchCompany(value)}
                  disabled={isSwitchingCompany}
                >
                  <SelectTrigger data-testid="select-company">
                    <SelectValue placeholder="Seleziona azienda" />
                  </SelectTrigger>
                  <SelectContent>
                    {myCompanies.profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {profile.companyName}
                          {profile.isCurrent && (
                            <Badge variant="secondary" className="ml-2 text-xs">Attuale</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Sicurezza
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setShowPasswordDialog(true)}
                data-testid="button-change-password"
              >
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4" />
                  <span>Cambia password</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Change Password Dialog */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambia Password</DialogTitle>
              <DialogDescription>Inserisci la tua password attuale e quella nuova</DialogDescription>
            </DialogHeader>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password attuale</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nuova password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            data-testid="input-new-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conferma nuova password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          data-testid="input-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={isChangingPassword} data-testid="button-save-password">
                    {isChangingPassword ? "Salvataggio..." : "Cambia password"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Change Phone Dialog */}
        <Dialog open={showPhoneDialog} onOpenChange={(open) => {
          setShowPhoneDialog(open);
          if (!open) {
            setPhoneStep('input');
            phoneForm.reset();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cambia Numero di Telefono</DialogTitle>
              <DialogDescription>
                {phoneStep === 'input' 
                  ? "Inserisci il nuovo numero. Ti invieremo un codice OTP per verificarlo."
                  : "Inserisci il codice OTP ricevuto sul nuovo numero"
                }
              </DialogDescription>
            </DialogHeader>
            
            {phoneStep === 'input' ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Select
                    value={phoneForm.watch('newPhonePrefix')}
                    onValueChange={(v) => phoneForm.setValue('newPhonePrefix', v)}
                  >
                    <SelectTrigger className="w-32" data-testid="select-phone-prefix">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PHONE_PREFIXES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Numero (es. 3381234567)"
                    value={phoneForm.watch('newPhone')}
                    onChange={(e) => phoneForm.setValue('newPhone', e.target.value.replace(/\D/g, ''))}
                    data-testid="input-new-phone"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowPhoneDialog(false)}>
                    Annulla
                  </Button>
                  <Button 
                    onClick={requestPhoneOtp} 
                    disabled={isRequestingOtp}
                    data-testid="button-request-otp"
                  >
                    {isRequestingOtp ? "Invio..." : "Invia Codice OTP"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Codice inviato a:</p>
                  <p className="font-medium">{phoneForm.watch('newPhonePrefix')}{phoneForm.watch('newPhone')}</p>
                </div>
                <Input
                  placeholder="Inserisci codice OTP"
                  value={phoneForm.watch('otp') || ''}
                  onChange={(e) => phoneForm.setValue('otp', e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  data-testid="input-otp"
                />
                <div className="flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setPhoneStep('input')}>
                    Indietro
                  </Button>
                  <Button 
                    onClick={verifyPhoneOtp} 
                    disabled={isVerifyingOtp}
                    data-testid="button-verify-otp"
                  >
                    {isVerifyingOtp ? "Verifica..." : "Verifica e Salva"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Logout Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => logout()}
            disabled={isLoggingOut}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggingOut ? "Disconnessione..." : "Esci"}
          </Button>
        </motion.div>
      </div>
    </PrLayout>
  );
}
