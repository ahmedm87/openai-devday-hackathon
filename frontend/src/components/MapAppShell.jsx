import React, {useEffect, useState} from 'react';

export default function MapAppShell({sheetState, onKeyDown, children}) {
  const [height, setHeight] = useState(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => setHeight(viewport?.height || window.innerHeight);
    update(); viewport?.addEventListener('resize', update);
    return () => viewport?.removeEventListener('resize', update);
  }, []);
  return <main className={`map-app sheet-${sheetState}`} style={height ? {height, '--app-height': `${height}px`} : undefined} onKeyDown={onKeyDown}>{children}</main>;
}
