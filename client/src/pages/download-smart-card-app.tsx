import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Loader2, CheckCircle, ExternalLink, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function DownloadSmartCardApp() {
  const [isCreating, setIsCreating] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const createGitHubRepo = async () => {
    setIsCreating(true);
    setError(null);
    
    try {
      const result = await apiRequest('/api/github/create-smart-card-repo', {
        method: 'POST'
      });
      
      if (result.success && result.repoUrl) {
        setRepoUrl(result.repoUrl);
        toast({
          title: "Repository creato!",
          description: "Il repository è pronto su GitHub"
        });
      } else {
        throw new Error(result.error || 'Errore sconosciuto');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Errore",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Event4U Smart Card Reader</h1>
          <p className="text-muted-foreground">
            Pubblica su GitHub per ottenere l'installer automatico
          </p>
        </div>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Github className="h-5 w-5" />
              Crea Repository GitHub
            </CardTitle>
            <CardDescription>
              Clicca per creare automaticamente il repository con tutti i file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {!repoUrl ? (
              <>
                <Button 
                  onClick={createGitHubRepo}
                  disabled={isCreating}
                  size="lg"
                  className="w-full"
                  data-testid="button-create-repo"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creazione in corso...
                    </>
                  ) : (
                    <>
                      <Github className="mr-2 h-5 w-5" />
                      Crea Repository su GitHub
                    </>
                  )}
                </Button>
                
                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Repository creato con successo!</span>
                </div>
                
                <a 
                  href={repoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" size="lg" className="w-full">
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Apri Repository
                  </Button>
                </a>
                
                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <p className="font-medium">Prossimi passi:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Vai alla tab <strong>Actions</strong> nel repository</li>
                    <li>Clicca su <strong>"Build and Release Smart Card Reader"</strong></li>
                    <li>Clicca <strong>"Run workflow"</strong> → <strong>"Run workflow"</strong></li>
                    <li>Attendi 2-3 minuti per la compilazione</li>
                    <li>Scarica il file ZIP dalla sezione <strong>Releases</strong></li>
                  </ol>
                </div>
              </div>
            )}
            
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Come funziona</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">1</div>
              <div>
                <p className="font-medium">Crea il repository</p>
                <p className="text-sm text-muted-foreground">Clicca il bottone qui sopra</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">2</div>
              <div>
                <p className="font-medium">GitHub compila automaticamente</p>
                <p className="text-sm text-muted-foreground">Avvia il workflow dalla tab Actions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">3</div>
              <div>
                <p className="font-medium">Scarica e distribuisci</p>
                <p className="text-sm text-muted-foreground">Il file ZIP sarà nella sezione Releases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-center">
            <strong>Nota:</strong> Gli utenti finali dovranno solo scaricare il ZIP, estrarlo e fare doppio click su <code className="bg-muted px-1 rounded">install-and-run.bat</code>
          </p>
        </div>
      </div>
    </div>
  );
}
