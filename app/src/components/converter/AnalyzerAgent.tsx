'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Search, FileSpreadsheet, CheckCircle2, AlertTriangle,
  TrendingUp, Layers, Hash, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from '@/lib/safe-toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AnalyzerAgentProps { onComplete: (data: any) => void; }

export function AnalyzerAgent({ onComplete }: AnalyzerAgentProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const analyzeMutation = trpc.converter.analyze.useMutation({
    onSuccess: (data) => {
      toast.success('Análisis completado', {
        description: `${data.stats.totalAccounts} cuentas detectadas en "${data.format.sheetName}"`,
      });
      onComplete(data);
    },
    onError: (error) => {
      toast.error('Error en análisis', { description: error.message });
    },
  });

  const handleFileChange = useCallback((selectedFile: File | null) => {
    if (!selectedFile) return;
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Tipo de archivo inválido', { description: 'Se requiere archivo Excel (.xlsx o .xls)' });
      return;
    }
    setFile(selectedFile);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => setIsDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileChange(f);
  }, [handleFileChange]);

  const handleAnalyze = async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(',')[1];
      if (base64) {
        await analyzeMutation.mutateAsync({ fileName: file.name, fileData: base64 });
      }
    };
    reader.readAsDataURL(file);
  };

  const analysis = analyzeMutation.data;

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--agent-analyzer-muted))] text-[hsl(var(--agent-analyzer))]">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[hsl(var(--agent-analyzer))]">
            Agente Analizador
          </h3>
          <p className="text-sm text-muted-foreground">
            Detecta formato, parsea jerarquía PUC y valida datos
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      {!analysis && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300',
            isDragging
              ? 'border-[hsl(var(--agent-analyzer))] bg-[hsl(var(--agent-analyzer-muted))]'
              : 'border-muted-foreground/25 hover:border-[hsl(var(--agent-analyzer))]/50',
            file && 'border-green-500 bg-green-50 dark:bg-green-950/30'
          )}
        >
          {file ? (
            <div className="space-y-3">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400 mx-auto" />
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={() => setFile(null)}>Cambiar</Button>
                <Button
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="bg-[hsl(var(--agent-analyzer))] hover:bg-[hsl(var(--agent-analyzer))]/90 text-white"
                >
                  {analyzeMutation.isPending ? 'Analizando...' : 'Analizar'}
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <FileSpreadsheet className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-medium">Arrastra tu archivo Excel aquí</p>
              <p className="text-sm text-muted-foreground">Formato: CODIGO, NOMBRE, SALDO</p>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>Seleccionar archivo</span>
                </Button>
                <input type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {analyzeMutation.isPending && (
        <Card className="p-6 text-center">
          <div className="animate-pulse space-y-2">
            <Search className="w-8 h-8 mx-auto text-[hsl(var(--agent-analyzer))] animate-bounce" />
            <p className="text-sm text-muted-foreground">Analizando estructura del archivo...</p>
          </div>
        </Card>
      )}

      {/* Results Dashboard */}
      {analysis && (
        <div className="space-y-4">
          {/* Format Detection */}
          <Card className="p-4 border-[hsl(var(--agent-analyzer))]/30">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--agent-analyzer))]">
              <FileSpreadsheet className="w-4 h-4" /> Formato Detectado
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Hoja:</span> <strong>{analysis.format.sheetName}</strong></div>
              <div><span className="text-muted-foreground">Código:</span> <strong>{analysis.format.codeColumn}</strong></div>
              <div><span className="text-muted-foreground">Nombre:</span> <strong>{analysis.format.nameColumn}</strong></div>
              <div><span className="text-muted-foreground">Valor:</span> <strong>{analysis.format.valueColumn}</strong></div>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <Hash className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{analysis.stats.totalAccounts}</p>
              <p className="text-xs text-muted-foreground">Total Cuentas</p>
            </Card>
            <Card className="p-4 text-center">
              <Layers className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{analysis.stats.leafAccounts}</p>
              <p className="text-xs text-muted-foreground">Cuentas Hoja</p>
            </Card>
            <Card className="p-4 text-center">
              <TrendingUp className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{analysis.stats.parentAccounts}</p>
              <p className="text-xs text-muted-foreground">Cuentas Padre</p>
            </Card>
            <Card className="p-4 text-center">
              <Layers className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{analysis.stats.maxDepth}</p>
              <p className="text-xs text-muted-foreground">Profundidad Máx</p>
            </Card>
          </div>

          {/* Classes Breakdown */}
          <Card className="p-4 border-[hsl(var(--agent-analyzer))]/30">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--agent-analyzer))]">
              <Layers className="w-4 h-4" /> Clases Contables
            </h4>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {analysis.stats.classes.map((cls: any) => (
                <div key={cls.code} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-[hsl(var(--agent-analyzer))]">
                      {cls.code}
                    </span>
                    {cls.name}
                    <span className="text-xs text-muted-foreground">({cls.count} hojas)</span>
                  </span>
                  <span className="font-mono font-medium">
                    ${cls.total < 0 ? '-' : ''}${Math.abs(cls.total).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Validation */}
          <Card className="p-4 border-[hsl(var(--agent-analyzer))]/30">
            <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--agent-analyzer))]">
              Validación Contable
            </h4>
            <div className="space-y-2">
              <div className={cn('flex items-center gap-2 text-sm p-2 rounded-lg',
                analysis.validation.ecuacionPatrimonial.isValid
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
              )}>
                {analysis.validation.ecuacionPatrimonial.isValid
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <AlertTriangle className="w-4 h-4" />}
                <span>Ecuación Patrimonial: Activos = Pasivos + Patrimonio</span>
              </div>
              <div className={cn('flex items-center gap-2 text-sm p-2 rounded-lg',
                analysis.validation.ecuacionResultados.isValid
                  ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
                  : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
              )}>
                {analysis.validation.ecuacionResultados.isValid
                  ? <CheckCircle2 className="w-4 h-4" />
                  : <AlertTriangle className="w-4 h-4" />}
                <span>Ecuación de Resultados</span>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}