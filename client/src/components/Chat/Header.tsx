import { useMemo } from 'react';
import { useMediaQuery } from '@librechat/client';
import { useOutletContext } from 'react-router-dom';
import { getConfigDefaults } from 'librechat-data-provider';
import type { ContextType } from '~/common';
import ModelSelector from './Menus/Endpoints/ModelSelector';
import { HeaderNewChat, OpenSidebar } from './Menus';
import { useGetStartupConfig } from '~/data-provider';
import ExportAndShareMenu from './ExportAndShareMenu';
import { TemporaryChat } from './TemporaryChat';
import { useHasAccess } from '~/hooks';

const defaultInterface = getConfigDefaults().interface;

export default function Header() {
  const { data: startupConfig } = useGetStartupConfig();
  const { navVisible, setNavVisible } = useOutletContext<ContextType>();

  const interfaceConfig = useMemo(
    () => startupConfig?.interface ?? defaultInterface,
    [startupConfig],
  );

  const isSmallScreen = useMediaQuery('(max-width: 768px)');

  return (
    <div className="sticky top-0 z-10 flex h-14 w-full items-center justify-between bg-white p-2 font-semibold text-text-primary dark:bg-gray-800">
      <div className="hide-scrollbar flex w-full items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          <OpenSidebar setNavVisible={setNavVisible} />
          <HeaderNewChat isSmallScreen={isSmallScreen} />
        </div>
        <div className="flex items-center gap-2 flex-1 justify-center">
          <ModelSelector startupConfig={startupConfig} />
        </div>
        <div className="flex items-center gap-2">
          <TemporaryChat />
          <ExportAndShareMenu />
        </div>
      </div>
    </div>
  );
}
