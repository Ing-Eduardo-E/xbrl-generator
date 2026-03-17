'use client';

import { useState } from 'react';
import { WizardLayout, type WizardStep, ifeSteps } from '@/components/WizardLayout';
import { UploadStep } from '@/components/UploadStep';
import { DistributeStep } from '@/components/DistributeStep';
import { GenerateStep } from '@/components/GenerateStep';
import { IFECompanyInfoForm, type IFECompanyData } from '@/components/IFECompanyInfoForm';
import { BatchIFECompanyForm } from '@/components/BatchIFECompanyForm';

type NIIFGroup = 'grupo1' | 'grupo2' | 'grupo3' | 'r414' | 'ife';
type IFETrimestre = '1T' | '2T' | '3T' | '4T';

interface IFEMetadata {
  year: string;
  trimestre: IFETrimestre;
}

// Función para calcular la fecha de reporte según año y trimestre
function calculateReportDate(year: string, trimestre: IFETrimestre): string {
  const lastDayOfQuarter: Record<IFETrimestre, string> = {
    '1T': `${year}-03-31`,
    '2T': `${year}-06-30`,
    '3T': `${year}-09-30`,
    '4T': `${year}-12-31`,
  };
  return lastDayOfQuarter[trimestre];
}

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');
  const [niifGroup, setNiifGroup] = useState<NIIFGroup>('grupo1');
  const [ifeMetadata, setIfeMetadata] = useState<IFEMetadata | null>(null);
  const [ifeCompanyData, setIfeCompanyData] = useState<IFECompanyData | null>(null);
  const [batchMode, setBatchMode] = useState(false);

  // generationMode derivado del estado actual
  type GenerationMode = 'annual' | 'ife-single' | 'ife-batch';
  const generationMode: GenerationMode =
    niifGroup === 'ife' ? (batchMode ? 'ife-batch' : 'ife-single') : 'annual';

  const isIFE = niifGroup === 'ife';

  const handleUploadSuccess = (selectedNiifGroup: NIIFGroup, metadata?: IFEMetadata) => {
    setNiifGroup(selectedNiifGroup);
    if (metadata) {
      setIfeMetadata(metadata);
    }
    setCurrentStep('distribute');
  };

  const handleDistributeSuccess = () => {
    // Para IFE batch o no-IFE: ir directamente a generate
    // Para IFE individual: ir al paso de company-info primero
    if (niifGroup === 'ife' && !batchMode) {
      setCurrentStep('company-info');
    } else {
      setCurrentStep('generate');
    }
  };

  const handleCompanyInfoSubmit = (data: IFECompanyData) => {
    setIfeCompanyData(data);
    setCurrentStep('generate');
  };

  const handleBack = () => {
    if (currentStep === 'distribute') {
      setCurrentStep('upload');
    } else if (currentStep === 'company-info') {
      setCurrentStep('distribute');
    } else if (currentStep === 'generate') {
      // IFE individual: volver a company-info
      // IFE batch y otros: volver a distribute
      if (niifGroup === 'ife' && !batchMode) {
        setCurrentStep('company-info');
      } else {
        setCurrentStep('distribute');
      }
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
    setNiifGroup('grupo1');
    setIfeMetadata(null);
    setIfeCompanyData(null);
    setBatchMode(false);
  };

  return (
    <WizardLayout currentStep={currentStep} steps={isIFE ? ifeSteps : undefined}>
      {currentStep === 'upload' && (
        <UploadStep onSuccess={handleUploadSuccess} onBatchModeChange={setBatchMode} />
      )}
      {currentStep === 'distribute' && (
        <DistributeStep
          onSuccess={handleDistributeSuccess}
          onBack={handleBack}
        />
      )}
      {currentStep === 'company-info' && (
        <IFECompanyInfoForm
          onSubmit={handleCompanyInfoSubmit}
          onBack={handleBack}
          initialData={{
            ...ifeCompanyData,
            // Pasar la fecha de reporte calculada desde el año y trimestre seleccionados
            reportDate: ifeMetadata ? calculateReportDate(ifeMetadata.year, ifeMetadata.trimestre) : '',
          }}
        />
      )}
      {currentStep === 'generate' && generationMode === 'ife-batch' && (
        <BatchIFECompanyForm
          onBack={handleBack}
          onReset={handleReset}
        />
      )}
      {currentStep === 'generate' && generationMode !== 'ife-batch' && (
        <GenerateStep
          onBack={handleBack}
          onReset={handleReset}
          ifeCompanyData={isIFE ? ifeCompanyData : undefined}
          ifeMetadata={isIFE ? ifeMetadata : undefined}
        />
      )}
    </WizardLayout>
  );
}
