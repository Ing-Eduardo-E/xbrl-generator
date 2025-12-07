'use client';

import { useState, useEffect } from 'react';
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
  Building2,
  Calendar,
  Hash,
  FileText,
  CircleDollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

import type { IFECompanyData } from '@/components/IFECompanyInfoForm';

interface IFEMetadata {
  year: string;
  trimestre: '1T' | '2T' | '3T' | '4T';
}

interface GenerateStepProps {
  onBack: () => void;
  onReset: () => void;
  ifeCompanyData?: IFECompanyData | null;
  ifeMetadata?: IFEMetadata | null;
}

/**
 * Funcion para descargar un archivo desde base64
 * Usa un método que no interfiere con el DOM de React
 */
function downloadBase64File(base64Data: string, fileName: string, mimeType: string) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  
  // Usar click() directamente sin appendChild para evitar conflictos con React DOM
  link.click();
  
  // Limpiar después de un pequeño delay
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
}

export function GenerateStep({ onBack, onReset, ifeCompanyData, ifeMetadata }: GenerateStepProps) {
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
  const [isDownloadingOfficial, setIsDownloadingOfficial] = useState(false);
  
  // Formulario para datos de la empresa
  const [companyId, setCompanyId] = useState('');
  const [companyName, setCompanyName] = useState('');
  // Fecha por defecto: 31 de diciembre del año actual (se sobrescribe con ifeMetadata si aplica)
  const [reportDate, setReportDate] = useState(() => {
    const year = new Date().getFullYear();
    return `${year}-12-31`;
  });
  const [nit, setNit] = useState('');
  const [businessNature, setBusinessNature] = useState('Servicios publicos domiciliarios');
  const [startDate, setStartDate] = useState('');
  const [roundingDegree, setRoundingDegree] = useState('4'); // 4=Pesos redondeada a miles (mas comun)
  const [hasRestatedInfo, setHasRestatedInfo] = useState('No');
  const [restatedPeriod, setRestatedPeriod] = useState('');

  const serviceTotalsQuery = trpc.balance.getTotalesServicios.useQuery();
  const sessionQuery = trpc.balance.getSessionInfo.useQuery();
  const downloadExcelQuery = trpc.balance.downloadExcel.useQuery(undefined, {
    enabled: false,
  });

  // Pre-llenar datos del formulario con ifeCompanyData si está disponible
  useEffect(() => {
    if (ifeCompanyData) {
      setCompanyId(ifeCompanyData.idRups || '');
      setCompanyName(ifeCompanyData.companyName || '');
      setNit(ifeCompanyData.nit || '');
      if (ifeCompanyData.reportDate) {
        setReportDate(ifeCompanyData.reportDate);
      }
    }
  }, [ifeCompanyData]);

  // Helper para calcular fecha de cierre según trimestre
  const getIFEReportDate = (trimestre: '1T' | '2T' | '3T' | '4T', year: string) => {
    const endDates = {
      '1T': `${year}-03-31`,
      '2T': `${year}-06-30`,
      '3T': `${year}-09-30`,
      '4T': `${year}-12-31`,
    };
    return endDates[trimestre];
  };

  // Obtener la fecha efectiva del reporte (considera si es IFE o no)
  const effectiveReportDate = (sessionQuery.data?.niifGroup === 'ife' && ifeMetadata)
    ? getIFEReportDate(ifeMetadata.trimestre, ifeMetadata.year)
    : reportDate;

  const downloadOfficialMutation = trpc.balance.downloadOfficialTemplates.useMutation({
    onSuccess: (data) => {
      downloadBase64File(data.fileData, data.fileName, data.mimeType);
      toast.success('Plantillas oficiales descargadas exitosamente', {
        description: `Archivo: ${data.fileName}`,
      });
    },
    onError: (error) => {
      toast.error('Error al descargar plantillas', {
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

  const handleDownloadOfficialTemplates = async () => {
    if (!companyId.trim()) {
      toast.error('ID de empresa requerido', {
        description: 'Ingresa el codigo RUPS de la empresa para personalizar las plantillas',
      });
      return;
    }
    if (!companyName.trim()) {
      toast.error('Nombre de empresa requerido', {
        description: 'Ingresa el nombre de la empresa',
      });
      return;
    }
    
    setIsDownloadingOfficial(true);
    try {
      // Construir datos específicos de IFE si están disponibles
      const ifeData = ifeCompanyData ? {
        address: ifeCompanyData.address,
        city: ifeCompanyData.city,
        phone: ifeCompanyData.phone,
        cellphone: ifeCompanyData.phone, // Usar mismo teléfono si no hay celular
        email: ifeCompanyData.email,
        employeesStart: ifeCompanyData.employeesStart,
        employeesEnd: ifeCompanyData.employeesEnd,
        employeesAverage: ifeCompanyData.employeesAverage,
        representativeDocType: ifeCompanyData.representativeDocType,
        representativeDocNumber: ifeCompanyData.representativeDocNumber,
        representativeFirstName: ifeCompanyData.representativeFirstName,
        representativeLastName: ifeCompanyData.representativeLastName,
        normativeGroup: ifeCompanyData.normativeGroup,
        complianceDeclaration: ifeCompanyData.complianceDeclaration ? 'true' : 'false',
        goingConcernUncertainty: ifeCompanyData.goingConcernUncertainty 
          ? ifeCompanyData.goingConcernExplanation || 'Sí hay incertidumbre'
          : 'NA',
        goingConcernExplanation: ifeCompanyData.goingConcernExplanation || 'NA',
        servicesContinuityUncertainty: 'NA',
        servicesTermination: ifeCompanyData.servicesTermination ? 'Sí' : 'No',
        servicesTerminationDetail: ifeCompanyData.servicesTerminationExplanation || 'NA',
      } : undefined;

      await downloadOfficialMutation.mutateAsync({
        companyId: companyId.trim(),
        companyName: companyName.trim(),
        reportDate: effectiveReportDate,
        nit: nit.trim() || undefined,
        businessNature: businessNature.trim() || undefined,
        startDate: startDate || undefined,
        roundingDegree: roundingDegree || undefined,
        hasRestatedInfo: hasRestatedInfo || undefined,
        restatedPeriod: restatedPeriod.trim() || undefined,
        // Datos específicos de IFE
        ifeData,
      });
    } finally {
      setIsDownloadingOfficial(false);
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

        {/* Paquete XBRL - Plantillas Oficiales */}
        <Card className="p-6 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Paquete XBRL - Plantillas Oficiales SSPD</h4>
                <p className="text-sm text-muted-foreground">
                  Plantillas oficiales con datos pre-llenados, 100% compatibles con XBRL Express
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-blue-100 dark:bg-blue-900/50 rounded text-sm">
              <span className="font-medium">Taxonomia detectada:</span>
              <span className="text-blue-700 dark:text-blue-300 font-semibold">
                {sessionQuery.data?.niifGroup === 'r414' ? 'Resolucion 414 - Sector Publico' :
                 sessionQuery.data?.niifGroup === 'grupo1' ? 'NIIF Plenas (Grupo 1)' :
                 sessionQuery.data?.niifGroup === 'grupo2' ? 'NIIF PYMES (Grupo 2)' :
                 sessionQuery.data?.niifGroup === 'grupo3' ? 'Microempresas (Grupo 3)' :
                 sessionQuery.data?.niifGroup === 'ife' ? 'IFE - Informe Financiero Especial (Trimestral)' :
                 sessionQuery.data?.niifGroup?.toUpperCase() || 'GRUPO1'}
              </span>
            </div>

            {/* Formulario de datos de empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              {/* Fila 1: RUPS y NIT */}
              <div className="space-y-2">
                <Label htmlFor="companyId" className="flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Codigo RUPS *
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
                  placeholder="Ej: 814002123"
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
                  placeholder="Ej: Empresa de Servicios Publicos de..."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              {/* Fila 3: Naturaleza del negocio (ancho completo) */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessNature" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Informacion sobre la naturaleza del negocio
                </Label>
                <Input
                  id="businessNature"
                  placeholder="Ej: Servicios publicos domiciliarios"
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

              {/* Fecha de cierre - Para IFE muestra período seleccionado, para otros grupos permite editar fecha */}
              {sessionQuery.data?.niifGroup === 'ife' && ifeMetadata ? (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Período del reporte
                  </Label>
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium">
                      {ifeMetadata.trimestre === '1T' && '1er Trimestre'}
                      {ifeMetadata.trimestre === '2T' && '2do Trimestre'}
                      {ifeMetadata.trimestre === '3T' && '3er Trimestre'}
                      {ifeMetadata.trimestre === '4T' && '4to Trimestre'}
                      {' '}{ifeMetadata.year}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Fecha de cierre: {effectiveReportDate}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="reportDate" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Fecha de cierre del periodo *
                  </Label>
                  <Input
                    id="reportDate"
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                  />
                </div>
              )}

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
              </div>

              {/* Fila 6: Informacion reexpresada */}
              <div className="space-y-2">
                <Label htmlFor="hasRestatedInfo" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Presenta informacion reexpresada?
                </Label>
                <Select value={hasRestatedInfo} onValueChange={setHasRestatedInfo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="No">No</SelectItem>
                    <SelectItem value="Si">Si</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fila 7: Periodo de reexpresion (solo si aplica) */}
              {hasRestatedInfo === 'Si' && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="restatedPeriod" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Periodo para el cual se presenta informacion reexpresada
                  </Label>
                  <Input
                    id="restatedPeriod"
                    placeholder="Ej: 2023-01-01 a 2023-12-31"
                    value={restatedPeriod}
                    onChange={(e) => setRestatedPeriod(e.target.value)}
                  />
                </div>
              )}

              {/* Boton de descarga */}
              <div className="flex items-end md:col-span-2 pt-2">
                <Button 
                  onClick={handleDownloadOfficialTemplates} 
                  disabled={isDownloadingOfficial || !companyId.trim() || !companyName.trim()}
                  className="w-full"
                  size="lg"
                >
                  {isDownloadingOfficial ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generando paquete XBRL...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Generar y Descargar Paquete XBRL
                    </>
                  )}
                </Button>
              </div>
              
              {(!companyId.trim() || !companyName.trim()) && (
                <p className="text-xs text-blue-600 dark:text-blue-400 md:col-span-2">
                  * Campos obligatorios para generar el paquete
                </p>
              )}
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
