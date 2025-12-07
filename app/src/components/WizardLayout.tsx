'use client';

import { cn } from '@/lib/utils';
import { CheckCircle2, Circle } from 'lucide-react';

export type WizardStep = 'upload' | 'distribute' | 'company-info' | 'generate';

export interface StepConfig {
  id: WizardStep;
  number: number;
  title: string;
  subtitle: string;
  description: string;
}

interface WizardLayoutProps {
  currentStep: WizardStep;
  children: React.ReactNode;
  steps?: StepConfig[];
}

// Pasos por defecto (taxonomías anuales: R414, Grupo1, Grupo2, Grupo3)
const defaultSteps: StepConfig[] = [
  {
    id: 'upload',
    number: 1,
    title: 'Cargar',
    subtitle: 'Balance General',
    description: 'Sube el archivo Excel',
  },
  {
    id: 'distribute',
    number: 2,
    title: 'Distribuir',
    subtitle: 'Por Servicio',
    description: 'Define porcentajes',
  },
  {
    id: 'generate',
    number: 3,
    title: 'Generar',
    subtitle: 'XBRL',
    description: 'Descarga archivos',
  },
];

// Pasos para IFE (incluye información de empresa)
export const ifeSteps: StepConfig[] = [
  {
    id: 'upload',
    number: 1,
    title: 'Cargar',
    subtitle: 'Balance Trimestral',
    description: 'Sube el archivo Excel',
  },
  {
    id: 'distribute',
    number: 2,
    title: 'Distribuir',
    subtitle: 'Por Servicio',
    description: 'Define porcentajes',
  },
  {
    id: 'company-info',
    number: 3,
    title: 'Empresa',
    subtitle: 'Info Adicional',
    description: 'Datos de la entidad',
  },
  {
    id: 'generate',
    number: 4,
    title: 'Generar',
    subtitle: 'IFE XBRL',
    description: 'Descarga archivos',
  },
];

export function WizardLayout({ currentStep, children, steps = defaultSteps }: WizardLayoutProps) {
  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                <svg
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                  Generador XBRL
                </h1>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  SSPD - Servicios Públicos
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-medium">
                v2.0
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Wizard Steps - Desktop */}
      <div className="hidden lg:block border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;
              const isUpcoming = index > currentStepIndex;

              return (
                <div
                  key={step.id}
                  className={cn(
                    'flex items-center',
                    index < steps.length - 1 && 'flex-1'
                  )}
                >
                  {/* Step Content */}
                  <div className="flex flex-col items-center">
                    {/* Step Circle */}
                    <div
                      className={cn(
                        'relative flex items-center justify-center w-16 h-16 rounded-2xl border-2 transition-all duration-300 shadow-lg',
                        isCompleted &&
                          'bg-gradient-to-br from-green-500 to-emerald-600 border-green-400 scale-100',
                        isCurrent &&
                          'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-400 scale-110 shadow-blue-300/50',
                        isUpcoming &&
                          'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 scale-95'
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-8 h-8 text-white" />
                      ) : (
                        <span
                          className={cn(
                            'text-2xl font-bold',
                            isCurrent && 'text-white',
                            isUpcoming && 'text-slate-400 dark:text-slate-600'
                          )}
                        >
                          {step.number}
                        </span>
                      )}

                      {/* Pulse animation for current step */}
                      {isCurrent && (
                        <span className="absolute inset-0 rounded-2xl bg-blue-400 animate-ping opacity-20" />
                      )}
                    </div>

                    {/* Step Info */}
                    <div className="mt-4 text-center min-w-[120px]">
                      <p
                        className={cn(
                          'text-sm font-bold',
                          isCurrent && 'text-blue-600 dark:text-blue-400',
                          isCompleted && 'text-green-600 dark:text-green-400',
                          isUpcoming && 'text-slate-500 dark:text-slate-500'
                        )}
                      >
                        {step.title}
                      </p>
                      <p
                        className={cn(
                          'text-xs font-medium mt-0.5',
                          isCurrent && 'text-blue-500 dark:text-blue-500',
                          isCompleted && 'text-green-500 dark:text-green-500',
                          isUpcoming && 'text-slate-400 dark:text-slate-600'
                        )}
                      >
                        {step.subtitle}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-600 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div className="flex-1 px-4 pb-16">
                      <div
                        className={cn(
                          'h-1 rounded-full transition-all duration-500',
                          isCompleted
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : 'bg-slate-200 dark:bg-slate-700'
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Wizard Steps - Mobile/Tablet */}
      <div className="lg:hidden border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = step.id === currentStep;

              return (
                <div
                  key={step.id}
                  className={cn('flex-1', index < steps.length - 1 && 'mr-2')}
                >
                  <div
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-300',
                      isCompleted &&
                        'bg-gradient-to-r from-green-500 to-emerald-500',
                      isCurrent &&
                        'bg-gradient-to-r from-blue-600 to-indigo-600',
                      !isCompleted && !isCurrent && 'bg-slate-200 dark:bg-slate-700'
                    )}
                  />
                  <p
                    className={cn(
                      'text-xs font-medium mt-2 text-center',
                      isCurrent && 'text-blue-600 dark:text-blue-400',
                      isCompleted && 'text-green-600 dark:text-green-400',
                      !isCompleted && !isCurrent && 'text-slate-400'
                    )}
                  >
                    {step.title}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 lg:p-10">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            <p className="text-center sm:text-left">
              <span className="font-semibold">Generador XBRL v2.0</span>
              {' · '}
              <span>Superintendencia de Servicios Públicos Domiciliarios</span>
            </p>
            <p className="text-center sm:text-right text-slate-500 dark:text-slate-500">
              Desarrollado con Next.js 16 · React 19
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
