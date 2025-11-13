/**
 * Thesys C1 Action Handlers
 * 
 * Comprehensive action handling for all C1 action types:
 * - continue_conversation: Send message back to API
 * - navigate: Navigate to different routes
 * - open_url: Open external URLs
 * - download: Download files
 * - copy_to_clipboard: Copy text to clipboard
 * - tool_call: Execute server-side tools/functions
 * - file_upload: Handle file uploads
 */

import { validateActionParams, isValidUrl } from './security';

export interface C1Action {
  type: string;
  params?: any;
  humanFriendlyMessage?: string;
}

export interface ActionHandlerContext {
  language: string;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setMessages: (updater: any) => void;
  messages: any[];
  saveConversation: (messages: any[]) => Promise<void>;
  router?: any; // Next.js router for navigation
}

/**
 * Handle continue_conversation action
 * Sends message back to Thesys C1 API
 */
export const handleContinueConversation = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const { language, setIsLoading, setError, setMessages, messages, saveConversation } = context;
  
  const actionMessage = action.params?.llmFriendlyMessage || action.humanFriendlyMessage || '';
  const actionImages = action.params?.images || [];
  
  try {
    setIsLoading(true);
    
    // Build message with images if present
    const messagePayload: any = {
      role: 'user',
      content: actionMessage
    };
    if (actionImages.length > 0) {
      messagePayload.images = actionImages;
    }
    
    const response = await fetch('/api/thesys-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [messagePayload],
        language
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.c1Component) {
      const aiMessageId = Date.now().toString();
      const aiMessage: any = {
        id: aiMessageId,
        content: { type: 'c1_component', data: data.c1Component },
        sender: 'ai' as const,
      };
      
      const updatedMessages = [...messages, aiMessage];
      setMessages(updatedMessages);
      await saveConversation(updatedMessages);
    }
  } catch (error) {
    console.error('[ActionHandler] Error in continue_conversation:', error);
    setError('Failed to process action');
  } finally {
    setIsLoading(false);
  }
};

/**
 * Handle navigate action
 * Navigate to different routes in the app
 */
export const handleNavigate = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const { router } = context;
  const path = action.params?.path || action.params?.url || '/';
  
  console.log('[ActionHandler] Navigate to:', path);
  
  if (router) {
    // Use Next.js router if available
    router.push(path);
  } else {
    // Fallback to window.location
    window.location.href = path;
  }
};

/**
 * Handle open_url action
 * Open external URLs in new tab
 */
export const handleOpenUrl = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const url = action.params?.url || action.params?.href;
  const target = action.params?.target || '_blank';
  
  if (!url) {
    console.error('[ActionHandler] No URL provided for open_url action');
    return;
  }
  
  console.log('[ActionHandler] Opening URL:', url);
  
  // Security: Validate URL
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
      window.open(url, target, 'noopener,noreferrer');
    } else {
      console.error('[ActionHandler] Invalid URL protocol:', urlObj.protocol);
    }
  } catch (error) {
    console.error('[ActionHandler] Invalid URL:', url, error);
  }
};

/**
 * Handle download action
 * Download files from URLs
 */
export const handleDownload = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const url = action.params?.url;
  const filename = action.params?.filename || 'download';
  
  if (!url) {
    console.error('[ActionHandler] No URL provided for download action');
    return;
  }
  
  console.log('[ActionHandler] Downloading:', url);
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('[ActionHandler] Download failed:', error);
    context.setError('Failed to download file');
  }
};

/**
 * Handle copy_to_clipboard action
 * Copy text to clipboard
 */
export const handleCopyToClipboard = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const text = action.params?.text || action.params?.content || '';
  
  if (!text) {
    console.error('[ActionHandler] No text provided for copy action');
    return;
  }
  
  console.log('[ActionHandler] Copying to clipboard');
  
  try {
    await navigator.clipboard.writeText(text);
    
    // Optional: Show success feedback
    // You could add a toast notification here
    console.log('[ActionHandler] ✅ Copied to clipboard');
  } catch (error) {
    console.error('[ActionHandler] Copy failed:', error);
    
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('[ActionHandler] ✅ Copied to clipboard (fallback)');
    } catch (fallbackError) {
      console.error('[ActionHandler] Fallback copy failed:', fallbackError);
      context.setError('Failed to copy to clipboard');
    }
    
    document.body.removeChild(textArea);
  }
};

/**
 * Handle tool_call action
 * Execute server-side tools/functions
 */
export const handleToolCall = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const { setIsLoading, setError } = context;
  const toolName = action.params?.tool || action.params?.function;
  const toolParams = action.params?.params || action.params?.arguments || {};
  
  if (!toolName) {
    console.error('[ActionHandler] No tool name provided');
    return;
  }
  
  console.log('[ActionHandler] Calling tool:', toolName, toolParams);
  
  try {
    setIsLoading(true);
    
    const response = await fetch('/api/thesys-tool-call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: toolName,
        params: toolParams
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('[ActionHandler] ✅ Tool call successful:', data.result);
      // Handle tool result (could trigger new C1 response)
    } else {
      throw new Error(data.error || 'Tool call failed');
    }
  } catch (error: any) {
    console.error('[ActionHandler] Tool call failed:', error);
    setError(`Tool call failed: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

/**
 * Handle file_upload action
 * Handle file uploads from C1 forms
 */
export const handleFileUpload = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  const { setIsLoading, setError, setMessages, messages, saveConversation, language } = context;
  const files = action.params?.files || [];
  const uploadUrl = action.params?.uploadUrl || '/api/c1-file-upload';
  const callback = action.params?.callback; // Optional: Send uploaded URLs back to C1
  
  if (!files || files.length === 0) {
    console.error('[ActionHandler] No files provided for upload');
    setError('No files selected');
    return;
  }
  
  console.log('[ActionHandler] Uploading files:', files.length);
  
  try {
    setIsLoading(true);
    
    const formData = new FormData();
    files.forEach((file: File, index: number) => {
      formData.append(`file${index}`, file);
    });
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success && data.files) {
      console.log('[ActionHandler] ✅ Files uploaded:', data.files);
      
      // If callback is specified, send uploaded file info back to C1
      if (callback) {
        const fileUrls = data.files.map((f: any) => f.url);
        const fileInfo = data.files.map((f: any) => ({
          url: f.url,
          filename: f.originalFilename,
          mimeType: f.mimeType,
          size: f.size
        }));
        
        // Send file info back to C1 API
        const callbackMessage = {
          role: 'user',
          content: `Files uploaded successfully: ${fileInfo.map((f: any) => f.filename).join(', ')}`
        };
        
        const c1Response = await fetch('/api/thesys-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [callbackMessage],
            language,
            context: {
              uploadedFiles: fileInfo
            }
          })
        });
        
        const c1Data = await c1Response.json();
        
        if (c1Data.success && c1Data.c1Component) {
          const aiMessageId = Date.now().toString();
          const aiMessage: any = {
            id: aiMessageId,
            content: { type: 'c1_component', data: c1Data.c1Component },
            sender: 'ai' as const,
          };
          
          const updatedMessages = [...messages, aiMessage];
          setMessages(updatedMessages);
          await saveConversation(updatedMessages);
        }
      }
      
      return data.files;
    } else {
      throw new Error(data.error || 'Upload failed');
    }
  } catch (error: any) {
    console.error('[ActionHandler] Upload failed:', error);
    setError(`Upload failed: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

/**
 * Main action handler dispatcher
 * Routes actions to appropriate handlers
 */
export const handleC1Action = async (
  action: C1Action,
  context: ActionHandlerContext
) => {
  console.log('[ActionHandler] Handling action:', action.type);
  
  // Security: Validate action parameters
  const validation = validateActionParams(action);
  if (!validation.valid) {
    console.error('[ActionHandler] Security validation failed:', validation.errors);
    context.setError(`Invalid action: ${validation.errors.join(', ')}`);
    return;
  }
  
  switch (action.type) {
    case 'continue_conversation':
      await handleContinueConversation(action, context);
      break;
      
    case 'navigate':
      await handleNavigate(action, context);
      break;
      
    case 'open_url':
      await handleOpenUrl(action, context);
      break;
      
    case 'download':
      await handleDownload(action, context);
      break;
      
    case 'copy_to_clipboard':
    case 'copy':
      await handleCopyToClipboard(action, context);
      break;
      
    case 'tool_call':
    case 'function_call':
      await handleToolCall(action, context);
      break;
      
    case 'file_upload':
    case 'upload':
      await handleFileUpload(action, context);
      break;
      
    default:
      console.warn('[ActionHandler] Unknown action type:', action.type);
      console.log('[ActionHandler] Action details:', action);
  }
};

export default handleC1Action;
