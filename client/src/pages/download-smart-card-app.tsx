import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github, Loader2, CheckCircle, ExternalLink, AlertCircle, Copy, FileCode } from "lucide-react";
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
          copy server.js release\\
          copy package.json release\\
          copy install-and-run.bat release\\
          copy README.md release\\
          xcopy node_modules release\\node_modules\\ /E /I /Y
          
      - name: Create ZIP
        run: Compress-Archive -Path release\\* -DestinationPath Event4U-SmartCard-Reader.zip
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
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
          description: "Ora aggiungi il workflow"
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
    setCopied(true);
    toast({
      title: "Copiato!",
      description: "Incolla il contenuto nel file build.yml su GitHub"
    });
    setTimeout(() => setCopied(false), 3000);
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

        {/* Step 1: Create Repo */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</span>
              Crea Repository GitHub
            </CardTitle>
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
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Repository creato!</span>
                </div>
                
                <a 
                  href={repoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Apri Repository su GitHub
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Add Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</span>
              Aggiungi il Workflow
            </CardTitle>
            <CardDescription>
              Crea il file per la compilazione automatica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={copyWorkflow}
              size="lg"
              variant={copied ? "secondary" : "default"}
              className="w-full"
              data-testid="button-copy-workflow"
            >
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Copiato!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copia Contenuto Workflow
                </>
              )}
            </Button>
            
            <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
              <p className="font-medium">Come fare:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Apri il repository su GitHub</li>
                <li>Clicca <strong>"Add file"</strong> → <strong>"Create new file"</strong></li>
                <li>Scrivi come nome: <code className="bg-background px-1 rounded">.github/workflows/build.yml</code></li>
                <li>Incolla il contenuto copiato</li>
                <li>Clicca <strong>"Commit new file"</strong></li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Run Workflow */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</span>
              Avvia la Compilazione
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Vai alla tab <strong>Actions</strong> nel repository</li>
              <li>Clicca su <strong>"Build and Release Smart Card Reader"</strong></li>
              <li>Clicca <strong>"Run workflow"</strong> → <strong>"Run workflow"</strong></li>
              <li>Attendi 2-3 minuti</li>
              <li>Scarica il file ZIP dagli <strong>Artifacts</strong></li>
            </ol>
          </CardContent>
        </Card>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-center">
            <strong>Risultato finale:</strong> Un file ZIP che i tuoi utenti possono scaricare, estrarre e usare con un doppio click!
          </p>
        </div>
      </div>
    </div>
  );
}
