import Emitter from '../module/emitter-component.js';
import Hammer from '../module/hammer.js';
import {
	disablePreventDefaultVertically,
	onTouch, onRelease
} from '../hammerUtil.js';
import {
	selectiveExtend, deepExtend, throttle, convert,
	addClassName, removeClassName, option, extend,
	addEventListener, removeEventListener
} from '../util.js';
import Activator from '../shared/Activator.js';
import TimeAxis from './component/TimeAxis.js';
import {
	toTime, updateHiddenDates, toScreen,
	convertHiddenOptions
} from './DateUtil.js'
import CustomTime from './component/CustomTime.js'

/**
 * Create a timeline visualization
 */
export default class Core {
	/**
	 * Create the main DOM for the Core: a root panel containing left, right,
	 * top, bottom, content, and background panel.
	 * @param {Element} container - The container element where the Core 
	 * will be attached.
	 * @protected
	 */
	_create(container) {
		this.dom = {
			container,
			root                : document.createElement('div'),
			background          : document.createElement('div'),
			backgroundVertical  : document.createElement('div'),
			backgroundHorizontal: document.createElement('div'),
			centerContainer     : document.createElement('div'),
			leftContainer       : document.createElement('div'),
			rightContainer      : document.createElement('div'),
			center              : document.createElement('div'),
			left                : document.createElement('div'),
			right               : document.createElement('div'),
			top                 : document.createElement('div'),
			bottom              : document.createElement('div'),
			shadowTop           : document.createElement('div'),
			shadowBottom        : document.createElement('div'),
			shadowTopLeft       : document.createElement('div'),
			shadowBottomLeft    : document.createElement('div'),
			shadowTopRight      : document.createElement('div'),
			shadowBottomRight   : document.createElement('div'),
		};

		this.dom.root.className                 = 'vis-timeline';
		this.dom.background.className           = 'vis-panel vis-background';
		this.dom.backgroundVertical.className   = 
			'vis-panel vis-background vis-vertical';
		this.dom.backgroundHorizontal.className = 
			'vis-panel vis-background vis-horizontal';
		this.dom.centerContainer.className      = 'vis-panel vis-center';
		this.dom.leftContainer.className        = 'vis-panel vis-left';
		this.dom.rightContainer.className       = 'vis-panel vis-right';
		this.dom.top.className                  = 'vis-panel vis-top';
		this.dom.bottom.className               = 'vis-panel vis-bottom';
		this.dom.left.className                 = 'vis-content';
		this.dom.center.className               = 'vis-content';
		this.dom.right.className                = 'vis-content';
		this.dom.shadowTop.className            = 'vis-shadow vis-top';
		this.dom.shadowBottom.className         = 'vis-shadow vis-bottom';
		this.dom.shadowTopLeft.className        = 'vis-shadow vis-top';
		this.dom.shadowBottomLeft.className     = 'vis-shadow vis-bottom';
		this.dom.shadowTopRight.className       = 'vis-shadow vis-top';
		this.dom.shadowBottomRight.className    = 'vis-shadow vis-bottom';

		this.dom.root.appendChild(this.dom.background);
		this.dom.root.appendChild(this.dom.backgroundVertical);
		this.dom.root.appendChild(this.dom.backgroundHorizontal);
		this.dom.root.appendChild(this.dom.centerContainer);
		this.dom.root.appendChild(this.dom.leftContainer);
		this.dom.root.appendChild(this.dom.rightContainer);
		this.dom.root.appendChild(this.dom.top);
		this.dom.root.appendChild(this.dom.bottom);

		this.dom.centerContainer.appendChild(this.dom.center);
		this.dom.leftContainer.appendChild(this.dom.left);
		this.dom.rightContainer.appendChild(this.dom.right);

		this.dom.centerContainer.appendChild(this.dom.shadowTop);
		this.dom.centerContainer.appendChild(this.dom.shadowBottom);
		this.dom.leftContainer.appendChild(this.dom.shadowTopLeft);
		this.dom.leftContainer.appendChild(this.dom.shadowBottomLeft);
		this.dom.rightContainer.appendChild(this.dom.shadowTopRight);
		this.dom.rightContainer.appendChild(this.dom.shadowBottomRight);

		this.on('rangechange', () => {
			if (this.initialDrawDone === true) this._redraw();
			// this allows overriding the _redraw method
		});
		this.on('touch',       this._onTouch.bind(this));
		this.on('pan',         this._onDrag.bind(this));

		this.on('_change', properties => {
			if (properties && properties.queue) {
				// redraw once on next tick
				if (!this._redrawTimer) {
					this._redrawTimer = setTimeout(() => {
						this._redrawTimer = null;
						this._redraw();
					}, 0);
				}
			} else {
				// redraw immediately
				this._redraw();
			}
		});

		// create event listeners for all interesting events, these events will be
		// emitted via emitter
		this.hammer = new Hammer(this.dom.root);
		let pinchRecognizer = this.hammer.get('pinch').set({enable: true});
		disablePreventDefaultVertically(pinchRecognizer);
		this.hammer.get('pan').set({
			threshold:5, direction: Hammer.DIRECTION_HORIZONTAL
		});
		this.listeners = {};

		const events = [
			'tap', 'doubletap', 'press',
			'pinch',
			'pan', 'panstart', 'panmove', 'panend'
		];
		events.forEach(type => {
			const listener = event => {
				if (this.isActive()) this.emit(type, event);
			}
			this.hammer.on(type, listener);
			this.listeners[type] = listener;
		});

		// emulate a touch event 
		// (emitted before the start of a pan, pinch, tap, or press)
		onTouch(this.hammer, event => {this.emit('touch', event)})

		// emulate a release event (emitted after a pan, pinch, tap, or press)
		onRelease(this.hammer, event => this.emit('release', event));

		const onMouseWheel = event => {
			if (this.isActive()) this.emit('mousewheel', event);
		}
		this.dom.root.addEventListener('mousewheel', onMouseWheel);
		this.dom.root.addEventListener('DOMMouseScroll', onMouseWheel);

		// size properties of each of the panels
		this.props = {
			root: {},
			background: {},
			centerContainer: {},
			leftContainer: {},
			rightContainer: {},
			center: {},
			left: {},
			right: {},
			top: {},
			bottom: {},
			border: {},
			scrollTop: 0,
			scrollTopMin: 0
		};

		this.customTimes = [];

		// store state information needed for touch events
		this.touch = {};

		this.redrawCount = 0;
		this.initialDrawDone = false;

		// attach the root panel to the provided container
		if (!container) throw new Error('No container provided');
		container.appendChild(this.dom.root);
	}

	/**
	 * Set options. Options will be passed to all components loaded 
	 * in the Timeline.
	 * @param {Object} [options]
	 * @param {string} [options.orientation=bottom] - vertical orientation for the
	 * Timeline, can be 'bottom' or 'top'.
	 * @param {string|number} [options.width='100%'] - width for the timeline,
	 * a number in pixels or a css string like '1000px' or '75%'. 
	 * @param {string|number} [options.height] - fixed height for the timeline, a
	 * number in pixels or a css string like '400px' or '75%'. If undefined,
	 * the Timeline will automatically size such that its contents fit.
	 * @param {string|number} [options.minHeight] - Minimum height for 
	 * the timeline, a number in pixels or a css string like '400px' or '75%'.
	 * @param {string|number} [options.maxHeight] - Maximum height for 
	 * the timeline, a number in pixels or a css string like '400px' or '75%'.
	 * @param {number|Date|string} [options.start] date for the visible window
	 * @param {number|Date|string} [options.end] date for the visible window
	 */
	setOptions(options) {
		if (options) {
			const fields = [
				'width', 'height', 'minHeight', 'maxHeight', 'autoResize',
				'start', 'end', 'clickToUse', 'dataAttributes', 'hiddenDates',
				'locale', 'locales', 'moment', 'rtl',
				'throttleRedraw'
			]
			selectiveExtend(fields, this.options, options);

			if (this.options.rtl) {
				var contentContainer = this.dom.leftContainer;
				this.dom.leftContainer = this.dom.rightContainer;
				this.dom.rightContainer = contentContainer;
				this.dom.container.style.direction = 'rtl';
				this.dom.backgroundVertical.className = 
					'vis-panel vis-background vis-vertical-rtl';
			}

			this.options.orientation = {item:undefined, axis:undefined};
			if ('orientation' in options) {
				if (typeof options.orientation === 'string') {
					this.options.orientation = {
						item: options.orientation,
						axis: options.orientation
					};
				}
				else if (typeof options.orientation === 'object') {
					if ('item' in options.orientation) {
						this.options.orientation.item = options.orientation.item;
					}
					if ('axis' in options.orientation) {
						this.options.orientation.axis = options.orientation.axis;
					}
				}
			}

			if (this.options.orientation.axis === 'both') {
				if (!this.timeAxis2) {
					var timeAxis2 = this.timeAxis2 = new TimeAxis(this.body);
					timeAxis2.setOptions = function (options) {
						var _options = options ? extend({}, options) : {};
						_options.orientation = 'top'; // override the orientation option, always top
						TimeAxis.prototype.setOptions.call(timeAxis2, _options);
					};
					this.components.push(timeAxis2);
				}
			}
			else {
				if (this.timeAxis2) {
					var index = this.components.indexOf(this.timeAxis2);
					if (index !== -1) {
						this.components.splice(index, 1);
					}
					this.timeAxis2.destroy();
					this.timeAxis2 = null;
				}
			}

			// if the graph2d's drawPoints is a function delegate the callback to the onRender property
			if (typeof options.drawPoints == 'function') {
				options.drawPoints = {
					onRender: options.drawPoints
				};
			}

			if ('hiddenDates' in this.options) {
				convertHiddenOptions(this.options.moment, this.body, this.options.hiddenDates);
			}

			if ('clickToUse' in options) {
				if (options.clickToUse) {
					if (!this.activator) {
						this.activator = new Activator(this.dom.root);
					}
				}
				else {
					if (this.activator) {
						this.activator.destroy();
						delete this.activator;
					}
				}
			}

			if ('showCustomTime' in options) {
				throw new Error('Option `showCustomTime` is deprecated. Create a custom time bar via timeline.addCustomTime(time [, id])');
			}

			// enable/disable autoResize
			this._initAutoResize();
		}

		// propagate options to all components
		this.components.forEach(component => component.setOptions(options));

		// enable/disable configure
		if ('configure' in options) {
			if (!this.configurator) {
				this.configurator = this._createConfigurator();
			}

			this.configurator.setOptions(options.configure);

			// collect the settings of all components, and pass them to the configuration system
			var appliedOptions = deepExtend({}, this.options);
			this.components.forEach(component => {
				deepExtend(appliedOptions, component.options);
			});
			this.configurator.setModuleOptions({global: appliedOptions});
		}

		// override redraw with a throttled version
		if (!this._origRedraw) {
			this._origRedraw = this._redraw.bind(this);
			this._redraw = throttle(this._origRedraw, this.options.throttleRedraw);
		} else {
			// Not the initial run: redraw everything
			this._redraw();
		}
	}

	/**
	 * Returns true when the Timeline is active.
	 * @returns {boolean}
	 */
	isActive() {
		return !this.activator || this.activator.active;
	}

	/**
	 * Destroy the Core, clean up all DOM elements and event listeners.
	 */
	destroy() {
		// unbind datasets
		this.setItems(null);
		this.setGroups(null);

		// remove all event listeners
		this.off();

		// stop checking for changed size
		this._stopAutoResize();

		// remove from DOM
		if (this.dom.root.parentNode) {
			this.dom.root.parentNode.removeChild(this.dom.root);
		}
		this.dom = null;

		// remove Activator
		if (this.activator) {
			this.activator.destroy();
			delete this.activator;
		}

		// cleanup hammer touch events
		for (var event in this.listeners) {
			if (this.listeners.hasOwnProperty(event)) {
				delete this.listeners[event];
			}
		}
		this.listeners = null;
		this.hammer = null;

		// give all components the opportunity to cleanup
		this.components.forEach(component => component.destroy());

		this.body = null;
	}

	/**
	 * Set a custom time bar
	 * @param {Date} time
	 * @param {number} [id=undefined] Optional id of the custom time bar to be adjusted.
	 */
	setCustomTime(time, id) {
		var customTimes = this.customTimes
			.filter(component => id === component.options.id);

		if (customTimes.length === 0) 
			throw new Error('No custom time bar found with id ' + JSON.stringify(id))

		if (customTimes.length > 0) customTimes[0].setCustomTime(time);
	}

	/**
	 * Retrieve the current custom time.
	 * @param {number} [id=undefined]    Id of the custom time bar.
	 * @return {Date | undefined} customTime
	 */
	getCustomTime(id) {
		var customTimes = this.customTimes
			.filter(component => id === component.options.id);

		if (customTimes.length === 0) {
			throw new Error('No custom time bar found with id ' + JSON.stringify(id))
		}
		return customTimes[0].getCustomTime();
	}

	/**
	 * Set a custom title for the custom time bar.
	 * @param {String} [title] Custom title
	 * @param {number} [id=undefined]    Id of the custom time bar.
	 */
	setCustomTimeTitle(title, id) {
		var customTimes = this.customTimes
			.filter(component => id === component.options.id);

		if (customTimes.length === 0) {
			throw new Error('No custom time bar found with id ' + JSON.stringify(id))
		}
		if (customTimes.length > 0) return customTimes[0].setCustomTitle(title);
	}

	/**
	 * Retrieve meta information from an event.
	 * Should be overridden by classes extending Core
	 * @param {Event} event
	 * @return {Object} An object with related information.
	 */
	getEventProperties(event) {
		return { event };
	}

	/**
	 * Add custom vertical bar
	 * @param {Date|string|number} [time=new Date()] A Date, unix timestamp, or
	 * ISO date string. Time point where the new bar should be places.
	 * @param {number|string} [id] of the new bar
	 * @return {number|string} id
	 */
	addCustomTime(time = new Date(), id) {
		time = convert(time, 'Date').valueOf()
		
		const exists = this.customTimes.some(customTime => 
			customTime.options.id === id);
		if (exists) 
			throw Error(`A custom time with id ${JSON.stringify(id)} already exists`);
		
		const customTime = new CustomTime(
			this.body, 
			extend({}, this.options, {time, id})
		);

		this.customTimes.push(customTime);
		this.components.push(customTime);
		this._redraw();

		return id;
	}

	/**
	 * Remove previously added custom bar
	 * @param {int} id ID of the custom bar to be removed
	 * @return {boolean} True if the bar exists and is removed, false otherwise
	 */
	removeCustomTime(id) {
		const customTimes = this.customTimes.filter(bar => bar.options.id === id);

		if (customTimes.length === 0)
			throw Error('No custom time bar found with id ' + JSON.stringify(id));
		
		customTimes.forEach(customTime => {
			this.customTimes.splice(this.customTimes.indexOf(customTime), 1);
			this.components.splice(this.components.indexOf(customTime), 1);
			customTime.destroy();
		});
	}

	/**
	 * Gets the id's of the currently visible items
	 * @returns {Array} the ids of the visible items
	 */
	getVisibleItems() {
		return this.itemSet && this.itemSet.getVisibleItems() || [];
	}

	/**
	 * Sets Core window such that it fits all items
	 * @param {Object} [options]
	 * @param {boolean|Object} [options.animation=true] - if true, the range
	 * is animated smoothly to the new window. An object can be provided to 
	 * specify duration and easing function.
	 * @param {number} [options.animation.duration=500] milliseconds
	 * @param {string} [options.animation.easingFunction=easeInOutQuad] -
	 * easing function to use.
	 */
	fit({animation = true} = {}) {
		const {min: rangeMin, max: rangeMax} = this.getDataRange();

		// skip range set if there is no min and max date
		if (rangeMin === null && rangeMax === null) return;

		const interval = rangeMax - rangeMin;
		const min = new Date(rangeMin.valueOf() - interval * 0.01);
		const max = new Date(rangeMax.valueOf() + interval * 0.01);
		this.range.setRange(min, max, animation);
	}

	/**
	 * Calculate the data range of the items start and end dates
	 * @returns {{min: Date | null, max: Date | null}}
	 * @protected
	 */
	getDataRange() {
		// must be implemented by Timeline and Graph2d
		throw new Error('Cannot invoke abstract method getDataRange');
	}

	/**
	 * Set the visible window. Both parameters are optional, you can change only
	 * start or only end. Syntax:
	 *
	 *     TimeLine.setWindow(start, end)
	 *     TimeLine.setWindow(start, end, options)
	 *     TimeLine.setWindow(range)
	 *
	 * Where start and end can be a Date, number, or string, and range is an
	 * object with properties start and end.
	 * 
	 * @param {Date|Number|String|Object} [start] - Start date of visible window
	 * @param {Date|Number|String} [end] - End date of visible window
	 * @param {Object} [options]
	 * @param {boolean|Object} [options.animation=true] - if true, the range
	 * is animated smoothly to the new window. An object can be provided to 
	 * specify duration and easing function.
	 * @param {number} [options.animation.duration=500] milliseconds
	 * @param {string} [options.animation.easingFunction=easeInOutQuad] -
	 * easing function to use.
	 */
	setWindow(start, end, options) {
		/* eslint-disable prefer-rest-params */
		let animation;
		if (arguments.length === 1) {
			({start, end, animation} = arguments[0]);
		} else {
			({animation} = options || {});
		}
		if (animation === undefined) animation = true;
		this.range.setRange(start, end, animation);
	}

	/**
	 * Move the window such that the given time is centered on screen.
	 * @param {Date|number|string} time
	 * @param {Object} [options]
	 * @param {boolean|Object} [options.animation=true] - if true, the range
	 * is animated smoothly to the new window. An object can be provided to 
	 * specify duration and easing function.
	 * @param {number} [options.animation.duration=500] milliseconds
	 * @param {string} [options.animation.easingFunction=easeInOutQuad] -
	 * easing function to use.
	 */
	moveTo(time, {animation = true} = {}) {
		const interval = this.range.end - this.range.start;
		time = convert(time, 'Date').valueOf();

		const start = time - interval / 2;
		const end = time + interval / 2;
		this.range.setRange(start, end, animation);
	}

	/**
	 * Get the visible window
	 * @return {{start: Date, end: Date}}   Visible range
	 */
	getWindow() {
		const range = this.range.getRange();
		return {
			start: new Date(range.start),
			end: new Date(range.end)
		};
	}

	/**
	 * Force a redraw. Can be overridden by implementations of Core
	 * Note: this function will be overridden on construction with 
	 * a trottled version
	 */
	redraw() {
		this._redraw();
	}

	/**
	 * Redraw for internal use. Redraws all components. See also the public
	 * method redraw.
	 * @protected
	 */
	_redraw() {
		this.redrawCount++;
		var resized = false;
		var options = this.options;
		var props = this.props;
		var dom = this.dom;

		// when destroyed, or invisible
		if (!dom || !dom.container || dom.root.offsetWidth == 0) return; 

		updateHiddenDates(this.options.moment, this.body, this.options.hiddenDates);

		// update class names
		if (options.orientation == 'top') {
			addClassName(dom.root, 'vis-top');
			removeClassName(dom.root, 'vis-bottom');
		}
		else {
			removeClassName(dom.root, 'vis-top');
			addClassName(dom.root, 'vis-bottom');
		}

		// update root width and height options
		dom.root.style.maxHeight = option.asSize(options.maxHeight, '');
		dom.root.style.minHeight = option.asSize(options.minHeight, '');
		dom.root.style.width = option.asSize(options.width, '');

		// calculate border widths
		props.border.left   = 
			(dom.centerContainer.offsetWidth - dom.centerContainer.clientWidth) / 2;
		props.border.right  = props.border.left;
		props.border.top    = 
			(dom.centerContainer.offsetHeight - dom.centerContainer.clientHeight) / 2;
		props.border.bottom = props.border.top;
		var borderRootHeight= dom.root.offsetHeight - dom.root.clientHeight;
		var borderRootWidth = dom.root.offsetWidth - dom.root.clientWidth;

		// workaround for a bug in IE: the clientWidth of an element with
		// a height:0px and overflow:hidden is not calculated and always has value 0
		if (dom.centerContainer.clientHeight === 0) {
			props.border.left = props.border.top;
			props.border.right  = props.border.left;
		}
		if (dom.root.clientHeight === 0) {
			borderRootWidth = borderRootHeight;
		}

		// calculate the heights. If any of the side panels is empty, 
		// we set the height to
		// minus the border width, such that the border will be invisible
		props.center.height = dom.center.offsetHeight;
		props.left.height   = dom.left.offsetHeight;
		props.right.height  = dom.right.offsetHeight;
		props.top.height    = dom.top.clientHeight    || -props.border.top;
		props.bottom.height = dom.bottom.clientHeight || -props.border.bottom;

		// TODO: compensate borders when any of the panels is empty.

		// apply auto height
		// TODO: only calculate autoHeight when needed 
		// (else we cause an extra reflow/repaint of the DOM)
		var contentHeight = 
			Math.max(props.left.height, props.center.height, props.right.height);
		var autoHeight = props.top.height + contentHeight + props.bottom.height +
			borderRootHeight + props.border.top + props.border.bottom;
		dom.root.style.height = option.asSize(options.height, autoHeight + 'px');

		// calculate heights of the content panels
		props.root.height = dom.root.offsetHeight;
		props.background.height = props.root.height - borderRootHeight;
		var containerHeight = props.root.height - props.top.height 
			- props.bottom.height -	borderRootHeight;
		props.centerContainer.height  = containerHeight;
		props.leftContainer.height    = containerHeight;
		props.rightContainer.height   = props.leftContainer.height;

		// calculate the widths of the panels
		props.root.width = dom.root.offsetWidth;
		props.background.width = props.root.width - borderRootWidth;
		props.left.width = dom.leftContainer.clientWidth   || -props.border.left;
		props.leftContainer.width = props.left.width;
		props.right.width = dom.rightContainer.clientWidth || -props.border.right;
		props.rightContainer.width = props.right.width;
		var centerWidth = props.root.width - props.left.width 
			- props.right.width - borderRootWidth;
		props.center.width          = centerWidth;
		props.centerContainer.width = centerWidth;
		props.top.width             = centerWidth;
		props.bottom.width          = centerWidth;

		// resize the panels
		dom.background.style.height           = props.background.height + 'px';
		dom.backgroundVertical.style.height   = props.background.height + 'px';
		dom.backgroundHorizontal.style.height = props.centerContainer.height + 'px';
		dom.centerContainer.style.height      = props.centerContainer.height + 'px';
		dom.leftContainer.style.height        = props.leftContainer.height + 'px';
		dom.rightContainer.style.height       = props.rightContainer.height + 'px';

		dom.background.style.width            = props.background.width + 'px';
		dom.backgroundVertical.style.width    = props.centerContainer.width + 'px';
		dom.backgroundHorizontal.style.width  = props.background.width + 'px';
		dom.centerContainer.style.width       = props.center.width + 'px';
		dom.top.style.width                   = props.top.width + 'px';
		dom.bottom.style.width                = props.bottom.width + 'px';

		// reposition the panels
		dom.background.style.left           = '0';
		dom.background.style.top            = '0';
		dom.backgroundVertical.style.left   =
			(props.left.width + props.border.left) + 'px';
		dom.backgroundVertical.style.top    = '0';
		dom.backgroundHorizontal.style.left = '0';
		dom.backgroundHorizontal.style.top  = props.top.height + 'px';
		dom.centerContainer.style.left      = props.left.width + 'px';
		dom.centerContainer.style.top       = props.top.height + 'px';
		dom.leftContainer.style.left        = '0';
		dom.leftContainer.style.top         = props.top.height + 'px';
		dom.rightContainer.style.left = 
			(props.left.width + props.center.width) + 'px';
		dom.rightContainer.style.top        = props.top.height + 'px';
		dom.top.style.left                  = props.left.width + 'px';
		dom.top.style.top                   = '0';
		dom.bottom.style.left               = props.left.width + 'px';
		dom.bottom.style.top                = 
			(props.top.height + props.centerContainer.height) + 'px';

		// update the scrollTop, feasible range for the offset can be changed
		// when the height of the Core or of the contents of the center changed
		this._updateScrollTop();

		// reposition the scrollable contents
		var offset = this.props.scrollTop;
		if (options.orientation.item != 'top') {
			offset += Math.max(
				this.props.centerContainer.height - this.props.center.height -
				this.props.border.top - this.props.border.bottom, 0);
		}
		dom.center.style.left = '0';
		dom.center.style.top  = offset + 'px';
		dom.left.style.left   = '0';
		dom.left.style.top    = offset + 'px';
		dom.right.style.left  = '0';
		dom.right.style.top   = offset + 'px';

		// show shadows when vertical scrolling is available
		var visibilityTop = this.props.scrollTop == 0 ? 'hidden' : '';
		var visibilityBottom = this.props.scrollTop == 
			this.props.scrollTopMin ? 'hidden' : '';
		dom.shadowTop.style.visibility          = visibilityTop;
		dom.shadowBottom.style.visibility       = visibilityBottom;
		dom.shadowTopLeft.style.visibility      = visibilityTop;
		dom.shadowBottomLeft.style.visibility   = visibilityBottom;
		dom.shadowTopRight.style.visibility     = visibilityTop;
		dom.shadowBottomRight.style.visibility  = visibilityBottom;

		// enable/disable vertical panning
		var contentsOverflow = 
			this.props.center.height > this.props.centerContainer.height;
		this.hammer.get('pan').set({
			direction: contentsOverflow 
				? Hammer.DIRECTION_ALL : Hammer.DIRECTION_HORIZONTAL
		});

		// redraw all components
		this.components.forEach(component => {
			resized = component.redraw() || resized;
		});
		var MAX_REDRAW = 5;
		if (resized) {
			if (this.redrawCount < MAX_REDRAW) {
				this.body.emitter.emit('_change');
				return;
			}
			else {
				console.log('WARNING: infinite loop in redraw?'); 
			}
		} else {
			this.redrawCount = 0;
		}
		this.initialDrawDone = true;

		//Emit public 'changed' event for UI updates, see issue #1592
		this.body.emitter.emit('changed');
	}

	/**
	 * Set a current time. This can be used for example to ensure that a client's
	 * time is synchronized with a shared server time.
	 * Only applicable when option `showCurrentTime` is true.
	 * @param {Date | String | Number} time     A Date, unix timestamp, or
	 *                                          ISO date string.
	 */
	setCurrentTime(time) {
		if (!this.currentTime) 
			throw new Error('Option showCurrentTime must be true');

		this.currentTime.setCurrentTime(time);
	}

	/**
	 * Get the current time.
	 * Only applicable when option `showCurrentTime` is true.
	 * @return {Date} Returns the current time.
	 */
	getCurrentTime() {
		if (!this.currentTime) 
			throw new Error('Option showCurrentTime must be true');

		return this.currentTime.getCurrentTime();
	}

	/**
	 * Convert a position on screen (pixels) to a datetime
	 * @param {int}     x    Position on the screen in pixels
	 * @return {Date}   time The datetime the corresponds with given position x
	 * @protected
	 * @todo Move this function to range
	 */
	_toTime(x) {
		return toTime(this, x, this.props.center.width);
	}

	/**
	 * Convert a position on the global screen (pixels) to a datetime
	 * @param {int}     x    Position on the screen in pixels
	 * @return {Date}   time The datetime the corresponds with given position x
	 * @protected
	 */
	// TODO: move this function to Range
	_toGlobalTime(x) {
		return toTime(this, x, this.props.root.width);
		//var conversion = this.range.conversion(this.props.root.width);
		//return new Date(x / conversion.scale + conversion.offset);
	}

	/**
	 * Convert a datetime (Date object) into a position on the screen
	 * @param {Date}   time A date
	 * @return {int}   x    The position on the screen in pixels which corresponds
	 *                      with the given date.
	 * @protected
	 */
	// TODO: move this function to Range
	_toScreen(time) {
		return toScreen(this, time, this.props.center.width);
	}

	/**
	 * Convert a datetime (Date object) into a position on the root
	 * This is used to get the pixel density estimate for the screen, not the center panel
	 * @param {Date}   time A date
	 * @return {int}   x    The position on root in pixels which corresponds
	 *                      with the given date.
	 * @protected
	 */
	// TODO: move this function to Range
	_toGlobalScreen(time) {
		return toScreen(this, time, this.props.root.width);
		//var conversion = this.range.conversion(this.props.root.width);
		//return (time.valueOf() - conversion.offset) * conversion.scale;
	}


	/**
	 * Initialize watching when option autoResize is true
	 * @private
	 */
	_initAutoResize () {
		if (this.options.autoResize == true) 
			this._startAutoResize();
		else 
			this._stopAutoResize();
	}

	/**
	 * Watch for changes in the size of the container. On resize, the Panel will
	 * automatically redraw itself.
	 * @private
	 */
	_startAutoResize() {
		this._stopAutoResize();
		this._onResize = () => {
			if (!this.options.autoResize) {
				// stop watching when the option autoResize is changed to false
				this._stopAutoResize();
				return;
			}

			if (this.dom.root) {
				// check whether the frame is resized
				// Note: we compare offsetWidth here, not clientWidth. For some reason,
				// IE does not restore the clientWidth from 0 to the actual width after
				// changing the timeline's container display style from none to visible
				if ((this.dom.root.offsetWidth != this.props.lastWidth) ||
					(this.dom.root.offsetHeight != this.props.lastHeight)) {
					this.props.lastWidth = this.dom.root.offsetWidth;
					this.props.lastHeight = this.dom.root.offsetHeight;

					this.body.emitter.emit('_change');
				}
			}
		}

		// add event listener to window resize
		addEventListener(window, 'resize', this._onResize);

		//Prevent initial unnecessary redraw
		if (this.dom.root) {
			this.props.lastWidth = this.dom.root.offsetWidth;
			this.props.lastHeight = this.dom.root.offsetHeight;
		}

		this.watchTimer = setInterval(this._onResize, 1000);
	}

	/**
	 * Stop watching for a resize of the frame.
	 * @privae
	 */
	_stopAutoResize() {
		if (this.watchTimer) {
			clearInterval(this.watchTimer);
			this.watchTimer = undefined;
		}

		// remove event listener on window.resize
		if (this._onResize) {
			removeEventListener(window, 'resize', this._onResize);
			this._onResize = null;
		}
	}

	/**
	 * Start moving the timeline vertically
	 * @param {Event} event
	 * @private
	 */
	_onTouch() {
		this.touch.allowDragging = true;
		this.touch.initialScrollTop = this.props.scrollTop;
	}

	/**
	 * Start moving the timeline vertically
	 * @param {Event} event
	 * @private
	 */
	_onPinch() {
		this.touch.allowDragging = false;
	}

	/**
	 * Move the timeline vertically
	 * @param {Event} event
	 * @private
	 */
	_onDrag(event) {
		// refuse to drag when we where pinching to prevent the timeline make a jump
		// when releasing the fingers in opposite order from the touch screen
		if (!this.touch.allowDragging) return;

		var delta = event.deltaY;

		var oldScrollTop = this._getScrollTop();
		var newScrollTop = this._setScrollTop(this.touch.initialScrollTop + delta);


		if (newScrollTop != oldScrollTop) {
			this.emit('verticalDrag');
		}
	}

	/**
	 * Apply a scrollTop
	 * @param {Number} scrollTop
	 * @returns {Number} scrollTop  Returns the applied scrollTop
	 * @private
	 */
	_setScrollTop(scrollTop) {
		this.props.scrollTop = scrollTop;
		this._updateScrollTop();
		return this.props.scrollTop;
	}

	/**
	 * Update the current scrollTop when the height of  the containers has been changed
	 * @returns {Number} scrollTop  Returns the applied scrollTop
	 * @private
	 */
	_updateScrollTop() {
		// recalculate the scrollTopMin
		var scrollTopMin = Math.min(this.props.centerContainer.height - this.props.center.height, 0); // is negative or zero
		if (scrollTopMin != this.props.scrollTopMin) {
			// in case of bottom orientation, change the scrollTop such that the contents
			// do not move relative to the time axis at the bottom
			if (this.options.orientation.item != 'top') {
				this.props.scrollTop += (scrollTopMin - this.props.scrollTopMin);
			}
			this.props.scrollTopMin = scrollTopMin;
		}

		// limit the scrollTop to the feasible scroll range
		if (this.props.scrollTop > 0) this.props.scrollTop = 0;
		if (this.props.scrollTop < scrollTopMin) this.props.scrollTop = scrollTopMin;

		return this.props.scrollTop;
	}

	/**
	 * Get the current scrollTop
	 * @returns {number} scrollTop
	 * @private
	 */
	_getScrollTop() {
		return this.props.scrollTop;
	}

	/**
	 * Load a configurator
	 * @return {Object}
	 * @private
	 */
	_createConfigurator() {
		throw new Error('Cannot invoke abstract method _createConfigurator');
	}
}

// turn Core into an event emitter
Emitter(Core.prototype);