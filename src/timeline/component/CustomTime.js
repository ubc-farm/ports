import Hammer from '../../module/hammer.js';
import moment from '../../module/moment.js';
import * as locales from '../locales.js';
import {
	extend, selectiveExtend,
	convert
} from '../../util.js';
import TimelineComponent from './Component.js';

/**
 * A custom time bar
 * @extends Component
 */
export default class CustomTime extends TimelineComponent {
	constructor(body, options) {
		super(body, options);
		this.body = body;

		// default options
		this.defaultOptions = {
			moment,
			locales,
			locale: 'en',
			id: undefined,
			title: undefined
		};
		this.options = extend({}, this.defaultOptions);

		if (options && options.time) {
			this.customTime = options.time;
		} else {
			this.customTime = new Date();
		}

		this.eventParams = {}; // stores state parameters while dragging the bar

		this.setOptions(options);

		// create the DOM
		this._create();
	}

	/**
	 * Set options for the component. Options will be merged in current options.
	 * @param {Object} options  Available parameters:
	 *                                  {number | string} id
	 *                                  {string} locales
	 *                                  {string} locale
	 */
	setOptions(options) {
		if (options) {
			// copy all options that we know
			selectiveExtend(['moment', 'locale', 'locales', 'id'], this.options, options);
		}
	}

	/**
	 * Create the DOM for the custom time
	 * @private
	 */
	_create() {
		var bar = document.createElement('div');
		bar['custom-time'] = this;
		bar.className = 'vis-custom-time ' + (this.options.id || '');
		bar.style.position = 'absolute';
		bar.style.top = '0px';
		bar.style.height = '100%';
		this.bar = bar;

		var drag = document.createElement('div');
		drag.style.position = 'relative';
		drag.style.top = '0px';
		drag.style.left = '-10px';
		drag.style.height = '100%';
		drag.style.width = '20px';
		bar.appendChild(drag);

		// attach event listeners
		this.hammer = new Hammer(drag);
		this.hammer.on('panstart', this._onDragStart.bind(this));
		this.hammer.on('panmove',  this._onDrag.bind(this));
		this.hammer.on('panend',   this._onDragEnd.bind(this));
		this.hammer.get('pan').set({threshold:5, direction: Hammer.DIRECTION_HORIZONTAL});
	}

	/**
	 * Destroy the CustomTime bar
	 */
	destroy() {
		this.hide();

		this.hammer.destroy();
		this.hammer = null;

		this.body = null;
	}

	/**
	 * Repaint the component
	 * @return {boolean} Returns true if the component is resized
	 */
	redraw() {
		var parent = this.body.dom.backgroundVertical;
		if (this.bar.parentNode != parent) {
			// attach to the dom
			if (this.bar.parentNode) {
				this.bar.parentNode.removeChild(this.bar);
			}
			parent.appendChild(this.bar);
		}

		var x = this.body.util.toScreen(this.customTime);

		var locale = this.options.locales[this.options.locale];
		if (!locale) {
			if (!this.warned) {
				console.log('WARNING: options.locales[\'' + this.options.locale + '\'] not found. See http://visjs.org/docs/timeline.html#Localization');
				this.warned = true;
			}
			locale = this.options.locales['en']; // fall back on english when not available
		}

		var title = this.options.title;
		// To hide the title completely use empty string ''.
		if (title === undefined) {
			title = locale.time + ': ' + this.options.moment(this.customTime).format('dddd, MMMM Do YYYY, H:mm:ss');
			title = title.charAt(0).toUpperCase() + title.substring(1);
		}

		this.bar.style.left = x + 'px';
		this.bar.title = title;

		return false;
	}

	/**
	 * Remove the CustomTime from the DOM
	 */
	hide() {
		// remove the line from the DOM
		if (this.bar.parentNode) {
			this.bar.parentNode.removeChild(this.bar);
		}
	}

	/**
	 * Set custom time.
	 * @param {Date | number | string} time
	 */
	setCustomTime(time) {
		this.customTime = convert(time, 'Date');
		this.redraw();
	}

	/**
	 * Retrieve the current custom time.
	 * @return {Date} customTime
	 */
	getCustomTime() {
		return new Date(this.customTime.valueOf());
	}

	/**
		* Set custom title.
		* @param {Date | number | string} title
		*/
	setCustomTitle(title) {
		this.options.title = title;
	}

	/**
	 * Start moving horizontally
	 * @param {Event} event
	 * @private
	 */
	_onDragStart(event) {
		this.eventParams.dragging = true;
		this.eventParams.customTime = this.customTime;

		event.stopPropagation();
	}

	/**
	 * Perform moving operating.
	 * @param {Event} event
	 * @private
	 */
	_onDrag(event) {
		if (!this.eventParams.dragging) return;

		var x = this.body.util.toScreen(this.eventParams.customTime) + event.deltaX;
		var time = this.body.util.toTime(x);

		this.setCustomTime(time);

		// fire a timechange event
		this.body.emitter.emit('timechange', {
			id: this.options.id,
			time: new Date(this.customTime.valueOf())
		});

		event.stopPropagation();
	}

	/**
	 * Stop moving operating.
	 * @param {Event} event
	 * @private
	 */
	_onDragEnd(event) {
		if (!this.eventParams.dragging) return;

		// fire a timechanged event
		this.body.emitter.emit('timechanged', {
			id: this.options.id,
			time: new Date(this.customTime.valueOf())
		});

		event.stopPropagation();
	}
}

/**
 * Find a custom time from an event target:
 * searches for the attribute 'custom-time' in the event target's element tree
 * @param {Event} event
 * @return {CustomTime | null} customTime
 */
export function customTimeFromTarget({target}) {
	while (target) {
		if (target.hasOwnProperty('custom-time')) return target['custom-time'];
		target = target.parentNode;
	}
	return null;
}

CustomTime.customTimeFromTarget = customTimeFromTarget;