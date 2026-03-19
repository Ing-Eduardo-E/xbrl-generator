'use client';


import React, { useState } from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { ProjectionUploadStep } from './ProjectionUploadStep';
import { ProjectionClassifyStep } from './ProjectionClassifyStep';
import { ProjectionConfigStep } from './ProjectionConfigStep';
import { ProjectionResultStep } from './ProjectionResultStep';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20 flex flex-col items-center py-6">
      <div className="w-full max-w-5xl">
        {/* HEADER sticky */}
        <div className="sticky top-0 z-40 w-full mb-6">
          <div className="flex items-center justify-between px-2 py-3 sm:px-4 backdrop-blur bg-white/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 shadow-sm">
            <Link href="/" className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-semibold hover:underline">
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">Generador XBRL</span>
            </Link>
            <ThemeToggle />
          </div>
        </div>
        {/* Título y subtítulo */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">Proyección Trimestral</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base">Genera balances trimestrales a partir del balance anual</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((step, idx) => {
            const isCompleted = steps.findIndex(s => s.id === currentStep) > idx;
            const isActive = steps.findIndex(s => s.id === currentStep) === idx;
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg transition-all duration-200 border-2',
                      isCompleted
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-blue-600 dark:from-blue-700 dark:to-indigo-700 dark:border-blue-700'
                        : isActive
                        ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white ring-4 ring-blue-200 dark:from-blue-700 dark:to-indigo-700 dark:ring-blue-900/40 dark:text-white border-blue-400 dark:border-blue-500 animate-pulse'
                        : 'bg-slate-200 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : step.number}
                  </div>
                  <span className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">{step.title}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{step.subtitle}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div className="flex-1 h-1 mx-2 bg-gradient-to-r from-blue-200 to-indigo-200 dark:from-blue-900/40 dark:to-indigo-900/30 rounded" style={{ minWidth: 24 }} />
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