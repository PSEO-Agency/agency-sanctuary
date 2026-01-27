import { useState, useEffect } from "react";
import { LayoutDashboard, FolderKanban, FileText, BarChart3, Settings, Rocket, Send, BookOpen, ArrowRightLeft, Zap, Layers, FileStack, Link2 } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SubaccountSwitcher } from "./SubaccountSwitcher";
import { BillingWidget } from "./BillingWidget";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SubaccountSidebarProps {
  subaccountId: string;
}

interface SubscriptionData {
  planName: string;
  articlesUsed: number;
  articleLimit: number;
  otherCredits: number;
  billingPeriodEnd: Date;
}

export function SubaccountSidebar({ subaccountId }: SubaccountSidebarProps) {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === "collapsed";
  const [pseoBuilderEnabled, setPseoBuilderEnabled] = useState(false);
  const [activeMode, setActiveMode] = useState<"content-machine" | "pseo-builder">(() => {
    const saved = localStorage.getItem(`sidebar-mode-${subaccountId}`);
    return saved === "pseo-builder" ? "pseo-builder" : "content-machine";
  });
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    fetchFeatureSettings();
    fetchSubscription();
  }, [subaccountId]);

  const fetchFeatureSettings = async () => {
    try {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "show_pseo_builder")
        .maybeSingle();
      
      if (data) {
        setPseoBuilderEnabled(data.value === "true");
      }
    } catch (error) {
      // Setting not found, default to false
    }
  };

  const toggleMode = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setActiveMode(prev => {
        const newMode = prev === "content-machine" ? "pseo-builder" : "content-machine";
        localStorage.setItem(`sidebar-mode-${subaccountId}`, newMode);
        return newMode;
      });
      setTimeout(() => setIsTransitioning(false), 150);
    }, 150);
  };

  const fetchSubscription = async () => {
    try {
      // Get the subaccount's Airtable base ID first
      const { data: subaccount } = await supabase
        .from("subaccounts")
        .select("airtable_base_id")
        .eq("id", subaccountId)
        .maybeSingle();

      let actualArticlesUsed = 0;

      // If subaccount has an Airtable base, fetch article count from there
      if (subaccount?.airtable_base_id) {
        try {
          const { data: articlesData } = await supabase.functions.invoke('fetch-airtable-articles', {
            body: { baseId: subaccount.airtable_base_id }
          });
          
          if (articlesData?.success && Array.isArray(articlesData.articles)) {
            actualArticlesUsed = articlesData.articles.length;
          }
        } catch (airtableError) {
          console.error("Error fetching Airtable articles count:", airtableError);
        }
      }

      // First check if subscription exists
      const { data: existingSubscription } = await supabase
        .from("subaccount_subscriptions")
        .select(`
          articles_used,
          other_credits,
          billing_period_end,
          plan_id
        `)
        .eq("subaccount_id", subaccountId)
        .maybeSingle();

      if (existingSubscription) {
        // Get plan details
        const { data: plan } = await supabase
          .from("subscription_plans")
          .select("name, article_limit")
          .eq("id", existingSubscription.plan_id)
          .single();

        if (plan) {
          setSubscription({
            planName: plan.name,
            articlesUsed: actualArticlesUsed,
            articleLimit: plan.article_limit,
            otherCredits: existingSubscription.other_credits || 0,
            billingPeriodEnd: new Date(existingSubscription.billing_period_end),
          });
        }
      } else {
        // Create default Basic subscription
        const { data: basicPlan } = await supabase
          .from("subscription_plans")
          .select("id, name, article_limit")
          .eq("name", "Basic")
          .single();

        if (basicPlan) {
          const { data: newSubscription, error } = await supabase
            .from("subaccount_subscriptions")
            .insert({
              subaccount_id: subaccountId,
              plan_id: basicPlan.id,
            })
            .select()
            .single();

          if (!error && newSubscription) {
            setSubscription({
              planName: basicPlan.name,
              articlesUsed: actualArticlesUsed,
              articleLimit: basicPlan.article_limit,
              otherCredits: 5,
              billingPeriodEnd: new Date(newSubscription.billing_period_end),
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
      // Default fallback
      setSubscription({
        planName: "Basic",
        articlesUsed: 0,
        articleLimit: 10,
        otherCredits: 5,
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
    }
  };

  const getWeeksUntilReset = () => {
    if (!subscription) return 4;
    const now = new Date();
    const diffTime = subscription.billingPeriodEnd.getTime() - now.getTime();
    const diffWeeks = Math.ceil(diffTime / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, diffWeeks);
  };

  const mainNavItems = [
    { title: "Dashboard", url: `/subaccount/${subaccountId}/dashboard`, icon: LayoutDashboard },
    { title: "Launchpad", url: `/subaccount/${subaccountId}/launchpad`, icon: Rocket },
    { title: "Knowledge Base", url: `/subaccount/${subaccountId}/knowledge-base`, icon: BookOpen },
  ];

  const contentMachineItems = [
    { title: "Connections", url: `/subaccount/${subaccountId}/connections`, icon: Link2 },
    { title: "Publishing", url: `/subaccount/${subaccountId}/wordpress`, icon: Send },
    { title: "Articles", url: `/subaccount/${subaccountId}/projects`, icon: FileText },
  ];

  const pseoBuilderItems = [
    { title: "Campaigns", url: `/subaccount/${subaccountId}/campaigns`, icon: FolderKanban, disabled: false },
    { title: "Pages", url: `/subaccount/${subaccountId}/pages`, icon: FileStack, disabled: false },
    { title: "Reports", url: `/subaccount/${subaccountId}/reports`, icon: BarChart3, disabled: true },
  ];

  const isRouteActive = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const getMenuItemClassName = (isActive: boolean) => {
    if (isActive) {
      return "bg-white/15 text-white font-medium hover:bg-white/20";
    }
    return "text-white/80 hover:bg-white/10 hover:text-white";
  };

  const getIconClassName = (isActive: boolean) => {
    if (isActive) {
      return "h-5 w-5 text-white";
    }
    return "h-5 w-5 text-white/70";
  };

  const gradientStyle = { background: 'linear-gradient(to bottom, hsl(263 70% 50%), hsl(271 81% 45%))' };

  return (
    <Sidebar 
      variant="floating"
      className={cn(
        collapsed ? "w-14" : "w-60",
        "border-0"
      )} 
      collapsible="icon"
      style={gradientStyle}
    >
      <SidebarContent className="flex-1 pt-2">
        {!collapsed && (
          <div className="px-2 py-2 mt-2">
            <SubaccountSwitcher subaccountId={subaccountId} />
          </div>
        )}

        {/* Mode Switcher Card - Only show if pSEO Builder is enabled */}
        {pseoBuilderEnabled && !collapsed && (
          <div className="px-2 py-2">
            <button
              onClick={toggleMode}
              className={cn(
                "w-full group relative overflow-hidden rounded-xl p-3",
                "bg-white/10 backdrop-blur-sm",
                "border border-white/20 hover:border-white/40",
                "transition-all duration-300 ease-out",
                "hover:bg-white/15",
                "hover:scale-[1.02]"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg",
                  "bg-white/20 text-white",
                  "group-hover:bg-white group-hover:text-[hsl(var(--theme-primary))]",
                  "transition-colors duration-300"
                )}>
                  {activeMode === "content-machine" ? (
                    <Layers className="h-4 w-4" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-semibold text-white whitespace-nowrap">
                    {activeMode === "content-machine" ? "pSEO Builder" : "Content Machine"}
                  </p>
                  <p className="text-xs text-white/60 leading-tight">
                    {activeMode === "content-machine" 
                      ? "Switch to our industry leading most powerful builder" 
                      : "Write in-depth researched SEO optimized articles"}
                  </p>
                </div>
                <ArrowRightLeft className="flex-shrink-0 h-3.5 w-3.5 text-white/40 group-hover:text-white transition-colors" />
              </div>
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = isRouteActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={getMenuItemClassName(isActive)}
                    >
                      <NavLink to={item.url} end>
                        <item.icon className={getIconClassName(isActive)} />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Machine Section - Show when in content-machine mode */}
        <div className={cn(
          "transition-all duration-500 ease-out transform-gpu",
          activeMode === "content-machine" 
            ? "opacity-100 translate-x-0 scale-100" 
            : "opacity-0 -translate-x-4 scale-95 absolute pointer-events-none",
          isTransitioning && "opacity-0 scale-95"
        )}>
          {activeMode === "content-machine" && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-white/50 uppercase text-xs font-normal">
                Content Machine
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {contentMachineItems.map((item) => {
                    const isActive = isRouteActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={getMenuItemClassName(isActive)}
                        >
                          <NavLink to={item.url} end>
                            <item.icon className={getIconClassName(isActive)} />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>

        {/* pSEO Builder Section - Show when in pseo-builder mode AND feature is enabled */}
        <div className={cn(
          "transition-all duration-500 ease-out transform-gpu",
          activeMode === "pseo-builder" && pseoBuilderEnabled 
            ? "opacity-100 translate-x-0 scale-100" 
            : "opacity-0 translate-x-4 scale-95 absolute pointer-events-none",
          isTransitioning && "opacity-0 scale-95"
        )}>
          {activeMode === "pseo-builder" && pseoBuilderEnabled && (
            <SidebarGroup>
              <SidebarGroupLabel className="text-white/50 uppercase text-xs font-normal">
                pSEO Builder
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pseoBuilderItems.map((item) => {
                    const isActive = isRouteActive(item.url);
                    if (item.disabled) {
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            disabled
                            className="text-white/30 cursor-not-allowed"
                          >
                            <item.icon className="h-5 w-5" />
                            {!collapsed && (
                              <span className="flex items-center justify-between w-full">
                                {item.title}
                                <span className="text-xs text-white/20 ml-2">Soon</span>
                              </span>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    }
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={getMenuItemClassName(isActive)}
                        >
                          <NavLink to={item.url} end>
                            <item.icon className={getIconClassName(isActive)} />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3 space-y-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className={getMenuItemClassName(isRouteActive(`/subaccount/${subaccountId}/settings`))}
            >
              <NavLink to={`/subaccount/${subaccountId}/settings`} end>
                <Settings className={getIconClassName(isRouteActive(`/subaccount/${subaccountId}/settings`))} />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Billing Widget */}
        {subscription && (
          <BillingWidget
            subaccountId={subaccountId}
            planName={subscription.planName}
            articlesUsed={subscription.articlesUsed}
            articleLimit={subscription.articleLimit}
            otherCredits={subscription.otherCredits}
            weeksUntilReset={getWeeksUntilReset()}
            collapsed={collapsed}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
