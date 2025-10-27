declare module 'next-themes' {
  export interface UseThemeProps {
    theme?: string;
    setTheme: (theme: string) => void;
    forcedTheme?: string;
    resolvedTheme?: string;
    systemTheme?: string;
    themes: string[];
  }
  
  export function useTheme(): UseThemeProps;
  export function ThemeProvider({ children, attribute, defaultTheme, enableSystem, disableTransitionOnChange }: {
    children: React.ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
  }): JSX.Element;
}