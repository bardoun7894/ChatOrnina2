import React, { useContext, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useRecoilState } from 'recoil';
import { Dropdown, ThemeContext } from '@librechat/client';
import ArchivedChats from './ArchivedChats';
import ToggleSwitch from '../ToggleSwitch';
import { useLocalize } from '~/hooks';
import store from '~/store';

const switches = [
  {
    stateAtom: store.autoScroll,
    localizationKey: 'com_nav_auto_scroll',
    switchId: 'autoScroll',
    hoverCardText: undefined,
    key: 'autoScroll',
  },
];

export const ThemeSelector = ({
  theme,
  onChange,
}: {
  theme: string;
  onChange: (value: string) => void;
}) => {
  const localize = useLocalize();

  const themeOptions = [
    { value: 'system', label: localize('com_nav_theme_system') },
    { value: 'dark', label: localize('com_nav_theme_dark') },
    { value: 'light', label: localize('com_nav_theme_light') },
  ];

  const labelId = 'theme-selector-label';

  return (
    <div className="flex items-center justify-between">
      <div id={labelId}>{localize('com_nav_theme')}</div>

      <Dropdown
        value={theme}
        onChange={onChange}
        options={themeOptions}
        sizeClasses="w-[180px]"
        testId="theme-selector"
        className="z-50"
        aria-labelledby={labelId}
      />
    </div>
  );
};

export const LangSelector = ({
  langcode,
  onChange,
}: {
  langcode: string;
  onChange: (value: string) => void;
}) => {
  const localize = useLocalize();

  const languageOptions = [
    { value: 'en', label: localize('com_nav_lang_english') },
    { value: 'ar', label: localize('com_nav_lang_arabic') },
  ];

  const labelId = 'language-selector-label';

  return (
    <div className="flex items-center justify-between">
      <div id={labelId}>{localize('com_nav_language')}</div>

      <Dropdown
        value={langcode}
        onChange={onChange}
        sizeClasses="[--anchor-max-height:256px]"
        options={languageOptions}
        className="z-50"
        aria-labelledby={labelId}
      />
    </div>
  );
};

function General() {
  const { theme, setTheme } = useContext(ThemeContext);

  const [langcode, setLangcode] = useRecoilState(store.lang);

  const changeTheme = useCallback(
    (value: string) => {
      setTheme(value);
    },
    [setTheme],
  );

  const changeLang = useCallback(
    (value: string) => {
      requestAnimationFrame(() => {
        document.documentElement.lang = value;
      });
      setLangcode(value);
      Cookies.set('lang', value, { expires: 365 });
    },
    [setLangcode],
  );

  return (
    <div className="flex flex-col gap-3 p-1 text-sm text-text-primary">
      <div className="pb-3">
        <ThemeSelector theme={theme} onChange={changeTheme} />
      </div>
      <div className="pb-3">
        <LangSelector langcode={langcode} onChange={changeLang} />
      </div>
      {switches.map((config) => (
        <div key={config.key} className="pb-3">
          <ToggleSwitch
            stateAtom={config.stateAtom}
            localizationKey={config.localizationKey}
            hoverCardText={config.hoverCardText}
            switchId={config.switchId}
          />
        </div>
      ))}
      <div className="pb-3">
        <ArchivedChats />
      </div>
    </div>
  );
}

export default React.memo(General);
