'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

type NIIFGroup = 'grupo1' | 'grupo2' | 'grupo3' | 'r414' | 'ife';
type IFETrimestre = '1T' | '2T' | '3T' | '4T';

// Años disponibles para IFE (desde 2T 2020)
const IFE_YEARS = ['2020', '2021', '2022', '2023', '2024', '2025'];

// Obtener trimestres disponibles según el año
function getAvailableTrimestres(year: string): IFETrimestre[] {
  if (year === '2020') {
    // IFE comenzó en 2T 2020
    return ['2T', '3T', '4T'];
  }
  return ['1T', '2T', '3T', '4T'];
}

interface UploadStepProps {
  onSuccess: (niifGroup: NIIFGroup, ifeMetadata?: { year: string; trimestre: IFETrimestre }) => void;
}

// Función para calcular la fecha de reporte según año y trimestre
function calculateReportDate(year: string, trimestre: IFETrimestre): string {
  const lastDayOfQuarter: Record<IFETrimestre, string> = {
    '1T': `${year}-03-31`,
    '2T': `${year}-06-30`,
    '3T': `${year}-09-30`,
    '4T': `${year}-12-31`,
  };
  return lastDayOfQuarter[trimestre];
}

export function UploadStep({ onSuccess }: UploadStepProps) {
  const [file, setFile] = useState<File | null>(null);
  const [niifGroup, setNiifGroup] = useState<NIIFGroup>('grupo1');
  const [ifeYear, setIfeYear] = useState<string>('2025');
  const [ifeTrimestre, setIfeTrimestre] = useState<IFETrimestre>('2T');
  const [isDragging, setIsDragging] = useState(false);

  // Ajustar trimestre si el año cambia y el trimestre no está disponible
  const handleYearChange = (year: string) => {
    setIfeYear(year);
    const availableTrimestres = getAvailableTrimestres(year);
    if (!availableTrimestres.includes(ifeTrimestre)) {
      setIfeTrimestre(availableTrimestres[0]);
    }
  };

  const uploadMutation = trpc.balance.uploadBalance.useMutation({
    onSuccess: (data) => {
      toast.success('Balance cargado exitosamente', {
        description: `Archivo: ${data.fileName}`,
      });
      // Pasar metadata IFE si aplica
      if (niifGroup === 'ife') {
        onSuccess(niifGroup, { year: ifeYear, trimestre: ifeTrimestre });
      } else {
        onSuccess(niifGroup);
      }
    },
    onError: (error) => {
      toast.error('Error al cargar el balance', {
        description: error.message,
      });
    },
  });

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];

    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Tipo de archivo inválido', {
        description: 'Por favor, sube un archivo Excel (.xlsx o .xls)',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error('Archivo muy grande', {
        description: 'El tamaño máximo es 10MB',
      });
      return;
    }

    setFile(selectedFile);
    toast.success('Archivo seleccionado', {
      description: selectedFile.name,
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileChange(droppedFile);
      }
    },
    [handleFileChange]
  );

  const handleUpload = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      const fileData = base64.split(',')[1]; // Remove data URL prefix

      await uploadMutation.mutateAsync({
        fileName: file.name,
        fileData,
        niifGroup,
        // Incluir año y trimestre solo para IFE
        ...(niifGroup === 'ife' && {
          ifeYear,
          ifeTrimestre,
        }),
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      {/* Instructions Card */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Instrucciones para cargar el Balance General
            </p>
            <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-200">
              <li>El archivo debe ser Excel (.xlsx o .xls)</li>
              <li>
                Debe contener columnas: <strong>CÓDIGO</strong>,{' '}
                <strong>DENOMINACIÓN</strong> y <strong>Total</strong>
              </li>
              <li>Los códigos deben seguir el Plan Único de Cuentas (PUC)</li>
              <li>El balance debe estar consolidado (no individual por servicio)</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* NIIF Group Selection */}
      <div className="space-y-3">
        <Label htmlFor="niif-group" className="text-base font-medium">
          Grupo NIIF / Tipo de Taxonomía
        </Label>
        <Select value={niifGroup} onValueChange={(v) => setNiifGroup(v as NIIFGroup)}>
          <SelectTrigger id="niif-group" className="w-full max-w-md">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="grupo1">Grupo 1 - NIIF Plenas</SelectItem>
            <SelectItem value="grupo2">Grupo 2 - NIIF PYMES</SelectItem>
            <SelectItem value="grupo3">Grupo 3 - Contabilidad Simplificada</SelectItem>
            <SelectItem value="r414">Resolución 414 - Régimen Simplificado</SelectItem>
            <SelectItem value="ife">IFE - Informe Financiero Especial (Trimestral)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {niifGroup === 'ife' 
            ? 'IFE es el informe financiero trimestral obligatorio para todas las empresas de servicios públicos'
            : 'Selecciona el grupo NIIF al que pertenece tu empresa según la clasificación SSPD'
          }
        </p>
      </div>

      {/* IFE Year and Trimestre Selection - solo visible cuando se selecciona IFE */}
      {niifGroup === 'ife' && (
        <div className="space-y-4">
          {/* Selector de Año */}
          <div className="space-y-2">
            <Label htmlFor="ife-year" className="text-base font-medium flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Año del reporte
            </Label>
            <Select value={ifeYear} onValueChange={handleYearChange}>
              <SelectTrigger id="ife-year" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IFE_YEARS.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Trimestre */}
          <div className="space-y-2">
            <Label htmlFor="ife-trimestre" className="text-base font-medium">
              Trimestre a reportar
            </Label>
            <Select value={ifeTrimestre} onValueChange={(v) => setIfeTrimestre(v as IFETrimestre)}>
              <SelectTrigger id="ife-trimestre" className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableTrimestres(ifeYear).map((trimestre) => (
                  <SelectItem key={trimestre} value={trimestre}>
                    {trimestre === '1T' && '1er Trimestre (Enero - Marzo)'}
                    {trimestre === '2T' && '2do Trimestre (Abril - Junio)'}
                    {trimestre === '3T' && '3er Trimestre (Julio - Septiembre)'}
                    {trimestre === '4T' && '4to Trimestre (Octubre - Diciembre)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Nota:</strong> El IFE usa el mismo balance consolidado pero con estructura diferente.
              Las cuentas por cobrar se distribuirán automáticamente por rangos de vencimiento 
              (55% no vencidas, 25% 1-90 días, 20% 91-180 días).
            </p>
          </div>
        </div>
      )}

      {/* File Upload Area */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Archivo del Balance General</Label>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-lg p-12 text-center transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
            file && 'border-green-500 bg-green-50 dark:bg-green-950'
          )}
        >
          {file ? (
            <div className="space-y-4">
              <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto" />
              <div>
                <p className="font-medium text-lg">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFile(null)}
              >
                Cambiar archivo
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <p className="font-medium text-lg mb-1">
                  Arrastra tu archivo Excel aquí
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  o haz clic para seleccionar
                </p>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar archivo
                </Button>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                aria-label="Seleccionar archivo Excel"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Procesando archivo...</span>
            <span className="font-medium">60%</span>
          </div>
          <Progress value={60} className="h-2" />
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end pt-4">
        <Button
          size="lg"
          onClick={handleUpload}
          disabled={!file || uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <>Procesando...</>
          ) : (
            <>
              Cargar y Procesar
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
