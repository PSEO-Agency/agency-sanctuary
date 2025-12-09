import { ScrollArea } from "@/components/ui/scroll-area";

interface ArticleHTMLPreviewProps {
  html: string;
  content: string;
  metaTitle: string;
}

export function ArticleHTMLPreview({ html, content, metaTitle }: ArticleHTMLPreviewProps) {
  // If we have HTML from Airtable, use it directly
  // Otherwise, convert markdown-ish content to basic HTML
  const displayHtml = html || convertContentToHTML(content);

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-8">
        {/* Article Title */}
        {metaTitle && (
          <h1 className="text-3xl font-bold mb-6 text-foreground">
            {metaTitle}
          </h1>
        )}
        
        {/* Article Content */}
        <article 
          className="prose prose-sm sm:prose lg:prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: displayHtml }}
        />
      </div>
    </ScrollArea>
  );
}

function convertContentToHTML(content: string): string {
  if (!content) return '<p class="text-muted-foreground">No content to preview</p>';
  
  let html = content;
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Convert lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^(\* )(.+)$/gm, '<li>$2</li>');
  
  // Wrap consecutive list items
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  
  // Convert links
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');
  
  // Convert paragraphs (lines not already wrapped)
  const lines = html.split('\n');
  html = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<li') || trimmed.startsWith('<p')) {
      return line;
    }
    return `<p>${trimmed}</p>`;
  }).join('\n');
  
  return html;
}
