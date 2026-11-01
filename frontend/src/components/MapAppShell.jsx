import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {overlayLayout} from '../overlayLayout.js';

export default function MapAppShell({sheetState, searchOpen, decisionOpen, onKeyDown, children}) {
  const [height, setHeight] = useState(null);
  const rootRef = useRef(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    const update = () => setHeight(viewport?.height || window.innerHeight);
    update(); viewport?.addEventListener('resize', update);
    return () => viewport?.removeEventListener('resize', update);
  }, []);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const targets = ['.app-header', '.search-tabs', '.results-dock', '.fit-journey', '.empty-map-hint', '.layer-switcher'].map(selector => root.querySelector(selector)).filter(Boolean);
    const measure = () => {
      const bounds = root.getBoundingClientRect();
      const header = root.querySelector('.app-header')?.getBoundingClientRect();
      const search = root.querySelector('.search-tabs')?.getBoundingClientRect();
      const dock = root.querySelector('.results-dock')?.getBoundingClientRect();
      const fit = root.querySelector('.fit-journey')?.getBoundingClientRect();
      const hint = root.querySelector('.empty-map-hint')?.getBoundingClientRect();
      const context = root.querySelector('.layer-switcher');
      const contextBounds = context?.getBoundingClientRect();
      const notice = root.querySelector('.global-notice');
      const noticeBounds = notice && getComputedStyle(notice).visibility !== 'hidden' ? notice.getBoundingClientRect() : null;
      const styles = getComputedStyle(root);
      const edgeGap = parseFloat(styles.getPropertyValue('--edge-gap')) || 24;
      const lowerTop = dock?.top ?? hint?.top ?? bounds.bottom - 76;
      const railTop = lowerTop - 56;
      const railRight = bounds.left + edgeGap + 80 + (fit?.width ? fit.width + 10 : 0);
      const leftBlocked = !!noticeBounds && noticeBounds.left < railRight && noticeBounds.right > bounds.left + edgeGap && noticeBounds.top < railTop + 44 && noticeBounds.bottom > railTop;
      const layout = overlayLayout({height:bounds.height,
        topBoundary:Math.max(header?.bottom || bounds.top, search?.bottom || bounds.top)-bounds.top,
        dockTop:dock ? dock.top-bounds.top : null,
        hintTop:hint ? hint.top-bounds.top : null,
        dockBottom:parseFloat(styles.getPropertyValue('--dock-bottom')) || 76,
        fitWidth:fit?.width || 0, edgeGap,
        contextLeft:contextBounds ? contextBounds.left-bounds.left : null,
        contextNaturalHeight:context ? context.scrollHeight + 2 : 0, leftBlocked});
      const values = {'--context-top':layout.contextTop,'--context-max-height':layout.contextMaxHeight,'--sheet-top-limit':layout.sheetTop,'--sheet-space':layout.sheetSpace,'--sheet-max-height':layout.sheetMaxHeight,'--zoom-right':layout.zoomRight};
      Object.entries(values).forEach(([key,value]) => {const next=`${value}px`;if(root.style.getPropertyValue(key)!==next)root.style.setProperty(key,next);});
      root.dataset.contextTight=String(layout.contextTight);
      root.dataset.controlsSide=layout.controlsLeft ? 'left' : 'right';
    };
    const observer = new ResizeObserver(measure);
    [root,...targets].forEach(element => observer.observe(element));
    root.addEventListener('toggle',measure,true);
    measure();
    return () => {observer.disconnect();root.removeEventListener('toggle',measure,true);};
  }, [children,height,sheetState,searchOpen]);
  return <main ref={rootRef} className={`map-app sheet-${sheetState}${searchOpen ? ' search-open' : ''}${decisionOpen ? ' decision-open' : ''}`} style={height ? {height, '--app-height': `${height}px`} : undefined} onKeyDown={onKeyDown}>{children}</main>;
}
