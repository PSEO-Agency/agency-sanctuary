import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Building2, Globe, Database, Brain, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StepStatus {
  businessInfo: boolean;
  wordpress: boolean;
  airtable: boolean;
  knowledgeBase: boolean;
}

export default function Launchpad() {
  const navigate = useNavigate();
  const { subaccountId } = useParams();
  const [loading, setLoading] = useState(true);
  const [stepStatus, setStepStatus] = useState<StepStatus>({
    businessInfo: false,
    wordpress: false,
    airtable: false,
    knowledgeBase: false,
  });

  useEffect(() => {
    const fetchStatus = async () => {
      if (!subaccountId) return;

      try {
        // Fetch subaccount data
        const { data: subaccount } = await supabase
          .from("subaccounts")
          .select("business_settings, integration_settings, airtable_base_id")
          .eq("id", subaccountId)
          .single();

        // Fetch knowledge base data
        const { data: knowledgeBase } = await supabase
          .from("subaccount_knowledge_base")
          .select("brand_name, system_prompt, ai_agent_prompt")
          .eq("subaccount_id", subaccountId)
          .single();

        if (subaccount) {
          const businessSettings = subaccount.business_settings as Record<string, unknown> | null;
          const integrationSettings = subaccount.integration_settings as Record<string, unknown> | null;
          const wordpressSettings = integrationSettings?.wordpress as Record<string, unknown> | null;

          setStepStatus({
            businessInfo: !!(
              businessSettings?.name ||
              businessSettings?.description ||
              businessSettings?.website
            ),
            wordpress: !!(
              wordpressSettings?.site_url &&
              wordpressSettings?.username &&
              wordpressSettings?.app_password
            ),
            airtable: !!subaccount.airtable_base_id,
            knowledgeBase: !!(
              knowledgeBase?.brand_name ||
              knowledgeBase?.system_prompt ||
              knowledgeBase?.ai_agent_prompt
            ),
          });
        }
      } catch (error) {
        console.error("Error fetching launchpad status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, [subaccountId]);

  const steps = [
    {
      id: "businessInfo",
      title: "Complete Business Information",
      description: "Add your business name, description, and website details",
      action: "Configure",
      path: `/subaccount/${subaccountId}/settings/business`,
      icon: Building2,
    },
    {
      id: "wordpress",
      title: "Connect WordPress",
      description: "Set up your WordPress connection for publishing articles",
      action: "Connect",
      path: `/subaccount/${subaccountId}/wordpress`,
      icon: Globe,
    },
    {
      id: "airtable",
      title: "Configure Airtable",
      description: "Your Airtable base for article management",
      action: "Configure",
      path: `/subaccount/${subaccountId}/settings/integrations`,
      icon: Database,
    },
    {
      id: "knowledgeBase",
      title: "Setup Brand Voice & Writing Agent",
      description: "Define your brand identity and AI writing style",
      action: "Setup",
      path: `/subaccount/${subaccountId}/knowledge-base`,
      icon: Brain,
    },
  ];

  const completedCount = Object.values(stepStatus).filter(Boolean).length;
  const totalSteps = steps.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Launchpad</h1>
        <p className="text-muted-foreground mt-2">
          Complete these steps to get your account fully set up ({completedCount}/{totalSteps} complete)
        </p>
      </div>

      <div className="grid gap-4">
        {steps.map((step, index) => {
          const isCompleted = stepStatus[step.id as keyof StepStatus];
          const StepIcon = step.icon;

          return (
            <Card 
              key={step.id} 
              className={isCompleted ? "border-primary/30 bg-primary/5" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-3">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <StepIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        <span className="text-muted-foreground mr-2">Step {index + 1}:</span>
                        {step.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant={isCompleted ? "outline" : "default"}
                    onClick={() => navigate(step.path)}
                  >
                    {isCompleted ? "Review" : step.action}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                Check out our documentation or reach out to support
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                View Documentation
              </Button>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
