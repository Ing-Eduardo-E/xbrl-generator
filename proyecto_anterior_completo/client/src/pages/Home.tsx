import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Settings, Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { APP_TITLE } from "@/const";
import { toast } from "sonner";
// import { readBalanceFromExcel, distributeByServices, validateAccountingEquations, generateBalanceSummary, type BalanceData } from "@/lib/excelProcessor";
// import { generateXBRLPackage } from "@/lib/xbrlGenerator";

interface BalanceData {
  empresa: string;
  periodo: string;
  totales: {
    activos: number;
    pasivos: number;
    patrimonio: number;
    ingresos: number;
    gastos: number;
    costos: number;
  };
  totalCuentas: number;
  totalHojas: number;
}

type NIIFGroup = "grupo1" | "grupo2" | "grupo3" | "r414";

interface ServiceConfig {
  name: string;
  percentage: number;
}

export default function Home() {
  // The userAuth hooks provides authentication state
  // To implement login/logout functionality, simply call logout() or redirect to getLoginUrl()
  let { user, loading, error: authError, isAuthenticated, logout } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [niifGroup, setNiifGroup] = useState<NIIFGroup>("grupo2");
  const [file, setFile] = useState<File | null>(null);
  const [services, setServices] = useState<ServiceConfig[]>([
    { name: "Acueducto", percentage: 40 },
    { name: "Alcantarillado", percentage: 20 },
    { name: "Aseo", percentage: 40 },
  ]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const cargarBalanceMutation = trpc.balance.cargar.useMutation();
  const distribuirMutation = trpc.balance.distribuir.useMutation();
  const [fileError, setFileError] = useState<string | null>(null);
  const [serviciosDistribuidos, setServiciosDistribuidos] = useState<any[] | null>(null);
  const descargarExcelMutation = trpc.balance.descargarExcel.useMutation();

  const totalPercentage = services.reduce((sum, s) => sum + s.percentage, 0);
  const isValidPercentage = totalPercentage === 100;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setFileError(null);
        toast.info("Procesando archivo Excel...");
        
        try {
          // Convertir archivo a base64
          const reader = new FileReader();
          const fileBase64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(selectedFile);
          });

          // Llamar a la API del backend
          const result = await cargarBalanceMutation.mutateAsync({
            fileBase64,
            filename: selectedFile.name,
          });

          // Guardar datos del balance
          setBalanceData({
            empresa: "Empresa de Servicios Públicos", // TODO: extraer del Excel
            periodo: "2023", // TODO: extraer del Excel
            totales: result.totales,
            totalCuentas: result.totalCuentas,
            totalHojas: result.totalHojas,
          });

          toast.success(
            `Balance cargado: ${result.totalCuentas} cuentas (${result.totalHojas} hojas). ` +
            `Activos: $${(result.totales.activos / 1_000_000).toFixed(1)}M`
          );
        } catch (err) {
          setFileError(err instanceof Error ? err.message : "Error al procesar el archivo");
          toast.error("Error al procesar el archivo Excel");
        }
      } else {
        setFileError("Por favor selecciona un archivo Excel (.xlsx o .xls)");
        toast.error("Formato de archivo inválido");
      }
    }
  };

  const handleServiceChange = (index: number, value: number) => {
    const newServices = [...services];
    newServices[index].percentage = value;
    setServices(newServices);
  };

  const handleAddService = () => {
    setServices([...services, { name: `Servicio ${services.length + 1}`, percentage: 0 }]);
  };

  const handleRemoveService = (index: number) => {
    if (services.length > 1) {
      setServices(services.filter((_, i) => i !== index));
    }
  };

  const handleGenerate = async () => {
    if (!file || !balanceData) {
      toast.error("Por favor carga un archivo Excel primero");
      return;
    }

    if (!isValidPercentage) {
      toast.error("Los porcentajes deben sumar exactamente 100%");
      return;
    }

    setProcessing(true);
    setProgress(0);
    setFileError(null);

    try {
      toast.info("Iniciando procesamiento...");
      setProgress(10);
      
      // Distribuir cuentas por servicios
      toast.info("Distribuyendo cuentas por servicios...");
      const resultadoDistribucion = await distribuirMutation.mutateAsync({
        servicios: services.map(s => ({
          nombre: s.name,
          porcentaje: s.percentage,
        })),
      });
      
      setServiciosDistribuidos(resultadoDistribucion.servicios);
      setProgress(50);
      
      // Mostrar resumen de la distribución
      const resumen = resultadoDistribucion.servicios
        .map(s => `${s.servicio}: $${(s.activos / 1_000_000).toFixed(1)}M`)
        .join(', ');
      toast.success(`Distribución completada: ${resumen}`);
      
      setProgress(80);
      
      // TODO: Generar archivos XBRL
      toast.info("Generación de archivos XBRL pendiente de implementación");
      setProgress(100);
      
      toast.success("¡Distribución completada exitosamente!");
      setStep(3);
      setDownloadUrl("#");
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Error al procesar el archivo");
      toast.error("Error al generar la taxonomía");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async () => {
    try {
      toast.info("Generando archivo Excel...");
      
      // Ejecutar la mutation para obtener el Excel
      const resultado = await descargarExcelMutation.mutateAsync();
      
      if (!resultado) {
        throw new Error("No se pudo generar el archivo");
      }
      
      // Convertir base64 a Blob
      const byteCharacters = atob(resultado.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: resultado.mimeType });
      
      // Crear enlace de descarga
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = resultado.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("¡Archivo descargado exitosamente!");
    } catch (error) {
      console.error('Error al descargar:', error);
      toast.error("Error al descargar el archivo");
    }
  };

  const handleReset = () => {
    setStep(1);
    setFile(null);
    setBalanceData(null);
    setDownloadUrl(null);
    setProgress(0);
    setFileError(null);
    setServiciosDistribuidos(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{APP_TITLE}</h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Automatiza la generación de taxonomías XBRL desde balances consolidados
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    step >= s
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {s}
                </div>
                {s < 3 && (
                  <div
                    className={`w-24 h-1 mx-2 ${
                      step > s ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-32 mt-2">
            <span className="text-sm font-medium">Cargar</span>
            <span className="text-sm font-medium">Configurar</span>
            <span className="text-sm font-medium">Generar</span>
          </div>
        </div>

        {/* Step 1: Upload */}
        {step === 1 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Paso 1: Cargar Balance Consolidado
              </CardTitle>
              <CardDescription>
                Selecciona el grupo NIIF y carga el archivo Excel con el balance consolidado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="niif-group">Grupo NIIF</Label>
                <Select value={niifGroup} onValueChange={(v) => setNiifGroup(v as NIIFGroup)}>
                  <SelectTrigger id="niif-group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grupo1">Grupo 1 - NIIF Plenas</SelectItem>
                    <SelectItem value="grupo2">Grupo 2 - NIIF PYMES</SelectItem>
                    <SelectItem value="grupo3">Grupo 3 - Microempresas</SelectItem>
                    <SelectItem value="r414">R414 - ESAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload">Archivo Excel</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      {file ? file.name : "Haz clic para seleccionar o arrastra el archivo aquí"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos soportados: .xlsx, .xls
                    </p>
                  </label>
                </div>
              </div>

              {fileError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{fileError}</AlertDescription>
                </Alert>
              )}
              
              {balanceData && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">Balance cargado exitosamente:</p>
                      <p className="text-sm">Total cuentas: {balanceData.totalCuentas}</p>
                      <p className="text-sm">Cuentas hoja: {balanceData.totalHojas}</p>
                      <p className="text-sm">Activos: ${(balanceData.totales.activos / 1_000_000).toFixed(2)}M</p>
                      <p className="text-sm">Pasivos: ${(balanceData.totales.pasivos / 1_000_000).toFixed(2)}M</p>
                      <p className="text-sm">Patrimonio: ${(balanceData.totales.patrimonio / 1_000_000).toFixed(2)}M</p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!file}
                className="w-full"
                size="lg"
              >
                Continuar →
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure */}
        {step === 2 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Paso 2: Configurar Distribución por Servicios
              </CardTitle>
              <CardDescription>
                Asigna los porcentajes de distribución para cada servicio (deben sumar 100%)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                {services.map((service, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <Input
                      value={service.name}
                      onChange={(e) => {
                        const newServices = [...services];
                        newServices[index].name = e.target.value;
                        setServices(newServices);
                      }}
                      className="flex-1"
                      placeholder="Nombre del servicio"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={service.percentage}
                        onChange={(e) => handleServiceChange(index, Number(e.target.value))}
                        className="w-24"
                        min="0"
                        max="100"
                      />
                      <span className="text-sm font-medium">%</span>
                    </div>
                    {services.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveService(index)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="outline" onClick={handleAddService} className="w-full">
                + Agregar Servicio
              </Button>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total:</span>
                  <span
                    className={`text-lg font-bold ${
                      isValidPercentage ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {totalPercentage}%
                  </span>
                </div>
                {!isValidPercentage && (
                  <p className="text-sm text-red-600 mt-2">
                    Los porcentajes deben sumar exactamente 100%
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  ← Atrás
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!isValidPercentage || processing}
                  className="flex-1"
                  size="lg"
                >
                  {processing ? "Procesando..." : "Generar Taxonomía"}
                </Button>
              </div>

              {processing && (
                <div className="space-y-2">
                  <Progress value={progress} className="w-full" />
                  <p className="text-sm text-center text-gray-600">
                    Procesando... {progress}%
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Download */}
        {step === 3 && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                ¡Taxonomía Generada Exitosamente!
              </CardTitle>
              <CardDescription>
                Tu paquete XBRL está listo para descargar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {serviciosDistribuidos && serviciosDistribuidos.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <p className="font-medium">Distribución por Servicios:</p>
                      {serviciosDistribuidos.map((servicio: any) => (
                        <div key={servicio.servicio} className="text-sm">
                          <p className="font-medium">{servicio.servicio} ({servicio.porcentaje}%):</p>
                          <ul className="ml-4 text-xs space-y-0.5">
                            <li>Activos: ${(servicio.activos / 1_000_000).toFixed(2)}M</li>
                            <li>Pasivos: ${(servicio.pasivos / 1_000_000).toFixed(2)}M</li>
                            <li>Patrimonio: ${(servicio.patrimonio / 1_000_000).toFixed(2)}M</li>
                            <li>Ingresos: ${(servicio.ingresos / 1_000_000).toFixed(2)}M</li>
                          </ul>
                        </div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Nota:</p>
                  <p className="text-sm">La generación de archivos XBRL está pendiente de implementación. Por ahora, el sistema ha completado exitosamente:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Carga y validación del balance consolidado</li>
                    <li>Distribución proporcional por servicios</li>
                    <li>Validación de ecuaciones contables</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Próximos pasos:</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Descarga el paquete ZIP</li>
                  <li>Abre los archivos en XBRL Express</li>
                  <li>Completa las 34 hojas restantes (notas, políticas, revelaciones)</li>
                  <li>Valida en XBRL Express hasta obtener "sin errores"</li>
                  <li>Genera el archivo .xbrl final y certifica en el SUI</li>
                </ol>
              </div>

              <Button onClick={handleDownload} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                Descargar Balances en Excel
              </Button>

              <Button variant="outline" onClick={handleReset} className="w-full">
                Generar Otra Taxonomía
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm mt-12">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>Generador de Taxonomías XBRL - Prototipo MVP</p>
          <p className="mt-1">Compatible con XBRL Express y plataforma SUI</p>
        </div>
      </footer>
    </div>
  );
}
