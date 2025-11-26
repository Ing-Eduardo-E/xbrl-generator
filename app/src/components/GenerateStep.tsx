'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Package,
  Building2,
  Calendar,
  Hash,
  FileText,
  CircleDollarSign,
  Layers,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface GenerateStepProps {
  onBack: () => void;
  onReset: () => void;
}

/**
 * Función para descargar un archivo desde base64
 */
function downloadBase64File(base64Data: string, fileName: string, mimeType: string) {
  // Convertir base64 a blob
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  // Crear link de descarga
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function GenerateStep({ onBack, onReset }: GenerateStepProps) {
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingXBRL, setIsDownloadingXBRL] = useState(false);
  
  // Formulario para XBRL
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxonomyYear, setTaxonomyYear] = useState('2024');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0].replace(/-\d{2}$/, '-12-31'));
  const [nit, setNit] = useState('');
  // Nuevos campos según hoja 110000 de XBRL Express
  const [businessNature, setBusinessNature] = useState('Servicios públicos domiciliarios');
  const [startDate, setStartDate] = useState('');
  const [roundingDegree, setRoundingDegree] = useState('1'); // 1=Pesos por defecto
  const [hasRestatedInfo, setHasRestatedInfo] = useState('No');
  const [restatedPeriod, setRestatedPeriod] = useState('');

  // Años de taxonomía disponibles
  const availableYears = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017'];

  const serviceTotalsQuery = trpc.balance.getTotalesServicios.useQuery();
  const sessionQuery = trpc.balance.getSessionInfo.useQuery();
  const downloadExcelQuery = trpc.balance.downloadExcel.useQuery(undefined, {
    enabled: false,
  });
  const downloadXBRLMutation = trpc.balance.downloadXBRL.useMutation({
    onSuccess: (data) => {
      downloadBase64File(data.fileData, data.fileName, data.mimeType);
      toast.success('Paquete XBRL generado exitosamente', {
        description: `Archivo: ${data.fileName}`,
      });
    },
    onError: (error) => {
      toast.error('Error al generar XBRL', {
        description: error.message,
      });
    },
  });

  const handleDownloadExcel = async () => {
    setIsDownloadingExcel(true);
    try {
      const result = await downloadExcelQuery.refetch();
      
      if (result.data) {
        downloadBase64File(
          result.data.fileData,
          result.data.fileName,
          result.data.mimeType
        );
        
        toast.success('Excel generado exitosamente', {
          description: `Archivo: ${result.data.fileName}`,
        });
      } else if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      toast.error('Error al generar Excel', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    } finally {
      setIsDownloadingExcel(false);
    }
  };

  const handleDownloadXBRL = async () => {
    if (!companyId.trim()) {
      toast.error('ID de empresa requerido', {
        description: 'Ingresa el código RUPS de la empresa',
      });
      return;
    }
    if (!companyName.trim()) {
      toast.error('Nombre de empresa requerido', {
        description: 'Ingresa el nombre de la empresa',
      });
      return;
    }

    setIsDownloadingXBRL(true);
    try {
      await downloadXBRLMutation.mutateAsync({
        companyId: companyId.trim(),
        companyName: companyName.trim(),
        reportDate,
        taxonomyYear: taxonomyYear as '2024' | '2025' | '2023' | '2022' | '2021' | '2020' | '2019' | '2018' | '2017',
        nit: nit.trim() || undefined,
        businessNature: businessNature.trim() || undefined,
        startDate: startDate || undefined,
        roundingDegree: roundingDegree as '1' | '2' | '3' | '4' || undefined,
        hasRestatedInfo: hasRestatedInfo || undefined,
        restatedPeriod: restatedPeriod.trim() || undefined,
      });
    } finally {
      setIsDownloadingXBRL(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Success Message */}
      <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
              Balance procesado exitosamente
            </h3>
            <p className="text-green-800 dark:text-green-200">
              El balance ha sido distribuido correctamente entre los tres servicios
              {sessionQuery.data && (
                <span className="ml-1">
                  ({sessionQuery.data.niifGroup?.toUpperCase()})
                </span>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* Service Totals Summary */}
      {serviceTotalsQuery.data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Acueducto */}
          <Card className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                Acueducto
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Activos</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.acueducto.activos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pasivos</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.acueducto.pasivos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Patrimonio</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.acueducto.patrimonio)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Alcantarillado */}
          <Card className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-green-600 dark:text-green-400">
                Alcantarillado
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Activos</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.alcantarillado.activos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pasivos</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.alcantarillado.pasivos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Patrimonio</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.alcantarillado.patrimonio)}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Aseo */}
          <Card className="p-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg text-orange-600 dark:text-orange-400">
                Aseo
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Activos</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.aseo.activos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pasivos</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.aseo.pasivos)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Patrimonio</span>
                  <span className="font-medium">
                    {formatCurrency(serviceTotalsQuery.data.aseo.patrimonio)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Download Options */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Descargar archivos generados</h3>

        {/* Excel Download */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <FileSpreadsheet className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium">Balance Distribuido (Excel)</h4>
                <p className="text-sm text-muted-foreground">
                  Archivo Excel con 4 hojas: Consolidado + 3 servicios
                </p>
              </div>
            </div>
            <Button onClick={handleDownloadExcel} disabled={isDownloadingExcel}>
              {isDownloadingExcel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* XBRL Download */}
        <Card className="p-6">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Paquete XBRL (ZIP)</h4>
                <p className="text-sm text-muted-foreground">
                  Archivos .xbrl, .xbrlt, .xml listos para XBRL Express y SUI
                </p>
              </div>
            </div>

            {/* Formulario de datos de empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              {/* Año de taxonomía */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="taxonomyYear" className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Año de Taxonomía SSPD
                </Label>
                <Select value={taxonomyYear} onValueChange={(value) => {
                  setTaxonomyYear(value);
                  // Actualizar automáticamente la fecha de reporte al año seleccionado
                  setReportDate(`${value}-12-31`);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar año..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>
                        {year} - Taxonomía SSPD Corte {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  URL: http://www.sui.gov.co/xbrl/Corte_{taxonomyYear}/grupo1/
                </p>
              </div>

              {/* Fila 1: RUPS y NIT */}
              <div className="space-y-2">
                <Label htmlFor="companyId" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Código RUPS *
                </Label>
                <Input
                  id="companyId"
                  placeholder="Ej: 20037"
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nit" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  NIT
                </Label>
                <Input
                  id="nit"
                  placeholder="Ej: 900123456-1"
                  value={nit}
                  onChange={(e) => setNit(e.target.value)}
                />
              </div>

              {/* Fila 2: Nombre de empresa (ancho completo) */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="companyName" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Nombre de la Empresa *
                </Label>
                <Input
                  id="companyName"
                  placeholder="Ej: Empresa de Servicios Públicos de..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* Fila 3: Naturaleza del negocio (ancho completo) */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessNature" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Información sobre la naturaleza del negocio
                </Label>
                <Input
                  id="businessNature"
                  placeholder="Ej: Servicios públicos domiciliarios"
                  value={businessNature}
                  onChange={(e) => setBusinessNature(e.target.value)}
                />
              </div>

              {/* Fila 4: Fechas */}
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de inicio de operaciones
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reportDate" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Fecha de cierre del período *
                </Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>

              {/* Fila 5: Grado de redondeo */}
              <div className="space-y-2">
                <Label htmlFor="roundingDegree" className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4" />
                  Grado de redondeo utilizado
                </Label>
                <Select value={roundingDegree} onValueChange={setRoundingDegree}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Pesos</SelectItem>
                    <SelectItem value="2">2 - Miles de pesos</SelectItem>
                    <SelectItem value="3">3 - Millones de pesos</SelectItem>
                    <SelectItem value="4">4 - Pesos redondeada a miles</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Código de redondeo según taxonomía SSPD
                </p>
              </div>

              {/* Fila 6: Información reexpresada */}
              <div className="space-y-2">
                <Label htmlFor="hasRestatedInfo" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  ¿Presenta información reexpresada?
                </Label>
                <Select value={hasRestatedInfo} onValueChange={setHasRestatedInfo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Sí">Sí</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fila 7: Período de reexpresión (solo si aplica) */}
              {hasRestatedInfo === 'Sí' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="restatedPeriod" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Período para el cual se presenta información reexpresada
                  </Label>
                  <Input
                    id="restatedPeriod"
                    placeholder="Ej: 2023-01-01 a 2023-12-31"
                    value={restatedPeriod}
                    onChange={(e) => setRestatedPeriod(e.target.value)}
                  />
                </div>
              )}

              {/* Botón de descarga */}
              <div className="flex items-end md:col-span-2">
                <Button 
                  onClick={handleDownloadXBRL} 
                  disabled={isDownloadingXBRL}
                  className="w-full"
                  variant="default"
                >
                  {isDownloadingXBRL ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando XBRL...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar y Descargar XBRL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button onClick={onReset} variant="secondary">
          Procesar Nuevo Balance
        </Button>
      </div>
    </div>
  );
}
