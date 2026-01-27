import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Send, ArrowLeft, Brain, Lightbulb, MessageCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileAppLayout, MobileHeader, HapticButton, triggerHaptic } from '@/components/mobile-primitives';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';

interface Insight {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  data?: any;
}

const springTransition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.92 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: springTransition,
  },
};

export default function AIAnalysis() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  const { data: insights, isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: ['/api/ai/insights'],
  });

  const analysisMutation = useMutation({
    mutationFn: async (userQuery: string) => {
      const response = await apiRequest('POST', '/api/ai/analyze', { query: userQuery });
      return { response, userQuery };
    },
    onSuccess: (data: any) => {
      triggerHaptic('success');
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: data.userQuery },
        { role: 'assistant', content: data.response.answer }
      ]);
      setQuery('');
    },
    onError: () => {
      triggerHaptic('error');
      toast({
        title: t('aiAnalysis.error'),
        description: t('aiAnalysis.analyzeError'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      triggerHaptic('medium');
      analysisMutation.mutate(query);
    }
  };

  const handleSuggestionTap = (question: string) => {
    triggerHaptic('light');
    setQuery(question);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-7 w-7" />;
      case 'success':
        return <CheckCircle2 className="h-7 w-7" />;
      default:
        return <TrendingUp className="h-7 w-7" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'warning':
        return {
          iconBg: 'bg-amber-500',
          iconColor: 'text-black',
          gradient: 'from-amber-500/25 via-amber-500/10 to-transparent',
        };
      case 'success':
        return {
          iconBg: 'bg-emerald-500',
          iconColor: 'text-black',
          gradient: 'from-emerald-500/25 via-emerald-500/10 to-transparent',
        };
      default:
        return {
          iconBg: 'bg-primary',
          iconColor: 'text-primary-foreground',
          gradient: 'from-primary/25 via-primary/10 to-transparent',
        };
    }
  };

  const suggestedQuestions = [
    { icon: TrendingUp, text: t('aiAnalysis.suggestedQ1') },
    { icon: AlertTriangle, text: t('aiAnalysis.suggestedQ2') },
    { icon: Sparkles, text: t('aiAnalysis.suggestedQ3') },
    { icon: Lightbulb, text: t('aiAnalysis.suggestedQ4') },
  ];

  const header = (
    <MobileHeader
      title={t('aiAnalysis.title')}
      leftAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/')}
          data-testid="button-back"
          className="h-11 w-11"
        >
          <ArrowLeft className="h-6 w-6" />
        </HapticButton>
      }
      rightAction={
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          className="h-11 w-11 flex items-center justify-center"
        >
          <Brain className="h-6 w-6 text-primary" />
        </motion.div>
      }
    />
  );

  if (!isMobile) {
    return (
      <div className="container mx-auto p-6 space-y-6" data-testid="page-ai-analysis">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              {t('aiAnalysis.title')}
            </h1>
            <p className="text-muted-foreground">{t('aiAnalysis.description')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                {t('aiAnalysis.insights')}
              </CardTitle>
              <CardDescription>{t('aiAnalysis.insightsDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insightsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : insights && insights.length > 0 ? (
                insights.map((insight, index) => {
                  const colors = getInsightColors(insight.type);
                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl bg-gradient-to-br ${colors.gradient} border border-border/50`}
                      data-testid={`card-insight-${index}`}
                    >
                      <div className="flex gap-4">
                        <div className={`h-12 w-12 rounded-xl ${colors.iconBg} flex items-center justify-center shrink-0`}>
                          <span className={colors.iconColor}>
                            {getInsightIcon(insight.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1">
                            {insight.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('aiAnalysis.noInsights')}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-[#00CED1]" />
                {t('aiAnalysis.chat')}
              </CardTitle>
              <CardDescription>{t('aiAnalysis.chatDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {conversationHistory.length > 0 ? (
                <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto" data-testid="div-conversation-history">
                  {conversationHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`div-message-${index}`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[85%] ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Domande suggerite:</p>
                  <div className="grid gap-2">
                    {suggestedQuestions.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => setQuery(item.text)}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate active-elevate-2 text-left"
                        data-testid={`button-suggestion-${index}`}
                      >
                        <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm text-foreground">{item.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex gap-2 items-end pt-4 border-t">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Fai una domanda sui tuoi dati..."
                  className="min-h-[80px] flex-1 resize-none"
                  disabled={analysisMutation.isPending}
                  data-testid="textarea-query"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!query.trim() || analysisMutation.isPending}
                  className="h-[80px] w-[50px] shrink-0"
                  data-testid="button-send"
                >
                  {analysisMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <MobileAppLayout header={header} contentClassName="pb-24">
      <div className="flex flex-col gap-8 py-6">
        {/* Section Header - Insights */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={springTransition}
          className="flex items-center gap-3"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Insights Automatici</h2>
            <p className="text-muted-foreground">Analisi intelligente dei tuoi dati</p>
          </div>
        </motion.div>

        {/* Insights Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          {insightsLoading ? (
            <motion.div variants={cardVariant}>
              <Card className="min-h-[180px] bg-gradient-to-br from-primary/10 to-transparent border-0">
                <CardContent className="flex items-center justify-center h-[180px]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-10 w-10 text-primary" />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {insights?.map((insight, index) => {
                const colors = getInsightColors(insight.type);
                return (
                  <motion.div
                    key={index}
                    variants={cardVariant}
                    layout
                    whileTap={{ scale: 0.97 }}
                    transition={springTransition}
                    onTapStart={() => triggerHaptic('light')}
                  >
                    <Card 
                      className={`min-h-[160px] bg-gradient-to-br ${colors.gradient} border-0 overflow-hidden`}
                      data-testid={`card-insight-${index}`}
                    >
                      <CardContent className="p-5">
                        <div className="flex gap-4">
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ ...springTransition, delay: 0.15 + index * 0.1 }}
                            className={`h-14 w-14 rounded-2xl ${colors.iconBg} flex items-center justify-center shrink-0`}
                          >
                            <span className={colors.iconColor}>
                              {getInsightIcon(insight.type)}
                            </span>
                          </motion.div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-foreground leading-tight mb-2">
                              {insight.title}
                            </h3>
                            <p className="text-base text-muted-foreground leading-relaxed">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Section Header - Chat */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...springTransition, delay: 0.2 }}
          className="flex items-center gap-3 mt-4"
        >
          <div className="h-12 w-12 rounded-2xl bg-[#00CED1]/20 flex items-center justify-center">
            <MessageCircle className="h-6 w-6 text-[#00CED1]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Chat con l'AI</h2>
            <p className="text-muted-foreground">Fai domande sui tuoi dati</p>
          </div>
        </motion.div>

        {/* Chat Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.3 }}
        >
          <Card className="border-0 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-5 flex flex-col gap-5">
              {/* Conversation History */}
              <AnimatePresence mode="popLayout">
                {conversationHistory.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-4 max-h-[450px] overflow-y-auto" 
                    data-testid="div-conversation-history"
                  >
                    {conversationHistory.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: message.role === 'user' ? 30 : -30, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={springTransition}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        data-testid={`div-message-${index}`}
                      >
                        <div
                          className={`rounded-3xl px-5 py-4 max-w-[90%] ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted/80'
                          }`}
                        >
                          <p className="text-base whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Suggested Questions */}
              <AnimatePresence>
                {conversationHistory.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col gap-4"
                  >
                    <p className="text-base font-medium text-muted-foreground">Domande suggerite:</p>
                    <div className="flex flex-col gap-3">
                      {suggestedQuestions.map((item, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...springTransition, delay: 0.08 * index }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSuggestionTap(item.text)}
                          className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 hover-elevate active-elevate-2 text-left min-h-[56px]"
                          data-testid={`button-suggestion-${index}`}
                        >
                          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <span className="text-base text-foreground">{item.text}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-3 items-end mt-2">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Fai una domanda sui tuoi dati..."
                  className="min-h-[60px] flex-1 text-base resize-none rounded-2xl border-2 border-muted focus:border-primary"
                  disabled={analysisMutation.isPending}
                  data-testid="textarea-query"
                />
                <HapticButton
                  type="submit"
                  size="icon"
                  disabled={!query.trim() || analysisMutation.isPending}
                  hapticType="medium"
                  className="h-[60px] w-[60px] rounded-2xl shrink-0 bg-primary"
                  data-testid="button-send"
                >
                  {analysisMutation.isPending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-6 w-6" />
                    </motion.div>
                  ) : (
                    <Send className="h-6 w-6" />
                  )}
                </HapticButton>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MobileAppLayout>
  );
}
