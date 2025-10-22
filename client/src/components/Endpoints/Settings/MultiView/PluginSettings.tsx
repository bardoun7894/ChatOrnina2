import Settings from '../Plugins';
import { useSetIndexOptions } from '~/hooks';
import { useChatContext } from '~/Providers';

export default function PluginsView({ conversation, models, isPreset = false }) {
  const { setOption, setTools, checkPluginSelection } = useSetIndexOptions(
    isPreset ? conversation : null,
  );
  if (!conversation) {
    return null;
  }

  return (
    <Settings
      conversation={conversation}
      setOption={setOption}
      setTools={setTools}
      checkPluginSelection={checkPluginSelection}
      models={models}
    />
  );
}
