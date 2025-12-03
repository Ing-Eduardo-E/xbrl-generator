'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UsuariosEstratoForm, UsuariosEstratoData } from './UsuariosEstratoForm';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Droplets, Waves, Trash2 } from 'lucide-react';
import { cn, formatCurrency, validateDistribution } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface DistributeStepProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function DistributeStep({ onSuccess, onBack }: DistributeStepProps) {
  const [acueducto, setAcueducto] = useState<number>(40);
  const [alcantarillado, setAlcantarillado] = useState<number>(35);
  const [aseo, setAseo] = useState<number>(25);

  // Estado para usuarios por estrato y servicio
  const [usuariosEstrato, setUsuariosEstrato] = useState<UsuariosEstratoData | null>(null);

  // Estado para subsidios por servicio
  const [subsidioAcueducto, setSubsidioAcueducto] = useState<number>(0);
  const [subsidioAlcantarillado, setSubsidioAlcantarillado] = useState<number>(0);
  const [subsidioAseo, setSubsidioAseo] = useState<number>(0);

  const totalsQuery = trpc.balance.getTotals.useQuery();
  const distributeMutation = trpc.balance.distributeBalance.useMutation({
    onSuccess: () => {
      toast.success('Balance distribuido exitosamente');
      onSuccess();
    },
    onError: (error) => {
      toast.error('Error al distribuir el balance', {
        description: error.message,
      });
    },
  });

  const validation = validateDistribution(acueducto, alcantarillado, aseo);

  const handleDistribute = async () => {
    if (!validation.isValid) {
      toast.error('Distribución inválida', {
        description: validation.message,
      });
      return;
    }

    // Validar que usuarios por estrato estén definidos
    if (!usuariosEstrato) {
      toast.error('Debes ingresar el número de usuarios por estrato y servicio.');
      return;
    }

      // Log para debug
      console.log('📤 Enviando datos al servidor:');
      console.log('  - Distribución:', { acueducto, alcantarillado, aseo });
      console.log('  - Usuarios por estrato:', JSON.stringify(usuariosEstrato, null, 2));
      console.log('  - Subsidios:', { acueducto: subsidioAcueducto, alcantarillado: subsidioAlcantarillado, aseo: subsidioAseo });
      
    await distributeMutation.mutateAsync({
      acueducto,
      alcantarillado,
      aseo,
      usuariosEstrato,
      subsidios: {
        acueducto: subsidioAcueducto,
        alcantarillado: subsidioAlcantarillado,
        aseo: subsidioAseo,
      },
    });
  };

  const handlePreset = (preset: 'equal' | 'water-heavy' | 'custom') => {
    switch (preset) {
      case 'equal':
        setAcueducto(33.33);
        setAlcantarillado(33.33);
        setAseo(33.34);
        break;
      case 'water-heavy':
        setAcueducto(50);
        setAlcantarillado(30);
        setAseo(20);
        break;
    }
  };

  return (
    <div className="space-y-8">
      {/* Balance Summary */}
      {totalsQuery.data && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Resumen del Balance Cargado</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Activos</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalsQuery.data.activos)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pasivos</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(totalsQuery.data.pasivos)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Patrimonio</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalsQuery.data.patrimonio)}
              </p>
            </div>
          </div>

          {/* Accounting Equation Validation */}
          <div className="mt-4 pt-4 border-t">
            {totalsQuery.data.isValid ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Ecuación contable válida: Activos = Pasivos + Patrimonio
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm font-medium">
                  Advertencia: La ecuación contable no cuadra. Diferencia:{' '}
                  {formatCurrency(totalsQuery.data.difference || 0)}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Instructions */}
      <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">
              Distribución de Cuentas por Servicio
            </p>
            <p className="text-blue-800 dark:text-blue-200">
              Define el porcentaje de distribución para cada servicio público. La suma
              debe ser exactamente 100%. Estos porcentajes se aplicarán de forma
              proporcional a todas las cuentas del balance.
            </p>
          </div>
        </div>
      </Card>

      {/* Preset Buttons */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Plantillas de distribución</Label>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handlePreset('equal')} size="sm">
            Equitativo (33/33/34)
          </Button>
          <Button
            variant="outline"
            onClick={() => handlePreset('water-heavy')}
            size="sm"
          >
            Mayor Acueducto (50/30/20)
          </Button>
        </div>
      </div>

      {/* Distribution Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Acueducto */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <Label htmlFor="acueducto" className="text-base font-medium">
                  Acueducto
                </Label>
                <p className="text-xs text-muted-foreground">Suministro de agua</p>
              </div>
            </div>
            <div className="relative">
              <Input
                id="acueducto"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={acueducto}
                onChange={(e) => setAcueducto(parseFloat(e.target.value) || 0)}
                className="text-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </Card>

        {/* Alcantarillado */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Waves className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <Label htmlFor="alcantarillado" className="text-base font-medium">
                  Alcantarillado
                </Label>
                <p className="text-xs text-muted-foreground">Recolección de aguas</p>
              </div>
            </div>
            <div className="relative">
              <Input
                id="alcantarillado"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={alcantarillado}
                onChange={(e) => setAlcantarillado(parseFloat(e.target.value) || 0)}
                className="text-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </Card>

        {/* Aseo */}
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Trash2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <Label htmlFor="aseo" className="text-base font-medium">
                  Aseo
                </Label>
                <p className="text-xs text-muted-foreground">Recolección de basuras</p>
              </div>
            </div>
            <div className="relative">
              <Input
                id="aseo"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={aseo}
                onChange={(e) => setAseo(parseFloat(e.target.value) || 0)}
                className="text-lg pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                %
              </span>
            </div>
          </div>
        </Card>
      </div>


      {/* Validation Summary */}
      <Card
        className={cn(
          'p-6',
          validation.isValid
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
        )}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total de distribución</span>
            <span
              className={cn(
                'text-2xl font-bold',
                validation.isValid ? 'text-green-600' : 'text-red-600'
              )}
            >
              {validation.total.toFixed(2)}%
            </span>
          </div>
          <Progress
            value={Math.min(validation.total, 100)}
            className={cn(
              'h-2',
              validation.isValid ? 'bg-green-200' : 'bg-red-200'
            )}
          />
          {!validation.isValid && (
            <p className="text-sm text-red-700 dark:text-red-300">
              {validation.message}
            </p>
          )}
        </div>
      </Card>

      {/* Usuarios por Estrato y Servicio */}
      <UsuariosEstratoForm
        initialValue={usuariosEstrato ?? undefined}
        onSubmit={setUsuariosEstrato}
      />

      {/* Subsidios por Servicio */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-semibold mb-4">Subsidios Recibidos por Servicio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <Label htmlFor="subsidio-acueducto">Acueducto</Label>
            <Input
              id="subsidio-acueducto"
              type="number"
              min="0"
              value={subsidioAcueducto}
              onChange={(e) => setSubsidioAcueducto(Number(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="subsidio-alcantarillado">Alcantarillado</Label>
            <Input
              id="subsidio-alcantarillado"
              type="number"
              min="0"
              value={subsidioAlcantarillado}
              onChange={(e) => setSubsidioAlcantarillado(Number(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="subsidio-aseo">Aseo</Label>
            <Input
              id="subsidio-aseo"
              type="number"
              min="0"
              value={subsidioAseo}
              onChange={(e) => setSubsidioAseo(Number(e.target.value) || 0)}
              className="mt-2"
            />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={distributeMutation.isPending}>
          Volver
        </Button>
        <Button
          size="lg"
          onClick={handleDistribute}
          disabled={!validation.isValid || distributeMutation.isPending}
        >
          {distributeMutation.isPending ? (
            <>Distribuyendo...</>
          ) : (
            <>
              Distribuir Balance
              <CheckCircle2 className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
