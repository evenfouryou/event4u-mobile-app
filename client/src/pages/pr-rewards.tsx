import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { usePrAuth } from "@/hooks/usePrAuth";
import { PrLayout, PrPageContainer } from "@/components/pr-layout";
import {
  Trophy,
  Gift,
  Target,
  Star,
  Check,
  Clock,
  Sparkles,
} from "lucide-react";

interface PrReward {
  id: string;
  name: string;
  description: string | null;
  rewardType: string;
  targetValue: number;
  rewardValue: string | null;
  isActive: boolean;
  currentProgress: number;
  isClaimed: boolean;
  progress: {
    currentValue: number;
    targetValue: number;
    isCompleted: boolean;
    rewardClaimed: boolean;
  } | null;
}

export default function PrRewards() {
  const { prProfile, isLoading: isLoadingProfile } = usePrAuth();

  const { data: rewards = [], isLoading: isLoadingRewards } = useQuery<PrReward[]>({
    queryKey: ["/api/pr/rewards"],
    enabled: !!prProfile,
  });

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "tickets":
        return <Target className="h-5 w-5" />;
      case "guests":
        return <Star className="h-5 w-5" />;
      case "revenue":
        return <Trophy className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case "tickets":
        return "from-violet-500/20 to-violet-500/5 border-violet-500/30";
      case "guests":
        return "from-amber-500/20 to-amber-500/5 border-amber-500/30";
      case "revenue":
        return "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30";
      default:
        return "from-blue-500/20 to-blue-500/5 border-blue-500/30";
    }
  };

  const getProgressPercentage = (reward: PrReward) => {
    if (!reward.targetValue) return 0;
    return Math.min((reward.currentProgress / reward.targetValue) * 100, 100);
  };

  const activeRewards = rewards.filter(r => !r.isClaimed);
  const claimedRewards = rewards.filter(r => r.isClaimed);

  if (isLoadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PrLayout>
      <PrPageContainer>
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-2" data-testid="section-rewards-header">
              <div className="p-2 rounded-xl bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">I tuoi premi</h1>
                <p className="text-sm text-muted-foreground">
                  Raggiungi gli obiettivi e ottieni ricompense
                </p>
              </div>
            </div>
          </motion.div>

          {isLoadingRewards ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-2 w-full" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="text-center py-12">
                <CardContent>
                  <div className="p-4 rounded-full bg-muted/50 inline-block mb-4">
                    <Gift className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nessun premio disponibile
                  </h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Non ci sono premi attivi al momento. Continua a lavorare e il gestore potrebbe assegnarti nuovi obiettivi!
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <>
              {activeRewards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Obiettivi attivi
                  </h2>
                  <div className="space-y-4">
                    {activeRewards.map((reward, index) => {
                      const progress = getProgressPercentage(reward);
                      const isCompleted = progress >= 100;
                      
                      return (
                        <motion.div
                          key={reward.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          data-testid={`card-reward-${reward.id}`}
                        >
                          <Card className={`bg-gradient-to-br ${getRewardColor(reward.rewardType)} overflow-hidden`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-background/50 backdrop-blur-sm">
                                  {getRewardIcon(reward.rewardType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h3 className="font-semibold text-foreground">
                                        {reward.name}
                                      </h3>
                                      {reward.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                          {reward.description}
                                        </p>
                                      )}
                                    </div>
                                    {isCompleted ? (
                                      <Badge className="bg-emerald-500 text-white shrink-0">
                                        <Check className="h-3 w-3 mr-1" />
                                        Completato
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="shrink-0">
                                        <Clock className="h-3 w-3 mr-1" />
                                        In corso
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="mt-4">
                                    <div className="flex items-center justify-between text-sm mb-2">
                                      <span className="text-muted-foreground">Progresso</span>
                                      <span className="font-medium text-foreground">
                                        {reward.currentProgress} / {reward.targetValue}
                                      </span>
                                    </div>
                                    <Progress 
                                      value={progress} 
                                      className="h-2"
                                    />
                                  </div>
                                  
                                  {reward.rewardValue && (
                                    <div className="mt-3 flex items-center gap-2">
                                      <Gift className="h-4 w-4 text-primary" />
                                      <span className="text-sm font-medium text-foreground">
                                        Premio: €{parseFloat(reward.rewardValue).toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {claimedRewards.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Check className="h-5 w-5 text-emerald-500" />
                    Premi ottenuti
                  </h2>
                  <div className="space-y-3">
                    {claimedRewards.map((reward, index) => (
                      <motion.div
                        key={reward.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <Card className="bg-muted/30 border-muted">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-lg bg-emerald-500/10">
                                <Trophy className="h-5 w-5 text-emerald-500" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-medium text-foreground">
                                  {reward.name}
                                </h3>
                                {reward.rewardValue && (
                                  <p className="text-sm text-muted-foreground">
                                    Premio: €{parseFloat(reward.rewardValue).toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                Riscattato
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </PrPageContainer>
    </PrLayout>
  );
}
