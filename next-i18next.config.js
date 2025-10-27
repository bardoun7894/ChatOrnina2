module.exports = {
  i18n: {
    defaultLocale: 'ar',
    locales: ['ar', 'en'],
  },
  fallbackLng: {
    default: ['en'],
  },
  debug: process.env.NODE_ENV === 'development',
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};
