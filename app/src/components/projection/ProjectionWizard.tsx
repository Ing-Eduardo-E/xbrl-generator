'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import { ProjectionUploadStep } from './ProjectionUploadStep';
import { ProjectionClassifyStep } from './ProjectionClassifyStep';
import { ProjectionConfigStep } from './ProjectionConfigStep';
import { ProjectionResultStep } from './ProjectionResultStep';

import type { ParsedAccount } from '@/lib/services/excelParser';

type ProjectionStep = 'upload' | 'classify' | 'configure' | 'result';

const steps = [
  { id: 'upload', number: 1, title: 'Cargar', subtitle: 'Balance Anual' },
  { id: 'classify', number: 2, title: 'Clasificar', subtitle: 'Cuentas' },
  { id: 'configure', number: 3, title: 'Configurar', subtitle: 'Porcentajes' },
  { id: 'result', number: 4, title: 'Resultado', subtitle: 'Descargar' },
];

export function ProjectionWizard() {
  const [currentStep, setCurrentStep] = useState<ProjectionStep>('upload');
  const [accounts, setAccounts] = useState<ParsedAccount[]>([]);
  const [staticAccounts, setStaticAccounts] = useState<ParsedAccount[]>([]);
  const [dynamicAccounts, setDynamicAccounts] = useState<ParsedAccount[]>([]);
  const [summary, setSummary] = useState<{
    totalStatic: number;
    totalDynamic: number;
    staticPercent: number;
    dynamicPercent: number;
  } | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<Array<{ fileName: string; base64: string; quarter: string }>>([]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center py-6">
      <div className="w-full max-w-5xl">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Proyección Trimestral</h1>
            <p className="text-slate-500 text-sm sm:text-base">Genera balances trimestrales a partir del balance anual</p>
          </div>
          <a href="/" className="text-blue-700 hover:underline text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Volver al Generador XBRL
          </a>
        </header>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, idx) => {
            const isCompleted = steps.findIndex(s => s.id === currentStep) > idx;
            const isActive = steps.findIndex(s => s.id === currentStep) === idx;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={`${
                      isCompleted
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                        : isActive
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-200 animate-pulse'
                        : 'bg-slate-200 text-slate-400'
                    } rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg transition-all duration-200`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : step.number}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-slate-700">{step.title}</span>
                  <span className="text-[10px] text-slate-400">{step.subtitle}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-gradient-to-r from-blue-200 to-indigo-200 rounded" style={{ minWidth: 24 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="w-full max-w-4xl mx-auto">
          {currentStep === 'upload' && (
            <ProjectionUploadStep
              onSuccess={(data) => {
                setAccounts(data.accounts);
                setStaticAccounts(data.staticAccounts);
                setDynamicAccounts(data.dynamicAccounts);
                setSummary(data.summary);
                setCurrentStep('classify');
              }}
            />
          )}
          {currentStep === 'classify' && summary && (
            <ProjectionClassifyStep
              staticAccounts={staticAccounts}
              dynamicAccounts={dynamicAccounts}
              summary={summary}
              onNext={() => setCurrentStep('configure')}
              onBack={() => setCurrentStep('upload')}
            />
          )}
          {currentStep === 'configure' && (
            <ProjectionConfigStep
              accounts={accounts}
              onBack={() => setCurrentStep('classify')}
              onGenerate={(files) => {
                setGeneratedFiles(files);
                setCurrentStep('result');
              }}
            />
          )}
          {currentStep === 'result' && (
            <ProjectionResultStep
              files={generatedFiles}
              onReset={() => {
                setCurrentStep('upload');
                setAccounts([]);
                setStaticAccounts([]);
                setDynamicAccounts([]);
                setSummary(null);
                setGeneratedFiles([]);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}