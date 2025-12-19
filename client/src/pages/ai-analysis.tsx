import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Insight {
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  data?: any;
}

export default function AIAnalysis() {
  const { toast } = useToast();
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
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      default:
        return <TrendingUp className="h-5 w-5 text-primary" />;
    }
  };

  const getInsightVariant = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (type) {
      case 'warning':
        return 'destructive';
      case 'success':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const suggestedQuestions = [
    "Quali sono i prodotti più venduti questo mese?",
    "Ci sono prodotti che rischiano di finire?",
    "Quale evento ha avuto il consumo più alto?",
    "Dammi suggerimenti per ottimizzare le scorte",
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          Analisi AI
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Analizza i tuoi dati con l'intelligenza artificiale
        </p>
      </div>

      {/* Insights Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {insightsLoading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        ) : (
          insights?.map((insight, index) => (
            <Card key={index} data-testid={`card-insight-${index}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    {getInsightIcon(insight.type)}
                    <CardTitle className="text-base">{insight.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI Chat Section */}
      <Card>
        <CardHeader>
          <CardTitle>Chat con l'AI</CardTitle>
          <CardDescription>
            Fai domande sui tuoi dati e ricevi analisi personalizzate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conversation History */}
          {conversationHistory.length > 0 && (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto" data-testid="div-conversation-history">
              {conversationHistory.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`div-message-${index}`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
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
          )}

          {/* Suggested Questions */}
          {conversationHistory.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Domande suggerite:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedQuestions.map((question, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover-elevate"
                    onClick={() => setQuery(question)}
                    data-testid={`badge-suggestion-${index}`}
                  >
                    {question}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Fai una domanda sui tuoi dati..."
              className="min-h-[80px] flex-1"
              disabled={analysisMutation.isPending}
              data-testid="textarea-query"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!query.trim() || analysisMutation.isPending}
              data-testid="button-send"
            >
              {analysisMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
