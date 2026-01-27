import { Entity } from "../types";
import { cn } from "@/lib/utils";

interface SitemapBoardProps {
  entities: Entity[];
  pagesPerEntity: Record<string, number>;
  staticPages?: Array<{ id: string; name: string; path: string }>;
  className?: string;
}

export function SitemapBoard({
  entities,
  pagesPerEntity,
  staticPages = [],
  className,
}: SitemapBoardProps) {
  const defaultStaticPages = [
    { id: "about", name: "About Us", path: "/about" },
    { id: "contact", name: "Contact Us", path: "/contact" },
    ...staticPages,
  ];

  const totalDynamicPages = Object.values(pagesPerEntity).reduce((a, b) => a + b, 0);

  return (
    <div className={cn("flex flex-col items-center py-8 px-4", className)}>
      <h3 className="text-lg font-semibold mb-2 text-foreground">
        Your Site Structure
      </h3>
      <p className="text-sm text-muted-foreground mb-8">
        {totalDynamicPages} dynamic pages across {entities.length} entity type{entities.length !== 1 ? "s" : ""}
      </p>

      {/* Homepage node */}
      <div className="relative">
        <div className="bg-primary text-primary-foreground rounded-xl px-6 py-4 shadow-lg">
          <div className="font-semibold">Homepage</div>
          <div className="text-xs opacity-80">1 page</div>
        </div>

        {/* Connector line down */}
        <div className="absolute left-1/2 -translate-x-1/2 w-px h-8 bg-border" style={{ top: "100%" }} />
      </div>

      {/* Horizontal connector */}
      <div className="w-full max-w-3xl h-px bg-border mt-8 relative">
        {/* Vertical connectors to each child */}
        <div className="absolute inset-x-0 flex justify-center">
          <div className="flex gap-4 -translate-y-1/2">
            {[...entities, ...defaultStaticPages].map((_, idx, arr) => (
              <div
                key={idx}
                className="w-px h-4 bg-border"
                style={{ 
                  width: `${100 / arr.length}%`,
                  minWidth: '120px',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Child nodes */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 max-w-4xl">
        {/* Entity pages */}
        {entities.map((entity) => (
          <div
            key={entity.id}
            className="relative bg-card border rounded-xl px-4 py-3 shadow-sm min-w-[140px] text-center"
          >
            <div className="font-medium text-sm">{entity.name}</div>
            <div className="text-xs text-muted-foreground">
              {pagesPerEntity[entity.id] || 0} pages
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              {entity.urlPrefix}*
            </div>
          </div>
        ))}

        {/* Static pages */}
        {defaultStaticPages.map((page) => (
          <div
            key={page.id}
            className="relative bg-muted/50 border border-dashed rounded-xl px-4 py-3 min-w-[120px] text-center"
          >
            <div className="font-medium text-sm text-muted-foreground">
              {page.name}
            </div>
            <div className="text-xs text-muted-foreground">1 page</div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              {page.path}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-primary" />
          <span>Main Page</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-card border" />
          <span>Dynamic Pages (generated)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-muted/50 border border-dashed" />
          <span>Static Pages (optional)</span>
        </div>
      </div>
    </div>
  );
}
