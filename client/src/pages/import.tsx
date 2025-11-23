import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Papa from "papaparse";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

type ImportType = "products" | "priceListItems";

interface PreviewRow {
  [key: string]: any;
  _valid: boolean;
  _errors?: string[];
  _warnings?: string[];
  _rowIndex: number;
}

export default function ImportPage() {
  const { toast } = useToast();
  const [importType, setImportType] = useState<ImportType>("products");
  const [selectedPriceList, setSelectedPriceList] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch price lists for price list items import
  const { data: priceLists } = useQuery<any[]>({
    queryKey: ['/api/price-lists'],
    enabled: importType === "priceListItems",
  });

  // Import mutation for products
  const importProductsMutation = useMutation({
    mutationFn: async (products: any[]) => {
      return await apiRequest('POST', '/api/import/products', { products });
    },
    onSuccess: (data) => {
      toast({
        title: "Import completato",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      resetState();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore import",
        description: error.message || "Errore durante l'import dei prodotti",
      });
    },
  });

  // Import mutation for price list items
  const importPriceListItemsMutation = useMutation({
    mutationFn: async ({ priceListId, items }: { priceListId: string; items: any[] }) => {
      return await apiRequest('POST', '/api/import/price-list-items', { priceListId, items });
    },
    onSuccess: (data) => {
      toast({
        title: "Import completato",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/price-lists'] });
      resetState();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Errore import",
        description: error.message || "Errore durante l'import del listino prezzi",
      });
    },
  });

  const resetState = () => {
    setFile(null);
    setPreviewData([]);
    setShowPreview(false);
  };

  const validateDecimalField = (
    value: string | undefined | null,
    fieldName: string
  ): { isValid: boolean; errors: string[]; warnings: string[]; normalized: string | null } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!value || value.trim() === '') {
      errors.push(`${fieldName} mancante o vuoto`);
      return { isValid: false, errors, warnings, normalized: null };
    }

    const normalized = value.trim().replace(',', '.');
    
    if (isNaN(parseFloat(normalized))) {
      errors.push(`${fieldName} non è un numero valido`);
      return { isValid: false, errors, warnings, normalized: null };
    }

    const num = parseFloat(normalized);
    
    if (num < 0) {
      errors.push(`${fieldName} deve essere positivo`);
      return { isValid: false, errors, warnings, normalized: null };
    }

    const decimalRegex = /^\d+(\.\d{1,2})?$/;
    if (!decimalRegex.test(normalized)) {
      const parts = normalized.split('.');
      if (parts.length > 1 && parts[1].length > 2) {
        warnings.push(`${fieldName} ha più di 2 decimali (${normalized}) - sarà arrotondato a ${num.toFixed(2)}`);
      } else {
        errors.push(`${fieldName} ha un formato non valido (${normalized})`);
        return { isValid: false, errors, warnings, normalized: null };
      }
    }

    const canonicalValue = num.toFixed(2);
    return { isValid: true, errors, warnings, normalized: canonicalValue };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validated = validateRows(results.data);
        setPreviewData(validated);
        setShowPreview(true);
      },
      error: (error) => {
        toast({
          variant: "destructive",
          title: "Errore parsing CSV",
          description: error.message,
        });
      },
    });
  };

  const validateRows = (rows: any[]): PreviewRow[] => {
    if (importType === "products") {
      return rows.map((row, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!row.code) errors.push("Codice mancante");
        if (!row.name) errors.push("Nome mancante");
        if (!row.unitOfMeasure) errors.push("Unità di misura mancante");

        const costPriceValidation = validateDecimalField(row.costPrice, "Prezzo costo");
        errors.push(...costPriceValidation.errors);
        warnings.push(...costPriceValidation.warnings);

        if (row.minThreshold) {
          const minThresholdValidation = validateDecimalField(row.minThreshold, "Soglia minima");
          errors.push(...minThresholdValidation.errors);
          warnings.push(...minThresholdValidation.warnings);
          if (minThresholdValidation.normalized) {
            row.minThreshold = minThresholdValidation.normalized;
          }
        }

        if (costPriceValidation.normalized) {
          row.costPrice = costPriceValidation.normalized;
        }

        return {
          ...row,
          _valid: errors.length === 0,
          _errors: errors.length > 0 ? errors.map(e => `Riga ${index + 2}: ${e}`) : undefined,
          _warnings: warnings.length > 0 ? warnings.map(w => `Riga ${index + 2}: ${w}`) : undefined,
          _rowIndex: index + 2,
        };
      });
    } else {
      return rows.map((row, index) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!row.productCode) errors.push("Codice prodotto mancante");

        const salePriceValidation = validateDecimalField(row.salePrice, "Prezzo vendita");
        errors.push(...salePriceValidation.errors);
        warnings.push(...salePriceValidation.warnings);

        if (salePriceValidation.normalized) {
          row.salePrice = salePriceValidation.normalized;
        }

        return {
          ...row,
          _valid: errors.length === 0,
          _errors: errors.length > 0 ? errors.map(e => `Riga ${index + 2}: ${e}`) : undefined,
          _warnings: warnings.length > 0 ? warnings.map(w => `Riga ${index + 2}: ${w}`) : undefined,
          _rowIndex: index + 2,
        };
      });
    }
  };

  const handleImport = () => {
    const validRows = previewData.filter(row => row._valid);
    
    if (validRows.length === 0) {
      toast({
        variant: "destructive",
        title: "Nessuna riga valida",
        description: "Correggi gli errori prima di procedere",
      });
      return;
    }

    const hasWarnings = validRows.some(row => row._warnings && row._warnings.length > 0);
    if (hasWarnings) {
      const warningCount = validRows.filter(row => row._warnings && row._warnings.length > 0).length;
      toast({
        title: "Attenzione",
        description: `${warningCount} ${warningCount === 1 ? 'riga ha' : 'righe hanno'} avvisi (valori arrotondati). Controlla l'anteprima.`,
      });
    }

    if (importType === "products") {
      const products = validRows.map(({ _valid, _errors, _warnings, _rowIndex, ...row }) => ({
        code: row.code,
        name: row.name,
        category: row.category || null,
        unitOfMeasure: row.unitOfMeasure,
        costPrice: row.costPrice,
        minThreshold: row.minThreshold || null,
        active: row.active === "false" ? false : true,
      }));
      importProductsMutation.mutate(products);
    } else {
      if (!selectedPriceList) {
        toast({
          variant: "destructive",
          title: "Listino non selezionato",
          description: "Seleziona un listino prezzi",
        });
        return;
      }

      const items = validRows.map(({ _valid, _errors, _warnings, _rowIndex, ...row }) => ({
        productCode: row.productCode,
        salePrice: row.salePrice,
      }));
      importPriceListItemsMutation.mutate({ priceListId: selectedPriceList, items });
    }
  };

  const validCount = previewData.filter(row => row._valid).length;
  const invalidCount = previewData.length - validCount;
  const warningCount = previewData.filter(row => row._warnings && row._warnings.length > 0).length;

  return (
    <div className="p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Import CSV/Excel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importa prodotti o listini prezzi da file CSV
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurazione Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo Import</Label>
              <Select value={importType} onValueChange={(v) => {
                setImportType(v as ImportType);
                resetState();
              }}>
                <SelectTrigger data-testid="select-import-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="products">Prodotti</SelectItem>
                  <SelectItem value="priceListItems">Voci Listino Prezzi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {importType === "priceListItems" && (
              <div className="space-y-2">
                <Label>Listino Prezzi</Label>
                <Select value={selectedPriceList} onValueChange={setSelectedPriceList}>
                  <SelectTrigger data-testid="select-price-list">
                    <SelectValue placeholder="Seleziona listino" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceLists?.map(pl => (
                      <SelectItem key={pl.id} value={pl.id}>
                        {pl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>File CSV</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  data-testid="input-csv-file"
                  className="flex-1"
                />
                {file && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-filename">
                    <FileText className="h-4 w-4" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>
            </div>

            <Alert data-testid="alert-csv-format">
              <AlertDescription>
                <strong>Formato CSV per Prodotti:</strong><br />
                code, name, category, unitOfMeasure, costPrice, minThreshold, active<br /><br />
                <strong>Formato CSV per Listino Prezzi:</strong><br />
                productCode, salePrice
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {showPreview && previewData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span data-testid="text-preview-count">Anteprima ({previewData.length} righe)</span>
                <div className="flex items-center gap-4 text-sm font-normal">
                  <span className="flex items-center gap-1 text-green-600" data-testid="text-valid-count">
                    <CheckCircle2 className="h-4 w-4" />
                    {validCount} valide
                  </span>
                  {warningCount > 0 && (
                    <span className="flex items-center gap-1 text-yellow-600" data-testid="text-warning-count">
                      <AlertCircle className="h-4 w-4" />
                      {warningCount} avvisi
                    </span>
                  )}
                  {invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-destructive" data-testid="text-invalid-count">
                      <AlertCircle className="h-4 w-4" />
                      {invalidCount} errori
                    </span>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-auto max-h-96" data-testid="table-preview">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Riga</TableHead>
                      <TableHead className="w-12">Stato</TableHead>
                      {importType === "products" ? (
                        <>
                          <TableHead>Codice</TableHead>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead>UM</TableHead>
                          <TableHead>Prezzo Costo</TableHead>
                          <TableHead>Soglia Min</TableHead>
                          <TableHead>Attivo</TableHead>
                        </>
                      ) : (
                        <>
                          <TableHead>Codice Prodotto</TableHead>
                          <TableHead>Prezzo Vendita</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((row, idx) => (
                      <>
                        <TableRow 
                          key={idx} 
                          className={!row._valid ? "bg-destructive/10" : (row._warnings && row._warnings.length > 0 ? "bg-yellow-50 dark:bg-yellow-950/10" : "")} 
                          data-testid={`row-preview-${idx}`}
                        >
                          <TableCell className="font-medium text-muted-foreground" data-testid={`rownum-${idx}`}>
                            {row._rowIndex}
                          </TableCell>
                          <TableCell data-testid={`status-row-${idx}`}>
                            {row._valid ? (
                              row._warnings && row._warnings.length > 0 ? (
                                <AlertCircle 
                                  className="h-4 w-4 text-yellow-600" 
                                  title={row._warnings.join(", ")}
                                  data-testid={`icon-warning-${idx}`}
                                />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 text-green-600" data-testid={`icon-valid-${idx}`} />
                              )
                            ) : (
                              <AlertCircle 
                                className="h-4 w-4 text-destructive" 
                                title={row._errors?.join(", ")}
                                data-testid={`icon-invalid-${idx}`}
                              />
                            )}
                          </TableCell>
                          {importType === "products" ? (
                            <>
                              <TableCell className="font-mono text-xs">{row.code}</TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>{row.category}</TableCell>
                              <TableCell>{row.unitOfMeasure}</TableCell>
                              <TableCell>€{row.costPrice}</TableCell>
                              <TableCell>{row.minThreshold || "-"}</TableCell>
                              <TableCell>{row.active === "false" ? "No" : "Sì"}</TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell className="font-mono text-xs">{row.productCode}</TableCell>
                              <TableCell>€{row.salePrice}</TableCell>
                            </>
                          )}
                        </TableRow>
                        {(row._errors || row._warnings) && (
                          <TableRow key={`${idx}-details`} className={!row._valid ? "bg-destructive/5" : "bg-yellow-50/50 dark:bg-yellow-950/5"}>
                            <TableCell colSpan={importType === "products" ? 9 : 4} className="py-2">
                              <div className="text-xs space-y-1">
                                {row._errors && row._errors.map((err, errIdx) => (
                                  <div key={errIdx} className="text-destructive flex items-start gap-1" data-testid={`error-${idx}-${errIdx}`}>
                                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                                {row._warnings && row._warnings.map((warn, warnIdx) => (
                                  <div key={warnIdx} className="text-yellow-700 dark:text-yellow-500 flex items-start gap-1" data-testid={`warning-${idx}-${warnIdx}`}>
                                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                    <span>{warn}</span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  onClick={resetState}
                  data-testid="button-cancel-import"
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={validCount === 0 || importProductsMutation.isPending || importPriceListItemsMutation.isPending}
                  data-testid="button-confirm-import"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Importa {validCount} {validCount === 1 ? "Riga" : "Righe"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
