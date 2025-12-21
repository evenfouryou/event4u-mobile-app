import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Send, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { MobileAppLayout, MobileHeader, HapticButton } from '@/components/mobile-primitives';
import { useLocation } from 'wouter';

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
      staggerChildren: 0.1,
    },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
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
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', content: data.userQuery },
        { role: 'assistant', content: data.response.answer }
      ]);
      setQuery('');
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile analizzare i dati",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      analysisMutation.mutate(query);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-warning" />;
      case 'success':
        return <CheckCircle2 className="h-6 w-6 text-success" />;
      default:
        return <TrendingUp className="h-6 w-6 text-primary" />;
    }
  };

  const getInsightGradient = (type: string) => {
    switch (type) {
      case 'warning':
        return 'from-warning/20 to-warning/5';
      case 'success':
        return 'from-green-500/20 to-green-500/5';
      default:
        return 'from-primary/20 to-primary/5';
    }
  };

  const suggestedQuestions = [
    "Quali sono i prodotti più venduti questo mese?",
    "Ci sono prodotti che rischiano di finire?",
    "Quale evento ha avuto il consumo più alto?",
    "Dammi suggerimenti per ottimizzare le scorte",
  ];

  const header = (
    <MobileHeader
      title="Analisi AI"
      leftAction={
        <HapticButton
          variant="ghost"
          size="icon"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </HapticButton>
      }
      rightAction={
        <motion.div
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </motion.div>
      }
    />
  );

  return (
    <MobileAppLayout header={header} contentClassName="pb-24">
      <div className="flex flex-col gap-6 py-4">
        {/* Insights Section */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-4"
        >
          <motion.h2 
            variants={cardVariant}
            className="text-lg font-semibold text-foreground flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5 text-primary" />
            Insights Automatici
          </motion.h2>

          {insightsLoading ? (
            <motion.div variants={cardVariant}>
              <Card className="min-h-[160px]">
                <CardContent className="flex items-center justify-center h-[160px]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader2 className="h-8 w-8 text-primary" />
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {insights?.map((insight, index) => (
                <motion.div
                  key={index}
                  variants={cardVariant}
                  layout
                  whileTap={{ scale: 0.98 }}
                  transition={springTransition}
                >
                  <Card 
                    className={`min-h-[140px] bg-gradient-to-br ${getInsightGradient(insight.type)} border-0`}
                    data-testid={`card-insight-${index}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start gap-4">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ ...springTransition, delay: 0.2 + index * 0.1 }}
                          className="p-3 rounded-2xl bg-background/50 backdrop-blur-sm"
                        >
                          {getInsightIcon(insight.type)}
                        </motion.div>
                        <div className="flex-1">
                          <CardTitle className="text-lg leading-tight">{insight.title}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-base text-muted-foreground leading-relaxed">{insight.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>

        {/* AI Chat Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.3 }}
        >
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Chat con l'AI</CardTitle>
              <CardDescription className="text-base">
                Fai domande sui tuoi dati e ricevi analisi personalizzate
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Conversation History */}
              <AnimatePresence mode="popLayout">
                {conversationHistory.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col gap-3 max-h-[400px] overflow-y-auto" 
                    data-testid="div-conversation-history"
                  >
                    {conversationHistory.map((message, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: message.role === 'user' ? 20 : -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={springTransition}
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
                    className="flex flex-col gap-3"
                  >
                    <p className="text-base text-muted-foreground">Domande suggerite:</p>
                    <div className="flex flex-col gap-2">
                      {suggestedQuestions.map((question, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ ...springTransition, delay: 0.1 * index }}
                        >
                          <Badge
                            variant="outline"
                            className="cursor-pointer hover-elevate py-3 px-4 text-base font-normal justify-start w-full"
                            onClick={() => setQuery(question)}
                            data-testid={`badge-suggestion-${index}`}
                          >
                            {question}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Fai una domanda sui tuoi dati..."
                  className="min-h-[56px] flex-1 text-base resize-none rounded-2xl"
                  disabled={analysisMutation.isPending}
                  data-testid="textarea-query"
                />
                <HapticButton
                  type="submit"
                  size="icon"
                  disabled={!query.trim() || analysisMutation.isPending}
                  hapticType="medium"
                  className="h-14 w-14 rounded-2xl shrink-0"
                  data-testid="button-send"
                >
                  {analysisMutation.isPending ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <Send className="h-5 w-5" />
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
