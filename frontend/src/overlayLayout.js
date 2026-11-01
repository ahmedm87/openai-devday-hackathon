// Shared spacing for the floating panels and the horizontal map-control rail.
export function overlayLayout({height, topBoundary, dockTop = null, hintTop = null, dockBottom = 76, fitWidth = 0, edgeGap = 24, contextLeft = null, contextNaturalHeight = 0, leftBlocked = false}) {
  const contextTop = Math.ceil(topBoundary + 12);
  const lowerPanelTop = dockTop ?? hintTop;
  const sheetSpace = lowerPanelTop === null ? 76 : Math.ceil(height - lowerPanelTop + 12);
  const controlTop = height - sheetSpace - 44;
  const rightRoom = Math.floor(controlTop - contextTop - 12);
  const railWidth = 80 + (fitWidth > 0 ? Math.ceil(fitWidth) + 10 : 0);
  const controlsLeft = !leftBlocked && contextLeft !== null && contextLeft >= edgeGap + railWidth + 12 && contextNaturalHeight > rightRoom;
  const contextRoom = controlsLeft ? Math.floor((lowerPanelTop ?? height - 76) - contextTop - 12) : rightRoom;
  return {
    contextTop,
    sheetTop: contextTop,
    sheetSpace,
    zoomRight: edgeGap + (fitWidth > 0 ? Math.ceil(fitWidth) + 10 : 0),
    contextMaxHeight: Math.max(0, contextRoom),
    contextTight: contextRoom < 54,
    controlsLeft,
    sheetMaxHeight: Math.max(0, Math.floor(height - contextTop - dockBottom)),
  };
}
