// utility functions

// first check if moment.js is already loaded in the browser window, if so,
// use this instance. Else, load via commonjs.

import moment from 'moment';
import {v4} from './module/uuid.js';

import * as option from './util-option.js';
import * as easingFunctions from './util-easing.js';

export {option, easingFunctions};

/**
 * Test whether given object is a number
 * @param {*} object
 * @return {Boolean} isNumber
 */
export function isNumber(object) {
	return (object instanceof Number || typeof object == 'number');
}

/**
 * Remove everything in the DOM object
 * @param DOMobject
 */
export function recursiveDOMDelete(DOMobject) {
	if (DOMobject) {
		while (DOMobject.hasChildNodes() === true) {
			recursiveDOMDelete(DOMobject.firstChild);
			DOMobject.removeChild(DOMobject.firstChild);
		}
	}
}

/**
 * this function gives you a range between 0 and 1 based on the min and max values in the set, the total sum of all values and the current value.
 *
 * @param min
 * @param max
 * @param total
 * @param value
 * @returns {number}
 */
export function giveRange(min, max, total, value) {
	if (max == min) {
		return 0.5;
	}
	else {
		var scale = 1 / (max - min);
		return Math.max(0, (value - min) * scale);
	}
}

/**
 * Test whether given object is a string
 * @param {*} object
 * @return {Boolean} isString
 */
export function isString(object) {
	return (object instanceof String || typeof object == 'string');
}

/**
 * Test whether given object is a Date, or a String containing a Date
 * @param {Date | String} object
 * @return {Boolean} isDate
 */
export function isDate(object) {
	if (object instanceof Date) {
		return true;
	}
	else if (isString(object)) {
		// test whether this string contains a date
		var match = ASPDateRegex.exec(object);
		if (match) {
			return true;
		}
		else if (!isNaN(Date.parse(object))) {
			return true;
		}
	}

	return false;
}

/**
 * Create a semi UUID
 * source: http://stackoverflow.com/a/105074/1262753
 * @return {String} uuid
 */
export function randomUUID() {
	return v4();
}

/**
 * assign all keys of an object that are not nested objects to a certain value (used for color objects).
 * @param obj
 * @param value
 */
export function assignAllKeys(obj, value) {
	for (var prop in obj) {
		if (obj.hasOwnProperty(prop)) {
			if (typeof obj[prop] !== 'object') {
				obj[prop] = value;
			}
		}
	}
}


/**
 * Fill an object with a possibly partially defined other object. Only copies values if the a object has an object requiring values.
 * That means an object is not created on a property if only the b object has it.
 * @param obj
 * @param value
 */
export function fillIfDefined(a, b, allowDeletion = false) {
	for (var prop in a) {
		if (b[prop] !== undefined) {
			if (typeof b[prop] !== 'object') {
				if ((b[prop] === undefined || b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
					delete a[prop];
				}
				else {
					a[prop] = b[prop];
				}
			}
			else {
				if (typeof a[prop] === 'object') {
					fillIfDefined(a[prop], b[prop], allowDeletion);
				}
			}
		}
	}
}



/**
 * Extend object a with the properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Object} target
 * @param {... Object} sources
 * @return {Object} a
 */
export function protoExtend(a, ...sources) {
	for (const other of sources) {
		for (var prop in other) a[prop] = other[prop];
	}
	return a;
}

/**
 * Extend object a with the properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Object} target
 * @param {... Object} sources
 * @return {Object} target
 */
export function extend(target, ...sources) {
	for (const other of sources) {
		for (var prop in other) {
			if (other.hasOwnProperty(prop)) {
				target[prop] = other[prop];
			}
		}
	}
	return target;
}

/**
 * Extend target object with selected properties of source objects.
 * Akin to Object.assign, but filtered.
 * @param {string[]} props
 * @param {Object} target
 * @param {...Object} sources
 * @return {Object} target
 */
export function selectiveExtend(props, target, ...sources) {
	if (!Array.isArray(props)) 
		throw Error('Array with property names expected as first argument');
	
	for (const source of sources) {
		for (const prop of props) {
			if (source.hasOwnProperty(prop)) target[prop] = source[prop];
		}
	}
	return target;
}

/**
 * Extend object a with selected properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Array.<String>} props
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 */
export function selectiveDeepExtend(props, a, b, allowDeletion = false) {
	/* eslint-disable prefer-rest-params */
	// TODO: add support for Arrays to deepExtend
	if (Array.isArray(b)) {
		throw new TypeError('Arrays are not supported by deepExtend');
	}
	for (var i = 2; i < arguments.length; i++) {
		var other = arguments[i];
		for (var p = 0; p < props.length; p++) {
			var prop = props[p];
			if (other.hasOwnProperty(prop)) {
				if (b[prop] && b[prop].constructor === Object) {
					if (a[prop] === undefined) {
						a[prop] = {};
					}
					if (a[prop].constructor === Object) {
						deepExtend(a[prop], b[prop], false, allowDeletion);
					}
					else {
						if ((b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
							delete a[prop];
						}
						else {
							a[prop] = b[prop];
						}
					}
				} else if (Array.isArray(b[prop])) {
					throw new TypeError('Arrays are not supported by deepExtend');
				} else {
					if ((b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
						delete a[prop];
					}
					else {
						a[prop] = b[prop];
					}
				}

			}
		}
	}
	return a;
}

/**
 * Extend object a with selected properties of object b or a series of objects
 * Only properties with defined values are copied
 * @param {Array.<String>} props
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 */
export function selectiveNotDeepExtend(props, a, b, allowDeletion = false) {
	// TODO: add support for Arrays to deepExtend
	if (Array.isArray(b)) {
		throw new TypeError('Arrays are not supported by deepExtend');
	}
	for (var prop in b) {
		if (b.hasOwnProperty(prop)) {
			if (props.indexOf(prop) == -1) {
				if (b[prop] && b[prop].constructor === Object) {
					if (a[prop] === undefined) {
						a[prop] = {};
					}
					if (a[prop].constructor === Object) {
						deepExtend(a[prop], b[prop]);
					}
					else {
						if ((b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
							delete a[prop];
						}
						else {
							a[prop] = b[prop];
						}
					}
				} else if (Array.isArray(b[prop])) {
					a[prop] = [];
					for (let i = 0; i < b[prop].length; i++) {
						a[prop].push(b[prop][i]);
					}
				} else {
					if ((b[prop] === null) && a[prop] !== undefined && allowDeletion === true) {
						delete a[prop];
					}
					else {
						a[prop] = b[prop];
					}
				}
			}
		}
	}
	return a;
}

/**
 * Deep extend an object with the properties of the source object
 * @param {Object} target
 * @param {Object} source
 * @param {boolean} [protoExtend] - If true, the prototype values will
 * also be extended. (ie. the options object that inherit from others
 * will also ge the inherited options)
 * @param {boolean} [allowDeletion] - if true the values of fields that 
 * are null will not deleted
 */
export function deepExtend(target, source, protoExtend, allowDeletion) {
	for (let prop in source) {
		if (protoExtend || source.hasOwnProperty(prop)) {
			if (source[prop] && source[prop].constructor === Object) {
				if (target[prop] === undefined) target[prop] = {};
				if (target[prop].constructor === Object)
					deepExtend(target[prop], source[prop], protoExtend);
				else {
					if (allowDeletion 
					&& source[prop] === null && target[prop] !== undefined) 
						delete target[prop];
					else	
						target[prop] = source[prop];
				}
			} else if (Array.isArray(source[prop])) {
				target[prop] = [...source[prop]];
			} else {
				if (allowDeletion 
				&& source[prop] === null && target[prop] !== undefined) 
					delete target[prop];
				else	
					target[prop] = source[prop];
			}
		}
	}
	return target;
}

/**
 * Test whether all elements in two arrays are equal.
 * @param {Array} a
 * @param {Array} b
 * @return {boolean} Returns true if both arrays have the same length and same
 *                   elements.
 */
export function equalArray(a, b) {
	if (a.length != b.length) return false;

	for (var i = 0, len = a.length; i < len; i++) {
		if (a[i] != b[i]) return false;
	}

	return true;
}

/**
 * Convert an object to another type
 * @param {Boolean | Number | String | Date | Moment | Null | undefined} object
 * @param {String | undefined} type   Name of the type. Available types:
 *                                    'Boolean', 'Number', 'String',
 *                                    'Date', 'Moment', ISODate', 'ASPDate'.
 * @return {*} object
 * @throws Error
 */
export function convert(object, type) {
	var match;

	if (object === undefined) {
		return undefined;
	}
	if (object === null) {
		return null;
	}

	if (!type) {
		return object;
	}
	if (!(typeof type === 'string') && !(type instanceof String)) {
		throw new Error('Type must be a string');
	}

	//noinspection FallthroughInSwitchStatementJS
	switch (type) {
		case 'boolean':
		case 'Boolean':
			return Boolean(object);

		case 'number':
		case 'Number':
			return Number(object.valueOf());

		case 'string':
		case 'String':
			return String(object);

		case 'Date':
			if (isNumber(object)) {
				return new Date(object);
			}
			if (object instanceof Date) {
				return new Date(object.valueOf());
			}
			else if (moment.isMoment(object)) {
				return new Date(object.valueOf());
			}
			if (isString(object)) {
				match = ASPDateRegex.exec(object);
				if (match) {
					// object is an ASP date
					return new Date(Number(match[1])); // parse number
				}
				else {
					return moment(object).toDate(); // parse string
				}
			}
			else {
				throw new Error(
					'Cannot convert object of type ' + getType(object) +
					' to type Date');
			}

		case 'Moment':
			if (isNumber(object)) {
				return moment(object);
			}
			if (object instanceof Date) {
				return moment(object.valueOf());
			}
			else if (moment.isMoment(object)) {
				return moment(object);
			}
			if (isString(object)) {
				match = ASPDateRegex.exec(object);
				if (match) {
					// object is an ASP date
					return moment(Number(match[1])); // parse number
				}
				else {
					return moment(object); // parse string
				}
			}
			else {
				throw new Error(
					'Cannot convert object of type ' + getType(object) +
					' to type Date');
			}

		case 'ISODate':
			if (isNumber(object)) {
				return new Date(object);
			}
			else if (object instanceof Date) {
				return object.toISOString();
			}
			else if (moment.isMoment(object)) {
				return object.toDate().toISOString();
			}
			else if (isString(object)) {
				match = ASPDateRegex.exec(object);
				if (match) {
					// object is an ASP date
					return new Date(Number(match[1])).toISOString(); // parse number
				}
				else {
					return new Date(object).toISOString(); // parse string
				}
			}
			else {
				throw new Error(
					'Cannot convert object of type ' + getType(object) +
					' to type ISODate');
			}

		case 'ASPDate':
			if (isNumber(object)) {
				return '/Date(' + object + ')/';
			}
			else if (object instanceof Date) {
				return '/Date(' + object.valueOf() + ')/';
			}
			else if (isString(object)) {
				match = ASPDateRegex.exec(object);
				var value;
				if (match) {
					// object is an ASP date
					value = new Date(Number(match[1])).valueOf(); // parse number
				}
				else {
					value = new Date(object).valueOf(); // parse string
				}
				return '/Date(' + value + ')/';
			}
			else {
				throw new Error(
					'Cannot convert object of type ' + getType(object) +
					' to type ASPDate');
			}

		default:
			throw new Error('Unknown type "' + type + '"');
	}
}

// parse ASP.Net Date pattern,
// for example '/Date(1198908717056)/' or '/Date(1198908717056-0700)/'
// code from http://momentjs.com/
const ASPDateRegex = /^\/?Date\((\-?\d+)/i;

/**
 * Get the type of an object, for example exports.getType([]) returns 'Array'
 * @param {*} object
 * @return {String} type
 */
export function getType(object) {
	var type = typeof object;

	if (type == 'object') {
		if (object === null) {
			return 'null';
		}
		if (object instanceof Boolean) {
			return 'Boolean';
		}
		if (object instanceof Number) {
			return 'Number';
		}
		if (object instanceof String) {
			return 'String';
		}
		if (Array.isArray(object)) {
			return 'Array';
		}
		if (object instanceof Date) {
			return 'Date';
		}
		return 'Object';
	}
	else if (type == 'number') {
		return 'Number';
	}
	else if (type == 'boolean') {
		return 'Boolean';
	}
	else if (type == 'string') {
		return 'String';
	}
	else if (type === undefined) {
		return 'undefined';
	}


	return type;
}


/**
 * Used to extend an array and copy it. This is used to propagate paths recursively.
 *
 * @param arr
 * @param newValue
 * @returns {Array}
 */
export function copyAndExtendArray(arr, newValue) {
	let newArr = [];
	for (let i = 0; i < arr.length; i++) {
		newArr.push(arr[i]);
	}
	newArr.push(newValue);
	return newArr;
}

/**
 * Used to extend an array and copy it. This is used to propagate paths recursively.
 *
 * @param arr
 * @param newValue
 * @returns {Array}
 */
export function copyArray(arr) {
	let newArr = [];
	for (let i = 0; i < arr.length; i++) {
		newArr.push(arr[i]);
	}
	return newArr;
}

/**
 * Retrieve the absolute left value of a DOM element
 * @param {Element} elem        A dom element, for example a div
 * @return {number} left        The absolute left position of this element
 *                              in the browser page.
 */
export function getAbsoluteLeft(elem) {
	return elem.getBoundingClientRect().left;
}

export function getAbsoluteRight(elem) {
	return elem.getBoundingClientRect().right;
}

/**
 * Retrieve the absolute top value of a DOM element
 * @param {Element} elem        A dom element, for example a div
 * @return {number} top        The absolute top position of this element
 *                              in the browser page.
 */
export function getAbsoluteTop(elem) {
	return elem.getBoundingClientRect().top;
}

/**
 * add a className to the given elements style
 * @param {Element} elem
 * @param {String} className
 */
export function addClassName(elem, className) {
	var classes = elem.className.split(' ');
	if (classes.indexOf(className) == -1) {
		classes.push(className); // add the class to the array
		elem.className = classes.join(' ');
	}
}

/**
 * add a className to the given elements style
 * @param {Element} elem
 * @param {String} className
 */
export function removeClassName(elem, className) {
	var classes = elem.className.split(' ');
	var index = classes.indexOf(className);
	if (index != -1) {
		classes.splice(index, 1); // remove the class from the array
		elem.className = classes.join(' ');
	}
}

/**
 * For each method for both arrays and objects.
 * In case of an array, the built-in Array.forEach() is applied.
 * In case of an Object, the method loops over all properties of the object.
 * @param {Object | Array} object   An Object or Array
 * @param {function} callback       Callback method, called for each item in
 *                                  the object or array with three parameters:
 *                                  callback(value, index, object)
 */
export function forEach(object, callback) {
	var i,
		len;
	if (Array.isArray(object)) {
		// array
		for (i = 0, len = object.length; i < len; i++) {
			callback(object[i], i, object);
		}
	}
	else {
		// object
		for (i in object) {
			if (object.hasOwnProperty(i)) {
				callback(object[i], i, object);
			}
		}
	}
}

/**
 * Convert an object into an array: all objects properties are put into the
 * array. The resulting array is unordered.
 * @param {Object} object
 * @param {Array} array
 */
export function toArray(object) {
	var array = [];

	for (var prop in object) {
		if (object.hasOwnProperty(prop)) array.push(object[prop]);
	}

	return array;
}

/**
 * Update a property in an object
 * @param {Object} object
 * @param {String} key
 * @param {*} value
 * @return {Boolean} changed
 */
export function updateProperty(object, key, value) {
	if (object[key] !== value) {
		object[key] = value;
		return true;
	}
	else {
		return false;
	}
}

/**
 * Throttle the given function to be only executed once every `wait` milliseconds
 * @param {function} fn
 * @param {number} wait    Time in milliseconds
 * @returns {function} Returns the throttled function
 */
export function throttle(fn, wait) {
	var timeout = null;
	var needExecution = false;

	return function throttled () {
		if (!timeout) {
			needExecution = false;
			fn();

			timeout = setTimeout(() => {
				timeout = null;
				if (needExecution) {
					throttled();
				}
			}, wait)
		}
		else {
			needExecution = true;
		}
	}
}

/**
 * Add and event listener. Works for all browsers
 * @param {Element}     element    An html element
 * @param {string}      action     The action, for example "click",
 *                                 without the prefix "on"
 * @param {function}    listener   The callback function to be executed
 * @param {boolean}     [useCapture]
 */
export function addEventListener(element, action, listener, useCapture) {
	if (element.addEventListener) {
		if (useCapture === undefined)
			useCapture = false;

		if (action === 'mousewheel' && navigator.userAgent.indexOf('Firefox') >= 0) {
			action = 'DOMMouseScroll';  // For Firefox
		}

		element.addEventListener(action, listener, useCapture);
	} else {
		element.attachEvent('on' + action, listener);  // IE browsers
	}
}

/**
 * Remove an event listener from an element
 * @param {Element}     element         An html dom element
 * @param {string}      action          The name of the event, for example "mousedown"
 * @param {function}    listener        The listener function
 * @param {boolean}     [useCapture]
 */
export function removeEventListener(element, action, listener, useCapture) {
	if (element.removeEventListener) {
		// non-IE browsers
		if (useCapture === undefined)
			useCapture = false;

		if (action === 'mousewheel' && navigator.userAgent.indexOf('Firefox') >= 0) {
			action = 'DOMMouseScroll';  // For Firefox
		}

		element.removeEventListener(action, listener, useCapture);
	} else {
		// IE browsers
		element.detachEvent('on' + action, listener);
	}
}

/**
 * Cancels the event if it is cancelable, without stopping further propagation of the event.
 */
export function preventDefault(event) {
	if (!event)
		event = window.event;

	if (event.preventDefault) {
		event.preventDefault();  // non-IE browsers
	}
	else {
		event.returnValue = false;  // IE browsers
	}
}

/**
 * Get HTML element which is the target of the event
 * @param {Event} event
 * @return {Element} target element
 */
export function getTarget(event) {
	// code from http://www.quirksmode.org/js/events_properties.html
	if (!event) {
		event = window.event;
	}

	var target;

	if (event.target) {
		target = event.target;
	}
	else if (event.srcElement) {
		target = event.srcElement;
	}

	if (target.nodeType != undefined && target.nodeType == 3) {
		// defeat Safari bug
		target = target.parentNode;
	}

	return target;
}

/**
 * Check if given element contains given parent somewhere in the DOM tree
 * @param {Element} element
 * @param {Element} parent
 */
export function hasParent(element, parent) {
	var e = element;

	while (e) {
		if (e === parent) {
			return true;
		}
		e = e.parentNode;
	}

	return false;
}

/**
 * http://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
 *
 * @param {String} hex
 * @returns {{r: *, g: *, b: *}} | 255 range
 */
export function hexToRGB(hex) {
	// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
	var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
	hex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16)
	} : null;
}

/**
 * This function takes color in hex format or rgb() or rgba() format and overrides the opacity. Returns rgba() string.
 * @param color
 * @param opacity
 * @returns {*}
 */
export function overrideOpacity(color, opacity) {
	if (color.indexOf('rgba') != -1) return color;

	let r, g, b;
	if (color.indexOf('rgb') != -1) 
		[r, g, b] = color.substr(color.indexOf('(') + 1).replace(')', '').split(',')
	else {
		const rgb = hexToRGB(color);
		if (rgb == null) return color;
		else ({r, g, b} = rgb);
	}
	return `rgba(${r},${g},${b},${opacity})`;
}

/**
 *
 * @param red     0 -- 255
 * @param green   0 -- 255
 * @param blue    0 -- 255
 * @returns {string}
 * @constructor
 */
export function RGBToHex(red, green, blue) {
	return '#' + ((1 << 24) + (red << 16) + (green << 8) + blue).toString(16).slice(1);
}

/**
 * Parse a color property into an object with border, background, and
 * highlight colors
 * @param {Object | String} color
 * @return {Object} colorObject
 */
export function parseColor(color) {
	var c;
	if (isString(color) === true) {
		if (isValidRGB(color) === true) {
			const rgb = color.substr(4).substr(0, color.length - 5)
				.split(',').map(value => parseInt(value));
			color = RGBToHex(rgb[0], rgb[1], rgb[2]);
		}
		if (isValidHex(color) === true) {
			var hsv = hexToHSV(color);
			var lighterColorHSV = { 
				h: hsv.h, s: hsv.s * 0.8, v: Math.min(1, hsv.v * 1.02) 
			};
			var darkerColorHSV = { 
				h: hsv.h, s: Math.min(1, hsv.s * 1.25), v: hsv.v * 0.8 
			};
			var darkerColorHex = HSVToHex(
				darkerColorHSV.h, darkerColorHSV.s, darkerColorHSV.v);
			var lighterColorHex = HSVToHex(
				lighterColorHSV.h, lighterColorHSV.s, lighterColorHSV.v);
			c = {
				background: color,
				border: darkerColorHex,
				highlight: {
					background: lighterColorHex,
					border: darkerColorHex
				},
				hover: {
					background: lighterColorHex,
					border: darkerColorHex
				}
			};
		}
		else {
			c = {
				background: color,
				border: color,
				highlight: {
					background: color,
					border: color
				},
				hover: {
					background: color,
					border: color
				}
			};
		}
	}
	else {
		c = {};
		c.background = color.background || undefined;
		c.border = color.border || undefined;

		if (isString(color.highlight)) {
			c.highlight = {
				border: color.highlight,
				background: color.highlight
			}
		}
		else {
			c.highlight = {};
			c.highlight.background = color.highlight && color.highlight.background || undefined;
			c.highlight.border = color.highlight && color.highlight.border || undefined;
		}

		if (isString(color.hover)) {
			c.hover = {
				border: color.hover,
				background: color.hover
			}
		}
		else {
			c.hover = {};
			c.hover.background = color.hover && color.hover.background || undefined;
			c.hover.border = color.hover && color.hover.border || undefined;
		}
	}

	return c;
}



/**
 * http://www.javascripter.net/faq/rgb2hsv.htm
 *
 * @param red
 * @param green
 * @param blue
 * @returns {*}
 * @constructor
 */
export function RGBToHSV(red, green, blue) {
	red = red / 255; green = green / 255; blue = blue / 255;
	var minRGB = Math.min(red, Math.min(green, blue));
	var maxRGB = Math.max(red, Math.max(green, blue));

	// Black-gray-white
	if (minRGB == maxRGB) {
		return { h: 0, s: 0, v: minRGB };
	}

	// Colors other than black-gray-white:
	var d = (red == minRGB) ? green - blue : ((blue == minRGB) ? red - green : blue - red);
	var h = (red == minRGB) ? 3 : ((blue == minRGB) ? 1 : 5);
	var hue = 60 * (h - d / (maxRGB - minRGB)) / 360;
	var saturation = (maxRGB - minRGB) / maxRGB;
	var value = maxRGB;
	return { h: hue, s: saturation, v: value };
}

var cssUtil = {
	// split a string with css styles into an object with key/values
	split(cssText) {
		var styles = {};

		cssText.split(';').forEach(style => {
			if (style.trim() != '') {
				var parts = style.split(':');
				var key = parts[0].trim();
				var value = parts[1].trim();
				styles[key] = value;
			}
		});

		return styles;
	},

	// build a css text string from an object with key/values
	join(styles) {
		return Object.keys(styles)
			.map(key => key + ': ' + styles[key])
			.join('; ');
	}
};

/**
 * Append a string with css styles to an element
 * @param {Element} element
 * @param {String} cssText
 */
export function addCssText(element, cssText) {
	var currentStyles = cssUtil.split(element.style.cssText);
	var newStyles = cssUtil.split(cssText);
	var styles = extend(currentStyles, newStyles);

	element.style.cssText = cssUtil.join(styles);
}

/**
 * Remove a string with css styles from an element
 * @param {Element} element
 * @param {String} cssText
 */
export function removeCssText(element, cssText) {
	var styles = cssUtil.split(element.style.cssText);
	var removeStyles = cssUtil.split(cssText);

	for (var key in removeStyles) {
		if (removeStyles.hasOwnProperty(key)) {
			delete styles[key];
		}
	}

	element.style.cssText = cssUtil.join(styles);
}

/**
 * https://gist.github.com/mjijackson/5311256
 * @param h
 * @param s
 * @param v
 * @returns {{r: number, g: number, b: number}}
 * @constructor
 */
export function HSVToRGB(h, s, v) {
	var r, g, b;

	var i = Math.floor(h * 6);
	var f = h * 6 - i;
	var p = v * (1 - s);
	var q = v * (1 - f * s);
	var t = v * (1 - (1 - f) * s);

	switch (i % 6) {
		case 0: r = v, g = t, b = p; break;
		case 1: r = q, g = v, b = p; break;
		case 2: r = p, g = v, b = t; break;
		case 3: r = p, g = q, b = v; break;
		case 4: r = t, g = p, b = v; break;
		case 5: r = v, g = p, b = q; break;
	}

	return { 
		r: Math.floor(r * 255), 
		g: Math.floor(g * 255), 
		b: Math.floor(b * 255) 
	};
}

export function HSVToHex(h, s, v) {
	var rgb = HSVToRGB(h, s, v);
	return RGBToHex(rgb.r, rgb.g, rgb.b);
}

export function hexToHSV(hex) {
	var rgb = hexToRGB(hex);
	return RGBToHSV(rgb.r, rgb.g, rgb.b);
}

export function isValidHex(hex) {
	var isOk = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i.test(hex);
	return isOk;
}

export function isValidRGB(rgb) {
	rgb = rgb.replace(' ', '');
	var isOk = /rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)/i.test(rgb);
	return isOk;
}
export function isValidRGBA(rgba) {
	rgba = rgba.replace(' ', '');
	var isOk = /rgba\((\d{1,3}),(\d{1,3}),(\d{1,3}),(.{1,3})\)/i.test(rgba);
	return isOk;
}

/**
 * This recursively redirects the prototype of JSON objects to the referenceObject
 * This is used for default options.
 *
 * @param referenceObject
 * @returns {*}
 */
export function selectiveBridgeObject(fields, referenceObject) {
	if (typeof referenceObject == 'object') {
		var objectTo = Object.create(referenceObject);
		for (var i = 0; i < fields.length; i++) {
			if (referenceObject.hasOwnProperty(fields[i])) {
				if (typeof referenceObject[fields[i]] == 'object') {
					objectTo[fields[i]] = bridgeObject(referenceObject[fields[i]]);
				}
			}
		}
		return objectTo;
	}
	else {
		return null;
	}
}

/**
 * This recursively redirects the prototype of JSON objects to the referenceObject
 * This is used for default options.
 *
 * @param referenceObject
 * @returns {*}
 */
export function bridgeObject(referenceObject) {
	if (typeof referenceObject == 'object') {
		var objectTo = Object.create(referenceObject);
		for (var i in referenceObject) {
			if (referenceObject.hasOwnProperty(i)) {
				if (typeof referenceObject[i] == 'object') {
					objectTo[i] = bridgeObject(referenceObject[i]);
				}
			}
		}
		return objectTo;
	}
	else {
		return null;
	}
}

/**
 * This method provides a stable sort implementation, very fast for presorted data
 *
 * @param a the array
 * @param a order comparator
 * @returns {the array}
 */
export function insertSort(a,compare) {
	for (var i = 0; i < a.length; i++) {
		var k = a[i];
		for (var j = i; j > 0 && compare(k,a[j - 1])<0; j--) {
			a[j] = a[j - 1];
		}
		a[j] = k;
	}
	return a;
}

/**
 * this is used to set the options of subobjects in the options object. A requirement of these subobjects
 * is that they have an 'enabled' element which is optional for the user but mandatory for the program.
 *
 * @param [object] mergeTarget | this is either this.options or the options used for the groups.
 * @param [object] options     | options
 * @param [String] option      | this is the option key in the options argument
 */
export function mergeOptions(
	mergeTarget, options, option, allowDeletion = false, globalOptions = {}
) {
	if (options[option] === null) {
		mergeTarget[option] = Object.create(globalOptions[option]);
	}
	else {
		if (options[option] !== undefined) {
			if (typeof options[option] === 'boolean') {
				mergeTarget[option].enabled = options[option];
			}
			else {
				if (options[option].enabled === undefined) {
					mergeTarget[option].enabled = true;
				}
				for (var prop in options[option]) {
					if (options[option].hasOwnProperty(prop)) {
						mergeTarget[option][prop] = options[option][prop];
					}
				}
			}
		}
	}
}


/**
 * This function does a binary search for a visible item in a sorted list. If we find a visible item, the code that uses
 * this function will then iterate in both directions over this sorted list to find all visible items.
 *
 * @param {Item[]} orderedItems       | Items ordered by start
 * @param {function} comparator       | -1 is lower, 0 is equal, 1 is higher
 * @param {String} field
 * @param {String} field2
 * @returns {number}
 * @private
 */
export function binarySearchCustom(orderedItems, comparator, field, field2) {
	var maxIterations = 10000;
	var iteration = 0;
	var low = 0;
	var high = orderedItems.length - 1;

	while (low <= high && iteration < maxIterations) {
		var middle = Math.floor((low + high) / 2);

		var item = orderedItems[middle];
		var value = (field2 === undefined) ? item[field] : item[field][field2];

		var searchResult = comparator(value);
		if (searchResult == 0) { // jihaa, found a visible item!
			return middle;
		}
		else if (searchResult == -1) {  // it is too small --> increase low
			low = middle + 1;
		}
		else {  // it is too big --> decrease high
			high = middle - 1;
		}

		iteration++;
	}

	return -1;
}

/**
 * This function does a binary search for a specific value in a sorted array. If it does not exist but is in between of
 * two values, we return either the one before or the one after, depending on user input
 * If it is found, we return the index, else -1.
 *
 * @param {Array} orderedItems
 * @param {{start: number, end: number}} target
 * @param {String} field
 * @param {String} sidePreference   'before' or 'after'
 * @param {function} comparator an optional comparator, returning -1,0,1 for <,==,>.
 * @returns {number}
 * @private
 */
export function binarySearchValue(
	orderedItems, target, field, sidePreference, 
	comparator = (a, b) => a == b ? 0 : a < b ? -1 : 1
) {
	var maxIterations = 10000;
	var iteration = 0;
	var low = 0;
	var high = orderedItems.length - 1;
	var prevValue, value, nextValue, middle;

	while (low <= high && iteration < maxIterations) {
		// get a new guess
		middle = Math.floor(0.5 * (high + low));
		prevValue = orderedItems[Math.max(0, middle - 1)][field];
		value = orderedItems[middle][field];
		nextValue = orderedItems[Math.min(orderedItems.length - 1, middle + 1)][field];

		if (comparator(value, target) == 0) { // we found the target
			return middle;
		}
		else if (comparator(prevValue, target) < 0 && comparator(value, target) > 0) {  // target is in between of the previous and the current
			return sidePreference == 'before' ? Math.max(0, middle - 1) : middle;
		}
		else if (comparator(value, target) < 0 && comparator(nextValue, target) > 0) { // target is in between of the current and the next
			return sidePreference == 'before' ? middle : Math.min(orderedItems.length - 1, middle + 1);
		}
		else {  // didnt find the target, we need to change our boundaries.
			if (comparator(value, target) < 0) { // it is too small --> increase low
				low = middle + 1;
			}
			else {  // it is too big --> decrease high
				high = middle - 1;
			}
		}
		iteration++;
	}

	// didnt find anything. Return -1.
	return -1;
}