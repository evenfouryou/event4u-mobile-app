import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Star, Gift, History, Award, TrendingUp, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface CustomerPoints {
  totalPoints: number;
  lifetimePoints: number;
  programId: string;
  tierName: string | null;
  tierColor: string | null;
  tierMinPoints: number | null;
  tierDiscountPercent: string | null;
  programName: string;
  companyName: string | null;
  nextTierName: string | null;
  nextTierMinPoints: number | null;
  progressToNext: number;
}

interface AvailableReward {
  id: string;
  name: string;
  description: string | null;
  pointsCost: number;
  type: string;
  value: string | null;
  imageUrl: string | null;
  availableQuantity: number | null;
  programId: string;
  programName: string;
  customerPoints: number;
  canRedeem: boolean;
}

interface PointsHistory {
  id: string;
  points: number;
  type: string;
  description: string | null;
  createdAt: string;
  programName: string;
}

export function LoyaltyWidget() {
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<AvailableReward | null>(null);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("points");

  const { data: customerPoints = [], isLoading: loadingPoints } = useQuery<CustomerPoints[]>({
    queryKey: ["/api/public/loyalty/my-points"],
  });

  const { data: rewards = [], isLoading: loadingRewards } = useQuery<AvailableReward[]>({
    queryKey: ["/api/public/loyalty/rewards"],
  });

  const { data: history = [], isLoading: loadingHistory } = useQuery<PointsHistory[]>({
    queryKey: ["/api/public/loyalty/history"],
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) =>
      apiRequest(`/api/public/loyalty/rewards/${rewardId}/redeem`, { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/loyalty/my-points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/loyalty/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/loyalty/history"] });
      setShowRedeemDialog(false);
      setSelectedReward(null);
      toast({ 
        title: "Premio riscattato!", 
        description: data.message || "Il premio è stato aggiunto al tuo account"
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Impossibile riscattare il premio",
        variant: "destructive" 
      });
    },
  });

  const handleRedeemClick = (reward: AvailableReward) => {
    setSelectedReward(reward);
    setShowRedeemDialog(true);
  };

  const confirmRedeem = () => {
    if (selectedReward) {
      redeemMutation.mutate(selectedReward.id);
    }
  };

  if (loadingPoints) {
    return (
      <Card data-testid="loyalty-widget-loading">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (customerPoints.length === 0) {
    return (
      <Card data-testid="loyalty-widget-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Programma Fedeltà
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Inizia ad accumulare punti con i tuoi acquisti!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="loyalty-widget">
      {customerPoints.map((cp) => (
        <Card key={cp.programId} data-testid={`loyalty-card-${cp.programId}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  {cp.programName}
                </CardTitle>
                {cp.companyName && (
                  <CardDescription>{cp.companyName}</CardDescription>
                )}
              </div>
              {cp.tierName && (
                <Badge 
                  style={{ 
                    backgroundColor: cp.tierColor || "#CD7F32",
                    color: "#fff"
                  }}
                  data-testid={`badge-tier-${cp.programId}`}
                >
                  {cp.tierName}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold" data-testid={`text-points-${cp.programId}`}>
                  {cp.totalPoints.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">punti disponibili</div>
              </div>
              {cp.tierDiscountPercent && parseFloat(cp.tierDiscountPercent) > 0 && (
                <div className="text-right">
                  <div className="text-lg font-semibold text-green-600">
                    {cp.tierDiscountPercent}%
                  </div>
                  <div className="text-xs text-muted-foreground">sconto attivo</div>
                </div>
              )}
            </div>

            {cp.nextTierName && cp.nextTierMinPoints && (
              <div className="space-y-2" data-testid={`progress-next-tier-${cp.programId}`}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prossimo livello: {cp.nextTierName}</span>
                  <span className="text-muted-foreground">
                    {cp.totalPoints.toLocaleString()} / {cp.nextTierMinPoints.toLocaleString()}
                  </span>
                </div>
                <Progress value={cp.progressToNext} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="loyalty-tabs">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="rewards" data-testid="tab-rewards">
            <Gift className="h-4 w-4 mr-2" />
            Premi
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <History className="h-4 w-4 mr-2" />
            Storico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rewards" className="mt-4 space-y-3" data-testid="content-rewards">
          {loadingRewards ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : rewards.length === 0 ? (
            <Card className="p-6 text-center" data-testid="no-rewards">
              <Gift className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nessun premio disponibile al momento</p>
            </Card>
          ) : (
            rewards.map((reward) => (
              <Card key={reward.id} className="overflow-hidden" data-testid={`reward-card-${reward.id}`}>
                <div className="flex items-center p-4 gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{reward.name}</div>
                    {reward.description && (
                      <div className="text-sm text-muted-foreground">{reward.description}</div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        {reward.pointsCost.toLocaleString()} punti
                      </Badge>
                      {reward.availableQuantity !== null && reward.availableQuantity > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({reward.availableQuantity} disponibili)
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!reward.canRedeem}
                    onClick={() => handleRedeemClick(reward)}
                    data-testid={`button-redeem-${reward.id}`}
                  >
                    {reward.canRedeem ? "Riscatta" : "Punti insufficienti"}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4" data-testid="content-history">
          {loadingHistory ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <Card className="p-6 text-center" data-testid="no-history">
              <History className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">Nessuna transazione ancora</p>
            </Card>
          ) : (
            <Card data-testid="history-list">
              <div className="divide-y">
                {history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4" data-testid={`history-item-${item.id}`}>
                    <div>
                      <div className="font-medium">
                        {item.type === "earn" ? "Punti guadagnati" : item.type === "redeem" ? "Premio riscattato" : item.description}
                      </div>
                      {item.description && item.type === "earn" && (
                        <div className="text-sm text-muted-foreground">{item.description}</div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(item.createdAt), "d MMMM yyyy, HH:mm", { locale: it })}
                      </div>
                    </div>
                    <div className={`font-semibold ${item.points > 0 ? "text-green-600" : "text-red-600"}`}>
                      {item.points > 0 ? "+" : ""}{item.points.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showRedeemDialog} onOpenChange={setShowRedeemDialog}>
        <DialogContent data-testid="dialog-confirm-redeem">
          <DialogHeader>
            <DialogTitle>Conferma Riscatto</DialogTitle>
          </DialogHeader>
          {selectedReward && (
            <div className="py-4">
              <p className="mb-4">
                Vuoi riscattare <strong>{selectedReward.name}</strong> per{" "}
                <strong>{selectedReward.pointsCost.toLocaleString()} punti</strong>?
              </p>
              {selectedReward.description && (
                <p className="text-sm text-muted-foreground mb-4">{selectedReward.description}</p>
              )}
              <div className="bg-muted p-3 rounded-md">
                <div className="flex justify-between text-sm">
                  <span>Punti attuali:</span>
                  <span className="font-medium">{selectedReward.customerPoints.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Costo premio:</span>
                  <span className="font-medium text-red-600">-{selectedReward.pointsCost.toLocaleString()}</span>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between text-sm font-semibold">
                  <span>Punti rimanenti:</span>
                  <span>{(selectedReward.customerPoints - selectedReward.pointsCost).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRedeemDialog(false)} data-testid="button-cancel-redeem">
              Annulla
            </Button>
            <Button 
              onClick={confirmRedeem}
              disabled={redeemMutation.isPending}
              data-testid="button-confirm-redeem"
            >
              {redeemMutation.isPending ? "Riscatto in corso..." : "Conferma Riscatto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
