import Item from './Item.js';

export default class BoxItem extends Item {
	/**
	 * @constructor BoxItem
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
				width: 0,
				height: 0
			},
			line: {
				width: 0,
				height: 0
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

			// create main box
			dom.box = document.createElement('DIV');

			// contents box (inside the background box). used for making margins
			dom.content = document.createElement('DIV');
			dom.content.className = 'vis-item-content';
			dom.box.appendChild(dom.content);

			// line to axis
			dom.line = document.createElement('DIV');
			dom.line.className = 'vis-line';

			// dot on axis
			dom.dot = document.createElement('DIV');
			dom.dot.className = 'vis-dot';

			// attach this item as attribute
			dom.box['timeline-item'] = this;

			this.dirty = true;
		}

		// append DOM to parent DOM
		if (!this.parent) {
			throw new Error('Cannot redraw item: no parent attached');
		}
		if (!dom.box.parentNode) {
			var foreground = this.parent.dom.foreground;
			if (!foreground) throw new Error('Cannot redraw item: parent has no foreground container element');
			foreground.appendChild(dom.box);
		}
		if (!dom.line.parentNode) {
			var background = this.parent.dom.background;
			if (!background) throw new Error('Cannot redraw item: parent has no background container element');
			background.appendChild(dom.line);
		}
		if (!dom.dot.parentNode) {
			var axis = this.parent.dom.axis;
			if (!background) throw new Error('Cannot redraw item: parent has no axis container element');
			axis.appendChild(dom.dot);
		}
		this.displayed = true;

		// Update DOM when item is marked dirty. An item is marked dirty when:
		// - the item is not yet rendered
		// - the item's data is changed
		// - the item is selected/deselected
		if (this.dirty) {
			this._updateContents(this.dom.content);
			this._updateTitle(this.dom.box);
			this._updateDataAttributes(this.dom.box);
			this._updateStyle(this.dom.box);

			var editable = (this.options.editable.updateTime || 
											this.options.editable.updateGroup ||
											this.editable === true) &&
										this.editable !== false;

			// update class
			var className = (this.data.className? ' ' + this.data.className : '') +
					(this.selected ? ' vis-selected' : '') + 
					(editable ? ' vis-editable' : ' vis-readonly');
			dom.box.className = 'vis-item vis-box' + className;
			dom.line.className = 'vis-item vis-line' + className;
			dom.dot.className  = 'vis-item vis-dot' + className;

			// recalculate size
			this.props.dot.height = dom.dot.offsetHeight;
			this.props.dot.width = dom.dot.offsetWidth;
			this.props.line.width = dom.line.offsetWidth;
			this.width = dom.box.offsetWidth;
			this.height = dom.box.offsetHeight;

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
			var dom = this.dom;

			if (dom.box.parentNode)   dom.box.parentNode.removeChild(dom.box);
			if (dom.line.parentNode)  dom.line.parentNode.removeChild(dom.line);
			if (dom.dot.parentNode)   dom.dot.parentNode.removeChild(dom.dot);

			this.displayed = false;
		}
	}

	/**
	 * Reposition the item horizontally
	 * @Override
	 */
	repositionX() {
		var start = this.conversion.toScreen(this.data.start);
		var align = this.options.align;

		// calculate left position of the box
		if (align == 'right') {
			if (this.options.rtl) {
				this.right = start - this.width;

				// reposition box, line, and dot
				this.dom.box.style.right = this.right + 'px';
				this.dom.line.style.right = (start - this.props.line.width) + 'px';
				this.dom.dot.style.right = (start - this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
			} else {
				this.left = start - this.width;

				// reposition box, line, and dot
				this.dom.box.style.left = this.left + 'px';
				this.dom.line.style.left = (start - this.props.line.width) + 'px';
				this.dom.dot.style.left = (start - this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
			}
		}
		else if (align == 'left') {
			if (this.options.rtl) {
				this.right = start;

				// reposition box, line, and dot
				this.dom.box.style.right = this.right + 'px';
				this.dom.line.style.right = start + 'px';
				this.dom.dot.style.right = (start + this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
			} else {
				this.left = start;

				// reposition box, line, and dot
				this.dom.box.style.left = this.left + 'px';
				this.dom.line.style.left = start + 'px';
				this.dom.dot.style.left = (start + this.props.line.width / 2 - this.props.dot.width / 2) + 'px';
			}
		}
		else {
			// default or 'center'
			if (this.options.rtl) {
				this.right = start - this.width / 2;

				// reposition box, line, and dot
				this.dom.box.style.right = this.right + 'px';
				this.dom.line.style.right = (start - this.props.line.width) + 'px';
				this.dom.dot.style.right = (start - this.props.dot.width / 2) + 'px';
			} else {
				this.left = start - this.width / 2;

				// reposition box, line, and dot
				this.dom.box.style.left = this.left + 'px';
				this.dom.line.style.left = (start - this.props.line.width / 2) + 'px';
				this.dom.dot.style.left = (start - this.props.dot.width / 2) + 'px';
			}
		}
	}

	/**
	 * Reposition the item vertically
	 * @Override
	 */
	repositionY() {
		var orientation = this.options.orientation.item;
		var box = this.dom.box;
		var line = this.dom.line;
		var dot = this.dom.dot;

		if (orientation == 'top') {
			box.style.top     = (this.top || 0) + 'px';

			line.style.top    = '0';
			line.style.height = (this.parent.top + this.top + 1) + 'px';
			line.style.bottom = '';
		}
		else { // orientation 'bottom'
			var itemSetHeight = this.parent.itemSet.props.height; // TODO: this is nasty
			var lineHeight = itemSetHeight - this.parent.top - this.parent.height + this.top;

			box.style.top     = (this.parent.height - this.top - this.height || 0) + 'px';
			line.style.top    = (itemSetHeight - lineHeight) + 'px';
			line.style.bottom = '0';
		}

		dot.style.top = (-this.props.dot.height / 2) + 'px';
	}

	/**
	 * Return the width of the item left from its start date
	 * @return {number}
	 */
	getWidthLeft() {
		return this.width / 2;
	}

	/**
	 * Return the width of the item right from its start date
	 * @return {number}
	 */
	getWidthRight() {
		return this.width / 2;
	}
}