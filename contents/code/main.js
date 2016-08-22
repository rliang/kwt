/** @type {Boolean} whether to tile windows at creation or wait for user input. */
var AUTO_TILE = readConfig('auto-tile', true);
/** @type {Boolean} whether to append new tiles to the end of the list or insert at the beginning. */
var APPEND_TILES = readConfig('append-tiles', true);
/** @type {Boolean} whether to instead maximize a lone tile. */
var MAXIMIZE_SINGLE = readConfig('maximize-single', true);
/** @type {[Number]} top margin around the screen's usable space. */
var MARGIN_TOP = readConfig('screen-margin-top', 6);
/** @type {[Number]} bottom margin around the screen's usable space. */
var MARGIN_BOTTOM = readConfig('screen-margin-bottom', 6);
/** @type {[Number]} left margin around the screen's usable space. */
var MARGIN_LEFT = readConfig('screen-margin-left', 6);
/** @type {[Number]} right margin around the screen's usable space. */
var MARGIN_RIGHT = readConfig('screen-margin-right', 6);
/** @type {Number} margin around each side of each tiled window. */
var TILE_MARGIN = readConfig('tile-margin', 6);
/** @type {Number} screen area split ratio between tiled windows. */
var SPLIT_RATIO = readConfig('split-ratio', 0.5);
/** @type {Number} split ratio step increment. */
var SPLIT_RATIO_STEP = readConfig('split-ratio-step', 0.05);

/**
 * Finds out whether a window contains the pointer.
 *
 * @param {[?]} array the array.
 * @param {?} el the element which to find the neighbor.
 * @param {Number} n 1 for the next neighbor, -1 for the previous.
 * @return {?} the neighbor element, or undefined.
 */
function neighbor(array, el, n) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] != el)
      continue;
    var k = i + n;
    if (k >= array.length)
      return array[0];
    if (k <= 0)
      return array[array.length - 1];
    return array[k];
  }
}

/**
 * Applies a margin.
 *
 * @param {QRect} margin the margin.
 * @param {QRect} area the area.
 * @return {QRect} the new area.
 */
function margin(margin, area) {
  return {
    x: area.x + (margin.x || 0),
    y: area.y + (margin.y || 0),
    width: area.width - (margin.width || 0) - (margin.x || 0),
    height: area.height - (margin.height || 0) - (margin.y || 0),
  }
}

/**
 * Finds out whether a window should be focused when cycled.
 *
 * @param {KWin.Client} win the window.
 * @return {Boolean} whether the window is focusable.
 */
function isFocusable(win) {
  if (!win)
    return false;
  if (win.skipSwitcher || win.skipTaskbar || win.skipPager)
    return false;
  if (win.screen !== workspace.activeScreen || win.desktop !== workspace.currentDesktop)
    return false;
  return true;
}

/**
 * Finds out whether a window can be tiled.
 *
 * @param {KWin.Client} win the window.
 * @return {Boolean} whether the window can be tiled.
 */
function isTileable(win) {
  if (!isFocusable(win))
    return false;
  if (!win.moveable || !win.resizeable)
    return false;
  return true;
}

/**
 * Finds out whether a window is currently a tile.
 *
 * @param {KWin.Client} win the window.
 * @return {Boolean} whether the window is currently a tile.
 */
function isTiling(win) {
  return win.tiling && !win.fullScreen;
}

/**
 * Toggles whether a window is a tile, if possible.
 *
 * @param {KWin.Client} win the window.
 * @param {Boolean} tiling whether the window is a tile.
 */
function setTiling(win, tiling) {
  if (!isTileable(win))
    return;
  win.tiling = tiling;
  if (win.tiling) {
    win.order = APPEND_TILES ? Infinity : -Infinity;
    win.rect = win.geometry;
  } else {
    win.geometry = win.rect;
  }
}

/**
 * Toggles whether a window is a tile, if possible.
 *
 * @param {KWin.Client} win the window to toggle.
 */
function toggleTiling(win) {
  setTiling(win, !win.tiling);
}

/**
 * Sets the order of a window.
 *
 * @param {KWin.Client} win the window.
 * @param {Number} i the order.
 */
function setOrder(win, i) {
  win.order = i;
}

/**
 * Compares two windows for sorting.
 *
 * @param {KWin.Client} win1 one window.
 * @param {KWin.Client} win2 the other window.
 * @return {Boolean} 1, 0 or -1.
 */
function compare(win1, win2) {
  return !win1.tiling ? -1 : !win2.tiling ? 1 :
    win1.order > win2.order ? 1 :
    win1.order < win2.order ? -1 : 0;
}

/**
 * Swaps the order of two windows.
 *
 * @param {KWin.Client} win1 one window.
 * @param {KWin.Client} win2 the other window.
 */
function swap(win1, win2) {
  if (!win1 || !win2)
    return;
  var tmp = win1.order;
  win1.order = win2.order;
  win2.order = tmp;
}

/**
 * Initializes a newly created window.
 *
 * Makes it a tile if possible.
 *
 * @param {KWin.Client} win the window to initialize.
 */
function init(win) {
  setTiling(win, AUTO_TILE);
}

/**
 * Move-resizes a tile, subtracting the occupied area from the remaining
 * area.
 *
 * Will also apply the tile margin and un-minimize and un-maximize it if
 * needed.
 *
 * @param {KWin.Client} win the tile to move-resize.
 * @param {QRect} area the area to fill.
 */
function resize(win, area) {
  win.minimized = false;
  var m = {x: TILE_MARGIN, y: TILE_MARGIN, width: TILE_MARGIN, height: TILE_MARGIN};
  win.geometry = margin(m, area);
}

/**
 * Tiles a single window according to the layout.
 *
 * Fills a given part of the remaining area according to the split ratio.
 *
 * @param {{area: QRect, part: String|undefined}} the state.
 * @param {KWin.Client} win the window to lay out.
 * @return {{area: QRect, part: String}} the new state.
 */
function spiral(state, win) {
  var area = state.area;
  var ratio = SPLIT_RATIO;
  var fill = {
    left: margin({width: area.width * (1 - ratio)}, state.area),
    up: margin({height: area.height * (1 - ratio)}, state.area),
    right: margin({x: area.width * ratio}, state.area),
    down: margin({y: area.height * ratio}, state.area),
  };
  var next = {left: 'up', up: 'right', right: 'down', down: 'left'};
  var opposite = {left: 'right', up: 'down', right: 'left', down: 'up'};
  if (!state.part)
    state.part = area.width > area.height ? 'left' : 'up';
  resize(win, fill[state.part]);
  return {part: next[state.part], area: fill[opposite[state.part]]};
}

/**
 * Reductor method to lay out a single tile.
 *
 * @param {{area: [Number]}} state the remaining available area and other
 * state information set by internal methods.
 * @param {KWin.Client} win the current window.
 * @param {Number} i the current window index.
 * @param {[KWin.Client]} wins all the windows.
 * @return {{area: [Number]}} the currently reduced state.
 */
function layout(state, win, i, wins) {
  if (MAXIMIZE_SINGLE && wins.length <= 1) {
    win.geometry = workspace.clientArea(KWin.MaximizeArea, workspace.activeScreen, workspace.currentDesktop);
    return state;
  }
  if (i >= wins.length - 1) {
    resize(win, state.area);
    return state;
  }
  return spiral(state, win);
}

/**
 * Retrieves the ordered list of focusable windows.
 *
 * @return {[KWin.Client]} the windows.
 */
function getWindows() {
  return workspace.clientList().filter(isFocusable).sort(compare);
}

/**
 * Retrieves ordered list of tiles.
 *
 * @return {[KWin.Client]} the current tiles.
 */
function getTiles() {
  return getWindows().filter(isTiling);
}

/**
 * Refreshes all the tiles' positions.
 */
function refresh() {
  getWindows().forEach(setOrder);
  var m = {x: MARGIN_LEFT, y: MARGIN_TOP, width: MARGIN_RIGHT, height: MARGIN_BOTTOM};
  var area = workspace.clientArea(KWin.PlacementArea, workspace.activeScreen, workspace.currentDesktop);
  getTiles().reduce(layout, {area: margin(m, area)});
}

/**
 * Toggles whether the currently focused window is a tile, if possible.
 */
function toggleTile() {
  toggleTiling(workspace.activeClient);
  refresh();
}

/**
 * Focuses a neighbor window in-order.
 *
 * @param {Number} n 1 to focus the next, -1 the previous.
 */
function focusNeighbor(n) {
  workspace.activeClient = neighbor(getWindows(), workspace.activeClient, n);
  refresh();
}

/**
 * Focuses the next window.
 */
function focusNext() {
  focusNeighbor(1);
}

/**
 * Focuses the previous window.
 */
function focusPrevious() {
  focusNeighbor(-1);
}

/**
 * Swaps the currently focused tile with a neighbor tile.
 *
 * @param {Number} n 1 to swap forward, -1 backward.
 */
function swapNeighborTile(n) {
  swap(workspace.activeClient, neighbor(getTiles(), workspace.activeClient, n));
  refresh();
}

/**
 * Swaps the currenly focused tile with the next tile.
 */
function swapNextTile() {
  swapNeighborTile(1);
}

/**
 * Swaps the currenly focused tile with the previous tile.
 */
function swapPreviousTile() {
  swapNeighborTile(-1);
}

/**
 * Increments the split ratio by the split step times a given multiplier.
 *
 * @param {Number} n 1 to increase, -1 to decrease.
 */
function incrementSplitRatio(n) {
  SPLIT_RATIO += SPLIT_RATIO_STEP * n;
  refresh();
}

/**
 * Increases the split ratio.
 */
function increaseSplitRatio() {
  incrementSplitRatio(1);
}

/**
 * Decreases the split ratio.
 */
function decreaseSplitRatio() {
  incrementSplitRatio(-1);
}

registerShortcut('TileToggle', 'Toggle Tiling',
  'Meta+M', toggleTile);
registerShortcut('TileActivateNext', 'Activate Next Tile',
  'Meta+J', focusNext);
registerShortcut('TileActivatePrevious', 'Activate Previous Tile',
  'Meta+K', focusPrevious);
registerShortcut('TileSwapNext', 'Swap Next Tile',
  'Meta+Shift+J', swapNextTile);
registerShortcut('TileSwapPrevious', 'Swap Previous Tile',
  'Meta+Shift+K', swapPreviousTile);
registerShortcut('TileSplitIncrease', 'Increase Tiling Split Ratio',
  'Meta+L', increaseSplitRatio);
registerShortcut('TileSplitDecrease', 'Decrease Tiling Split Ratio',
  'Meta+H', decreaseSplitRatio);

workspace.clientAdded.connect(init);
workspace.clientActivated.connect(refresh);
workspace.clientRemoved.connect(refresh);
workspace.currentDesktopChanged.connect(refresh);

refresh();
