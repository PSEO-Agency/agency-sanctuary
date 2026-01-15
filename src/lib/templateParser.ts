/**
 * Template Parser Utility
 * Handles placeholder replacement and prompt extraction for campaign templates
 */

/**
 * Parse static placeholders like {{variable}} and replace with actual values
 */
export function parseStaticPlaceholders(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] || match;
  });
}

/**
 * Extract all prompt(...) patterns from template content
 * Returns an array of prompt objects with their original text and parsed prompt
 */
export interface ExtractedPrompt {
  id: string;
  original: string;
  prompt: string;
  placeholdersReplaced: string;
}

export function extractPrompts(
  template: string,
  data: Record<string, string> = {}
): ExtractedPrompt[] {
  const promptRegex = /prompt\(["'`]([^"'`]+)["'`]\)/g;
  const prompts: ExtractedPrompt[] = [];
  let match;
  let index = 0;

  while ((match = promptRegex.exec(template)) !== null) {
    const original = match[0];
    const promptText = match[1];
    const placeholdersReplaced = parseStaticPlaceholders(promptText, data);
    
    prompts.push({
      id: `prompt_${index}`,
      original,
      prompt: promptText,
      placeholdersReplaced,
    });
    index++;
  }

  return prompts;
}

/**
 * Check if a string contains any prompt(...) patterns
 */
export function hasPrompts(text: string): boolean {
  return /prompt\(["'`][^"'`]+["'`]\)/.test(text);
}

/**
 * Replace prompt patterns with generated content
 */
export function replacePrompts(
  template: string,
  generatedContent: Record<string, string>
): string {
  let result = template;
  
  Object.entries(generatedContent).forEach(([promptId, content]) => {
    // Find the original prompt pattern and replace it
    const promptRegex = /prompt\(["'`]([^"'`]+)["'`]\)/;
    result = result.replace(promptRegex, content);
  });

  return result;
}

/**
 * Full template render: replaces placeholders and optionally AI content
 */
export function renderTemplate(
  template: string,
  data: Record<string, string>,
  aiContent: Record<string, string> = {}
): string {
  // First replace static placeholders
  let rendered = parseStaticPlaceholders(template, data);
  
  // Then replace AI-generated content if provided
  if (Object.keys(aiContent).length > 0) {
    rendered = replacePrompts(rendered, aiContent);
  }

  return rendered;
}

/**
 * Generate a placeholder preview for prompts that haven't been generated yet
 */
export function getPromptPlaceholder(prompt: string): string {
  const truncated = prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt;
  return `[AI will generate: "${truncated}"]`;
}

/**
 * Render template with placeholder previews for ungenerated prompts
 */
export function renderTemplateWithPlaceholders(
  template: string,
  data: Record<string, string>,
  generatedContent: Record<string, string> = {}
): string {
  // First replace static placeholders
  let rendered = parseStaticPlaceholders(template, data);
  
  // Replace prompts with either generated content or placeholders
  const prompts = extractPrompts(template, data);
  
  prompts.forEach((p, index) => {
    const generatedKey = `prompt_${index}`;
    const replacement = generatedContent[generatedKey] 
      ? generatedContent[generatedKey]
      : getPromptPlaceholder(p.placeholdersReplaced);
    
    rendered = rendered.replace(p.original, replacement);
  });

  return rendered;
}
