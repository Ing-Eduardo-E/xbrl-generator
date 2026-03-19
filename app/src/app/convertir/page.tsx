'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Search, Map, Zap, ShieldCheck, ArrowLeft, ChevronRight
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import Link from 'next/link';
import { AnalyzerAgent } from '@/components/converter/AnalyzerAgent';
import { MapperAgent } from '@/components/converter/MapperAgent';
import { TransformerAgent } from '@/components/converter/TransformerAgent';
import { ValidatorAgent } from '@/components/converter/ValidatorAgent';

type Step = 'analyze' | 'map' | 'transform' | 'validate';

const STEPS: { id: Step; number: number; title: string; icon: typeof Search; colorVar: string }[] = [
  { id: 'analyze', number: 1, title: 'Analizar', icon: Search, colorVar: '--agent-analyzer' },
  { id: 'map', number: 2, title: 'Mapear', icon: Map, colorVar: '--agent-mapper' },
  { id: 'transform', number: 3, title: 'Transformar', icon: Zap, colorVar: '--agent-transformer' },
  { id: 'validate', number: 4, title: 'Validar', icon: ShieldCheck, colorVar: '--agent-validator' },
];

export default function ConvertirPage() {
  const [currentStep, setCurrentStep] = useState<Step>('analyze');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [analysisData, setAnalysisData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [_mappingData, setMappingData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transformData, setTransformData] = useState<any>(null);

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data);
    setCurrentStep('map');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMappingComplete = (data: any) => {
    setMappingData(data);
    setCurrentStep('transform');
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTransformComplete = (data: any) => {
    setTransformData(data);
    setCurrentStep('validate');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                  <svg className="h-6 w-6 sm:h-7 sm:w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Conversor de Plantillas
                  </h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    Excel plano → Plantilla XBRL
                  </p>
                </div>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="gap-1">
                  <ArrowLeft className="w-4 h-4" /> Generador
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Step Indicator */}
      <div className="border-b bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isComplete = index < currentStepIndex;
              const Icon = step.icon;

              return (
                <div key={step.id} className="flex items-center">
                  <button
                    onClick={() => {
                      if (isComplete) setCurrentStep(step.id);
                    }}
                    disabled={!isComplete && !isActive}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300',
                      isActive && 'shadow-md',
                      isComplete && 'cursor-pointer hover:opacity-80',
                      !isComplete && !isActive && 'opacity-40'
                    )}
                    style={isActive || isComplete ? {
                      backgroundColor: `hsl(${isActive ? `var(${step.colorVar}-muted)` : 'var(--muted)'})`,
                      color: `hsl(var(${step.colorVar}))`,
                    } : undefined}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                      isActive ? 'text-white' : isComplete ? 'text-white' : 'bg-muted text-muted-foreground'
                    )}
                      style={(isActive || isComplete) ? {
                        backgroundColor: `hsl(var(${step.colorVar}))`,
                      } : undefined}
                    >
                      {isComplete ? '✓' : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-semibold">{step.title}</p>
                      <p className="text-[10px] opacity-70">Agente {step.number}</p>
                    </div>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className={cn(
                      'w-4 h-4 mx-1 sm:mx-2',
                      index < currentStepIndex ? 'text-green-500' : 'text-muted-foreground/30'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 sm:p-8">
            {currentStep === 'analyze' && (
              <AnalyzerAgent onComplete={handleAnalysisComplete} />
            )}
            {currentStep === 'map' && (
              <MapperAgent
                analysisData={analysisData}
                onComplete={handleMappingComplete}
              />
            )}
            {currentStep === 'transform' && (
              <TransformerAgent
                analysisData={analysisData}
                onComplete={handleTransformComplete}
              />
            )}
            {currentStep === 'validate' && (
              <ValidatorAgent
                analysisData={analysisData}
                transformData={transformData}
              />
            )}
          </Card>

          {/* Navigation */}
          {currentStepIndex > 0 && (
            <div className="mt-4 flex justify-start">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(STEPS[currentStepIndex - 1]!.id)}
                className="gap-1"
              >
                <ArrowLeft className="w-4 h-4" /> Paso Anterior
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}