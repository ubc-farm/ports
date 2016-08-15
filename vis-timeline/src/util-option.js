import {isString, isNumber} from './util.js';

/**
 * Convert a value into a boolean
 * @param {Boolean | function | undefined} value
 * @param {Boolean} [defaultValue]
 * @returns {Boolean} bool
 */
export function asBoolean(value, defaultValue) {
	if (typeof value == 'function') {
		value = value();
	}

	if (value != null) {
		return (value != false);
	}

	return defaultValue || null;
}

/**
 * Convert a value into a number
 * @param {Boolean | function | undefined} value
 * @param {Number} [defaultValue]
 * @returns {Number} number
 */
export function asNumber(value, defaultValue) {
	if (typeof value == 'function') {
		value = value();
	}

	if (value != null) {
		return Number(value) || defaultValue || null;
	}

	return defaultValue || null;
}

/**
 * Convert a value into a string
 * @param {String | function | undefined} value
 * @param {String} [defaultValue]
 * @returns {String} str
 */
export function asString(value, defaultValue) {
	if (typeof value == 'function') {
		value = value();
	}

	if (value != null) {
		return String(value);
	}

	return defaultValue || null;
}

/**
 * Convert a size or location into a string with pixels or a percentage
 * @param {String | Number | function | undefined} value
 * @param {String} [defaultValue]
 * @returns {String} size
 */
export function asSize(value, defaultValue) {
	if (typeof value == 'function') {
		value = value();
	}

	if (isString(value)) {
		return value;
	}
	else if (isNumber(value)) {
		return value + 'px';
	}
	else {
		return defaultValue || null;
	}
}

/**
 * Convert a value into a DOM element
 * @param {HTMLElement | function | undefined} value
 * @param {HTMLElement} [defaultValue]
 * @returns {HTMLElement | null} dom
 */
export function asElement(value, defaultValue) {
	if (typeof value == 'function') {
		value = value();
	}

	return value || defaultValue || null;
}