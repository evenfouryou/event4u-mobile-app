import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Loader2, CheckCircle, ExternalLink, AlertCircle, AlertTriangle, Copy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const WORKFLOW_CONTENT = `name: Build and Release Smart Card Reader

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: windows-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install production dependencies
        run: npm ci --production
        
      - name: Create release package
        run: |
          mkdir release
          copy server.js release\\\\
          copy package.json release\\\\
          copy install-and-run.bat release\\\\
          copy README.md release\\\\
          xcopy node_modules release\\\\node_modules\\\\ /E /I /Y
          
      - name: Create ZIP
        run: Compress-Archive -Path release\\\\* -DestinationPath Event4U-SmartCard-Reader.zip
        shell: powershell
        
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: Event4U-SmartCard-Reader
          path: Event4U-SmartCard-Reader.zip
          
      - name: Create GitHub Release
        if: startsWith(github.ref, 'refs/tags/')
        uses: softprops/action-gh-release@v1
        with:
          files: Event4U-SmartCard-Reader.zip
          name: Event4U Smart Card Reader \${{ github.ref_name }}
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`;

export default function DownloadSmartCardApp() {
  const [isCreating, setIsCreating] = useState(false);
  const [repoUrl, setRepoUrl] = useState<string | null>(null);
  const [workflowSkipped, setWorkflowSkipped] = useState(false);
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
        setWorkflowSkipped(result.workflowSkipped || false);
        toast({
          title: "Repository creato!",
          description: result.workflowSkipped 
            ? "Devi aggiungere il workflow manualmente" 
            : "Il repository è pronto su GitHub"
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

  const copyWorkflow = () => {
    navigator.clipboard.writeText(WORKFLOW_CONTENT);
    toast({
      title: "Copiato!",
      description: "Incolla il contenuto nel file build.yml"
    });
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

                {workflowSkipped && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <AlertTriangle className="h-5 w-5" />
                      <span className="font-medium">Aggiungi il Workflow Manualmente</span>
                    </div>
                    <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                      <li>Vai nel repository su GitHub</li>
                      <li>Clicca "Add file" → "Create new file"</li>
                      <li>Nome file: <code className="bg-muted px-1 rounded">.github/workflows/build.yml</code></li>
                      <li>Incolla il contenuto qui sotto</li>
                      <li>Clicca "Commit new file"</li>
                    </ol>
                    <Button onClick={copyWorkflow} variant="secondary" size="sm" className="w-full">
                      <Copy className="mr-2 h-4 w-4" />
                      Copia Contenuto Workflow
                    </Button>
                  </div>
                )}
                
                <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
                  <p className="font-medium">Prossimi passi:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    {workflowSkipped && <li>Aggiungi il workflow come indicato sopra</li>}
                    <li>Vai alla tab <strong>Actions</strong> nel repository</li>
                    <li>Clicca su <strong>"Build and Release Smart Card Reader"</strong></li>
                    <li>Clicca <strong>"Run workflow"</strong> → <strong>"Run workflow"</strong></li>
                    <li>Attendi 2-3 minuti per la compilazione</li>
                    <li>Scarica il file ZIP dalla sezione <strong>Artifacts</strong></li>
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
                <p className="text-sm text-muted-foreground">Il file ZIP sarà negli Artifacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
