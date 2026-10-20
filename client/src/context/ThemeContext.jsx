import { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext(null);

/**
 * Theme Provider.
 * Manages dark/light mode preference. Checks localStorage first,
 * then falls back to OS-level media queries.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    // 1. Check local storage
    const saved = localStorage.getItem('spendsense-theme');
    if (saved) return saved;

    // 2. Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    // 3. Default to light
    return 'light';
  });

  useEffect(() => {
    // Apply to HTML element so CSS variables propagate
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('spendsense-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
