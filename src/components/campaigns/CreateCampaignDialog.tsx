import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CampaignFormData, initialFormData } from "./types";
import { BusinessDetailsStep } from "./steps/BusinessDetailsStep";
import { DataUploadMethodStep } from "./steps/DataUploadMethodStep";
import { CSVUploadStep } from "./steps/CSVUploadStep";
import { DatasetApprovalStep } from "./steps/DatasetApprovalStep";
import { BuildFromScratchStep } from "./steps/BuildFromScratchStep";
import { TemplateSelectionStep } from "./steps/TemplateSelectionStep";
import { TemplateEditorStep } from "./steps/TemplateEditorStep";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Loader2 } from "lucide-react";

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: CampaignFormData) => void;
  existingCampaignId?: string | null;
}

// Step titles for scratch path (6 steps) vs CSV path (5 steps)
const STEP_TITLES_SCRATCH = [
  "Business Details",
  "Data Upload Method",
  "Dataset Approval",
  "Build Your Datasets",
  "Template Selection",
  "Customize Template",
];

const STEP_TITLES_CSV = [
  "Business Details",
  "Data Upload Method",
  "CSV Upload",
  "Template Selection",
  "Customize Template",
];

export function CreateCampaignDialog({
  open,
  onOpenChange,
  onComplete,
  existingCampaignId,
}: CreateCampaignDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { saveDraftCampaign, finalizeCampaign, fetchCampaignById } = useCampaigns();
  
  // Debounce timer ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>("");

  // Dynamic total steps based on data upload method
  const totalSteps = formData.dataUploadMethod === "scratch" ? 6 : 5;
  const stepTitles = formData.dataUploadMethod === "scratch" ? STEP_TITLES_SCRATCH : STEP_TITLES_CSV;

  // Load existing draft if resuming
  useEffect(() => {
    const loadDraft = async () => {
      if (open && existingCampaignId) {
        setIsLoading(true);
        const campaign = await fetchCampaignById(existingCampaignId);
        if (campaign) {
          setCampaignId(campaign.id);
          setCurrentStep(campaign.wizard_step || 1);
          
          // Restore form data from wizard_state
          const wizardState = campaign.wizard_state as CampaignFormData;
          if (wizardState && typeof wizardState === 'object') {
            setFormData({
              ...initialFormData,
              ...wizardState,
              // Ensure these aren't null
              businessLogo: null,
              csvFile: null,
            });
          }
        }
        setIsLoading(false);
      } else if (open && !existingCampaignId) {
        // Reset for new campaign
        setCampaignId(null);
        setCurrentStep(1);
        setFormData(initialFormData);
      }
    };
    
    loadDraft();
  }, [open, existingCampaignId]);

  // Debounced auto-save
  const debouncedSave = useCallback(async (data: CampaignFormData, step: number, id: string | null) => {
    // Create a signature of current state
    const signature = JSON.stringify({ data, step, id });
    if (signature === lastSavedRef.current) return;
    
    setIsSaving(true);
    const savedId = await saveDraftCampaign(data, step, id || undefined);
    if (savedId && !id) {
      setCampaignId(savedId);
    }
    lastSavedRef.current = signature;
    setIsSaving(false);
  }, [saveDraftCampaign]);

  // Auto-save on step change or form data change
  useEffect(() => {
    if (!open) return;
    // Only save if we have at least some data
    if (!formData.businessName && currentStep === 1) return;
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Debounce save by 1 second
    saveTimeoutRef.current = setTimeout(() => {
      debouncedSave(formData, currentStep, campaignId);
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [open, currentStep, formData, campaignId, debouncedSave]);

  const updateFormData = (updates: Partial<CampaignFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const getStepTitle = () => {
    return stepTitles[currentStep - 1] || "Campaign";
  };

  const canProceed = () => {
    if (formData.dataUploadMethod === "scratch") {
      // 6-step flow for scratch
      switch (currentStep) {
        case 1:
          return formData.businessName && formData.businessType;
        case 2:
          return formData.dataUploadMethod !== null;
        case 3:
          // Dataset approval - must have at least one dataset
          return formData.dynamicColumns.length > 0;
        case 4:
          // Dataset data entry - must have some data
          return Object.values(formData.scratchData).some((arr) => arr.length > 0);
        case 5:
          return formData.selectedTemplate !== "";
        case 6:
          return true; // Template editor is optional
        default:
          return true;
      }
    } else {
      // 5-step flow for CSV
      switch (currentStep) {
        case 1:
          return formData.businessName && formData.businessType;
        case 2:
          return formData.dataUploadMethod !== null;
        case 3:
          return Object.keys(formData.columnMappings).length > 0;
        case 4:
          return formData.selectedTemplate !== "";
        case 5:
          return true; // Template editor is optional
        default:
          return true;
      }
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      // Save before moving to next step
      const nextStep = currentStep + 1;
      await debouncedSave(formData, nextStep, campaignId);
      setCurrentStep(nextStep);
    } else {
      handleFinishCampaign();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleClose = () => {
    // Clear timeout on close
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    lastSavedRef.current = "";
    setCurrentStep(1);
    setFormData(initialFormData);
    setCampaignId(null);
    onOpenChange(false);
  };

  const handleFinishCampaign = async () => {
    if (campaignId) {
      // Finalize the existing draft
      await finalizeCampaign(campaignId, formData);
    } else {
      // Create new campaign directly (fallback)
      onComplete(formData);
    }
    handleClose();
  };

  const renderStep = () => {
    if (formData.dataUploadMethod === "scratch") {
      // 6-step flow for scratch
      switch (currentStep) {
        case 1:
          return <BusinessDetailsStep formData={formData} updateFormData={updateFormData} />;
        case 2:
          return <DataUploadMethodStep formData={formData} updateFormData={updateFormData} />;
        case 3:
          return <DatasetApprovalStep formData={formData} updateFormData={updateFormData} />;
        case 4:
          return <BuildFromScratchStep formData={formData} updateFormData={updateFormData} />;
        case 5:
          return <TemplateSelectionStep formData={formData} updateFormData={updateFormData} />;
        case 6:
          return (
            <TemplateEditorStep 
              formData={formData} 
              updateFormData={updateFormData} 
              onBack={() => setCurrentStep(5)}
              onFinish={handleFinishCampaign}
            />
          );
        default:
          return null;
      }
    } else {
      // 5-step flow for CSV (or before method is selected)
      switch (currentStep) {
        case 1:
          return <BusinessDetailsStep formData={formData} updateFormData={updateFormData} />;
        case 2:
          return <DataUploadMethodStep formData={formData} updateFormData={updateFormData} />;
        case 3:
          if (formData.dataUploadMethod === "csv") {
            return <CSVUploadStep formData={formData} updateFormData={updateFormData} />;
          }
          // Before method is selected, show data upload method step
          return <DataUploadMethodStep formData={formData} updateFormData={updateFormData} />;
        case 4:
          return <TemplateSelectionStep formData={formData} updateFormData={updateFormData} />;
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
    }
  };

  // Final step (Template Editor) renders as full-screen portal to escape layout DOM
  const isTemplateEditorStep = formData.dataUploadMethod === "scratch" ? currentStep === 6 : currentStep === 5;
  
  if (open && isTemplateEditorStep) {
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
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Loading draft...</span>
          </div>
        ) : (
          <>
            {/* Header with Progress */}
            <div className="sticky top-0 bg-background z-10 px-6 pt-6 pb-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-muted-foreground">
                  Step {currentStep} of {totalSteps}
                </span>
                <div className="flex items-center gap-2">
                  {isSaving && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Saving...
                    </span>
                  )}
                  <span className="text-sm font-medium">{getStepTitle()}</span>
                </div>
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
                  Progress is saved automatically
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
