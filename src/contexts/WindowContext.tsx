import React, { createContext, useContext, type ReactNode } from 'react';

interface WindowContextType {
  window: Window;
  document: Document;
}

const WindowContext = createContext<WindowContextType>({
  window: typeof window !== 'undefined' ? window : ({} as Window),
  document: typeof document !== 'undefined' ? document : ({} as Document),
});

export const useWindowContext = () => useContext(WindowContext);

interface WindowProviderProps {
  window?: Window;
  document?: Document;
  children: ReactNode;
}

export const WindowProvider: React.FC<WindowProviderProps> = ({
  window: propWindow,
  document: propDocument,
  children,
}) => {
  const value = React.useMemo(
    () => ({
      window: propWindow || (typeof window !== 'undefined' ? window : ({} as Window)),
      document: propDocument || (typeof document !== 'undefined' ? document : ({} as Document)),
    }),
    [propWindow, propDocument],
  );

  return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
};
