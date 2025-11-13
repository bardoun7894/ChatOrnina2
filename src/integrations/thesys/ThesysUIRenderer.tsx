'use client';

import React, { useState, useCallback, Suspense, lazy, useEffect, useRef } from 'react';
import { validateC1Component, formatC1Error, hasInteractiveElements } from './helpers';
import { validateC1Payload, sanitizeC1Component } from './security';

// Dynamic imports to handle potential module loading issues
let C1Component: any = null;
let ThemeProvider: any = null;

// Flag to track if we've attempted to load the modules
let modulesLoaded = false;
let loadingError: string | null = null;

// Progressive C1 Component wrapper for chunked rendering
interface ProgressiveC1ComponentProps {
  C1Component: any;
  c1Response: string;
  onAction: (action: any) => void;
}

const ProgressiveC1Component: React.FC<ProgressiveC1ComponentProps> = ({
  C1Component,
  c1Response,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy rendering
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        root: null,
        rootMargin: '50px', // Start loading 50px before visible
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Add lazy loading for images within C1 components
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img');
    images.forEach((img) => {
      // Add native lazy loading
      img.loading = 'lazy';
      
      // Add intersection observer for better control
      const imgObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLImageElement;
              if (target.dataset.src) {
                target.src = target.dataset.src;
                target.removeAttribute('data-src');
              }
              imgObserver.unobserve(target);
            }
          });
        },
        { rootMargin: '100px' }
      );
      
      imgObserver.observe(img);
    });
  }, [isVisible]);

  return (
    <div ref={containerRef} className="progressive-c1-wrapper">
      {isVisible ? (
        <C1Component
          c1Response={c1Response}
          onAction={onAction}
        />
      ) : (
        <div className="h-20 bg-gray-50 rounded animate-pulse" />
      )}
    </div>
  );
};

// Dynamically load Thesys SDK components
const loadThesysModules = async () => {
  if (modulesLoaded) return { C1Component, ThemeProvider, error: loadingError };
  
  try {
    const sdk = await import('@thesysai/genui-sdk');
    const crayonUI = await import('@crayonai/react-ui');
    C1Component = sdk.C1Component;
    ThemeProvider = crayonUI.ThemeProvider;
    modulesLoaded = true;
    loadingError = null;
    console.log('[ThesysUIRenderer] ✅ Thesys SDK loaded successfully');
  } catch (error: any) {
    loadingError = `Failed to load Thesys SDK: ${error.message}`;
    console.error('[ThesysUIRenderer] ❌ Failed to load Thesys SDK:', error);
  }
  
  return { C1Component, ThemeProvider, error: loadingError };
};

interface ThesysUIRendererProps {
  data: any;
  onAction?: (action: any) => void;
  className?: string;
  fallbackToJson?: boolean;
}

export const ThesysUIRenderer: React.FC<ThesysUIRendererProps> = ({
  data,
  onAction,
  className = '',
  fallbackToJson = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modules, setModules] = useState<{ C1Component: any; ThemeProvider: any } | null>(null);

  // Load modules on first render
  React.useEffect(() => {
    const initModules = async () => {
      setIsLoading(true);
      
      // Load SDK modules (ThemeProvider handles its own styles)
      const { C1Component: C1, ThemeProvider: TP, error: loadError } = await loadThesysModules();
      
      if (loadError) {
        setError(loadError);
      } else {
        setModules({ C1Component: C1, ThemeProvider: TP });
      }
      setIsLoading(false);
    };

    initModules();
  }, []);

  const handleAction = useCallback((action: any) => {
    console.log('[ThesysUIRenderer] Action triggered:', action);
    if (onAction) {
      onAction(action);
    }
  }, [onAction]);

  // Loading state
  if (isLoading) {
    return (
      <div className={`thesys-c1-loading ${className}`}>
        <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
          <span className="text-sm text-gray-600"> wait ... </span>
        </div>
      </div>
    );
  }

  // Error state - SDK failed to load
  if (error) {
    return (
      <div className={`thesys-c1-error ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-red-800">Thesys C1 Error</span>
          </div>
          <p className="text-sm text-red-700 mb-3">{error}</p>
          {fallbackToJson && data && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                Show raw data
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-red-800 overflow-auto max-h-40">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  // No data
  if (!data) {
    return (
      <div className={`thesys-c1-empty ${className}`}>
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <span className="text-sm text-gray-500 italic">
            No UI component data available
          </span>
        </div>
      </div>
    );
  }

  // Check if this is streaming data (incomplete chunks)
  const isStreamingPlaceholder = data && data.streaming === true;
  
  // Skip validation for streaming placeholders
  let sanitizedData = data;
  if (!isStreamingPlaceholder) {
    // Security: Validate and sanitize the component data
    const securityValidation = validateC1Payload(data);
    if (!securityValidation.valid) {
      console.error('[ThesysUIRenderer] Security validation failed:', securityValidation.errors);
      
      return (
        <div className={`thesys-c1-security-error ${className}`}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="font-medium text-red-700">Security Validation Failed</span>
            </div>
            <ul className="list-disc list-inside text-sm text-red-600">
              {securityValidation.errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    
    // Use sanitized data
    sanitizedData = securityValidation.sanitized || data;
    
    // Validate the component data structure
    const isValid = validateC1Component(sanitizedData);
    if (!isValid) {
      console.error('[ThesysUIRenderer] Invalid C1 component structure');
      
      return (
        <div className={`thesys-c1-validation-error ${className}`}>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium text-yellow-700">Invalid Component Structure</span>
            </div>
            <p className="text-sm text-yellow-600">
              The component data does not match the expected C1 format.
            </p>
            {fallbackToJson && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-yellow-600 hover:text-yellow-700">
                  View raw data
                </summary>
                <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(sanitizedData, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
  }

  // Modules not loaded yet
  if (!modules?.C1Component || !modules?.ThemeProvider) {
    return (
      <div className={`thesys-c1-loading ${className}`}>
        <div className="p-4 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-500">
            Thesys C1 components not available
          </span>
        </div>
      </div>
    );
  }

  // Render C1 component with progressive rendering
  try {
    const streamingContent = sanitizedData && sanitizedData.content ? sanitizedData.content : '';
    
    const isInteractive = hasInteractiveElements(sanitizedData);
    
    // Convert sanitized data to string format expected by SDK
    // If already a string, use as-is; if object, stringify it
    const c1Response: string = typeof sanitizedData === 'string'
      ? sanitizedData
      : JSON.stringify(sanitizedData);
    
    // Show streaming indicator if streaming - try to render partial UI if possible
    if (isStreamingPlaceholder) {
      // Check if we have enough content to attempt partial rendering
      const hasPartialContent = streamingContent && streamingContent.length > 50;
      
      if (hasPartialContent) {
        // Try to render partial UI with streaming indicator
        try {
          return (
            <modules.ThemeProvider>
              <div className={`thesys-c1-container ${className}`}>
                {/* Streaming indicator banner */}
                <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded border border-purple-200">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="h-1.5 w-1.5 bg-purple-500 rounded-full animate-bounce"></span>
                    </div>
                    <span className="text-xs font-medium text-purple-700">
                      Streaming...
                    </span>
                  </div>
                </div>
                
                {/* Attempt to render partial content */}
                <div className="opacity-70 transition-opacity">
                  <Suspense fallback={
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  }>
                    <ProgressiveC1Component
                      C1Component={modules.C1Component}
                      c1Response={c1Response}
                      onAction={handleAction}
                    />
                  </Suspense>
                </div>
              </div>
            </modules.ThemeProvider>
          );
        } catch (error) {
          // If partial rendering fails, show loading indicator
          console.log('[ThesysUIRenderer] Partial render failed, showing loader');
        }
      }
      
      // Show loading indicator if no content yet or partial render failed
      return (
        <modules.ThemeProvider>
          <div className={`thesys-c1-container ${className}`}>
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <span className="h-2 w-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-2 w-2 bg-purple-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-2 w-2 bg-purple-500 rounded-full animate-bounce"></span>
                </div>
                <span className="text-sm font-medium text-purple-700">
                  Generating interactive UI...
                </span>
              </div>
            </div>
          </div>
        </modules.ThemeProvider>
      );
    }
    
    return (
      <modules.ThemeProvider>
        <div className={`thesys-c1-container ${className}`}>
          {/* Interactive indicator */}
          {isInteractive && (
            <div className="mb-2 flex items-center space-x-1 text-xs text-purple-600">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122" />
              </svg>
              <span>Interactive Component</span>
            </div>
          )}
          
          {/* Progressive rendering with Suspense for better perceived performance */}
          <Suspense fallback={
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          }>
            {/* C1 Component with ThemeProvider for theme context */}
            {/* NOTE: Nested button warning is expected from Thesys C1 SDK */}
            {/* The AccordionTrigger (button) contains an IconButton (button) */}
            {/* This is a known SDK issue and does not affect functionality */}
            {/* See: docs/THESYS_C1_NESTED_BUTTON_RESEARCH.md */}
            <ProgressiveC1Component
              C1Component={modules.C1Component}
              c1Response={c1Response}
              onAction={handleAction}
            />
          </Suspense>
        </div>
      </modules.ThemeProvider>
    );
  } catch (renderError: any) {
    const errorMessage = formatC1Error(renderError);
    console.error('[ThesysUIRenderer] Render error:', renderError);
    
    return (
      <div className={`thesys-c1-render-error ${className}`}>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-sm font-medium text-red-800">Render Error</span>
          </div>
          <p className="text-sm text-red-700 mb-3">{errorMessage}</p>
          {fallbackToJson && (
            <details className="text-xs">
              <summary className="cursor-pointer text-red-600 hover:text-red-800">
                Show component data
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-red-800 overflow-auto max-h-40">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
};

export default ThesysUIRenderer;
