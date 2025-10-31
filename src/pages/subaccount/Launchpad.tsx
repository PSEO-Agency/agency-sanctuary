import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";
import { useState } from "react";

export default function Launchpad() {
  const navigate = useNavigate();
  const { subaccountId } = useParams();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const steps = [
    {
      id: "business-info",
      title: "Complete Business Information",
      description: "Add your business name and location details",
      action: "Go to Settings",
      path: `/subaccount/${subaccountId}/settings`,
    },
    {
      id: "team",
      title: "Invite Team Members",
      description: "Add your team members to collaborate",
      action: "Manage Team",
      path: `/subaccount/${subaccountId}/settings/team`,
    },
    {
      id: "integrations",
      title: "Connect Integrations",
      description: "Connect WordPress and other services",
      action: "Setup Integrations",
      path: `/subaccount/${subaccountId}/settings/integrations`,
    },
    {
      id: "wordpress",
      title: "Configure WordPress",
      description: "Set up your WordPress connection for content publishing",
      action: "Configure WordPress",
      path: `/subaccount/${subaccountId}/wordpress`,
    },
    {
      id: "automation",
      title: "Create Your First Automation",
      description: "Build automated workflows for content generation",
      action: "Build Automation",
      path: `/subaccount/${subaccountId}/automation`,
    },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const isCompleted = (stepId: string) => completedSteps.includes(stepId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Launchpad</h1>
        <p className="text-muted-foreground mt-2">
          Get started with your subaccount setup
        </p>
      </div>

      <div className="grid gap-4">
        {steps.map((step, index) => (
          <Card key={step.id} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {isCompleted(step.id) ? (
                    <CheckCircle2 className="h-6 w-6 text-primary mt-1" />
                  ) : (
                    <Circle className="h-6 w-6 text-muted-foreground mt-1" />
                  )}
                  <div>
                    <CardTitle className="text-lg">
                      {index + 1}. {step.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {step.description}
                    </CardDescription>
                  </div>
                </div>
                <Button 
                  onClick={() => handleNavigate(step.path)}
                  variant={isCompleted(step.id) ? "outline" : "default"}
                >
                  {step.action}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="bg-muted/50 border-dashed">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>
            Check our documentation or reach out to support for assistance with your setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline">
              View Documentation
            </Button>
            <Button variant="outline">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
