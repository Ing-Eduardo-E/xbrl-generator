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
import { Building2, User, Users, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Datos de información de empresa para IFE.
 * Basado en la estructura del formulario oficial SSPD.
 */
export interface IFECompanyData {
  // Información básica
  nit: string;
  idRups: string;
  companyName: string;
  reportDate: string;
  address: string;
  city: string;
  phone: string;
  email: string;

  // Empleados
  employeesStart: number;
  employeesEnd: number;
  employeesAverage: number;

  // Representante legal
  representativeDocType: '01' | '02' | '03'; // CC, CE, Pasaporte
  representativeDocNumber: string;
  representativeFirstName: string;
  representativeLastName: string;

  // Marco normativo
  normativeGroup: 'R414' | 'NIIF1' | 'NIIF2' | 'NIIF3';
  complianceDeclaration: boolean;

  // Continuidad
  goingConcernUncertainty: boolean;
  goingConcernExplanation?: string;
  servicesTermination: boolean;
  servicesTerminationExplanation?: string;

  // Ajustes a trimestres anteriores
  previousQuarterAdjustments: boolean;
  adjustmentsExplanation?: string;
}

interface IFECompanyInfoFormProps {
  initialData?: Partial<IFECompanyData>;
  onSubmit: (data: IFECompanyData) => void;
  onBack?: () => void;
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

export function IFECompanyInfoForm({ initialData, onSubmit, onBack }: IFECompanyInfoFormProps) {
  const [formData, setFormData] = useState<IFECompanyData>({
    // Información básica
    nit: initialData?.nit || '',
    idRups: initialData?.idRups || '',
    companyName: initialData?.companyName || '',
    reportDate: initialData?.reportDate || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    phone: initialData?.phone || '',
    email: initialData?.email || '',

    // Empleados
    employeesStart: initialData?.employeesStart || 0,
    employeesEnd: initialData?.employeesEnd || 0,
    employeesAverage: initialData?.employeesAverage || 0,

    // Representante legal
    representativeDocType: initialData?.representativeDocType || '01',
    representativeDocNumber: initialData?.representativeDocNumber || '',
    representativeFirstName: initialData?.representativeFirstName || '',
    representativeLastName: initialData?.representativeLastName || '',

    // Marco normativo
    normativeGroup: initialData?.normativeGroup || 'R414',
    complianceDeclaration: initialData?.complianceDeclaration ?? true,

    // Continuidad
    goingConcernUncertainty: initialData?.goingConcernUncertainty || false,
    goingConcernExplanation: initialData?.goingConcernExplanation || '',
    servicesTermination: initialData?.servicesTermination || false,
    servicesTerminationExplanation: initialData?.servicesTerminationExplanation || '',

    // Ajustes
    previousQuarterAdjustments: initialData?.previousQuarterAdjustments || false,
    adjustmentsExplanation: initialData?.adjustmentsExplanation || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof IFECompanyData, string>>>({});

  // Calcular promedio de empleados automáticamente
  useEffect(() => {
    const avg = Math.round((formData.employeesStart + formData.employeesEnd) / 2);
    if (avg !== formData.employeesAverage) {
      setFormData(prev => ({ ...prev, employeesAverage: avg }));
    }
  }, [formData.employeesStart, formData.employeesEnd, formData.employeesAverage]);

  const updateField = <K extends keyof IFECompanyData>(field: K, value: IFECompanyData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof IFECompanyData, string>> = {};

    // Campos requeridos
    if (!formData.nit) newErrors.nit = 'NIT es requerido';
    if (!formData.idRups) newErrors.idRups = 'ID RUPS es requerido';
    if (!formData.companyName) newErrors.companyName = 'Nombre de empresa es requerido';
    if (!formData.address) newErrors.address = 'Dirección es requerida';
    if (!formData.city) newErrors.city = 'Ciudad es requerida';
    if (!formData.email) newErrors.email = 'Email es requerido';
    if (!formData.representativeDocNumber) newErrors.representativeDocNumber = 'Número de documento es requerido';
    if (!formData.representativeFirstName) newErrors.representativeFirstName = 'Nombres son requeridos';
    if (!formData.representativeLastName) newErrors.representativeLastName = 'Apellidos son requeridos';

    // Validar email
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email no válido';
    }

    // Validar explicaciones condicionales
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

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Información Básica de la Entidad */}
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
              placeholder="Ej: EMPRESA DE SERVICIOS PUBLICOS..."
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
              onValueChange={(v) => updateField('representativeDocType', v as '01' | '02' | '03')}
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
                onValueChange={(v) => updateField('normativeGroup', v as IFECompanyData['normativeGroup'])}
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
          </div>

          {/* Incertidumbre sobre negocio en marcha */}
          <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <Label>¿Existe incertidumbre sobre negocio en marcha?</Label>
            </div>
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

      {/* Botones de acción */}
      <div className="flex justify-between pt-4">
        {onBack && (
          <Button variant="outline" onClick={onBack}>
            Volver
          </Button>
        )}
        <Button onClick={handleSubmit} className={onBack ? '' : 'ml-auto'}>
          Continuar
          <CheckCircle2 className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
