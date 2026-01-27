import { useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CampaignFormData, initialFormData } from "./types";
import { BusinessDetailsStep } from "./steps/BusinessDetailsStep";
import { DataUploadMethodStep } from "./steps/DataUploadMethodStep";
import { CSVUploadStep } from "./steps/CSVUploadStep";
import { BuildFromScratchStep } from "./steps/BuildFromScratchStep";
import { TemplateSelectionStep } from "./steps/TemplateSelectionStep";
import { TemplateEditorStep } from "./steps/TemplateEditorStep";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: CampaignFormData) => void;
}

const STEP_TITLES = [
  "Business Details",
  "Data Upload",
  "Data Upload",
  "Template Selection",
  "Customize Template",
];

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onComplete,
}: CreateCampaignDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);

  const totalSteps = 5;

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const getStepTitle = () => {
    if (currentStep === 3) {
      if (formData.dataUploadMethod === "csv") {
        return formData.csvFile ? "Column Mapping" : "Data Upload";
      }
      return "Data Upload";
    }
    return STEP_TITLES[currentStep - 1];
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.businessName && formData.businessType;
      case 2:
        return formData.dataUploadMethod !== null;
      case 3:
        if (formData.dataUploadMethod === "csv") {
          return Object.keys(formData.columnMappings).length > 0;
        }
        return Object.values(formData.scratchData).some((arr) => arr.length > 0);
      case 4:
        return formData.selectedTemplate !== "";
      case 5:
        return true; // Template editor is optional customization
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      onComplete(formData);
      handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setFormData(initialFormData);
    onOpenChange(false);
  };

  const handleFinishCampaign = () => {
    onComplete(formData);
    handleClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessDetailsStep formData={formData} updateFormData={updateFormData} />
        );
      case 2:
        return (
          <DataUploadMethodStep formData={formData} updateFormData={updateFormData} />
        );
      case 3:
        if (formData.dataUploadMethod === "csv") {
          return <CSVUploadStep formData={formData} updateFormData={updateFormData} />;
        }
        return (
          <BuildFromScratchStep formData={formData} updateFormData={updateFormData} />
        );
      case 4:
        return (
          <TemplateSelectionStep formData={formData} updateFormData={updateFormData} />
        );
      case 5:
        return (
          <TemplateEditorStep 
            formData={formData} 
            updateFormData={updateFormData} 
            onBack={() => setCurrentStep(4)}
            onFinish={handleFinishCampaign}
          />
        );
      default:
        return null;
    }
  };

  // Step 5 renders as full-screen portal to escape layout DOM
  if (open && currentStep === 5) {
    return createPortal(
      <div className="fixed inset-0 z-[100] bg-background flex flex-col h-screen overflow-hidden">
        {renderStep()}
      </div>,
      document.body
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with Progress */}
        <div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium">{getStepTitle()}</span>
          </div>
          <Progress value={(currentStep / totalSteps) * 100} className="h-1.5" />
        </div>

        {/* Step Content */}
        <div className="px-6 py-8 overflow-x-hidden">{renderStep()}</div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="min-w-[100px]"
            >
              Back
            </Button>
            <span className="text-sm text-muted-foreground">
              Your progress is saved automatically.
            </span>
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="min-w-[100px]"
            >
              {currentStep === totalSteps ? "Finish" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
