/** @type {Boolean} whether to tile windows at creation or wait for user input. */
var AUTO_TILE = readConfig('auto-tile', true)
/** @type {Boolean} whether to append new tiles to the end of the list or insert at the beginning. */
var APPEND_TILES = readConfig('append-tiles', true)
/** @type {Boolean} whether to instead maximize a lone tile. */
var MAXIMIZE_SINGLE = readConfig('maximize-single', true)
/** @type {Number} gaps around the screen space and between tiles. */
var GAPS = readConfig('gaps', 12)
/** @type {Number} screen area split ratio between tiled windows. */
var SPLIT_RATIO = readConfig('split-ratio', 0.5)
/** @type {Number} split ratio step increment. */
var SPLIT_RATIO_STEP = readConfig('split-ratio-step', 0.05)

/**
 * Checks whether a window is cycleable.
 *
 * @param {KWin.Client} win the window.
 * @return {Boolean} whether the window is cycleable.
 */
function winCycleable(win) {
  return (win && win.closeable && win.managed && !win.deleted
    && !win.skipSwitcher && !win.skipTaskbar && !win.skipPager
      && win.desktop === workspace.currentDesktop
      && win.screen === workspace.activeScreen)
}

/**
 * Checks whether a window is tileable.
 *
 * @param {KWin.Client} win the window.
 * @return {Boolean} whether the window is tileable.
 */
function winTileable(win) {
  return (winCycleable(win) && win.moveable && win.resizeable
    && !win.transient && !win.specialWindow && !win.fullScreen)
}

/**
 * Checks whether a window is tiled.
 *
 * @param {KWin.Client} win the window.
 * @return {Boolean} whether the window is tiled.
 */
function winTiled(win) {
  return win.tiled
}

/**
 * Initializes a window.
 *
 * @param {KWin.Client} win the window.
 */
function winInit(win) {
  win.tiled = winTileable(win) && AUTO_TILE
  win.index = APPEND_TILES ? Infinity : -Infinity
}

/**
 * Sets the index of a window.
 *
 * @param {KWin.Client} win the window.
 * @param {Number} i the index.
 */
function winReorder(win, i) {
  win.index = i
}

/**
 * Compares two windows for sorting.
 *
 * @param {KWin.Client} win1 one window.
 * @param {KWin.Client} win2 the other window.
 * @return {Number} 1, 0 or -1.
 */
function winCompare(win1, win2) {
  return (!winTiled(win1) ? -1 : !winTiled(win2) ? 1 :
    win1.index > win2.index ? 1 : win1.index < win2.index ? -1 : 0)
}

/**
 * Swaps the index of two windows.
 *
 * @param {KWin.Client} win1 one window.
 * @param {KWin.Client} win2 the other window.
 */
function winSwap(win1, win2) {
  if (win1 && win2) {
    var t = win1.index
    win1.index = win2.index
    win2.index = t
  }
}

/**
 * Finds the neighbor of the active window inside an array.
 *
 * @param {[KWin.Client]} v the array.
 * @param {Number} n 1 for the next neighbor, -1 for the previous.
 * @return {KWin.Client?} the next or previous neighbor, or undefined.
 */
function winActiveNeighbor(v, n) {
  for (var i = 0; i < v.length; i++)
    if (v[i] == workspace.activeClient)
      return v[i + n] || v[n > 0 ? 0 : v.length - 1]
  return v[0]
}

/**
 * Retrieves a list of all cycleable windows sorted by index.
 *
 * @return {[KWin.Client]} the window list.
 */
function allCycleables() {
  return workspace.clientList().filter(winCycleable).sort(winCompare)
}

/**
 * Retrieves a list of all tiled windows sorted by index.
 *
 * @return {[KWin.Client]} the window list.
 */
function allTiles() {
  return allCycleables().filter(winTiled)
}

/**
 * Retrieves an area.
 *
 * @param {KWin.WorkspaceWrapper.ClientAreaOption} t the type of area.
 * @return {QRect} the retrieved area.
 */
function area(t) {
  return workspace.clientArea(t, workspace.activeScreen, workspace.currentDesktop)
}

/**
 * Trims an area.
 *
 * @param {QRect} area the area to cut.
 * @param {QRect} rect the amount to cut.
 * @return {QRect} the trimmed area.
 */
function areaTrim(area, rect) {
  return {
    x:      area.x      + (rect.x || 0),
    y:      area.y      + (rect.y || 0),
    width:  area.width  - (rect.x || 0) - (rect.width  || 0),
    height: area.height - (rect.y || 0) - (rect.height || 0),
  }
}

/**
 * Applies gaps to an area.
 *
 * @param {QRect} area the area to apply gaps.
 * @return {QRect} the gapped area.
 */
function areaGap(area) {
  return areaTrim(area, {x: GAPS, y: GAPS, width: GAPS, height: GAPS})
}

/**
 * Retrieves a portion of an area.
 *
 * @param {QRect} area the area to retrieve from.
 * @param {String} part the portion of the area to retrieve.
 * @return {QRect} the retrieved portion of the area.
 */
function areaFillPart(area, part) {
  return areaTrim(area, {
    left:  {width:  area.width  * (1 - SPLIT_RATIO)},
    up:    {height: area.height * (1 - SPLIT_RATIO)},
    right: {x:      area.width  * SPLIT_RATIO},
    down:  {y:      area.height * SPLIT_RATIO},
  }[part])
}

/**
 * Applies the layout to a tile.
 *
 * @param {{area: QRect, part: String?}} the current state.
 * @param {KWin.Client} win the tile to apply.
 * @param {Number} i the tile's index within the array.
 * @param {[KWin.Client]} wins the tile array.
 * @return {{area: QRect, part: String}} the new state.
 */
function layoutApply(state, win, i, wins) {
  if (!state.part)
    state.part = state.area.width > state.area.height ? 'left' : 'up'
  if (wins.length === 1 && MAXIMIZE_SINGLE)
    win.geometry = area(KWin.MaximizeArea)
  else if (i >= wins.length - 1)
    win.geometry = areaGap(state.area)
  else
    win.geometry = areaGap(areaFillPart(state.area, state.part))
  state.area = areaFillPart(state.area, {
    left: 'right', up: 'down', right: 'left', down: 'up',
  }[state.part])
  state.part = {
    left: 'up', up: 'right', right: 'down', down: 'left',
  }[state.part]
  return state
}

/**
 * Refreshes the layout.
 */
function layoutRefresh() {
  allCycleables().forEach(winReorder)
  allTiles().reduce(layoutApply, {area: areaGap(area(KWin.PlacementArea))})
}

/**
 * Toggles whether the active window is tiled.
 */
function slotToggle() {
  if (workspace.activeClient)
    workspace.activeClient.tiled = !workspace.activeClient.tiled
  layoutRefresh()
}

/**
 * Cycles between cycleable windows.
 *
 * @param {Number} 1 to cycle forward, -1 backward.
 */
function slotCycle(n) {
  workspace.activeClient = winActiveNeighbor(allCycleables(), n)
}

/**
 * Swaps the index of the active window with the windows.
 *
 * @param {Number} 1 to swap forward, -1 backward.
 */
function slotSwap(n) {
  winSwap(workspace.activeClient, winActiveNeighbor(allTiles(), n))
  layoutRefresh()
}

/**
 * Increments or decrements the split ratio.
 *
 * @param {Number} 1 to increment, -1 decrement.
 */
function slotSplit(n) {
  SPLIT_RATIO += SPLIT_RATIO_STEP * n
  layoutRefresh()
}

workspace.clientAdded.connect(winInit)
workspace.clientRemoved.connect(layoutRefresh)
workspace.clientActivated.connect(layoutRefresh)
workspace.currentDesktopChanged.connect(layoutRefresh)

registerShortcut('TilingClose',
  'Tiling: Close',
  'Alt+C',
  workspace.slotWindowClose)
registerShortcut('TilingNextDesktop',
  'Tiling: Next Desktop',
  'Alt+D',
  workspace.slotSwitchDesktopNext)
registerShortcut('TilingPreviousDesktop',
  'Tiling: Previous Desktop',
  'Alt+U',
  workspace.slotSwitchDesktopPrevious)
registerShortcut('TilingToNextDesktop',
  'Tiling: To Next Desktop',
  'Alt+Shift+D',
  workspace.slotWindowToNextDesktop)
registerShortcut('TilingToPreviousDesktop',
  'Tiling: To Previous Desktop',
  'Alt+Shift+U',
  workspace.slotWindowToPreviousDesktop)
registerShortcut('TilingToggle',
  'Tiling: Toggle',
  'Alt+M',
  slotToggle)
registerShortcut('TilingCycleNext',
  'Tiling: Cycle Next',
  'Alt+J',
  function() {
    slotCycle(1)
  })
registerShortcut('TilingCyclePrevious',
  'Tiling: Cycle Previous',
  'Alt+K',
  function() {
    slotCycle(-1)
  })
registerShortcut('TilingSwapNext',
  'Tiling: Swap Next',
  'Alt+Shift+J',
  function() {
    slotSwap(1)
  })
registerShortcut('TilingSwapPrevious',
  'Tiling: Swap Previous',
  'Alt+Shift+K',
  function() {
    slotSwap(-1)
  })
registerShortcut('TilingIncreaseSplit',
  'Tiling: Increase Split',
  'Alt+L',
  function() {
    slotSplit(1)
  })
registerShortcut('TilingDecreaseSplit',
  'Tiling: Decrease Split',
  'Alt+H',
  function() {
    slotSplit(-1)
  })
