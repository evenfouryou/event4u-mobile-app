import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Github, FileCode, Play, CheckCircle, ExternalLink } from "lucide-react";

export default function DownloadSmartCardApp() {
  const downloadFile = (filename: string) => {
    window.open(`/github-upload/${filename}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-6">
      <div className="max-w-3xl mx-auto space-y-6">
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
              Pubblica su GitHub
            </CardTitle>
            <CardDescription>
              Segui questi passi per creare l'installer automatico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">1</div>
                <div className="flex-1">
                  <p className="font-medium">Crea un nuovo repository GitHub</p>
                  <a 
                    href="https://github.com/new" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    github.com/new <ExternalLink className="h-3 w-3" />
                  </a>
                  <p className="text-sm text-muted-foreground mt-1">Nome consigliato: <code className="bg-muted px-1 rounded">event4u-smart-card-reader</code></p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">2</div>
                <div className="flex-1">
                  <p className="font-medium">Scarica e carica questi file sul repository</p>
                  <div className="mt-2 space-y-2">
                    <Button 
                      onClick={() => downloadFile('server.js')}
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      data-testid="button-download-server"
                    >
                      <FileCode className="mr-1 h-4 w-4" />
                      server.js
                    </Button>
                    <Button 
                      onClick={() => downloadFile('package.json')}
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      data-testid="button-download-package"
                    >
                      <FileCode className="mr-1 h-4 w-4" />
                      package.json
                    </Button>
                    <Button 
                      onClick={() => downloadFile('install-and-run.bat')}
                      variant="outline"
                      size="sm"
                      className="mr-2"
                      data-testid="button-download-bat"
                    >
                      <Play className="mr-1 h-4 w-4" />
                      install-and-run.bat
                    </Button>
                    <Button 
                      onClick={() => downloadFile('README.txt')}
                      variant="outline"
                      size="sm"
                      data-testid="button-download-readme"
                    >
                      <FileCode className="mr-1 h-4 w-4" />
                      README.txt
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">3</div>
                <div className="flex-1">
                  <p className="font-medium">Crea la cartella .github/workflows e carica:</p>
                  <div className="mt-2">
                    <Button 
                      onClick={() => downloadFile('.github/workflows/build.yml')}
                      variant="default"
                      size="sm"
                      data-testid="button-download-workflow"
                    >
                      <Download className="mr-1 h-4 w-4" />
                      build.yml (GitHub Actions)
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Questo file va in: <code className="bg-muted px-1 rounded">.github/workflows/build.yml</code>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold shrink-0">4</div>
                <div className="flex-1">
                  <p className="font-medium">Avvia la build</p>
                  <p className="text-sm text-muted-foreground">
                    Vai su <strong>Actions</strong> → <strong>Build and Release</strong> → <strong>Run workflow</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white font-bold shrink-0">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Scarica l'installer!</p>
                  <p className="text-sm text-muted-foreground">
                    Dopo qualche minuto, trovi il file ZIP nella sezione <strong>Releases</strong> del repository
                  </p>
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Struttura Repository</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`event4u-smart-card-reader/
├── .github/
│   └── workflows/
│       └── build.yml      ← GitHub Actions
├── server.js              ← Server WebSocket
├── package.json           ← Dipendenze
├── install-and-run.bat    ← Avvio Windows
└── README.txt             ← Istruzioni`}
            </pre>
          </CardContent>
        </Card>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-center">
            <strong>Tip:</strong> Puoi trascinare i file direttamente nella pagina del repository GitHub per caricarli velocemente!
          </p>
        </div>
      </div>
    </div>
  );
}
