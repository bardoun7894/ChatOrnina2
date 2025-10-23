import { atom } from 'recoil';

const lang = atom({
  key: 'lang',
  default: 'ar',
  effects_UNSTABLE: [
    ({ setSelf, onSet }) => {
      const savedValue = localStorage.getItem('lang');
      if (savedValue !== null) {
        // Since we're storing a string, no need to parse as JSON
        setSelf(savedValue);
      }

      onSet((newValue: string) => {
        localStorage.setItem('lang', newValue);
      });
    },
  ],
});

export default { lang };
