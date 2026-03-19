'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck, Download, CheckCircle2, XCircle, AlertTriangle, FileDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from '@/lib/safe-toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ValidatorAgentProps { analysisData: any; transformData: any; }

export function ValidatorAgent({ }: ValidatorAgentProps) {
  const [downloaded, setDownloaded] = useState(false);

  const validateMutation = trpc.converter.validate.useMutation({
    onSuccess: (data) => {
      if (data.allPassed) {
        toast.success('Todas las validaciones pasaron');
      } else {
        toast.warning('Algunas validaciones no pasaron');
      }
    },
    onError: (error) => {
      toast.error('Error en validación', { description: error.message });
    },
  });

  const generateMutation = trpc.converter.generateTemplate.useMutation({
    onSuccess: (data) => {
      const byteString = atob(data.base64);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.fileName;
      link.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      toast.success('Plantilla descargada exitosamente');
    },
    onError: (error) => {
      toast.error('Error al generar', { description: error.message });
    },
  });

  const handleValidate = () => {
    validateMutation.mutate();
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  const validation = validateMutation.data;

  const categoryLabel = (cat: string) => {
    if (cat === 'accounting') return 'Contable';
    if (cat === 'completeness') return 'Completitud';
    return 'Consistencia';
  };

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--agent-validator-muted))] text-[hsl(var(--agent-validator))]">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[hsl(var(--agent-validator))]">
            Agente Validador
          </h3>
          <p className="text-sm text-muted-foreground">
            Valida ecuaciones contables, consistencia y genera la plantilla final
          </p>
        </div>
      </div>

      {/* Validate Button */}
      {!validation && (
        <Card className="p-6 border-[hsl(var(--agent-validator))]/30 text-center">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--agent-validator))]" />
          <p className="text-sm text-muted-foreground mb-4">
            Ejecutar validación cruzada de datos transformados
          </p>
          <Button
            onClick={handleValidate}
            disabled={validateMutation.isPending}
            className="bg-[hsl(var(--agent-validator))] hover:bg-[hsl(var(--agent-validator))]/90 text-white"
          >
            {validateMutation.isPending ? 'Validando...' : 'Ejecutar Validación'}
          </Button>
        </Card>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="space-y-4">
          {/* Overall Status */}
          <Card className={cn(
            'p-4 border-2',
            validation.allPassed
              ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20'
              : 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20'
          )}>
            <div className="flex items-center gap-3">
              {validation.allPassed
                ? <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                : <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />}
              <div>
                <p className="font-semibold">
                  {validation.allPassed
                    ? 'Todas las validaciones pasaron'
                    : 'Algunas validaciones requieren atención'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {validation.checks.filter((c: { passed: boolean }) => c.passed).length} de {validation.checks.length} verificaciones exitosas
                </p>
              </div>
            </div>
          </Card>

          {/* Checks List */}
          <Card className="p-4 border-[hsl(var(--agent-validator))]/30">
            <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--agent-validator))]">
              Checklist de Validación
            </h4>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {validation.checks.map((check: any) => (
                <div key={check.id} className={cn(
                  'flex items-start gap-3 p-3 rounded-lg text-sm',
                  check.passed
                    ? 'bg-green-50 dark:bg-green-950/20'
                    : 'bg-red-50 dark:bg-red-950/20'
                )}>
                  {check.passed
                    ? <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{check.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {categoryLabel(check.category)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5">{check.message}</p>
                    {check.expected !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Esperado: ${check.expected?.toLocaleString('es-CO')} | Actual: ${check.actual?.toLocaleString('es-CO')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Download Section */}
          <Card className="p-6 border-[hsl(var(--agent-validator))]/30 text-center">
            <FileDown className="w-10 h-10 mx-auto mb-3 text-[hsl(var(--agent-validator))]" />
            <h4 className="font-semibold mb-1">Generar Plantilla Convertida</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Archivo Excel en formato estándar para importar al generador XBRL
            </p>
            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending || downloaded}
              size="lg"
              className={cn(
                'text-white',
                downloaded
                  ? 'bg-green-600 hover:bg-green-600'
                  : 'bg-[hsl(var(--agent-validator))] hover:bg-[hsl(var(--agent-validator))]/90'
              )}
            >
              {generateMutation.isPending
                ? 'Generando...'
                : downloaded
                  ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Descargado</>
                  : <><Download className="w-4 h-4 mr-2" /> Descargar Plantilla</>}
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}