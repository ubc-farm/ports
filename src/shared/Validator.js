/* eslint-disable no-console */

import {copyAndExtendArray, copyArray} from '../util.js';

let errorFound = false, allOptions;
export const printStyle = 'background: #FFeeee; color: #dd0000';

/**
 * Main function to be called
 * @param options
 * @param subObject
 * @return {boolean}
 */
export default function validate(options, referenceOptions, subObject) {
	errorFound = false;
	allOptions = referenceOptions;
	let usedOptions = referenceOptions;
	if (subObject !== undefined)
		usedOptions = referenceOptions[subObject];
	parse(options, usedOptions, []);
	return errorFound;
}

//export {validate};

/**
 * Will traverse an object recursively and check every value
 * @param options
 * @param referenceOptions
 * @param path
 */
export function parse(options, referenceOptions, path) {
	for (const option in options) {
		if (options.hasOwnProperty(option))
			check(option, options, referenceOptions, path);
	}
}

/**
 * Check every value. If the value is an object, 
 * call the parse function on that object.
 * @param option
 * @param options
 * @param referenceOptions
 * @param path
 */
export function check(option, options, referenceOptions, path) {
	if (referenceOptions[option] === undefined) {
		if (referenceOptions.__any__ === undefined) {
			getSuggestion(option, referenceOptions, path);
		} else {
			// __any__ is a wildcard. Any value is accepted and 
			// will be further analysed by reference.
			if (getType(options[option]) === 'object' 
			&& referenceOptions.__any__.__type__ !== undefined) {
				// if the any subgroup is not a predefined object in the configurator 
				// we do not look deeper into the object.
				checkFields(option, options, referenceOptions, '__any__',
					referenceOptions.__any__.__type__, path);
			} else {
				checkFields(option, options, referenceOptions, '__any__',
					referenceOptions.__any__, path);
			}
		}
	} else {
		// Since all options in the reference are objects, we can check whether
		// they are supposed to be object to look for the __type__ field.
		if (referenceOptions[option].__type__ !== undefined) {
			// if this should be an object, we check if the correct type has 
			// been supplied to account for shorthand options.
			checkFields(option, options, referenceOptions, option,
				referenceOptions[option].__type__, path);
		} else {
			checkFields(option, options, referenceOptions, option,
				referenceOptions[option], path);
		}
	}
}

/**
 * @param {string} option property
 * @param {Object} options - The supplied options object
 * @param {Object} referenceOptions containing all options and 
 * their allowed formats
 * @param {string} referenceOption - Usually this is the same as option, 
 * except when handling an __any__ tag.
 * @param {string} refOptionType - this is the type object from 
 * the reference options
 * @param {Array} path - where in the object is the option
 */
export function checkFields(
	option, options, referenceOptions, referenceOption, refOptionObj, path
) {
	let optionType = getType(options[option]);
	let refOptionType = refOptionObj[optionType];
	if (refOptionType !== undefined) {
		// if the type is correct, we check if it is supposed to be 
		// one of a few select values
		if (getType(refOptionType) === 'array') {
			if (refOptionType.indexOf(options[option]) === -1) {
				console.log(
					'%cInvalid option detected in "' + option + '".' 
					+	' Allowed values are:' + print(refOptionType) + ' not "' 
					+	options[option] + '". ' + printLocation(path, option), 
					printStyle
				);
				errorFound = true;
			}
			else if (optionType === 'object' && referenceOption !== '__any__') {
				path = copyAndExtendArray(path, option);
				parse(options[option], referenceOptions[referenceOption], path);
			}
		}
		else if (optionType === 'object' && referenceOption !== '__any__') {
			path = copyAndExtendArray(path, option);
			parse(options[option], referenceOptions[referenceOption], path);
		}
	}
	else if (refOptionObj['any'] === undefined) {
		// type of the field is incorrect and the field cannot be any
		console.log(
			'%cInvalid type received for "' + option + '". Expected: ' 
			+ print(Object.keys(refOptionObj)) + '. Received [' + optionType + '] "' 
			+ options[option] + '"' + printLocation(path, option)
			, printStyle
		);
		errorFound = true;
	}
}

export function getType(object) {
	const type = typeof object;
	switch (type) {
		case 'object': 
			if (object === null) return 'null';
			if (object instanceof Boolean) return 'boolean';
			if (object instanceof Number) return 'number';
			if (object instanceof String) return 'string';
			if (Array.isArray(object)) return 'array';
			if (object instanceof Date) return 'date';
			if (object.nodeType !== undefined) return 'dom';
			if (object._isAMomentObject === true) return 'moment';
			return 'object'; 
		case 'number': return 'number';
		case 'boolean': return 'boolean';
		case 'string': return 'string';
		case undefined: return 'undefined';
		default: return type;
	}
}

export function getSuggestion(option, options, path) {
	const localSearch = findInOptions(option,options,path,false);
	const globalSearch = findInOptions(option,allOptions,[],true);

	const localSearchThreshold = 8, globalSearchThreshold = 4;

	if (localSearch.indexMatch !== undefined) {
		console.log(
			'%cUnknown option detected: "' + option + '" in ' 
			+ printLocation(localSearch.path, option,'') 
			+ 'Perhaps it was incomplete? Did you mean: "' + localSearch.indexMatch 
			+ '"?\n\n', 
			printStyle
		);
	}
	else if (globalSearch.distance <= globalSearchThreshold 
	&& localSearch.distance > globalSearch.distance) {
		console.log(
			'%cUnknown option detected: "' + option + '" in ' 
			+ printLocation(localSearch.path, option,'') 
			+ 'Perhaps it was misplaced? Matching option found at: ' 
			+ printLocation(globalSearch.path, globalSearch.closestMatch,''), 
			printStyle
		);
	}
	else if (localSearch.distance <= localSearchThreshold) {
		console.log(
			'%cUnknown option detected: "' + option + '". Did you mean "' 
			+ localSearch.closestMatch + '"?' 
			+ printLocation(localSearch.path, option), 
			printStyle
		);
	}
	else {
		console.log(
			'%cUnknown option detected: "' + option 
			+ '". Did you mean one of these: ' + print(Object.keys(options)) 
			+ printLocation(path, option), 
			printStyle
		);
	}

	errorFound = true;
}

/**
 * traverse the options in search for a match.
 * @param option
 * @param options
 * @param path
 * @param recursive
 * @returns {{closestMatch: string, path: Array, distance: number}}
 */
export function findInOptions(option, options, path, recursive = false) {
	const lowerCaseOption = option.toLowerCase();
	let min = 1e9, closestMatch = '', closestMatchPath = [], indexMatch;
	for (let op in options) {
		let distance;
		if (options[op].__type__ !== undefined && recursive === true) {
			let result = findInOptions(option, options[op], 
				copyAndExtendArray(path,op));
			if (min > result.distance) {
				closestMatch = result.closestMatch;
				closestMatchPath = result.path;
				min = result.distance;
				indexMatch = result.indexMatch;
			}
		}
		else {
			if (op.toLowerCase().indexOf(lowerCaseOption) !== -1) indexMatch = op;
			distance = levenshteinDistance(option, op);
			if (min > distance) {
				closestMatch = op;
				closestMatchPath = copyArray(path);
				min = distance;
			}
		}
	}
	return {closestMatch, path: closestMatchPath, distance: min, indexMatch};
}

export function printLocation(
	path, option, prefix = 'Problem value found at: \n'
) {
	let str = '\n\n' + prefix + 'options = {\n';
	for (let i = 0; i < path.length; i++) {
		for (let j = 0; j < i + 1; j++) str += '  ';
		str += path[i] + ': {\n'
	}
	for (let j = 0; j < path.length + 1; j++) str += '  ';
	str += option + '\n';
	for (let i = 0; i < path.length + 1; i++) {
		for (let j = 0; j < path.length - i; j++) str += '  ';
		str += '}\n'
	}
	return str + '\n\n';
}

export function print(options) {
	return JSON.stringify(options)
		.replace(/(\")|(\[)|(\])|(,"__type__")/g, '')
		.replace(/(\,)/g, ', ');
}

/**
 * Compute the edit distance between the two given strings
 * @see http://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Levenshtein_distance#JavaScript
 * Copyright (c) 2011 Andrei Mackenzie

	 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

	 The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

	 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export function levenshteinDistance(a, b) {
	if (a.length === 0) return b.length;
	if (b.length === 0) return a.length;

	let matrix = [];

	// increment along the first column of each row
	for (let i = 0; i <= b.length; i++) matrix[i] = [i];
	
	// increment each column in the first row
	for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

	// Fill in the rest of the matrix;
	for (let i = 0; i <= b.length; i++) {
		for (let j = 0; j <= a.length; j++) {
			if (b.charAt(i - 1) == a.charAt(j - 1)) {
				matrix[i][j] = matrix[i - 1][j - 1];
			} else {
				matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
					Math.min(matrix[i][j - 1] + 1, // insertion
						matrix[i - 1][j] + 1)); // deletion
			}
		}
	}

	return matrix[b.length][a.length];
}