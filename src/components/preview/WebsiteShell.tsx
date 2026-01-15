import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Campaign {
  id: string;
  name: string;
  business_name: string | null;
  business_logo_url: string | null;
  template_config: any;
  preview_settings: any;
  data_columns: any;
}

interface CampaignPage {
  id: string;
  title: string;
  slug: string | null;
  preview_token: string;
  data_values: Record<string, string>;
}

interface SiblingPage {
  id: string;
  title: string;
  slug: string | null;
  preview_token: string;
  data_values: Record<string, string>;
}

interface WebsiteShellProps {
  campaign: Campaign | null;
  currentPage: CampaignPage;
  siblingPages: SiblingPage[];
  children: ReactNode;
}

// Group pages by a specific data column
function groupPagesByColumn(pages: SiblingPage[], columnKey: string): Record<string, SiblingPage[]> {
  const groups: Record<string, SiblingPage[]> = {};
  
  pages.forEach(page => {
    const value = page.data_values?.[columnKey] || "Other";
    if (!groups[value]) {
      groups[value] = [];
    }
    groups[value].push(page);
  });
  
  return groups;
}

// Get the primary grouping column from data_columns
function getPrimaryGroupingColumn(dataColumns: any): string | null {
  if (!dataColumns || !Array.isArray(dataColumns)) return null;
  
  // Look for common grouping columns
  const preferredColumns = ["city", "cities", "location", "locations", "region", "regions"];
  const columns = dataColumns.map((c: any) => c.name?.toLowerCase());
  
  for (const preferred of preferredColumns) {
    const found = dataColumns.find((c: any) => c.name?.toLowerCase() === preferred);
    if (found) return found.name;
  }
  
  // Return first column if no preferred found
  return dataColumns[0]?.name || null;
}

export default function WebsiteShell({ 
  campaign, 
  currentPage, 
  siblingPages, 
  children 
}: WebsiteShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const businessName = campaign?.business_name || campaign?.name || "Preview";
  const logoUrl = campaign?.business_logo_url;
  const previewSettings = campaign?.preview_settings || {};
  const showLogo = previewSettings.navbar?.showLogo !== false;
  const showEntityDropdowns = previewSettings.navbar?.showEntityDropdowns !== false;
  
  // Group pages for dropdown navigation
  const groupingColumn = getPrimaryGroupingColumn(campaign?.data_columns);
  const allPages = [currentPage, ...siblingPages];
  
  // Get unique values for dropdown
  const entityValues = new Set<string>();
  allPages.forEach(page => {
    if (groupingColumn && page.data_values?.[groupingColumn]) {
      entityValues.add(page.data_values[groupingColumn]);
    }
  });
  
  const entityDropdownItems = Array.from(entityValues).sort();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo / Business Name */}
          <div className="flex items-center gap-4">
            {showLogo && logoUrl ? (
              <img 
                src={logoUrl} 
                alt={businessName} 
                className="h-8 w-auto object-contain"
              />
            ) : (
              <span className="font-bold text-xl text-foreground">{businessName}</span>
            )}
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {/* Home link */}
            <span className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
              Home
            </span>
            
            {/* Entity Dropdown */}
            {showEntityDropdowns && entityDropdownItems.length > 0 && groupingColumn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-1 h-auto py-1 px-2">
                    <span className="text-sm font-medium capitalize">
                      {groupingColumn.replace(/s$/, '')}s
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover z-[100]">
                  {entityDropdownItems.map((value) => {
                    const targetPage = allPages.find(
                      p => p.data_values?.[groupingColumn] === value
                    );
                    const isCurrentPage = targetPage?.id === currentPage.id;
                    
                    return (
                      <DropdownMenuItem key={value} asChild>
                        <Link 
                          to={`/preview/${targetPage?.preview_token}`}
                          className={isCurrentPage ? "font-semibold bg-accent" : ""}
                        >
                          {value}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Static page links */}
            <span className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
              About
            </span>
            <span className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer">
              Contact
            </span>
          </nav>

          {/* Mobile menu button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background">
            <div className="container py-4 space-y-3">
              <span className="block text-sm font-medium text-muted-foreground">Home</span>
              
              {showEntityDropdowns && entityDropdownItems.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {groupingColumn?.replace(/s$/, '')}s
                  </span>
                  {entityDropdownItems.map((value) => {
                    const targetPage = allPages.find(
                      p => p.data_values?.[groupingColumn!] === value
                    );
                    const isCurrentPage = targetPage?.id === currentPage.id;
                    
                    return (
                      <Link 
                        key={value}
                        to={`/preview/${targetPage?.preview_token}`}
                        className={`block text-sm pl-3 ${isCurrentPage ? "font-semibold text-primary" : "text-muted-foreground"}`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {value}
                      </Link>
                    );
                  })}
                </div>
              )}
              
              <span className="block text-sm font-medium text-muted-foreground">About</span>
              <span className="block text-sm font-medium text-muted-foreground">Contact</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              {showLogo && logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt={businessName} 
                  className="h-6 w-auto object-contain"
                />
              ) : (
                <span className="font-semibold text-foreground">{businessName}</span>
              )}
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer">Privacy Policy</span>
              <span className="hover:text-foreground cursor-pointer">Terms of Service</span>
              <span className="hover:text-foreground cursor-pointer">Contact</span>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {businessName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
