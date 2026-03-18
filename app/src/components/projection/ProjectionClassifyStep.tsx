'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn, formatCurrency, getAccountClass } from '@/lib/utils';

interface ParsedAccount {
  code: string;
  name: string;
  value: number;
  isLeaf: boolean;
  level: number;
  class: string;
}

interface ProjectionClassifyStepProps {
  staticAccounts: ParsedAccount[];
  dynamicAccounts: ParsedAccount[];
  summary: { totalStatic: number; totalDynamic: number; staticPercent: number; dynamicPercent: number };
  onNext: () => void;
  onBack: () => void;
}

export function ProjectionClassifyStep({ staticAccounts, dynamicAccounts, summary, onNext, onBack }: ProjectionClassifyStepProps) {
  const staticLeaf = staticAccounts.filter(a => a.isLeaf);
  const dynamicLeaf = dynamicAccounts.filter(a => a.isLeaf);
  const totalAccounts = staticAccounts.length + dynamicAccounts.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-slate-700 text-base">Total cuentas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-bold text-blue-700">{totalAccounts}</CardContent>
        </Card>
        <Card className="shadow-sm border-amber-200 border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-700 text-base">Cuentas Estáticas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col">
            <span className="text-xl font-bold text-amber-700">{summary.totalStatic}</span>
            <span className="text-xs text-amber-600">{summary.staticPercent}% del total</span>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-green-200 border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-700 text-base">Cuentas Dinámicas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col">
            <span className="text-xl font-bold text-green-700">{summary.totalDynamic}</span>
            <span className="text-xs text-green-600">{summary.dynamicPercent}% del total</span>
          </CardContent>
        </Card>
      </div>

      {/* Explicación */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-0 shadow-none">
        <CardHeader className="pb-1">
          <CardTitle className="text-blue-800 text-base">¿Cómo se clasifican las cuentas?</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-slate-700 text-sm">
          <ul className="list-disc pl-5 space-y-0.5">
            <li><b>Cuentas Estáticas</b>: Se mantienen igual en cada trimestre (ej: propiedades, inversiones permanentes).</li>
            <li><b>Cuentas Dinámicas</b>: Se proyectan proporcionalmente según el porcentaje configurado (ej: ingresos, gastos, cuentas por cobrar).</li>
          </ul>
        </CardContent>
      </Card>

      {/* Tablas */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Estáticas */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-amber-700 font-semibold text-sm">Cuentas Estáticas ({staticLeaf.length} hojas)</span>
          </div>
          <div className="rounded-lg border border-amber-200 overflow-hidden max-h-96 overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-amber-100">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-amber-800">Código</th>
                  <th className="px-3 py-2 text-left font-bold text-amber-800">Denominación</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-800">Valor</th>
                  <th className="px-3 py-2 text-left font-bold text-amber-800">Clase</th>
                </tr>
              </thead>
              <tbody>
                {staticLeaf.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-amber-500 py-4">Sin cuentas estáticas hoja</td></tr>
                ) : (
                  staticLeaf.map((a, i) => (
                    <tr key={a.code} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50'}>
                      <td className="px-3 py-1.5 font-mono">{a.code}</td>
                      <td className="px-3 py-1.5">{a.name}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(a.value)}</td>
                      <td className="px-3 py-1.5">{getAccountClass(a.code)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        {/* Dinámicas */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-green-700 font-semibold text-sm">Cuentas Dinámicas ({dynamicLeaf.length} hojas)</span>
          </div>
          <div className="rounded-lg border border-green-200 overflow-hidden max-h-96 overflow-y-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-green-800">Código</th>
                  <th className="px-3 py-2 text-left font-bold text-green-800">Denominación</th>
                  <th className="px-3 py-2 text-right font-bold text-green-800">Valor</th>
                  <th className="px-3 py-2 text-left font-bold text-green-800">Clase</th>
                </tr>
              </thead>
              <tbody>
                {dynamicLeaf.length === 0 ? (
                  <tr><td colSpan={4} className="text-center text-green-500 py-4">Sin cuentas dinámicas hoja</td></tr>
                ) : (
                  dynamicLeaf.map((a, i) => (
                    <tr key={a.code} className={i % 2 === 0 ? 'bg-white' : 'bg-green-50'}>
                      <td className="px-3 py-1.5 font-mono">{a.code}</td>
                      <td className="px-3 py-1.5">{a.name}</td>
                      <td className="px-3 py-1.5 text-right">{formatCurrency(a.value)}</td>
                      <td className="px-3 py-1.5">{getAccountClass(a.code)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="flex flex-col sm:flex-row justify-between gap-3 mt-4">
        <Button variant="secondary" onClick={onBack} className="sm:w-auto w-full">
          ← Volver
        </Button>
        <Button className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white sm:w-auto w-full" onClick={onNext}>
          Continuar →
        </Button>
      </div>
    </div>
  );
}