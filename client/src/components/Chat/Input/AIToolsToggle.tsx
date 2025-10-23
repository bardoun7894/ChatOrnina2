import React, { useState } from 'react';
import { TooltipAnchor, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@librechat/client';
import { Image, Video, Code, Palette } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface AIToolsToggleProps {
  conversation: any;
}

export default function AIToolsToggle({ conversation }: AIToolsToggleProps) {
  const localize = useLocalize();
  const [activeTool, setActiveTool] = useState<string | null>(null);

  const handleToolSelect = (tool: string) => {
    setActiveTool(tool);
    // Here you would implement the actual AI tool functionality
    console.log(`Selected AI tool: ${tool}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <TooltipAnchor
          description={localize('com_ui_ai_tools')}
          className="inline-flex"
        >
          <button
            className={cn(
              'inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
              activeTool ? 'bg-blue-100 border-blue-300' : ''
            )}
          >
            <div className="flex items-center gap-2">
              <Image size={16} />
              <span className="hidden sm:inline">AI</span>
            </div>
          </button>
        </TooltipAnchor>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem onClick={() => handleToolSelect('image')} className="flex items-center gap-2">
          <Image size={16} />
          <span>{localize('com_ui_image_generation')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToolSelect('video')} className="flex items-center gap-2">
          <Video size={16} />
          <span>{localize('com_ui_video_generation')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToolSelect('code')} className="flex items-center gap-2">
          <Code size={16} />
          <span>{localize('com_ui_code_generation')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToolSelect('design')} className="flex items-center gap-2">
          <Palette size={16} />
          <span>{localize('com_ui_design_analysis')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

