import { useMemo } from 'react';
import { Blocks, DataIcon, FileIcon, GearIcon, LightningIcon, AttachmentIcon, UserIcon, SaveIcon } from '@librechat/client';
import { Settings2, ArrowRightToLine, Image, Video, Code, Palette, BarChart3, CreditCard, LayoutDashboard } from 'lucide-react';
import {
  Permissions,
  EModelEndpoint,
  PermissionTypes,
  isParamEndpoint,
  isAssistantsEndpoint,
} from 'librechat-data-provider';
import type { TInterfaceConfig, TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import PanelSwitch from '~/components/SidePanel/Builder/PanelSwitch';
import Parameters from '~/components/SidePanel/Parameters/Panel';
import { useGetStartupConfig } from '~/data-provider';
import { useHasAccess } from '~/hooks';
import React from 'react';

// Functional components for new AI tools
const ImageGenerationPanel = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Image Generation'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Generate images from text prompts in Arabic or English'),
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Prompt'),
      React.createElement('textarea', { 
        className: 'w-full p-2 border rounded-md', 
        rows: 3, 
        placeholder: 'Describe the image you want to generate...' 
      })
    ),
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Style'),
      React.createElement('select', { className: 'w-full p-2 border rounded-md' },
        React.createElement('option', null, 'Realistic'),
        React.createElement('option', null, 'Artistic'),
        React.createElement('option', null, 'Cartoon')
      )
    ),
    React.createElement('button', { 
      className: 'w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600' 
    }, 'Generate Image')
  )
);

const VideoGenerationPanel = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Video Generation'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Create videos from text prompts or templates'),
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Prompt'),
      React.createElement('textarea', { 
        className: 'w-full p-2 border rounded-md', 
        rows: 3, 
        placeholder: 'Describe the video you want to generate...' 
      })
    ),
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Duration'),
      React.createElement('select', { className: 'w-full p-2 border rounded-md' },
        React.createElement('option', null, 'Short (15 seconds)'),
        React.createElement('option', null, 'Medium (30 seconds)'),
        React.createElement('option', null, 'Long (60 seconds)')
      )
    ),
    React.createElement('button', { 
      className: 'w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600' 
    }, 'Generate Video')
  )
);

const CodeGenerationPanel = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Code Generation'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Generate code in multiple programming languages'),
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Description'),
      React.createElement('textarea', { 
        className: 'w-full p-2 border rounded-md', 
        rows: 3, 
        placeholder: 'Describe the code you want to generate...' 
      })
    ),
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Language'),
      React.createElement('select', { className: 'w-full p-2 border rounded-md' },
        React.createElement('option', null, 'JavaScript'),
        React.createElement('option', null, 'Python'),
        React.createElement('option', null, 'Java'),
        React.createElement('option', null, 'C++')
      )
    ),
    React.createElement('button', { 
      className: 'w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600' 
    }, 'Generate Code')
  )
);

const DesignAnalysisPanel = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Design Analysis'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Analyze Figma designs and convert to prompts'),
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', null,
      React.createElement('label', { className: 'block text-sm font-medium mb-2' }, 'Upload Design'),
      React.createElement('input', { 
        type: 'file', 
        className: 'w-full p-2 border rounded-md',
        accept: '.fig,.json'
      })
    ),
    React.createElement('button', { 
      className: 'w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600' 
    }, 'Analyze Design')
  )
);

const UsageAnalyticsPanel = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Usage Analytics'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Track your AI tool usage and statistics'),
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', { className: 'bg-gray-100 p-4 rounded-md' },
      React.createElement('h4', { className: 'font-medium mb-2' }, 'This Month'),
      React.createElement('div', { className: 'space-y-2' },
        React.createElement('div', { className: 'flex justify-between' },
          React.createElement('span', null, 'Images Generated'),
          React.createElement('span', null, '0')
        ),
        React.createElement('div', { className: 'flex justify-between' },
          React.createElement('span', null, 'Videos Created'),
          React.createElement('span', null, '0')
        ),
        React.createElement('div', { className: 'flex justify-between' },
          React.createElement('span', null, 'Code Generated'),
          React.createElement('span', null, '0')
        )
      )
    )
  )
);

const SubscriptionPanel = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Subscription'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Manage your subscription plan'),
  React.createElement('div', { className: 'space-y-4' },
    React.createElement('div', { className: 'bg-gray-100 p-4 rounded-md' },
      React.createElement('h4', { className: 'font-medium mb-2' }, 'Current Plan'),
      React.createElement('p', { className: 'text-lg font-bold' }, 'Free'),
      React.createElement('button', { 
        className: 'w-full bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 mt-4' 
      }, 'Upgrade Plan')
    )
  )
);

const UnifiedDashboard = () => React.createElement('div', { className: 'p-4' }, 
  React.createElement('h3', { className: 'text-lg font-semibold mb-4' }, 'Dashboard'),
  React.createElement('p', { className: 'text-sm text-gray-600 mb-4' }, 'Overview of all AI tools and services'),
  React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
    React.createElement('div', { className: 'bg-blue-100 p-4 rounded-md text-center' },
      React.createElement('div', { className: 'text-2xl mb-2' }, '🖼️'),
      React.createElement('h4', { className: 'font-medium' }, 'Images'),
      React.createElement('p', { className: 'text-sm' }, '0 generated')
    ),
    React.createElement('div', { className: 'bg-green-100 p-4 rounded-md text-center' },
      React.createElement('div', { className: 'text-2xl mb-2' }, '🎬'),
      React.createElement('h4', { className: 'font-medium' }, 'Videos'),
      React.createElement('p', { className: 'text-sm' }, '0 created')
    ),
    React.createElement('div', { className: 'bg-purple-100 p-4 rounded-md text-center' },
      React.createElement('div', { className: 'text-2xl mb-2' }, '💻'),
      React.createElement('h4', { className: 'font-medium' }, 'Code'),
      React.createElement('p', { className: 'text-sm' }, '0 generated')
    ),
    React.createElement('div', { className: 'bg-orange-100 p-4 rounded-md text-center' },
      React.createElement('div', { className: 'text-2xl mb-2' }, '🎨'),
      React.createElement('h4', { className: 'font-medium' }, 'Designs'),
      React.createElement('p', { className: 'text-sm' }, '0 analyzed')
    )
  )
);

export default function useSideNavLinks({
  hidePanel,
  keyProvided,
  endpoint,
  endpointType,
  interfaceConfig,
  endpointsConfig,
}: {
  hidePanel: () => void;
  keyProvided: boolean;
  endpoint?: EModelEndpoint | null;
  endpointType?: EModelEndpoint | null;
  interfaceConfig: Partial<TInterfaceConfig>;
  endpointsConfig: TEndpointsConfig;
}) {
  const { data: startupConfig } = useGetStartupConfig();

  const Links = useMemo(() => {
    const links: NavLink[] = [];
    
    // Assistant Builder (if applicable)
    if (
      isAssistantsEndpoint(endpoint) &&
      ((endpoint === EModelEndpoint.assistants &&
        endpointsConfig?.[EModelEndpoint.assistants] &&
        endpointsConfig[EModelEndpoint.assistants].disableBuilder !== true) ||
        (endpoint === EModelEndpoint.azureAssistants &&
          endpointsConfig?.[EModelEndpoint.azureAssistants] &&
          endpointsConfig[EModelEndpoint.azureAssistants].disableBuilder !== true)) &&
      keyProvided
    ) {
      links.push({
        title: 'com_sidepanel_assistant_builder',
        label: '',
        icon: Blocks,
        id: EModelEndpoint.assistants,
        Component: PanelSwitch,
      });
    }

    // Parameters (if applicable)
    if (
      interfaceConfig.parameters === true &&
      isParamEndpoint(endpoint ?? '', endpointType ?? '') === true &&
      keyProvided
    ) {
      links.push({
        title: 'com_sidepanel_parameters',
        label: '',
        icon: Settings2,
        id: 'parameters',
        Component: Parameters,
      });
    }

    // Hide Panel
    links.push({
      title: 'com_sidepanel_hide_panel',
      label: '',
      icon: ArrowRightToLine,
      onClick: hidePanel,
      id: 'hide-panel',
    });

    return links;
  }, [
    endpointsConfig,
    interfaceConfig.parameters,
    keyProvided,
    endpointType,
    endpoint,
    hidePanel,
  ]);

  return Links;
}
