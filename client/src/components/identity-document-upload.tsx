import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Camera,
  Upload,
  FileCheck,
  FileX,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";

interface UploadedDocument {
  id: string;
  documentType: string;
  documentNumber: string | null;
  verificationStatus: string;
  verificationMethod: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  ocrEnabled: boolean;
  ocrStatus: string | null;
  ocrConfidenceScore: string | null;
  isExpired: boolean;
  expiryDate: string | null;
  createdAt: string;
}

const documentTypeLabels: Record<string, string> = {
  carta_identita: "Carta d'Identità",
  patente: "Patente di Guida",
  passaporto: "Passaporto",
  permesso_soggiorno: "Permesso di Soggiorno",
};

const statusConfig: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "bg-yellow-500/20 text-yellow-400", icon: Clock, label: "In attesa di verifica" },
  under_review: { color: "bg-blue-500/20 text-blue-400", icon: Clock, label: "In revisione" },
  approved: { color: "bg-green-500/20 text-green-400", icon: CheckCircle, label: "Verificato" },
  rejected: { color: "bg-red-500/20 text-red-400", icon: FileX, label: "Rifiutato" },
  expired: { color: "bg-gray-500/20 text-gray-400", icon: AlertCircle, label: "Scaduto" },
};

export default function IdentityDocumentUpload() {
  const { toast } = useToast();
  const [documentType, setDocumentType] = useState("carta_identita");
  const [step, setStep] = useState<"select" | "front" | "back" | "selfie" | "uploading" | "done">("select");
  const [frontImage, setFrontImage] = useState<{ file: File; preview: string } | null>(null);
  const [backImage, setBackImage] = useState<{ file: File; preview: string } | null>(null);
  const [selfieImage, setSelfieImage] = useState<{ file: File; preview: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [enableOcr, setEnableOcr] = useState(true);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const { data: myDocs, isLoading: docsLoading, refetch: refetchDocs } = useQuery<{ documents: UploadedDocument[] }>({
    queryKey: ["/api/identity-documents/my"],
  });

  const getUploadUrlsMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      params.set("documentType", documentType);
      if (selfieImage) params.set("selfie", "true");
      const res = await fetch(`/api/identity-documents/upload-urls?${params}`);
      return res.json();
    },
  });

  const submitDocumentMutation = useMutation({
    mutationFn: async (data: {
      frontImageUrl: string;
      backImageUrl?: string;
      selfieImageUrl?: string;
    }) => {
      const res = await apiRequest("POST", "/api/identity-documents", {
        documentType,
        frontImageUrl: data.frontImageUrl,
        backImageUrl: data.backImageUrl,
        selfieImageUrl: data.selfieImageUrl,
        enableOcr,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/identity-documents/my"] });
      setStep("done");
      toast({ title: "Documento caricato", description: "In attesa di verifica" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
      setStep("select");
    },
  });

  const uploadFileToSignedUrl = async (file: File, signedUrl: string): Promise<void> => {
    await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });
  };

  const handleImageSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    setImage: (img: { file: File; preview: string } | null) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Errore", description: "Seleziona un'immagine valida", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Errore", description: "L'immagine è troppo grande (max 10MB)", variant: "destructive" });
      return;
    }

    const preview = URL.createObjectURL(file);
    setImage({ file, preview });
  };

  const handleSubmit = async () => {
    if (!frontImage) {
      toast({ title: "Errore", description: "Carica l'immagine del fronte", variant: "destructive" });
      return;
    }

    setStep("uploading");
    setUploadProgress(10);

    try {
      const urls = await getUploadUrlsMutation.mutateAsync();
      setUploadProgress(20);

      await uploadFileToSignedUrl(frontImage.file, urls.front.uploadUrl);
      setUploadProgress(50);

      let backPath = undefined;
      if (backImage && urls.back) {
        await uploadFileToSignedUrl(backImage.file, urls.back.uploadUrl);
        backPath = urls.back.objectPath;
      }
      setUploadProgress(70);

      let selfiePath = undefined;
      if (selfieImage && urls.selfie) {
        await uploadFileToSignedUrl(selfieImage.file, urls.selfie.uploadUrl);
        selfiePath = urls.selfie.objectPath;
      }
      setUploadProgress(90);

      await submitDocumentMutation.mutateAsync({
        frontImageUrl: urls.front.objectPath,
        backImageUrl: backPath,
        selfieImageUrl: selfiePath,
      });

      setUploadProgress(100);
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Errore upload", description: "Riprova più tardi", variant: "destructive" });
      setStep("select");
    }
  };

  const resetForm = () => {
    setDocumentType("carta_identita");
    setStep("select");
    setFrontImage(null);
    setBackImage(null);
    setSelfieImage(null);
    setUploadProgress(0);
  };

  const needsBackImage = documentType !== "passaporto";

  const hasApprovedDocument = myDocs?.documents?.some(d => d.verificationStatus === "approved" && !d.isExpired);
  const hasPendingDocument = myDocs?.documents?.some(d => d.verificationStatus === "pending" || d.verificationStatus === "under_review");

  if (docsLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (hasApprovedDocument) {
    const approvedDoc = myDocs?.documents?.find(d => d.verificationStatus === "approved");
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Documento Verificato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge variant="outline">{documentTypeLabels[approvedDoc?.documentType || ""]}</Badge>
            {approvedDoc?.documentNumber && (
              <span className="font-mono text-sm">{approvedDoc.documentNumber}</span>
            )}
            {approvedDoc?.expiryDate && (
              <span className="text-sm text-muted-foreground">
                Scade: {format(new Date(approvedDoc.expiryDate), "dd/MM/yyyy")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (hasPendingDocument) {
    const pendingDoc = myDocs?.documents?.find(d => d.verificationStatus === "pending" || d.verificationStatus === "under_review");
    const status = statusConfig[pendingDoc?.verificationStatus || "pending"];
    const StatusIcon = status.icon;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            {status.label}
          </CardTitle>
          <CardDescription>
            Il tuo documento è in fase di verifica. Riceverai una notifica quando sarà completata.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge className={status.color}>{status.label}</Badge>
            <Badge variant="outline">{documentTypeLabels[pendingDoc?.documentType || ""]}</Badge>
            {pendingDoc?.ocrEnabled && pendingDoc?.ocrStatus === "processing" && (
              <Badge variant="secondary">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analisi OCR in corso
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const rejectedDoc = myDocs?.documents?.find(d => d.verificationStatus === "rejected");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Carica Documento d'Identità</CardTitle>
        <CardDescription>
          Carica un documento d'identità valido per completare la verifica del tuo account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {rejectedDoc && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Documento precedente rifiutato</span>
            </div>
            <p className="text-sm">{rejectedDoc.rejectionReason}</p>
          </div>
        )}

        {step === "uploading" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Caricamento in corso...</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {step === "select" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo di documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="carta_identita">Carta d'Identità</SelectItem>
                  <SelectItem value="patente">Patente di Guida</SelectItem>
                  <SelectItem value="passaporto">Passaporto</SelectItem>
                  <SelectItem value="permesso_soggiorno">Permesso di Soggiorno</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fronte documento *</Label>
                <input
                  ref={frontInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e, setFrontImage)}
                  data-testid="input-front-image"
                />
                {frontImage ? (
                  <div className="relative">
                    <img src={frontImage.preview} alt="Fronte" className="w-full h-40 object-cover rounded-lg border" />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setFrontImage(null)}
                      data-testid="btn-remove-front"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-40 flex flex-col gap-2"
                    onClick={() => frontInputRef.current?.click()}
                    data-testid="btn-upload-front"
                  >
                    <Camera className="w-8 h-8" />
                    <span>Scatta foto o carica</span>
                  </Button>
                )}
              </div>

              {needsBackImage && (
                <div className="space-y-2">
                  <Label>Retro documento</Label>
                  <input
                    ref={backInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e, setBackImage)}
                    data-testid="input-back-image"
                  />
                  {backImage ? (
                    <div className="relative">
                      <img src={backImage.preview} alt="Retro" className="w-full h-40 object-cover rounded-lg border" />
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => setBackImage(null)}
                        data-testid="btn-remove-back"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full h-40 flex flex-col gap-2"
                      onClick={() => backInputRef.current?.click()}
                      data-testid="btn-upload-back"
                    >
                      <ImageIcon className="w-8 h-8" />
                      <span>Retro (opzionale)</span>
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 pt-4">
              <Button
                onClick={handleSubmit}
                disabled={!frontImage || submitDocumentMutation.isPending}
                className="flex-1"
                data-testid="btn-submit-document"
              >
                {submitDocumentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Carica Documento
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              I tuoi documenti sono crittografati e trattati secondo la normativa sulla privacy.
              Saranno utilizzati esclusivamente per la verifica della tua identità.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
