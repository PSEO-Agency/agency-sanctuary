import { useState, useEffect } from "react";
import { Home, FolderKanban, FileText, BarChart3, Settings, Cog, Rocket, Send, MessageSquare } from "lucide-react";
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
  const [showPseoBuilder, setShowPseoBuilder] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

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
        setShowPseoBuilder(data.value === "true");
      }
    } catch (error) {
      // Setting not found, default to false
    }
  };

  const fetchSubscription = async () => {
    try {
      // Get actual article count from blog_posts
      const { count: articleCount } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("subaccount_id", subaccountId);

      const actualArticlesUsed = articleCount || 0;

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
            otherCredits: existingSubscription.other_credits,
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

  const launchpadItem = {
    title: "Launchpad",
    url: `/subaccount/${subaccountId}/launchpad`,
    icon: Rocket,
  };

  const contentMachineItems = [
    { title: "Publishing", url: `/subaccount/${subaccountId}/wordpress`, icon: Send },
    { title: "Articles", url: `/subaccount/${subaccountId}/projects`, icon: FileText },
    { title: "Automation Builder", url: `/subaccount/${subaccountId}/automation`, icon: Cog },
  ];

  const pseoBuilderItems = [
    { title: "Dashboard", url: `/subaccount/${subaccountId}/dashboard`, icon: Home, disabled: true },
    { title: "Campaigns", url: `/subaccount/${subaccountId}/campaigns`, icon: FolderKanban, disabled: true },
    { title: "Reports", url: `/subaccount/${subaccountId}/reports`, icon: BarChart3, disabled: true },
  ];

  const isRouteActive = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  const getMenuItemClassName = (isActive: boolean) => {
    if (isActive) {
      return "bg-primary/10 text-sidebar-foreground font-medium hover:bg-primary/10";
    }
    return "text-sidebar-foreground/70 hover:bg-primary/10 hover:text-sidebar-foreground";
  };

  const getIconClassName = (isActive: boolean) => {
    if (isActive) {
      return "h-5 w-5 text-primary";
    }
    return "h-5 w-5";
  };

  return (
    <Sidebar className={`${collapsed ? "w-14" : "w-60"} border-r border-sidebar-border`} collapsible="icon">
      <SidebarContent className="flex-1 pt-16 bg-sidebar">
        {!collapsed && (
          <div className="px-2 py-2 mt-2">
            <SubaccountSwitcher subaccountId={subaccountId} />
          </div>
        )}

        {/* Launchpad Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  className={getMenuItemClassName(isRouteActive(launchpadItem.url))}
                >
                  <NavLink to={launchpadItem.url} end>
                    <launchpadItem.icon className={getIconClassName(isRouteActive(launchpadItem.url))} />
                    {!collapsed && <span>{launchpadItem.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content Machine Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-normal">
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

        {/* pSEO Builder Section - Conditionally shown */}
        {showPseoBuilder && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-xs font-normal">
              pSEO Builder
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pseoBuilderItems.map((item) => {
                  const isActive = isRouteActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        disabled={item.disabled}
                        className={isActive ? getMenuItemClassName(true) : "text-sidebar-foreground/40 cursor-not-allowed"}
                      >
                        <item.icon className={isActive ? getIconClassName(true) : "h-5 w-5"} />
                        {!collapsed && (
                          <span className="flex items-center justify-between w-full">
                            {item.title}
                            {item.disabled && <span className="text-xs text-sidebar-foreground/30 ml-2">Soon</span>}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 bg-sidebar space-y-3">
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
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
            >
              <a href="#" onClick={(e) => e.preventDefault()}>
                <MessageSquare className="h-5 w-5" />
                {!collapsed && <span>Support</span>}
              </a>
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
