import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Copy, Share2, Check, Gift, Users, Coins, Clock, CheckCircle
} from "lucide-react";

interface ReferralCode {
  id: string;
  customerId: string;
  companyId: string;
  code: string;
  usageCount: number;
  totalEarnings: string | null;
  isActive: boolean;
  createdAt: string | null;
}

interface MyReferral {
  id: string;
  status: string;
  referrerRewardPoints: number | null;
  convertedAt: string | null;
  createdAt: string | null;
  referredFirstName: string | null;
  referredLastName: string | null;
  referredEmail: string;
}

interface ReferralData {
  referrals: MyReferral[];
  totalPoints: number;
}

interface ReferralWidgetProps {
  companyId: string;
}

export function ReferralWidget({ companyId }: ReferralWidgetProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [applyCode, setApplyCode] = useState("");

  const { data: myCode, isLoading: loadingCode } = useQuery<ReferralCode>({
    queryKey: ["/api/public/referral/my-code", companyId],
    queryFn: async () => {
      const res = await fetch(`/api/public/referral/my-code?companyId=${companyId}`);
      if (!res.ok) throw new Error("Errore nel caricamento del codice");
      return res.json();
    },
  });

  const { data: myReferrals, isLoading: loadingReferrals } = useQuery<ReferralData>({
    queryKey: ["/api/public/referral/my-referrals"],
  });

  const applyCodeMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("/api/public/referral/apply", { method: "POST", body: JSON.stringify({ code }) }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/referral/my-referrals"] });
      toast({ 
        title: "Codice applicato!", 
        description: data.message || `Riceverai uno sconto del ${data.discountPercent}% sul primo acquisto`
      });
      setApplyCode("");
    },
    onError: (error: any) => {
      toast({ title: error.message || "Errore nell'applicazione del codice", variant: "destructive" });
    },
  });

  const handleCopyCode = () => {
    if (myCode?.code) {
      navigator.clipboard.writeText(myCode.code);
      setCopied(true);
      toast({ title: "Codice copiato!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (myCode?.code) {
      const link = `${window.location.origin}/r/${myCode.code}`;
      navigator.clipboard.writeText(link);
      toast({ title: "Link copiato!" });
    }
  };

  const handleShare = async () => {
    if (myCode?.code && navigator.share) {
      try {
        await navigator.share({
          title: "Invito esclusivo",
          text: `Usa il mio codice ${myCode.code} per ottenere uno sconto sul tuo primo acquisto!`,
          url: `${window.location.origin}/r/${myCode.code}`,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (loadingCode) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Invita un Amico
          </CardTitle>
          <CardDescription>
            Condividi il tuo codice e guadagna punti quando i tuoi amici effettuano il primo acquisto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                value={myCode?.code || ""}
                readOnly
                className="text-center text-lg font-mono tracking-wider pr-10"
                data-testid="input-my-referral-code"
              />
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={handleCopyCode}
                data-testid="button-copy-code"
              >
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleShare} data-testid="button-share">
              <Share2 className="h-4 w-4 mr-2" />
              Condividi
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-lg font-semibold" data-testid="text-usage-count">{myCode?.usageCount || 0}</div>
                <div className="text-xs text-muted-foreground">Amici invitati</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <Coins className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-lg font-semibold" data-testid="text-total-points">{myReferrals?.totalPoints || 0}</div>
                <div className="text-xs text-muted-foreground">Punti guadagnati</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {myReferrals && myReferrals.referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">I Miei Inviti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {myReferrals.referrals.map((referral) => (
                <div 
                  key={referral.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  data-testid={`row-referral-${referral.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      referral.status === "converted" ? "bg-green-500/20" : "bg-yellow-500/20"
                    }`}>
                      {referral.status === "converted" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {referral.referredFirstName || ""} {referral.referredLastName || referral.referredEmail}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {referral.createdAt ? new Date(referral.createdAt).toLocaleDateString("it-IT") : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={referral.status === "converted" ? "default" : "secondary"}>
                      {referral.status === "converted" ? "Convertito" : "In attesa"}
                    </Badge>
                    {referral.status === "converted" && referral.referrerRewardPoints && (
                      <div className="text-xs text-green-500 mt-1">+{referral.referrerRewardPoints} punti</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hai un Codice Invito?</CardTitle>
          <CardDescription>Inserisci il codice di un amico per ottenere uno sconto</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Inserisci codice"
              value={applyCode}
              onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
              className="font-mono"
              data-testid="input-apply-code"
            />
            <Button 
              onClick={() => applyCodeMutation.mutate(applyCode)}
              disabled={!applyCode || applyCodeMutation.isPending}
              data-testid="button-apply-code"
            >
              {applyCodeMutation.isPending ? "..." : "Applica"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
