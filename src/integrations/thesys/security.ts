/**
 * Thesys C1 Security Module
 * 
 * Provides security features for C1 components:
 * - Component type allowlist
 * - DSL payload sanitization
 * - URL validation
 * - XSS protection
 * - Content Security Policy
 */

// Allowed C1 component types
const ALLOWED_COMPONENT_TYPES = [
  // Basic components
  'card',
  'button',
  'input',
  'form',
  'table',
  'list',
  'accordion',
  'tabs',
  'modal',
  'alert',
  'badge',
  'progress',
  'skeleton',
  'divider',
  'spacer',
  'text',
  'heading',
  'image',
  'video',
  'audio',
  'link',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
  'container',
  'grid',
  'flex',
  'stack',
  'group',
  // Chart components
  'chart',
  'barchartv2',
  'piechartv2',
  'linechart',
  'areachart',
  'minichart',
  // Chart types (for MiniChart)
  'line',
  'area',
  'bar',
  'pie',
  // Thesys C1 specific components
  'header',
  'minicardblock',
  'minicard',
  'datatile',
  'icon',
  'layout',
  'inlineheader',
  'textcontent',
  'tagblock',
  'buttongroup',
  'button',
  'profiletile',
  'stats',
  'sectionblock',
  'calloutv2',
  'carouselv2',
  'datatile',
  'minichart',
];

// Allowed action types for C1 components
const ALLOWED_ACTION_TYPES = [
  'open_url',
  'submit_form',
  'trigger_event',
  'navigate',
  'copy_text',
  'download_file',
  'share',
];

// Dangerous HTML tags to strip
const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'applet',
  'meta',
  'link',
  'style',
  'base',
  'form', // Allow form components but strip HTML forms
];

// Dangerous attributes to strip
const DANGEROUS_ATTRIBUTES = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onmousedown',
  'onmouseup',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onreset',
  'onselect',
  'onabort',
  'ondrag',
  'ondrop',
];

/**
 * Validate component type against allowlist
 */
export const isAllowedComponentType = (type: string): boolean => {
  return ALLOWED_COMPONENT_TYPES.includes(type.toLowerCase());
};

/**
 * Validate action type against allowlist
 */
export const isAllowedActionType = (type: string): boolean => {
  return ALLOWED_ACTION_TYPES.includes(type.toLowerCase());
};

/**
 * Validate URL for safety
 */
export const isValidUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      console.warn('[Security] Invalid URL protocol:', urlObj.protocol);
      return false;
    }
    
    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = urlObj.hostname.toLowerCase();
      
      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        console.warn('[Security] Localhost URLs not allowed in production');
        return false;
      }
      
      // Block private IP ranges
      if (
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.2') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.')
      ) {
        console.warn('[Security] Private IP URLs not allowed in production');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.warn('[Security] Invalid URL:', url);
    return false;
  }
};

/**
 * Sanitize string to prevent XSS
 */
export const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return '';
  
  // Remove dangerous HTML tags
  let sanitized = str;
  DANGEROUS_TAGS.forEach(tag => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    const selfClosing = new RegExp(`<${tag}[^>]*/>`, 'gi');
    sanitized = sanitized.replace(selfClosing, '');
  });
  
  // Remove dangerous attributes
  DANGEROUS_ATTRIBUTES.forEach(attr => {
    const regex = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(regex, '');
  });
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (except for images)
  sanitized = sanitized.replace(/data:(?!image)/gi, '');
  
  return sanitized;
};

/**
 * Sanitize C1 component recursively
 */
export const sanitizeC1Component = (component: any): any => {
  if (!component || typeof component !== 'object') {
    return component;
  }
  
  // Handle arrays
  if (Array.isArray(component)) {
    return component.map(item => sanitizeC1Component(item));
  }
  
  // Sanitize object
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(component)) {
    // Handle action objects specially
    if (key === 'action' && typeof value === 'object' && value !== null) {
      const actionObj = value as Record<string, any>;
      // Validate action type
      if (actionObj.type && typeof actionObj.type === 'string') {
        if (!isAllowedActionType(actionObj.type)) {
          console.warn('[Security] Blocked disallowed action type:', actionObj.type);
          continue; // Skip this action
        }
      }
      // Recursively sanitize the action object
      sanitized[key] = sanitizeC1Component(value);
      continue;
    }
    
    // Validate component type
    if (key === 'type' && typeof value === 'string') {
      // Check if parent object has 'action' key - if so, this is an action type
      const isActionType = component.hasOwnProperty('action') || 
                          (component.props && typeof component.props === 'object');
      
      if (!isActionType && !isAllowedComponentType(value)) {
        console.warn('[Security] Blocked disallowed component type:', value);
        continue; // Skip this component
      }
      sanitized[key] = value;
      continue;
    }
    
    // Sanitize URLs
    if ((key === 'url' || key === 'href' || key === 'src') && typeof value === 'string') {
      // Allow empty strings for src (will be handled by placeholder)
      if (value === '') {
        sanitized[key] = value;
        continue;
      }
      
      if (!isValidUrl(value)) {
        console.warn('[Security] Blocked invalid URL:', value);
        // For images, use a placeholder instead of empty string
        if (key === 'src' && component.component?.toLowerCase() === 'image') {
          sanitized[key] = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="150"%3E%3Crect fill="%23e5e7eb" width="200" height="150"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%236b7280" font-size="14"%3EImage%3C/text%3E%3C/svg%3E';
        } else {
          sanitized[key] = ''; // Replace with empty string
        }
        continue;
      }
      sanitized[key] = value;
      continue;
    }
    
    // Sanitize strings
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
      continue;
    }
    
    // Recursively sanitize nested objects/arrays
    if (typeof value === 'object') {
      sanitized[key] = sanitizeC1Component(value);
      continue;
    }
    
    // Keep other primitive types as-is
    sanitized[key] = value;
  }
  
  return sanitized;
};

/**
 * Validate C1 DSL payload
 */
export const validateC1Payload = (payload: any): {
  valid: boolean;
  errors: string[];
  sanitized?: any;
} => {
  const errors: string[] = [];
  
  // Check if payload exists
  if (!payload) {
    errors.push('Payload is empty');
    return { valid: false, errors };
  }
  
  // Check payload size (max 1MB)
  const payloadSize = JSON.stringify(payload).length;
  if (payloadSize > 1024 * 1024) {
    errors.push(`Payload too large: ${payloadSize} bytes (max 1MB)`);
    return { valid: false, errors };
  }
  
  // Sanitize payload
  try {
    const sanitized = sanitizeC1Component(payload);
    
    // Check if sanitization removed everything
    if (!sanitized || (typeof sanitized === 'object' && Object.keys(sanitized).length === 0)) {
      errors.push('Payload was entirely removed during sanitization');
      return { valid: false, errors };
    }
    
    return {
      valid: true,
      errors: [],
      sanitized
    };
  } catch (error: any) {
    errors.push(`Sanitization failed: ${error.message}`);
    return { valid: false, errors };
  }
};

/**
 * Rate limiting for C1 API calls
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    // Check if limit exceeded
    if (validRequests.length >= this.maxRequests) {
      console.warn('[Security] Rate limit exceeded for:', identifier);
      return false;
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Export singleton rate limiter
export const c1RateLimiter = new RateLimiter(20, 60000); // 20 requests per minute

/**
 * Content Security Policy headers for C1 components
 */
export const getCSPHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React
      "style-src 'self' 'unsafe-inline'", // Required for styled components
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.thesys.dev",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
};

/**
 * Validate action parameters
 */
export const validateActionParams = (action: any): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!action || typeof action !== 'object') {
    errors.push('Invalid action object');
    return { valid: false, errors };
  }
  
  if (!action.type || typeof action.type !== 'string') {
    errors.push('Action type is required');
    return { valid: false, errors };
  }
  
  // Validate URLs in action params
  if (action.params) {
    if (action.params.url && !isValidUrl(action.params.url)) {
      errors.push('Invalid URL in action params');
    }
    
    if (action.params.href && !isValidUrl(action.params.href)) {
      errors.push('Invalid href in action params');
    }
    
    if (action.params.uploadUrl && !isValidUrl(action.params.uploadUrl)) {
      errors.push('Invalid uploadUrl in action params');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  isAllowedComponentType,
  isAllowedActionType,
  isValidUrl,
  sanitizeString,
  sanitizeC1Component,
  validateC1Payload,
  c1RateLimiter,
  getCSPHeaders,
  validateActionParams,
};
