import Item from './Item.js';

export default class PointItem extends Item {
	/**
	 * @constructor PointItem
	 * @extends Item
	 * @param {Object} data             Object containing parameters start
	 *                                  content, className.
	 * @param {{toScreen: function, toTime: function}} conversion
	 *                                  Conversion functions from time to screen and vice versa
	 * @param {Object} [options]        Configuration options
	 *                                  // TODO: describe available options
	 */
	constructor(data, conversion, options) {
		// validate data
		if (data) {
			if (data.start == undefined) {
				throw new Error('Property "start" missing in item ' + data);
			}
		}

		super(data, conversion, options);

		this.props = {
			dot: {
				top: 0,
				width: 0,
				height: 0
			},
			content: {
				height: 0,
				marginLeft: 0,
				marginRight: 0
			}
		};
		//this.options = options;
	}

	/**
	 * Check whether this item is visible inside given range
	 * @returns {{start: Number, end: Number}} range with a timestamp for start and end
	 * @returns {boolean} True if visible
	 */
	isVisible(range) {
		// determine visibility
		// TODO: account for the real width of the item. Right now we just add 1/4 to the window
		var interval = (range.end - range.start) / 4;
		return (this.data.start > range.start - interval) && (this.data.start < range.end + interval);
	}

	/**
	 * Repaint the item
	 */
	redraw() {
		var dom = this.dom;
		if (!dom) {
			// create DOM
			this.dom = {};
			dom = this.dom;

			// background box
			dom.point = document.createElement('div');
			// className is updated in redraw()

			// contents box, right from the dot
			dom.content = document.createElement('div');
			dom.content.className = 'vis-item-content';
			dom.point.appendChild(dom.content);

			// dot at start
			dom.dot = document.createElement('div');
			dom.point.appendChild(dom.dot);

			// attach this item as attribute
			dom.point['timeline-item'] = this;

			this.dirty = true;
		}

		// append DOM to parent DOM
		if (!this.parent) {
			throw new Error('Cannot redraw item: no parent attached');
		}
		if (!dom.point.parentNode) {
			var foreground = this.parent.dom.foreground;
			if (!foreground) {
				throw new Error('Cannot redraw item: parent has no foreground container element');
			}
			foreground.appendChild(dom.point);
		}
		this.displayed = true;

		// Update DOM when item is marked dirty. An item is marked dirty when:
		// - the item is not yet rendered
		// - the item's data is changed
		// - the item is selected/deselected
		if (this.dirty) {
			this._updateContents(this.dom.content);
			this._updateTitle(this.dom.point);
			this._updateDataAttributes(this.dom.point);
			this._updateStyle(this.dom.point);

			var editable = (this.options.editable.updateTime || 
											this.options.editable.updateGroup ||
											this.editable === true) &&
										this.editable !== false;

			// update class
			var className = (this.data.className ? ' ' + this.data.className : '') +
					(this.selected ? ' vis-selected' : '') +
					(editable ? ' vis-editable' : ' vis-readonly');
			dom.point.className  = 'vis-item vis-point' + className;
			dom.dot.className  = 'vis-item vis-dot' + className;

			// recalculate size of dot and contents
			this.props.dot.width = dom.dot.offsetWidth;
			this.props.dot.height = dom.dot.offsetHeight;
			this.props.content.height = dom.content.offsetHeight;

			// resize contents
			if (this.options.rtl) {
				dom.content.style.marginRight = 2 * this.props.dot.width + 'px';
			} else {
				dom.content.style.marginLeft = 2 * this.props.dot.width + 'px';
			}
			//dom.content.style.marginRight = ... + 'px'; // TODO: margin right

			// recalculate size
			this.width = dom.point.offsetWidth;
			this.height = dom.point.offsetHeight;

			// reposition the dot
			dom.dot.style.top = ((this.height - this.props.dot.height) / 2) + 'px';
			if (this.options.rtl) {
				dom.dot.style.right = (this.props.dot.width / 2) + 'px';
			} else {
				dom.dot.style.left = (this.props.dot.width / 2) + 'px';
			}

			this.dirty = false;
		}

		this._repaintDeleteButton(dom.box);
	}

	/**
	 * Show the item in the DOM (when not already displayed). The items DOM will
	 * be created when needed.
	 */
	show() {
		if (!this.displayed) {
			this.redraw();
		}
	}

	/**
	 * Hide the item from the DOM (when visible)
	 */
	hide() {
		if (this.displayed) {
			if (this.dom.point.parentNode) {
				this.dom.point.parentNode.removeChild(this.dom.point);
			}

			this.displayed = false;
		}
	}

	/**
	 * Reposition the item horizontally
	 * @Override
	 */
	repositionX() {
		var start = this.conversion.toScreen(this.data.start);

		if (this.options.rtl) {
			this.right = start - this.props.dot.width;

			// reposition point
			this.dom.point.style.right = this.right + 'px';
		} else {
			this.left = start - this.props.dot.width;

			// reposition point
			this.dom.point.style.left = this.left + 'px';
		}
	}

	/**
	 * Reposition the item vertically
	 * @Override
	 */
	repositionY() {
		var orientation = this.options.orientation.item;
		var point = this.dom.point;
		if (orientation == 'top') {
			point.style.top = this.top + 'px';
		}
		else {
			point.style.top = (this.parent.height - this.top - this.height) + 'px';
		}
	}

	/**
	 * Return the width of the item left from its start date
	 * @return {number}
	 */
	getWidthLeft() {
		return this.props.dot.width;
	}

	/**
	 * Return the width of the item right from its start date
	 * @return {number}
	 */
	getWidthRight() {
		return this.props.dot.width;
	}
}