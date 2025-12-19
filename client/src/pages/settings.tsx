import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Save, User, Mail, Shield, Monitor, Key, Copy, RefreshCw, CheckCircle2, XCircle, Wifi } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import type { Company } from "@shared/schema";
import { useSmartCardStatus } from "@/lib/smart-card-service";

const settingsSchema = z.object({
  name: z.string().min(1, "Il nome è obbligatorio"),
  taxId: z.string().optional(),
  address: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const smartCardStatus = useSmartCardStatus();
  
  const isBartender = user?.role === 'bartender';
  const [bridgeToken, setBridgeToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ['/api/companies/current'],
  });
  
  const [tokenCompanyId, setTokenCompanyId] = useState<string | null>(null);
  
  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', `/api/bridge/token`);
      return res.json();
    },
    onSuccess: (data: { token: string; companyId: string }) => {
      setBridgeToken(data.token);
      setTokenCompanyId(data.companyId);
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      toast({
        title: "Token Generato",
        description: "Copia il token e incollalo nell'app desktop Event4U",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile generare il token",
        variant: "destructive",
      });
    },
  });
  
  const copyToken = () => {
    if (bridgeToken) {
      navigator.clipboard.writeText(bridgeToken);
      setTokenCopied(true);
      toast({ title: "Copiato!", description: "Token copiato negli appunti" });
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  const form = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: company ? {
      name: company.name,
      taxId: company.taxId || '',
      address: company.address || '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsForm) => {
      await apiRequest('PATCH', `/api/companies/${company?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: "Successo",
        description: "Impostazioni azienda aggiornate con successo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Non autorizzato",
          description: "Effettua nuovamente il login...",
          variant: "destructive",
        });
        setTimeout(() => window.location.href = '/login', 500);
        return;
      }
      toast({
        title: "Errore",
        description: "Impossibile aggiornare le impostazioni",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <div className="mb-6 sm:mb-8">
          <Skeleton className="h-8 w-48 mb-2 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-12 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">Nessuna azienda associata</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6 md:mb-8"
      >
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2" data-testid="text-settings-title">
          Impostazioni
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Gestisci le informazioni della tua azienda
        </p>
      </motion.div>

      {!isBartender && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
          data-testid="card-company-settings"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-semibold">Informazioni Azienda</h2>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Azienda *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nome della tua azienda" 
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Partita IVA / Codice Fiscale</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="IT12345678901" 
                        data-testid="input-company-tax-id"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Indirizzo</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Via, città, CAP, provincia" 
                        rows={3}
                        data-testid="input-company-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="gradient-golden text-black font-semibold hover:opacity-90 min-h-[48px] md:min-h-9"
                  data-testid="button-save-settings"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateMutation.isPending ? 'Salvataggio...' : 'Salva Modifiche'}
                </Button>
              </div>
            </form>
          </Form>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 mt-6"
        data-testid="card-account-info"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
            <User className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold">Informazioni Account</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-0.5">Email</p>
              <p className="text-base" data-testid="text-user-email">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-0.5">Ruolo</p>
              <p className="text-base capitalize" data-testid="text-user-role">
                {user?.role === 'gestore' ? 'Gestore Azienda' : user?.role}
              </p>
            </div>
          </div>

          {(user?.firstName || user?.lastName) && (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-0.5">Nome</p>
                <p className="text-base" data-testid="text-user-name">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Bridge Lettore Smart Card Section - Only for super_admin */}
      {user?.role === 'super_admin' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 mt-6"
          data-testid="card-bridge-config"
        >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Monitor className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bridge Lettore Smart Card</h2>
            <p className="text-sm text-muted-foreground">Collega l'app desktop per emissione biglietti SIAE</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="rounded-xl bg-muted/30 p-4 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-3 h-3 rounded-full ${smartCardStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="font-medium">
              {smartCardStatus.connected ? 'Desktop collegato' : 'Desktop non collegato'}
            </span>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="flex items-center gap-2">
              <Wifi className={`h-4 w-4 ${smartCardStatus.relayConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-muted-foreground">Server:</span>
              <span className={smartCardStatus.relayConnected ? 'text-green-600' : 'text-red-500'}>
                {smartCardStatus.relayConnected ? 'Connesso' : 'Non connesso'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Monitor className={`h-4 w-4 ${smartCardStatus.bridgeConnected ? 'text-green-500' : 'text-muted-foreground'}`} />
              <span className="text-muted-foreground">Bridge .NET:</span>
              <span className={smartCardStatus.bridgeConnected ? 'text-green-600' : 'text-muted-foreground'}>
                {smartCardStatus.bridgeConnected ? 'Attivo' : 'Non attivo'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {smartCardStatus.readerDetected ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">Lettore:</span>
              <span className={smartCardStatus.readerDetected ? 'text-green-600' : 'text-muted-foreground'}>
                {smartCardStatus.readerDetected ? (smartCardStatus.readerName || 'Rilevato') : 'Non rilevato'}
              </span>
            </div>
          </div>
          
          {/* Smart Card Details - shown when card is inserted */}
          {smartCardStatus.cardInserted && (
            <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-green-600">Smart Card SIAE Inserita</span>
              </div>
              <div className="grid gap-2 text-sm">
                {smartCardStatus.cardSerial && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Seriale:</span>
                    <span className="font-mono text-foreground" data-testid="text-card-serial">
                      {smartCardStatus.cardSerial}
                    </span>
                  </div>
                )}
                {smartCardStatus.cardAtr && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">ATR:</span>
                    <span className="font-mono text-xs text-foreground" data-testid="text-card-atr">
                      {smartCardStatus.cardAtr}
                    </span>
                  </div>
                )}
                {smartCardStatus.cardType && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="text-foreground" data-testid="text-card-type">
                      {smartCardStatus.cardType}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 font-medium">Pronta per emissione biglietti</span>
                </div>
              </div>
            </div>
          )}
          
          {smartCardStatus.error && !smartCardStatus.demoMode && (
            <div className="mt-3 text-sm text-amber-600 dark:text-amber-400">
              {smartCardStatus.error}
            </div>
          )}
        </div>

        {/* Bridge Token Section */}
        <div className="border-t border-border/50 pt-6">
          <div className="flex items-center gap-2 mb-3">
            <Key className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Token di Connessione</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Genera un token univoco per collegare l'app desktop Event4U. 
            Copia il token e incollalo nella sezione "Connessione Remota" dell'applicazione desktop.
          </p>
          
          {bridgeToken ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input 
                  value={bridgeToken} 
                  readOnly 
                  className="font-mono text-sm"
                  data-testid="input-bridge-token"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={copyToken}
                  data-testid="button-copy-token"
                >
                  {tokenCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                ID Azienda: <span className="font-mono font-medium" data-testid="text-company-id-for-bridge">{tokenCompanyId || company?.id}</span>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateTokenMutation.mutate()}
                disabled={generateTokenMutation.isPending}
                data-testid="button-regenerate-token"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${generateTokenMutation.isPending ? 'animate-spin' : ''}`} />
                Rigenera Token
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => generateTokenMutation.mutate()}
              disabled={generateTokenMutation.isPending}
              className="gradient-golden text-black font-semibold hover:opacity-90"
              data-testid="button-generate-token"
            >
              <Key className="h-4 w-4 mr-2" />
              {generateTokenMutation.isPending ? 'Generazione...' : 'Genera Token Bridge'}
            </Button>
          )}
        </div>
      </motion.div>
      )}
    </div>
  );
}
