'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Package,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface GenerateStepProps {
  onBack: () => void;
  onReset: () => void;
}

export function GenerateStep({ onBack, onReset }: GenerateStepProps) {
  const serviceTotalsQuery = trpc.balance.getTotalesServicios.useQuery();

  const handleDownloadExcel = async () => {
    try {
      // TODO: Implement actual download
      toast.success('Excel generado', {
        description: 'El archivo se descargará automáticamente',
      });
    } catch (error) {
      toast.error('Error al generar Excel', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  };

  const handleDownloadXBRL = async () => {
    try {
      // TODO: Implement XBRL generation
      toast.info('Función en desarrollo', {
        description: 'La generación de archivos XBRL estará disponible próximamente',
      });
    } catch (error) {
      toast.error('Error al generar XBRL', {
        description: error instanceof Error ? error.message : 'Error desconocido',
      });
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
            <Button onClick={handleDownloadExcel}>
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </Button>
          </div>
        </Card>

        {/* XBRL Download (Coming Soon) */}
        <Card className="p-6 opacity-60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium">Archivos XBRL (ZIP)</h4>
                <p className="text-sm text-muted-foreground">
                  Paquete con taxonomías XBRL listas para SSPD
                </p>
              </div>
            </div>
            <Button onClick={handleDownloadXBRL} variant="outline" disabled>
              <Download className="w-4 h-4 mr-2" />
              Próximamente
            </Button>
          </div>
          <div className="mt-4 pt-4 border-t">
            <Progress value={60} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Función en desarrollo - 60% completado
            </p>
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
