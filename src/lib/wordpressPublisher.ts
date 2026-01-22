// WordPress Publisher Utility Functions

export function normalizeBaseUrl(baseUrl: string): string {
  let url = baseUrl.trim();
  // Remove trailing slashes
  while (url.endsWith('/')) {
    url = url.slice(0, -1);
  }
  // Ensure https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url;
}

export function buildEndpoint(baseUrl: string, path: string): string {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  return `${normalizedBase}/index.php?rest_route=${encodeURIComponent(path)}`;
}

export function validateConnectionInput(input: {
  name?: string;
  baseUrl?: string;
  apiKey?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name?.trim()) {
    errors.push('Connection name is required');
  }

  if (!input.baseUrl?.trim()) {
    errors.push('WordPress site URL is required');
  } else {
    const url = input.baseUrl.trim();
    // Basic URL validation
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        errors.push('URL must use HTTP or HTTPS protocol');
      }
    } catch {
      errors.push('Invalid URL format');
    }
  }

  if (!input.apiKey?.trim()) {
    errors.push('API key is required');
  }

  return { valid: errors.length === 0, errors };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

export function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  const plainText = text.replace(/<[^>]*>/g, '').trim();
  if (plainText.length <= maxLength) return plainText;
  return plainText.substring(0, maxLength - 3) + '...';
}

export function generateExcerpt(content: string, maxLength: number = 160): string {
  return truncateText(content, maxLength);
}

export interface Article {
  id?: string;
  airtableId?: string;
  title: string;
  content: string;
  excerpt?: string;
  slug?: string;
  metaTitle?: string;
  seoTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  categories?: string[];
  tags?: string[];
  featuredImageUrl?: string;
  imageUrl?: string;
  canonicalUrl?: string;
  noindex?: boolean;
  nofollow?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

export function validateArticleForPublish(article: Article): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!article.title?.trim()) {
    errors.push('Article title is required');
  }

  if (!article.content?.trim()) {
    errors.push('Article content is required');
  }

  return { valid: errors.length === 0, errors };
}

export function formatTimeAgo(date: Date | string | null): string {
  if (!date) return 'Never';
  
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return then.toLocaleDateString();
}
