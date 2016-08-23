import moment from '../module/moment';
import {
	convert, forEach, extend,
	getAbsoluteRight, getAbsoluteLeft, getAbsoluteTop,
	getTarget, hasParent
} from '../util.js';
import DataSet from '../DataSet.js';
import DataView from '../DataView.js';
import validate, {printStyle} from '../shared/Validator.js'
import Configurator from '../shared/Configurator.js';

import TimeAxis from './component/TimeAxis.js';
import CurrentTime from './component/CurrentTime.js'; 
import {customTimeFromTarget} from './component/CustomTime.js';
import ItemSet from './component/ItemSet.js';
import Range from './Range.js';
import Core from './Core.js';
import {allOptions, configureOptions} from './optionsTimeline.js';

export default class Timeline extends Core {
	/**
	 * Create a timeline visualization
	 * @param {HTMLElement} container
	 * @param {vis.DataSet | vis.DataView | Array} [items]
	 * @param {vis.DataSet | vis.DataView | Array} [groups]
	 * @param {Object} [options]  See Timeline.setOptions 
	 * for the available options.
	 * @constructor
	 * @extends Core
	 */
	constructor(container, items, groups, options) {
		super(container);

		// if the third element is options, the forth is groups (optionally);
		if (!(Array.isArray(groups) 
			|| groups instanceof DataSet 
			|| groups instanceof DataView) 
		&& groups instanceof Object) {
			[options, groups] = [groups, options];
		}

		this.options = extend({}, this.defaultOptions);

		// Create the DOM, props, and emitter
		this._create(container);

		// all components listed here will be repainted automatically
		this.components = [];

		this.body = {
			dom: this.dom,
			domProps: this.props,
			emitter: {
				on: this.on.bind(this),
				off: this.off.bind(this),
				emit: this.emit.bind(this)
			},
			hiddenDates: [],
			util: {
				getScale: () => this.timeAxis.step.scale,
				getStep: () => this.timeAxis.step.step,
				toScreen: this._toScreen.bind(this),
				// this refers to the root.width \/
				toGlobalScreen: this._toGlobalScreen.bind(this), 
				toTime: this._toTime.bind(this),
				toGlobalTime : this._toGlobalTime.bind(this)
			}
		}

		// range
		this.range = new Range(this.body);
		this.components.push(this.range);
		this.body.range = this.range;

		// time axis
		this.timeAxis = new TimeAxis(this.body);
		this.timeAxis2 = null; // used in case of orientation option 'both'
		this.components.push(this.timeAxis);

		// current time bar
		this.currentTime = new CurrentTime(this.body);
		this.components.push(this.currentTime);

		// item set
		this.itemSet = new ItemSet(this.body, this.options);
		this.components.push(this.itemSet);

		this.itemsData = null;      // DataSet
		this.groupsData = null;     // DataSet

		this.on('tap', event => {
			this.emit('click', this.getEventProperties(event))
		});
		this.on('doubletap', event => {
			this.emit('doubleClick', this.getEventProperties(event))
		});
		this.dom.root.oncontextmenu = event => {
			this.emit('contextmenu', this.getEventProperties(event))
		};

		//Single time autoscale/fit
		this.fitDone = false;
		const me = this;
		this.on('changed', function () {
			if (this.itemsData == null) return;
			if (!me.fitDone) {
				me.fitDone = true;
				if (me.options.start != undefined || me.options.end != undefined) {
					if (me.options.start == undefined || me.options.end == undefined) {
						var range = me.getItemRange();
					}

					var start = me.options.start != undefined ? me.options.start : range.min;
					var end   = me.options.end   != undefined ? me.options.end   : range.max;

					me.setWindow(start, end, {animation: false});
				}
				else {
					me.fit({animation: false});
				}
			}
		});

		// apply options
		if (options) this.setOptions(options);

		// IMPORTANT: THIS HAPPENS BEFORE SET ITEMS!
		if (groups) this.setGroups(groups);

		// create itemset
		if (items) this.setItems(items);

		// draw for the first time
		this._redraw();
	}

	get defaultOptions() {return {
		start: null,
		end:   null,

		autoResize: true,
		throttleRedraw: 0, // ms

		orientation: {
			axis: 'bottom',   // axis orientation: 'bottom', 'top', or 'both'
			item: 'bottom'    // not relevant
		},
		rtl: false,
		moment,

		width: null,
		height: null,
		maxHeight: null,
		minHeight: null
	}}

	/**
	 * Load a configurator
	 * @return {Object}
	 * @private
	 */
	_createConfigurator() {
		return new Configurator(this, this.dom.container, configureOptions);
	}

	/**
	 * Force a redraw. The size of all items will be recalculated.
	 * Can be useful to manually redraw when option autoResize=false and 
	 * the window has been resized, or when the items CSS has been changed.
	 *
	 * Note: this function will be overridden on construction with a trottled
	 * version
	 */
	redraw() {
		this.itemSet && this.itemSet.markDirty({refreshItems: true});
		this._redraw();
	}

	setOptions(options) {
		// validate options
		let errorFound = validate(options, allOptions);

		if (errorFound === true) {
			// eslint-disable-next-line no-console
			console.log('%cErrors have been found in the supplied options object.',
				printStyle);
		}

		super.setOptions(options);

		if ('type' in options) {
			if (options.type !== this.options.type) {
				this.options.type = options.type;

				// force recreation of all items
				const itemsData = this.itemsData;
				if (itemsData) {
					const selection = this.getSelection();
					this.setItems(null);          // remove all
					this.setItems(itemsData);     // add all
					this.setSelection(selection); // restore selection
				}
			}
		}
	}

	/**
	 * Set items
	 * @param {vis.DataSet | Array | null} items
	 */
	setItems(items) {
		// convert to type DataSet when needed
		let newDataSet;
		if (!items) newDataSet = null;
		else if (items instanceof DataSet || items instanceof DataView) 
			newDataSet = items;
		else {
			// turn an array into a dataset
			newDataSet = new DataSet(items, {
				type: {
					start: 'Date',
					end: 'Date'
				}
			});
		}

		// set items
		this.itemsData = newDataSet;
		this.itemSet && this.itemSet.setItems(newDataSet);
	}

	/**
	 * Set groups
	 * @param {vis.DataSet | Array} groups
	 */
	setGroups(groups) {
		// convert to type DataSet when needed
		let newDataSet;
		if (!groups) newDataSet = null;
		else if (groups instanceof DataSet || groups instanceof DataView) 
			newDataSet = groups;
		else {
			// turn an array into a dataset
			newDataSet = new DataSet(groups);
		}

		this.groupsData = newDataSet;
		this.itemSet.setGroups(newDataSet);
	}

	/**
	 * Set both items and groups in one go
	 * @param {{items: Array | vis.DataSet, groups: Array | vis.DataSet}} data
	 */
	setData(data) {
		if (data && data.groups) this.setGroups(data.groups);
		if (data && data.items) this.setItems(data.items);
	}

	/**
	 * Set selected items by their id. Replaces the current selection.
	 * Unknown id's are silently ignored.
	 * @param {string[] | string} [ids]  An array with zero or more id's of 
	 * the items to be selected. If ids is an empty array, all items will be
	 * unselected. 
	 * @param {Object} [options]    
	 * @param {boolean} [options.focus] - if true, focus will be set to the 
	 * selected items(s)
	 * @param {boolean|Object} [options.animation=true] - if true, the range
	 * is animated smoothly to the new window. An object can be provided to 
	 * specify duration and easing function.
	 * @param {number} [options.animation.duration=500] milliseconds
	 * @param {string} [options.animation.easingFunction=easeInOutQuad] -
	 * easing function to use.
	 */
	setSelection(ids, options) {
		this.itemSet && this.itemSet.setSelection(ids);
		if (options && options.focus) this.focus(ids, options);
	}

	/**
	 * Get the selected items by their id
	 * @return {Array} ids  The ids of the selected items
	 */
	getSelection() {
		return this.itemSet && this.itemSet.getSelection() || [];
	}

	/**
	 * Adjust the visible window such that the selected item (or multiple items)
	 * are centered on screen.
	 * @param {String|String[]} id - An item id or array with item ids
	 * @param {Object} [options]
	 * @param {boolean|Object} [options.animation=true] - if true, the range
	 * is animated smoothly to the new window. An object can be provided to 
	 * specify duration and easing function.
	 * @param {number} [options.animation.duration=500] milliseconds
	 * @param {string} [options.animation.easingFunction=easeInOutQuad] -
	 * easing function to use.
	 */
	focus(id, {animation = true} = {}) {
		if (!this.itemsData || id == undefined) return;
		const ids = Array.isArray(id) ? id : [id];

		// get the specified item(s)
		const itemsData = this.itemsData.getDataSet().get(ids, {
			type: {
				start: 'Date',
				end: 'Date'
			}
		});

		// calculate minimum start and maximum end of specified items
		let start = null; let end = null;
		itemsData.forEach(itemData => {
			const s = itemData.start.valueOf();
			const e = 'end' in itemData 
				? itemData.end.valueOf() 
				: itemData.start.valueOf();

			if (start === null || s < start) start = s;
			if (end === null || e > end) end = e;
		});

		if (start !== null && end !== null) {
			// calculate the new middle and interval for the window
			const middle = (start + end) / 2;
			const interval = Math.max((this.range.end - this.range.start), (end - start) * 1.1);

			this.range.setRange(
				middle - interval / 2, 
				middle + interval / 2, 
				animation
			);
		}
	}

	/**
	 * Set Timeline window such that it fits all items
	 * @param {Object} [options]
	 * @param {boolean|Object} [options.animation=true] - if true, the range
	 * is animated smoothly to the new window. An object can be provided to 
	 * specify duration and easing function.
	 * @param {number} [options.animation.duration=500] milliseconds
	 * @param {string} [options.animation.easingFunction=easeInOutQuad] -
	 * easing function to use.
	 */
	fit({animation = true} = {}) {
		let range;
		const dataset = this.itemsData && this.itemsData.getDataSet();
		if (dataset.length === 1 && dataset.get()[0].end === undefined) {
			// a single item -> 
			// don't fit, just show a range around the item from -4 to +3 days
			range = this.getDataRange();
			this.moveTo(range.min.valueOf(), {animation});
		}
		else {
			// exactly fit the items (plus a small margin)
			range = this.getItemRange();
			this.range.setRange(range.min, range.max, animation);
		}
	}

	/**
	 * Determine the range of the items, taking into account their actual width
	 * and a margin of 10 pixels on both sides.
	 * @return {{min: Date | null, max: Date | null}}
	 */
	getItemRange() {
		// get a rough approximation for the range based on the 
		// items start and end dates
		const range = this.getDataRange();
		let min = range.min !== null ? range.min.valueOf() : null;
		let max = range.max !== null ? range.max.valueOf() : null;
		let minItem = null, maxItem = null;

		const getStart = item => convert(item.data.start, 'Date').valueOf();
		const getEnd = item => {
			const end = item.data.end != undefined ? item.data.end : item.data.start;
			return convert(end, 'Date').valueOf();
		}

		if (min != null && max != null) {
			let interval = (max - min); // ms
			if (interval <= 0) interval = 10;
			const factor = interval / this.props.center.width;

			forEach(this.itemSet.items, item => {
				item.show();
				item.repositionX();

				const start = getStart(item);
				const end = getEnd(item);
				
				let startSide, endSide;
				if (this.options.rtl) {
					startSide  = start - (item.getWidthRight()  + 10) * factor;
					endSide = end   + (item.getWidthLeft() + 10) * factor;
				} else {
					startSide  = start - (item.getWidthLeft()  + 10) * factor;
					endSide = end   + (item.getWidthRight() + 10) * factor;
				}

				if (startSide < min) {
					min = startSide;
					minItem = item;
				}
				if (endSide > max) {
					max = endSide;
					maxItem = item;
				}
			})

			if (minItem && maxItem) {
				const lhs = minItem.getWidthLeft() + 10;
				const rhs = maxItem.getWidthRight() + 10;
				const delta = this.props.center.width - lhs - rhs;  // px

				if (delta > 0) {
					if (this.options.rtl) {
						min = getStart(minItem) - rhs * interval / delta; // ms
						max = getEnd(maxItem)   + lhs * interval / delta; // ms
					} else {
						min = getStart(minItem) - lhs * interval / delta; // ms
						max = getEnd(maxItem)   + rhs * interval / delta; // ms
					}
				}
			}
		}

		return {
			min: min != null ? new Date(min) : null,
			max: max != null ? new Date(max) : null
		}
	}

	/**
	 * Calculate the data range of the items start and end dates
	 * @returns {{min: Date | null, max: Date | null}}
	 */
	getDataRange() {
		let min = null, max = null;

		const dataset = this.itemsData && this.itemsData.getDataSet();
		if (dataset) {
			dataset.forEach(item => {
				const start = convert(item.start, 'Date').valueOf();
				const end = convert(item.end != undefined ? item.end : item.start, 
					'Date').valueOf();
				if (min === null || start < min) min = start;
				if (max === null || end > max) max = end;
			});
		}

		return {
			min: min != null ? new Date(min) : null,
			max: max != null ? new Date(max) : null
		}
	}

	/**
	 * Generate Timeline related information from an event
	 * @param {Event} event
	 * @return {Object} An object with related information, like on which area
	 * the event happened, wheter clicked on an item, etc.
	 */
	getEventProperties(event) {
		const clientX = event.center ? event.center.x : event.clientX;
		const clientY = event.center ? event.center.y : event.clientY;
		const x = this.options.rtl 
			?	getAbsoluteRight(this.dom.centerContainer) - clientX
			: clientX - getAbsoluteLeft(this.dom.centerContainer);
		const y = clientY - getAbsoluteTop(this.dom.centerContainer);

		const item = this.itemSet.itemFromTarget(event);
		const group = this.itemSet.groupFromTarget(event);
		const customTime = customTimeFromTarget(event); 

		const {snap = null} = this.itemSet.options;
		const scale = this.body.util.getScale();
		const step = this.body.util.getStep();
		const time = this._toTime(x);
		const snappedTime = snap ? snap(time, scale, step) : time;

		const element = getTarget(event);
		let what = null;
		if (item != null) what = 'item';
		else if (customTime != null) what = 'custom-time';
		else if (hasParent(element, this.timeAxis.dom.foreground)) what = 'axis';
		else if (this.timeAxis2 
		&& hasParent(element, time.timeAxis2.dom.foreground)) 
			what = 'axis';
		else if (hasParent(element, this.itemSet.dom.labelSet)) 
			what = 'group-label';
		else if (hasParent(element, this.currentTime.bar)) what = 'current-time';
		else if (hasParent(element, this.dom.center)) what = 'background';

		return {
			event, 
			item: item ? item.id : null,
			group: group ? group.groupId : null,
			what,
			pageX: event.srcEvent ? event.srcEvent.pageX : event.pageX,
			pageY: event.srcEvent ? event.srcEvent.pageY : event.pageY,
			x, y, time, snappedTime
		};
	}
}