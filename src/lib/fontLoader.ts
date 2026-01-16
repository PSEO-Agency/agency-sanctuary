/**
 * Dynamic Google Font Loader
 * Loads fonts on-demand to support template typography changes
 */

const loadedFonts = new Set<string>();

// Popular fonts for templates
export const AVAILABLE_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "Raleway",
  "Oswald",
  "Nunito",
  "Work Sans",
  "Quicksand",
  "DM Sans",
  "Space Grotesk",
  "Outfit",
  "Sora",
  "Plus Jakarta Sans",
  "Archivo",
];

/**
 * Load a Google Font dynamically
 */
export function loadGoogleFont(fontFamily: string): void {
  if (!fontFamily || loadedFonts.has(fontFamily)) return;
  
  // Skip system fonts
  const systemFonts = ["system-ui", "inherit", "sans-serif", "serif", "monospace"];
  if (systemFonts.includes(fontFamily.toLowerCase())) return;

  try {
    // Create link element for Google Fonts
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}:wght@300;400;500;600;700;800&display=swap`;
    
    document.head.appendChild(link);
    loadedFonts.add(fontFamily);
    
    console.log(`[FontLoader] Loaded font: ${fontFamily}`);
  } catch (error) {
    console.error(`[FontLoader] Failed to load font: ${fontFamily}`, error);
  }
}

/**
 * Load multiple fonts at once
 */
export function loadGoogleFonts(fontFamilies: string[]): void {
  fontFamilies.forEach(loadGoogleFont);
}

/**
 * Check if a font is already loaded
 */
export function isFontLoaded(fontFamily: string): boolean {
  return loadedFonts.has(fontFamily);
}

/**
 * Preload common template fonts
 */
export function preloadCommonFonts(): void {
  const commonFonts = ["Inter", "Poppins", "Playfair Display", "Montserrat", "DM Sans"];
  loadGoogleFonts(commonFonts);
}
