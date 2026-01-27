import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, FileText } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ModeSwitchDialogProps {
  open: boolean;
  mode: "content-machine" | "pseo-builder";
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}

const modeConfig = {
  "content-machine": {
    title: "Welcome to Content Machine",
    icon: FileText,
    description: "Create in-depth, AI-researched articles that rank. Our Content Machine analyzes top-performing content, builds comprehensive outlines, and generates SEO-optimized articles tailored to your brand voice.",
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    iconBg: "bg-gradient-to-br from-cyan-400 to-blue-600",
    buttonText: "Start Writing",
    glowColor: "bg-cyan-500/30",
  },
  "pseo-builder": {
    title: "Welcome to pSEO Builder",
    icon: Zap,
    description: "Scale your SEO with programmatic landing pages. Build data-driven campaigns, create dynamic templates, and deploy thousands of targeted pages that convert visitors into customers.",
    gradient: "from-purple-500 via-pink-500 to-orange-400",
    iconBg: "bg-gradient-to-br from-purple-400 to-pink-600",
    buttonText: "Start Building",
    glowColor: "bg-primary/30",
  },
};

export function ModeSwitchDialog({ open, mode, onConfirm, onOpenChange }: ModeSwitchDialogProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const config = modeConfig[mode];
  const Icon = config.icon;

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem("hide-mode-switch-dialog", "true");
    }
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-0 p-0 overflow-hidden bg-transparent shadow-2xl">
        {/* Glassmorphism container */}
        <div className="relative rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border border-white/10 overflow-hidden">
          {/* Animated gradient background */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br",
            config.gradient,
            mode === "content-machine" ? "opacity-30" : "opacity-20"
          )} />
          
          {/* Glow effect */}
          <div className={cn("absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl animate-pulse", config.glowColor)} />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          {/* Content */}
          <div className="relative z-10 p-8 text-center">
            {/* Animated Icon */}
            <div className="flex justify-center mb-6">
              <div className={cn(
                "relative w-20 h-20 rounded-2xl flex items-center justify-center",
                config.iconBg,
                "shadow-lg shadow-primary/25",
                "animate-[pulse_3s_ease-in-out_infinite]"
              )}>
                {/* Inner glow */}
                <div className="absolute inset-0 rounded-2xl bg-white/20 animate-ping opacity-75" style={{ animationDuration: "2s" }} />
                <Icon className="h-10 w-10 text-white relative z-10" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
              {config.title}
            </h2>

            {/* Description */}
            <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
              {config.description}
            </p>

            {/* Don't show again checkbox */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Checkbox
                id="dont-show-again"
                checked={dontShowAgain}
                onCheckedChange={(checked) => setDontShowAgain(checked === true)}
                className="border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
              />
              <label
                htmlFor="dont-show-again"
                className="text-sm text-white/50 cursor-pointer hover:text-white/70 transition-colors"
              >
                Don't show this again
              </label>
            </div>

            {/* CTA Button */}
            <Button
              onClick={handleConfirm}
              size="lg"
              className={cn(
                "w-full font-semibold text-white",
                "bg-gradient-to-r",
                config.gradient,
                "hover:opacity-90 transition-all duration-300",
                "shadow-lg hover:shadow-xl hover:scale-[1.02]",
                "border-0"
              )}
            >
              {config.buttonText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
