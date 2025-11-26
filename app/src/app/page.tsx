'use client';

import { useState } from 'react';
import { WizardLayout, type WizardStep } from '@/components/WizardLayout';
import { UploadStep } from '@/components/UploadStep';
import { DistributeStep } from '@/components/DistributeStep';
import { GenerateStep } from '@/components/GenerateStep';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<WizardStep>('upload');

  const handleUploadSuccess = () => {
    setCurrentStep('distribute');
  };

  const handleDistributeSuccess = () => {
    setCurrentStep('generate');
  };

  const handleBack = () => {
    if (currentStep === 'distribute') {
      setCurrentStep('upload');
    } else if (currentStep === 'generate') {
      setCurrentStep('distribute');
    }
  };

  const handleReset = () => {
    setCurrentStep('upload');
  };

  return (
    <WizardLayout currentStep={currentStep}>
      {currentStep === 'upload' && (
        <UploadStep onSuccess={handleUploadSuccess} />
      )}
      {currentStep === 'distribute' && (
        <DistributeStep onSuccess={handleDistributeSuccess} onBack={handleBack} />
      )}
      {currentStep === 'generate' && (
        <GenerateStep onBack={handleBack} onReset={handleReset} />
      )}
    </WizardLayout>
  );
}
