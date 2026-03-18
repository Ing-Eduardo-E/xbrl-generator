'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Map, ArrowRight, CheckCircle2, XCircle, AlertCircle, BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from '@/lib/safe-toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface MapperAgentProps { analysisData: any; onComplete: (data: any) => void; }

export function MapperAgent({ analysisData, onComplete }: MapperAgentProps) {
  const [taxonomy, setTaxonomy] = useState('r414');

  const mapMutation = trpc.converter.mapAccounts.useMutation({
    onSuccess: (data) => {
      toast.success('Mapeo completado', {
        description: `${data.coverage.coveragePercent}% de cobertura`,
      });
      onComplete(data);
    },
    onError: (error) => {
      toast.error('Error en mapeo', { description: error.message });
    },
  });

  const handleMap = () => {
    mapMutation.mutate({ targetTaxonomy: taxonomy });
  };

  const mapping = mapMutation.data;

  const statusIcon = (status: string) => {
    if (status === 'mapped') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'unmapped') return <XCircle className="w-4 h-4 text-red-400" />;
    return <AlertCircle className="w-4 h-4 text-amber-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--agent-mapper-muted))] text-[hsl(var(--agent-mapper))]">
          <Map className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[hsl(var(--agent-mapper))]">
            Agente Mapeador
          </h3>
          <p className="text-sm text-muted-foreground">
            Mapea cuentas PUC a la estructura de la taxonomía destino
          </p>
        </div>
      </div>

      {/* Taxonomy Selection */}
      {!mapping && (
        <Card className="p-6 border-[hsl(var(--agent-mapper))]/30">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Taxonomía Destino</label>
              <Select value={taxonomy} onValueChange={setTaxonomy}>
                <SelectTrigger className="max-w-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="r414">Resolución 414 - Régimen Simplificado</SelectItem>
                  <SelectItem value="grupo1">Grupo 1 - NIIF Plenas</SelectItem>
                  <SelectItem value="grupo2">Grupo 2 - NIIF PYMES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 rounded-lg bg-[hsl(var(--agent-mapper-muted))]">
              <p className="text-sm">
                <strong>{analysisData?.stats.leafAccounts ?? 0}</strong> cuentas hoja serán mapeadas
                a la plantilla <strong>{taxonomy.toUpperCase()}</strong>
              </p>
            </div>

            <Button
              onClick={handleMap}
              disabled={mapMutation.isPending}
              className="bg-[hsl(var(--agent-mapper))] hover:bg-[hsl(var(--agent-mapper))]/90 text-white"
            >
              {mapMutation.isPending ? 'Mapeando...' : 'Ejecutar Mapeo'}
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Loading */}
      {mapMutation.isPending && (
        <Card className="p-6 text-center">
          <Map className="w-8 h-8 mx-auto text-[hsl(var(--agent-mapper))] animate-pulse" />
          <p className="text-sm text-muted-foreground mt-2">Mapeando cuentas a taxonomía...</p>
        </Card>
      )}

      {/* Mapping Results */}
      {mapping && (
        <div className="space-y-4">
          {/* Coverage Bar */}
          <Card className="p-4 border-[hsl(var(--agent-mapper))]/30">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--agent-mapper))]">
              <BarChart3 className="w-4 h-4" /> Cobertura del Mapeo
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cuentas mapeadas</span>
                <span className="font-bold">{mapping.coverage.coveragePercent}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(var(--agent-mapper))] transition-all duration-500"
                  style={{ width: `${mapping.coverage.coveragePercent}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center mt-2">
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30">
                  <p className="font-bold text-green-700 dark:text-green-400">{mapping.coverage.mapped}</p>
                  <p className="text-muted-foreground">Mapeadas</p>
                </div>
                <div className="p-2 rounded bg-red-50 dark:bg-red-950/30">
                  <p className="font-bold text-red-700 dark:text-red-400">{mapping.coverage.unmapped}</p>
                  <p className="text-muted-foreground">Sin mapeo</p>
                </div>
                <div className="p-2 rounded bg-muted">
                  <p className="font-bold">{mapping.coverage.totalSource}</p>
                  <p className="text-muted-foreground">Total</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Mapping Table */}
          <Card className="p-4 border-[hsl(var(--agent-mapper))]/30">
            <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--agent-mapper))]">
              Detalle del Mapeo
            </h4>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left p-2">Estado</th>
                    <th className="text-left p-2">Cuenta PUC</th>
                    <th className="text-left p-2">Concepto</th>
                    <th className="text-right p-2">Valor</th>
                    <th className="text-left p-2">Destino</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {mapping.entries.map((entry: any, i: number) => (
                    <tr key={i} className={cn(
                      'border-b transition-colors hover:bg-muted/50',
                      entry.status === 'unmapped' && 'bg-red-50/50 dark:bg-red-950/10'
                    )}>
                      <td className="p-2">{statusIcon(entry.status)}</td>
                      <td className="p-2 font-mono text-xs">{entry.sourceCode}</td>
                      <td className="p-2 max-w-[200px] truncate">{entry.sourceName}</td>
                      <td className="p-2 text-right font-mono">
                        {entry.sourceValue.toLocaleString('es-CO')}
                      </td>
                      <td className="p-2 text-xs">
                        {entry.status !== 'unmapped'
                          ? `${entry.targetSheet} → F${entry.targetRow}`
                          : <span className="text-red-400">Sin destino</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}