/**
 * Thesys C1 Helper Functions
 * Utilities for detecting and processing Thesys C1 responses
 */

/**
 * Detects if a response is a Thesys C1 UI component
 */
export function isThesysC1Response(content: any): boolean {
  if (!content) return false;

  // If it's a string, detect Thesys <content> wrapper quickly
  if (typeof content === 'string') {
    return /<content[^>]*thesys="true"[^>]*>/i.test(content) || /<content[^>]*>/i.test(content);
  }

  if (typeof content !== 'object') return false;

  // Check for C1 component structure
  return (
    content.type === 'component' ||
    (content.component && typeof content.component === 'object') ||
    (content.ui && typeof content.ui === 'object') ||
    (content.elements && Array.isArray(content.elements)) ||
    // Check for nested C1 structure in API response
    (content.choices && content.choices[0]?.message?.content &&
      typeof content.choices[0].message.content === 'object')
  );
}

/**
 * Extracts C1 component data from response
 */
export function extractC1Component(response: any): any {
  if (!response) return null;
  
  // Handle API response structure
  if (response.choices?.[0]?.message?.content) {
    const content = response.choices[0].message.content;

    // Helper: decode minimal HTML entities used by API (&quot;, &amp;, &lt;, &gt;, &#39;)
    const decodeEntities = (str: string) =>
      str
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');

    // Helper: extract inner JSON from <content>...</content>
    const extractInner = (str: string) => {
      const match = str.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
      return match ? match[1] : str;
    };

    // If content is a string, clean wrapper and parse JSON
    if (typeof content === 'string') {
      // Remove <content> wrapper if present
      const inner = extractInner(content.trim());
      // Decode HTML entities inside
      const decoded = decodeEntities(inner.trim());
      // Some responses may wrap JSON with stray whitespace
      const maybeJson = decoded.trim();
      try {
        return JSON.parse(maybeJson);
      } catch {
        // As a fallback, try to find first JSON object substring
        const jsonStart = maybeJson.indexOf('{');
        const jsonEnd = maybeJson.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const jsonSlice = maybeJson.substring(jsonStart, jsonEnd + 1);
          try {
            return JSON.parse(jsonSlice);
          } catch {
            // fallthrough
          }
        }
        // Return original string when parsing fails
        return content;
      }
    }

    // If content is already an object, return it
    return content;
  }
  
  // Handle direct component data
  if (response.type === 'component' || response.component || response.ui) {
    return response;
  }
  
  return response;
}

/**
 * Validates C1 component structure
 */
export function validateC1Component(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  // Basic validation - component should have some recognizable structure
  return !!(
    data.type ||
    data.component ||
    data.ui ||
    data.elements ||
    data.props
  );
}

/**
 * Formats error message for C1 component failures
 */
export function formatC1Error(error: any): string {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.error) return error.error;
  return 'Unknown error occurred while rendering C1 component';
}

/**
 * Checks if response contains interactive elements
 */
export function hasInteractiveElements(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const interactiveTypes = ['button', 'input', 'form', 'select', 'checkbox', 'radio'];
  
  // Recursive check for interactive elements
  const checkRecursive = (obj: any): boolean => {
    if (Array.isArray(obj)) {
      return obj.some(item => checkRecursive(item));
    }
    
    if (obj && typeof obj === 'object') {
      // Check type field
      if (obj.type && typeof obj.type === 'string' && interactiveTypes.includes(obj.type.toLowerCase())) {
        return true;
      }
      
      // Check component field - handle both string and object types
      if (obj.component) {
        if (typeof obj.component === 'string' && interactiveTypes.includes(obj.component.toLowerCase())) {
          return true;
        }
        // If component is an object, check its type field
        if (typeof obj.component === 'object' && obj.component.type && typeof obj.component.type === 'string') {
          if (interactiveTypes.includes(obj.component.type.toLowerCase())) {
            return true;
          }
        }
      }
      
      // Recursively check nested objects
      return Object.values(obj).some(value => checkRecursive(value));
    }
    
    return false;
  };
  
  return checkRecursive(data);
}
