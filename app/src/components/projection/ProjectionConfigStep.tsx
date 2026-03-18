"use client";
import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { cn, formatCurrency } from "@/lib/utils";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from '@/lib/safe-toast';

interface ParsedAccount {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

interface PreviewProjection {
  quarter: string;
  label: string;
  percentage: number;
  totals: {
    activos: number;
    pasivos: number;
    patrimonio: number;
    ingresos: number;
    gastos: number;
    costos: number;
  };
  balanceValidation: {
    activos: number;
    pasivos: number;
    patrimonio: number;
    difference: number;
    adjustedAccount: string | null;
    adjustmentAmount: number;
  };
}

interface ProjectionConfigStepProps {
  accounts: ParsedAccount[];
  onBack: () => void;
  onGenerate: (files: Array<{ fileName: string; base64: string; quarter: string }>) => void;
}

const currentYear = new Date().getFullYear();

export function ProjectionConfigStep({ accounts, onBack, onGenerate }: ProjectionConfigStepProps) {
  const [year, setYear] = useState<number>(currentYear);
  const [companyName, setCompanyName] = useState<string>("");
  const [percentages, setPercentages] = useState<{ q1: number; q2: number; q3: number; q4: number }>({
    q1: 15,
    q2: 30,
    q3: 75,
    q4: 100,
  });
  const [previewData, setPreviewData] = useState<PreviewProjection[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);

  const previewMutation = trpc.projection.previewProjection.useMutation();
  const generateMutation = trpc.projection.generateExcels.useMutation();

  // Validaciones
  const percentageErrors = Object.values(percentages).some(
    (v) => isNaN(v) || v < 0 || v > 100
  );
  const q4Warning = percentages.q4 !== 100;

  // Handlers
  const handlePercentageChange = (quarter: keyof typeof percentages, value: string) => {
    let num = parseInt(value, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    setPercentages((prev) => ({ ...prev, [quarter]: num }));
  };

  const handlePreview = async () => {
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const res = await previewMutation.mutateAsync({
        accounts,
        config: { percentages, year },
      });
      setPreviewData(res.projections);
    } catch (e) {
      toast.error("Error al obtener la vista previa de la proyección");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerateLoading(true);
    try {
      const res = await generateMutation.mutateAsync({
        accounts,
        config: { percentages, year },
        companyName: companyName.trim() || undefined,
      });
      toast.success("¡Archivos generados exitosamente!");
      onGenerate(res.files);
    } catch (e) {
      toast.error("Error al generar los archivos Excel");
    } finally {
      setGenerateLoading(false);
    }
  };

  // Años para el selector
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-8">
      {/* Configuración */}
      <Card className="shadow-md dark:bg-slate-900 dark:border-slate-800">
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent text-2xl font-bold">
            Configuración de Proyección
          </CardTitle>
          <CardDescription className="dark:text-slate-400">Define los parámetros para la proyección trimestral.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Año y nombre empresa */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="year">Año</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger id="year" className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="companyName">Nombre de la empresa (opcional)</Label>
                <Input
                  id="companyName"
                  maxLength={200}
                  placeholder="Ej: Empresa de Acueducto S.A."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
            </div>
          </div>

          {/* Porcentajes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="q1">1er Trimestre</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="q1"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={percentages.q1}
                  onChange={(e) => handlePercentageChange("q1", e.target.value)}
                  className="w-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <span className="text-sm font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Las cuentas dinámicas se multiplican por este porcentaje</p>
            </div>
            <div>
              <Label htmlFor="q2">2do Trimestre</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="q2"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={percentages.q2}
                  onChange={(e) => handlePercentageChange("q2", e.target.value)}
                  className="w-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <span className="text-sm font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Las cuentas dinámicas se multiplican por este porcentaje</p>
            </div>
            <div>
              <Label htmlFor="q3">3er Trimestre</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="q3"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={percentages.q3}
                  onChange={(e) => handlePercentageChange("q3", e.target.value)}
                  className="w-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <span className="text-sm font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Las cuentas dinámicas se multiplican por este porcentaje</p>
            </div>
            <div>
              <Label htmlFor="q4">4to Trimestre</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="q4"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={percentages.q4}
                  onChange={(e) => handlePercentageChange("q4", e.target.value)}
                  className="w-24 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
                <span className="text-sm font-medium">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Las cuentas dinámicas se multiplican por este porcentaje</p>
            </div>
          </div>
          {percentageErrors && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2">Todos los porcentajes deben estar entre 0 y 100.</p>
          )}
          {q4Warning && !percentageErrors && (
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mt-2">Q4 generalmente es 100% (balance anual completo)</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between items-center">
          <Button variant="secondary" onClick={onBack} type="button">
            ← Volver
          </Button>
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewLoading || percentageErrors}
            type="button"
          >
            {previewLoading ? "Cargando..." : "Vista Previa"}
          </Button>
          <Button
            className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold"
            onClick={handleGenerate}
            disabled={!previewData || generateLoading}
            type="button"
          >
            {generateLoading ? "Generando..." : "Generar Archivos Excel"}
          </Button>
        </CardFooter>
      </Card>

      {/* Vista previa */}
      {previewData && (
        <Card className="shadow-md dark:bg-slate-900 dark:border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg font-bold dark:text-slate-100">Vista Previa de Proyección</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border dark:border-slate-700 rounded-md">
                <thead>
                  <tr className="bg-gradient-to-r from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/30">
                    <th className="px-2 py-2 font-semibold text-left">Trimestre</th>
                    <th className="px-2 py-2 font-semibold text-left">Porcentaje</th>
                    <th className="px-2 py-2 font-semibold text-left">Activos</th>
                    <th className="px-2 py-2 font-semibold text-left">Pasivos</th>
                    <th className="px-2 py-2 font-semibold text-left">Patrimonio</th>
                    <th className="px-2 py-2 font-semibold text-center">A=P+Pt</th>
                    <th className="px-2 py-2 font-semibold text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((proj, idx) => (
                    <tr key={proj.quarter} className="border-b dark:border-slate-700 last:border-b-0">
                      <td className="px-2 py-1 whitespace-nowrap">{proj.label}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{proj.percentage}%</td>
                      <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(proj.totals.activos)}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(proj.totals.pasivos)}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{formatCurrency(proj.totals.patrimonio)}</td>
                      <td className="px-2 py-1 text-center">
                        {proj.balanceValidation.difference === 0 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 inline" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 inline" />
                        )}
                      </td>
                      <td className="px-2 py-1 text-center">
                        {proj.balanceValidation.difference === 0 ? (
                          <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded text-xs font-medium">Balanceado</span>
                        ) : (
                          <span className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded text-xs font-medium">{formatCurrency(proj.balanceValidation.difference)}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Info de ajuste ER→Patrimonio */}
            {previewData.some((p) => p.balanceValidation.adjustedAccount) && (
              <div className="mt-3 text-xs text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 rounded px-3 py-2">
                <div className="font-semibold mb-1">Ajuste por Estado de Resultados → Patrimonio:</div>
                {previewData.map(
                  (p, i) =>
                    p.balanceValidation.adjustedAccount ? (
                      <div key={i}>
                        {p.label}: Cuenta <span className="font-semibold">{p.balanceValidation.adjustedAccount}</span> ajustada en {formatCurrency(p.balanceValidation.adjustmentAmount)} (Resultado del ejercicio al {p.percentage}%)
                      </div>
                    ) : null
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}