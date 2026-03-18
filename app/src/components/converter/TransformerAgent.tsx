'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Zap, ArrowRight, Percent, ArrowLeftRight
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from '@/lib/safe-toast';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TransformerAgentProps { analysisData: any; onComplete: (data: any) => void; }

export function TransformerAgent({ analysisData, onComplete }: TransformerAgentProps) {
  const [percentages, setPercentages] = useState({
    acueducto: 55,
    alcantarillado: 25,
    aseo: 20,
  });

  const transformMutation = trpc.converter.transform.useMutation({
    onSuccess: (data) => {
      toast.success('Transformación completada', {
        description: `Datos distribuidos en ${data.totals.length} servicios`,
      });
      onComplete(data);
    },
    onError: (error) => {
      toast.error('Error en transformación', { description: error.message });
    },
  });

  const totalPercent = percentages.acueducto + percentages.alcantarillado + percentages.aseo;
  const isValid = Math.abs(totalPercent - 100) < 0.01;

  const handleTransform = () => {
    if (!isValid) {
      toast.error('Los porcentajes deben sumar 100%');
      return;
    }
    transformMutation.mutate(percentages);
  };

  const transform = transformMutation.data;

  const formatCurrency = (v: number) =>
    `$${v < 0 ? '-' : ''}${Math.abs(v).toLocaleString('es-CO')}`;

  return (
    <div className="space-y-6">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--agent-transformer-muted))] text-[hsl(var(--agent-transformer))]">
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[hsl(var(--agent-transformer))]">
            Agente Transformador
          </h3>
          <p className="text-sm text-muted-foreground">
            Distribuye cuentas por servicio y genera estructura de plantilla
          </p>
        </div>
      </div>

      {/* Distribution Percentages */}
      {!transform && (
        <Card className="p-6 border-[hsl(var(--agent-transformer))]/30">
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2 text-[hsl(var(--agent-transformer))]">
            <Percent className="w-4 h-4" /> Distribución por Servicio
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {(['acueducto', 'alcantarillado', 'aseo'] as const).map((service) => (
              <div key={service} className="space-y-2">
                <Label className="capitalize">{service}</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={percentages[service]}
                    onChange={(e) => setPercentages(prev => ({
                      ...prev,
                      [service]: parseFloat(e.target.value) || 0,
                    }))}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                </div>
              </div>
            ))}
          </div>

          <div className={`p-3 rounded-lg text-sm ${isValid
            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
          }`}>
            Total: <strong>{totalPercent.toFixed(1)}%</strong>
            {isValid ? ' ✓' : ' (debe ser 100%)'}
          </div>

          <Button
            onClick={handleTransform}
            disabled={!isValid || transformMutation.isPending}
            className="mt-4 bg-[hsl(var(--agent-transformer))] hover:bg-[hsl(var(--agent-transformer))]/90 text-white"
          >
            {transformMutation.isPending ? 'Transformando...' : 'Transformar Datos'}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      )}

      {/* Loading */}
      {transformMutation.isPending && (
        <Card className="p-6 text-center">
          <Zap className="w-8 h-8 mx-auto text-[hsl(var(--agent-transformer))] animate-pulse" />
          <p className="text-sm text-muted-foreground mt-2">Distribuyendo cuentas por servicio...</p>
        </Card>
      )}

      {/* Transform Results */}
      {transform && (
        <div className="space-y-4">
          {/* Service Totals */}
          <Card className="p-4 border-[hsl(var(--agent-transformer))]/30">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[hsl(var(--agent-transformer))]">
              <ArrowLeftRight className="w-4 h-4" /> Totales por Servicio
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Servicio</th>
                    <th className="text-right p-2">Activos</th>
                    <th className="text-right p-2">Pasivos</th>
                    <th className="text-right p-2">Patrimonio</th>
                    <th className="text-right p-2">Ingresos</th>
                    <th className="text-right p-2">Gastos</th>
                    <th className="text-right p-2">Costos</th>
                  </tr>
                </thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {transform.totals.map((t: any) => (
                    <tr key={t.service} className="border-b hover:bg-muted/50">
                      <td className="p-2 capitalize font-medium">{t.service}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(t.activos)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(t.pasivos)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(t.patrimonio)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(t.ingresos)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(t.gastos)}</td>
                      <td className="p-2 text-right font-mono">{formatCurrency(t.costos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Template Data Preview */}
          <Card className="p-4 border-[hsl(var(--agent-transformer))]/30">
            <h4 className="text-sm font-semibold mb-3 text-[hsl(var(--agent-transformer))]">
              Vista Previa de Plantilla
            </h4>
            <div className="space-y-3">
              {Object.entries(transform.templateData).map(([sheet, rows]) => (
                <div key={sheet}>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">{sheet}</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
                    {Object.entries(rows as Record<number, number>)
                      .filter(([, val]) => val !== 0)
                      .slice(0, 12)
                      .map(([row, val]) => (
                        <div key={row} className="text-xs p-1.5 rounded bg-muted">
                          <span className="text-muted-foreground">F{row}:</span>{' '}
                          <span className="font-mono">{formatCurrency(val as number)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}