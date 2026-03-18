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
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  User,
  Users,
  FileText,
  Calendar,
  Download,
  Loader2,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from '@/lib/safe-toast';

interface BatchIFECompanyFormProps {
  onBack: () => void;
  onReset: () => void;
}

type NormativeGroup = 'R414' | 'NIIF1' | 'NIIF2' | 'NIIF3';
type DocType = '01' | '02' | '03';

interface FormData {
  // Identificación
  nit: string;
  idRups: string;
  companyName: string;
  address: string;
  city: string;
  phone: string;
  email: string;

  // Año fiscal (batch: genera los 4 trimestres)
  fiscalYear: string;

  // Empleados
  employeesStart: number;
  employeesEnd: number;
  employeesAverage: number;

  // Representante legal
  representativeDocType: DocType;
  representativeDocNumber: string;
  representativeFirstName: string;
  representativeLastName: string;

  // Marco normativo
  normativeGroup: NormativeGroup;
  complianceDeclaration: boolean;

  // Continuidad
  goingConcernUncertainty: boolean;
  goingConcernExplanation: string;
  servicesTermination: boolean;
  servicesTerminationExplanation: string;

  // Ajustes
  previousQuarterAdjustments: boolean;
  adjustmentsExplanation: string;

  // Opcionales para el paquete XBRL
  businessNature: string;
  roundingDegree: string;
  hasRestatedInfo: string;
  restatedPeriod: string;
}

const DOC_TYPES = [
  { value: '01', label: 'Cédula de Ciudadanía' },
  { value: '02', label: 'Cédula de Extranjería' },
  { value: '03', label: 'Pasaporte' },
];

const NORMATIVE_GROUPS = [
  { value: 'R414', label: 'Resolución 414 - CGN' },
  { value: 'NIIF1', label: 'NIIF Plenas (Grupo 1)' },
  { value: 'NIIF2', label: 'NIIF PYMES (Grupo 2)' },
  { value: 'NIIF3', label: 'Microempresas (Grupo 3)' },
];

function getQuarterEndDate(year: number, quarter: 1 | 2 | 3 | 4): string {
  const ends: Record<number, string> = {
    1: `31/03/${year}`,
    2: `30/06/${year}`,
    3: `30/09/${year}`,
    4: `31/12/${year}`,
  };
  return ends[quarter];
}

function getQuarterLabel(year: number, quarter: 1 | 2 | 3 | 4): string {
  const labels: Record<number, string> = {
    1: `Ene - Mar ${year}`,
    2: `Abr - Jun ${year}`,
    3: `Jul - Sep ${year}`,
    4: `Oct - Dic ${year}`,
  };
  return labels[quarter];
}

/**
 * Descarga un archivo desde base64 sin interferir con el DOM de React.
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
  link.click();

  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 100);
}

const currentYear = new Date().getFullYear();

export function BatchIFECompanyForm({ onBack, onReset }: BatchIFECompanyFormProps) {
  const [formData, setFormData] = useState<FormData>({
    nit: '',
    idRups: '',
    companyName: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    fiscalYear: String(currentYear),
    employeesStart: 0,
    employeesEnd: 0,
    employeesAverage: 0,
    representativeDocType: '01',
    representativeDocNumber: '',
    representativeFirstName: '',
    representativeLastName: '',
    normativeGroup: 'R414',
    complianceDeclaration: true,
    goingConcernUncertainty: false,
    goingConcernExplanation: '',
    servicesTermination: false,
    servicesTerminationExplanation: '',
    previousQuarterAdjustments: false,
    adjustmentsExplanation: '',
    businessNature: 'Servicios publicos domiciliarios',
    roundingDegree: '4',
    hasRestatedInfo: 'No',
    restatedPeriod: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [downloadResult, setDownloadResult] = useState<{ fileName: string; fileData: string; mimeType: string } | null>(null);

  // Calcular promedio de empleados automáticamente
  useEffect(() => {
    const avg = Math.round((formData.employeesStart + formData.employeesEnd) / 2);
    if (avg !== formData.employeesAverage) {
      setFormData(prev => ({ ...prev, employeesAverage: avg }));
    }
  }, [formData.employeesStart, formData.employeesEnd, formData.employeesAverage]);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const generateBatchMutation = trpc.balance.generateBatchIFE.useMutation({
    onSuccess: (data) => {
      setDownloadResult({ fileName: data.fileName, fileData: data.fileData, mimeType: data.mimeType });
      toast.success('Batch IFE generado exitosamente', {
        description: `${data.trimestresGenerados.length} trimestres incluidos en ${data.fileName}`,
      });
    },
    onError: (error) => {
      toast.error('Error al generar batch IFE', {
        description: error.message,
      });
    },
  });

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.nit) {
      newErrors.nit = 'NIT es requerido';
    } else if (!/^\d{9,10}$/.test(formData.nit.trim())) {
      newErrors.nit = 'NIT debe tener 9-10 dígitos';
    }

    if (!formData.idRups) {
      newErrors.idRups = 'ID RUPS es requerido';
    } else if (!/^\d{1,6}$/.test(formData.idRups.trim())) {
      newErrors.idRups = 'ID RUPS debe ser numérico';
    }

    if (!formData.companyName) newErrors.companyName = 'Nombre de empresa es requerido';
    if (!formData.address) newErrors.address = 'Dirección es requerida';
    if (!formData.city) newErrors.city = 'Ciudad es requerida';
    if (!formData.email) {
      newErrors.email = 'Email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email no válido';
    }
    if (!formData.representativeDocNumber) newErrors.representativeDocNumber = 'Número de documento es requerido';
    if (!formData.representativeFirstName) newErrors.representativeFirstName = 'Nombres son requeridos';
    if (!formData.representativeLastName) newErrors.representativeLastName = 'Apellidos son requeridos';

    const yearNum = parseInt(formData.fiscalYear, 10);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      newErrors.fiscalYear = 'Año fiscal debe estar entre 2020 y 2030';
    }

    if (formData.goingConcernUncertainty && !formData.goingConcernExplanation) {
      newErrors.goingConcernExplanation = 'Debe explicar la incertidumbre';
    }
    if (formData.servicesTermination && !formData.servicesTerminationExplanation) {
      newErrors.servicesTerminationExplanation = 'Debe explicar la finalización';
    }
    if (formData.previousQuarterAdjustments && !formData.adjustmentsExplanation) {
      newErrors.adjustmentsExplanation = 'Debe explicar los ajustes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = () => {
    if (!validate()) return;

    generateBatchMutation.mutate({
      companyId: formData.idRups.trim(),
      companyName: formData.companyName.trim(),
      nit: formData.nit.trim() || undefined,
      businessNature: formData.businessNature.trim() || undefined,
      roundingDegree: formData.roundingDegree || undefined,
      hasRestatedInfo: formData.hasRestatedInfo || undefined,
      restatedPeriod: formData.restatedPeriod.trim() || undefined,
      year: formData.fiscalYear.trim(),
    });
  };

  const handleDownload = () => {
    if (downloadResult) {
      downloadBase64File(downloadResult.fileData, downloadResult.fileName, downloadResult.mimeType);
    }
  };

  const fiscalYearNum = parseInt(formData.fiscalYear, 10);
  const validYear = !isNaN(fiscalYearNum) && fiscalYearNum >= 2020 && fiscalYearNum <= 2030;

  return (
    <div className="space-y-6">
      {/* Cabecera informativa */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Batch IFE — 4 trimestres en un solo ZIP
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Se generaran los 4 paquetes XBRL trimestrales del año fiscal seleccionado.
              Cada trimestre quedara en un sub-ZIP independiente dentro del archivo descargado.
            </p>
          </div>
        </div>
      </Card>

      {/* Año fiscal + preview de períodos */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Año Fiscal</h3>
            <p className="text-sm text-muted-foreground">
              Define el año para el cual se generaran los 4 trimestres IFE
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="fiscalYear">Año fiscal *</Label>
            <Input
              id="fiscalYear"
              type="number"
              min={2020}
              max={2030}
              value={formData.fiscalYear}
              onChange={(e) => updateField('fiscalYear', e.target.value)}
              placeholder="Ej: 2025"
              className={errors.fiscalYear ? 'border-red-500' : ''}
            />
            {errors.fiscalYear && (
              <p className="text-sm text-red-500">{errors.fiscalYear}</p>
            )}
            <p className="text-xs text-muted-foreground">Rango válido: 2020 – 2030</p>
          </div>

          {/* Tabla preview de los 4 períodos */}
          {validYear && (
            <div className="space-y-2">
              <Label>Períodos que se generaran</Label>
              <div className="rounded-lg border overflow-hidden text-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Trimestre</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Período</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fecha cierre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([1, 2, 3, 4] as const).map((q) => (
                      <tr key={q} className="border-t">
                        <td className="px-3 py-2 font-medium">T{q} {fiscalYearNum}</td>
                        <td className="px-3 py-2 text-muted-foreground">{getQuarterLabel(fiscalYearNum, q)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{getQuarterEndDate(fiscalYearNum, q)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Información básica de la entidad */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Información de la Entidad</h3>
            <p className="text-sm text-muted-foreground">Datos básicos de identificación</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nit">NIT *</Label>
            <Input
              id="nit"
              value={formData.nit}
              onChange={(e) => updateField('nit', e.target.value)}
              placeholder="Ej: 814005646"
              className={errors.nit ? 'border-red-500' : ''}
            />
            {errors.nit && <p className="text-sm text-red-500">{errors.nit}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="idRups">ID RUPS *</Label>
            <Input
              id="idRups"
              value={formData.idRups}
              onChange={(e) => updateField('idRups', e.target.value)}
              placeholder="Ej: 20037"
              className={errors.idRups ? 'border-red-500' : ''}
            />
            {errors.idRups && <p className="text-sm text-red-500">{errors.idRups}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="companyName">Nombre de la Entidad *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              placeholder="Ej: EMPRESA DE SERVICIOS PUBLICOS DE..."
              className={errors.companyName ? 'border-red-500' : ''}
            />
            {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección *</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              placeholder="Ej: Calle 6 Nro. 8-02"
              className={errors.address ? 'border-red-500' : ''}
            />
            {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Ciudad *</Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="Ej: LA CRUZ - NARIÑO"
              className={errors.city ? 'border-red-500' : ''}
            />
            {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder="Ej: 3116151373"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="email">Email Corporativo *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Ej: gerencia@empresa.gov.co"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="businessNature">Naturaleza del negocio</Label>
            <Input
              id="businessNature"
              value={formData.businessNature}
              onChange={(e) => updateField('businessNature', e.target.value)}
              placeholder="Ej: Servicios publicos domiciliarios"
            />
          </div>
        </div>
      </Card>

      {/* Información de Empleados */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Información de Empleados</h3>
            <p className="text-sm text-muted-foreground">Número de empleados y contratistas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employeesStart">Al inicio del periodo</Label>
            <Input
              id="employeesStart"
              type="number"
              min="0"
              value={formData.employeesStart}
              onChange={(e) => updateField('employeesStart', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeesEnd">Al final del periodo</Label>
            <Input
              id="employeesEnd"
              type="number"
              min="0"
              value={formData.employeesEnd}
              onChange={(e) => updateField('employeesEnd', parseInt(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employeesAverage">Promedio del periodo</Label>
            <Input
              id="employeesAverage"
              type="number"
              value={formData.employeesAverage}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Calculado automáticamente</p>
          </div>
        </div>
      </Card>

      {/* Representante Legal */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <User className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Representante Legal</h3>
            <p className="text-sm text-muted-foreground">Datos del representante legal</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="docType">Tipo de Documento *</Label>
            <Select
              value={formData.representativeDocType}
              onValueChange={(v) => updateField('representativeDocType', v as DocType)}
            >
              <SelectTrigger id="docType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docNumber">Número de Documento *</Label>
            <Input
              id="docNumber"
              value={formData.representativeDocNumber}
              onChange={(e) => updateField('representativeDocNumber', e.target.value)}
              placeholder="Ej: 87249156"
              className={errors.representativeDocNumber ? 'border-red-500' : ''}
            />
            {errors.representativeDocNumber && (
              <p className="text-sm text-red-500">{errors.representativeDocNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="firstName">Nombres *</Label>
            <Input
              id="firstName"
              value={formData.representativeFirstName}
              onChange={(e) => updateField('representativeFirstName', e.target.value)}
              placeholder="Ej: JONATHAN ALEXANDER"
              className={errors.representativeFirstName ? 'border-red-500' : ''}
            />
            {errors.representativeFirstName && (
              <p className="text-sm text-red-500">{errors.representativeFirstName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Apellidos *</Label>
            <Input
              id="lastName"
              value={formData.representativeLastName}
              onChange={(e) => updateField('representativeLastName', e.target.value)}
              placeholder="Ej: BOLAÑOS MUÑOZ"
              className={errors.representativeLastName ? 'border-red-500' : ''}
            />
            {errors.representativeLastName && (
              <p className="text-sm text-red-500">{errors.representativeLastName}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Marco Normativo y Continuidad */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-lg">
            <FileText className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Marco Normativo y Continuidad</h3>
            <p className="text-sm text-muted-foreground">Información regulatoria y de negocio en marcha</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="normativeGroup">Grupo Normativo</Label>
              <Select
                value={formData.normativeGroup}
                onValueChange={(v) => updateField('normativeGroup', v as NormativeGroup)}
              >
                <SelectTrigger id="normativeGroup">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NORMATIVE_GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="roundingDegree">Grado de redondeo</Label>
              <Select value={formData.roundingDegree} onValueChange={(v) => updateField('roundingDegree', v)}>
                <SelectTrigger id="roundingDegree">
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

            <div className="space-y-2">
              <Label>Declaración de Cumplimiento</Label>
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.complianceDeclaration}
                    onChange={() => updateField('complianceDeclaration', true)}
                    className="w-4 h-4"
                  />
                  <span>Sí cumple</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.complianceDeclaration}
                    onChange={() => updateField('complianceDeclaration', false)}
                    className="w-4 h-4"
                  />
                  <span>No cumple</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hasRestatedInfo">Presenta información reexpresada</Label>
              <Select value={formData.hasRestatedInfo} onValueChange={(v) => updateField('hasRestatedInfo', v)}>
                <SelectTrigger id="hasRestatedInfo">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Si">Si</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.hasRestatedInfo === 'Si' && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="restatedPeriod">Período de reexpresión</Label>
                <Input
                  id="restatedPeriod"
                  value={formData.restatedPeriod}
                  onChange={(e) => updateField('restatedPeriod', e.target.value)}
                  placeholder="Ej: 2023-01-01 a 2023-12-31"
                />
              </div>
            )}
          </div>

          {/* Negocio en marcha */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label>¿Existe incertidumbre sobre negocio en marcha?</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.goingConcernUncertainty}
                  onChange={() => updateField('goingConcernUncertainty', false)}
                  className="w-4 h-4"
                />
                <span>No aplica</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.goingConcernUncertainty}
                  onChange={() => updateField('goingConcernUncertainty', true)}
                  className="w-4 h-4"
                />
                <span>Sí existe</span>
              </label>
            </div>
            {formData.goingConcernUncertainty && (
              <div className="space-y-2">
                <Label htmlFor="goingConcernExplanation">Explicación *</Label>
                <Textarea
                  id="goingConcernExplanation"
                  value={formData.goingConcernExplanation}
                  onChange={(e) => updateField('goingConcernExplanation', e.target.value)}
                  placeholder="Explique la incertidumbre sobre el negocio en marcha..."
                  className={errors.goingConcernExplanation ? 'border-red-500' : ''}
                />
                {errors.goingConcernExplanation && (
                  <p className="text-sm text-red-500">{errors.goingConcernExplanation}</p>
                )}
              </div>
            )}
          </div>

          {/* Finalización de servicios */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label>¿Finalización de prestación de servicios inscritos en RUPS?</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.servicesTermination}
                  onChange={() => updateField('servicesTermination', false)}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.servicesTermination}
                  onChange={() => updateField('servicesTermination', true)}
                  className="w-4 h-4"
                />
                <span>Sí</span>
              </label>
            </div>
            {formData.servicesTermination && (
              <div className="space-y-2">
                <Label htmlFor="servicesTerminationExplanation">Explicación *</Label>
                <Textarea
                  id="servicesTerminationExplanation"
                  value={formData.servicesTerminationExplanation}
                  onChange={(e) => updateField('servicesTerminationExplanation', e.target.value)}
                  placeholder="Explique la finalización de servicios..."
                  className={errors.servicesTerminationExplanation ? 'border-red-500' : ''}
                />
                {errors.servicesTerminationExplanation && (
                  <p className="text-sm text-red-500">{errors.servicesTerminationExplanation}</p>
                )}
              </div>
            )}
          </div>

          {/* Ajustes a trimestres anteriores */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <Label>¿Hubo ajustes a trimestres anteriores?</Label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!formData.previousQuarterAdjustments}
                  onChange={() => updateField('previousQuarterAdjustments', false)}
                  className="w-4 h-4"
                />
                <span>No</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={formData.previousQuarterAdjustments}
                  onChange={() => updateField('previousQuarterAdjustments', true)}
                  className="w-4 h-4"
                />
                <span>Sí</span>
              </label>
            </div>
            {formData.previousQuarterAdjustments && (
              <div className="space-y-2">
                <Label htmlFor="adjustmentsExplanation">Explicación de ajustes *</Label>
                <Textarea
                  id="adjustmentsExplanation"
                  value={formData.adjustmentsExplanation}
                  onChange={(e) => updateField('adjustmentsExplanation', e.target.value)}
                  placeholder="Explique los ajustes realizados a trimestres anteriores..."
                  className={errors.adjustmentsExplanation ? 'border-red-500' : ''}
                />
                {errors.adjustmentsExplanation && (
                  <p className="text-sm text-red-500">{errors.adjustmentsExplanation}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Resultado de generación */}
      {downloadResult && (
        <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  Batch IFE generado correctamente
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">{downloadResult.fileName}</p>
              </div>
            </div>
            <Button onClick={handleDownload} className="bg-green-700 hover:bg-green-800 text-white">
              <Download className="w-4 h-4 mr-2" />
              Descargar ZIP
            </Button>
          </div>
        </Card>
      )}

      {/* Botones de acción */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={generateBatchMutation.isPending}>
          Volver
        </Button>

        <div className="flex gap-3">
          {downloadResult && (
            <Button variant="secondary" onClick={onReset}>
              Procesar Nuevo Balance
            </Button>
          )}
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={generateBatchMutation.isPending}
          >
            {generateBatchMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generando 4 trimestres IFE...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 mr-2" />
                Generar 4 trimestres IFE
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
