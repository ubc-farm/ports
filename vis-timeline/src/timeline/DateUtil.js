/**
 * used in Core to convert the options into a volatile variable
 * 
 * @param {function} moment
 * @param {Object} body
 * @param {Array | Object} hiddenDates
 */
export function convertHiddenOptions(moment, body, hiddenDates) {
	if (hiddenDates && !Array.isArray(hiddenDates)) {
		return convertHiddenOptions(moment, body, [hiddenDates])
	}

	body.hiddenDates = [];
	if (hiddenDates) {
		if (Array.isArray(hiddenDates) == true) {
			for (var i = 0; i < hiddenDates.length; i++) {
				if (hiddenDates[i].repeat === undefined) {
					var dateItem = {};
					dateItem.start = moment(hiddenDates[i].start).toDate().valueOf();
					dateItem.end = moment(hiddenDates[i].end).toDate().valueOf();
					body.hiddenDates.push(dateItem);
				}
			}
			// sort by start time
			body.hiddenDates.sort((a, b) => a.start - b.start);
		}
	}
}

/**
 * create new entrees for the repeating hidden dates
 * @param {function} moment
 * @param {Object} body
 * @param {Array | Object} hiddenDates
 */
export function updateHiddenDates(moment, body, hiddenDates) {
	if (hiddenDates && !Array.isArray(hiddenDates)) {
		return updateHiddenDates(moment, body, [hiddenDates])
	}

	if (hiddenDates && body.domProps.centerContainer.width !== undefined) {
		convertHiddenOptions(moment, body, hiddenDates);

		var start = moment(body.range.start);
		var end = moment(body.range.end);

		var totalRange = (body.range.end - body.range.start);
		var pixelTime = totalRange / body.domProps.centerContainer.width;

		for (var i = 0; i < hiddenDates.length; i++) {
			if (hiddenDates[i].repeat !== undefined) {
				var startDate = moment(hiddenDates[i].start);
				var endDate = moment(hiddenDates[i].end);

				if (startDate._d == 'Invalid Date') {
					throw new Error('Supplied start date is not valid: ' + hiddenDates[i].start);
				}
				if (endDate._d == 'Invalid Date') {
					throw new Error('Supplied end date is not valid: ' + hiddenDates[i].end);
				}

				var duration = endDate - startDate;
				if (duration >= 4 * pixelTime) {

					var offset = 0;
					var runUntil = end.clone();
					switch (hiddenDates[i].repeat) {
						case 'daily': // case of time
							if (startDate.day() != endDate.day()) {
								offset = 1;
							}
							startDate.dayOfYear(start.dayOfYear());
							startDate.year(start.year());
							startDate.subtract(7,'days');

							endDate.dayOfYear(start.dayOfYear());
							endDate.year(start.year());
							endDate.subtract(7 - offset,'days');

							runUntil.add(1, 'weeks');
							break;
						case 'weekly':
							var dayOffset = endDate.diff(startDate,'days')
							var day = startDate.day();

							// set the start date to the range.start
							startDate.date(start.date());
							startDate.month(start.month());
							startDate.year(start.year());
							endDate = startDate.clone();

							// force
							startDate.day(day);
							endDate.day(day);
							endDate.add(dayOffset,'days');

							startDate.subtract(1,'weeks');
							endDate.subtract(1,'weeks');

							runUntil.add(1, 'weeks');
							break
						case 'monthly':
							if (startDate.month() != endDate.month()) {
								offset = 1;
							}
							startDate.month(start.month());
							startDate.year(start.year());
							startDate.subtract(1,'months');

							endDate.month(start.month());
							endDate.year(start.year());
							endDate.subtract(1,'months');
							endDate.add(offset,'months');

							runUntil.add(1, 'months');
							break;
						case 'yearly':
							if (startDate.year() != endDate.year()) {
								offset = 1;
							}
							startDate.year(start.year());
							startDate.subtract(1,'years');
							endDate.year(start.year());
							endDate.subtract(1,'years');
							endDate.add(offset,'years');

							runUntil.add(1, 'years');
							break;
						default:
							console.log('Wrong repeat format, allowed are: daily, weekly, monthly, yearly. Given:', hiddenDates[i].repeat);
							return;
					}
					while (startDate < runUntil) {
						body.hiddenDates.push({start: startDate.valueOf(), end: endDate.valueOf()});
						switch (hiddenDates[i].repeat) {
							case 'daily':
								startDate.add(1, 'days');
								endDate.add(1, 'days');
								break;
							case 'weekly':
								startDate.add(1, 'weeks');
								endDate.add(1, 'weeks');
								break;
							case 'monthly':
								startDate.add(1, 'months');
								endDate.add(1, 'months');
								break;
							case 'yearly':
								startDate.add(1, 'y');
								endDate.add(1, 'y');
								break;
							default:
								console.log('Wrong repeat format, allowed are: daily, weekly, monthly, yearly. Given:', hiddenDates[i].repeat);
								return;
						}
					}
					body.hiddenDates.push({start: startDate.valueOf(), end: endDate.valueOf()});
				}
			}
		}
		// remove duplicates, merge where possible
		removeDuplicates(body);
		// ensure the new positions are not on hidden dates
		var startHidden = _isHidden(body.range.start, body.hiddenDates);
		var endHidden = _isHidden(body.range.end,body.hiddenDates);
		var rangeStart = body.range.start;
		var rangeEnd = body.range.end;
		if (startHidden.hidden == true) {rangeStart = body.range.startToFront == true ? startHidden.startDate - 1 : startHidden.endDate + 1;}
		if (endHidden.hidden == true)   {rangeEnd   = body.range.endToFront == true ?   endHidden.startDate - 1   : endHidden.endDate + 1;}
		if (startHidden.hidden == true || endHidden.hidden == true) {
			body.range._applyRange(rangeStart, rangeEnd);
		}
	}
}

/**
 * remove duplicates from the hidden dates list. Duplicates are evil. They mess everything up.
 * Scales with N^2
 * @param body
 */
export function removeDuplicates(body) {
	let hiddenDates = body.hiddenDates, safeDates = [];
	for (let i = 0; i < hiddenDates.length; i++) {
		for (let j = 0; j < hiddenDates.length; j++) {
			if (i != j && hiddenDates[j].remove != true 
			&& hiddenDates[i].remove != true) {
				// j inside i
				if (hiddenDates[j].start >= hiddenDates[i].start 
				&& hiddenDates[j].end <= hiddenDates[i].end) {
					hiddenDates[j].remove = true;
				}
				// j start inside i
				else if (hiddenDates[j].start >= hiddenDates[i].start 
				&& hiddenDates[j].start <= hiddenDates[i].end) {
					hiddenDates[i].end = hiddenDates[j].end;
					hiddenDates[j].remove = true;
				}
				// j end inside i
				else if (hiddenDates[j].end >= hiddenDates[i].start 
				&& hiddenDates[j].end <= hiddenDates[i].end) {
					hiddenDates[i].start = hiddenDates[j].start;
					hiddenDates[j].remove = true;
				}
			}
		}
	}

	for (let i = 0; i < hiddenDates.length; i++) {
		if (hiddenDates[i].remove !== true) {
			safeDates.push(hiddenDates[i]);
		}
	}

	body.hiddenDates = safeDates;
	body.hiddenDates.sort((a, b) => a.start - b.start); // sort by start time
}

export function printDates(dates) {
	for (let i = 0; i < dates.length; i++) {
		console.log(
			i, 
			new Date(dates[i].start),
			new Date(dates[i].end), 
			dates[i].start, 
			dates[i].end, 
			dates[i].remove
		);
	}
}

/**
 * Used in TimeStep to avoid the hidden times.
 * @param {function} moment
 * @param {TimeStep} timeStep
 * @param previousTime
 */
export function stepOverHiddenDates(moment, timeStep, previousTime) {
	var stepInHidden = false;
	var currentValue = timeStep.current.valueOf();
	for (var i = 0; i < timeStep.hiddenDates.length; i++) {
		var startDate = timeStep.hiddenDates[i].start;
		var endDate = timeStep.hiddenDates[i].end;
		if (currentValue >= startDate && currentValue < endDate) {
			stepInHidden = true;
			break;
		}
	}

	if (stepInHidden == true && currentValue < timeStep._end.valueOf() 
	&& currentValue != previousTime) {
		var prevValue = moment(previousTime);
		var newValue = moment(endDate);
		//check if the next step should be major
		if (prevValue.year() != newValue.year()) 
			timeStep.switchedYear = true;
		else if (prevValue.month() != newValue.month()) 
			timeStep.switchedMonth = true;
		else if (prevValue.dayOfYear() != newValue.dayOfYear()) 
			timeStep.switchedDay = true;

		timeStep.current = newValue;
	}
}

/**
 * replaces the Core toScreen methods
 * @param Core
 * @param time
 * @param width
 * @returns {number}
 */
export function toScreen(Core, time, width) {
	if (Core.body.hiddenDates.length == 0) {
		const conversion = Core.range.conversion(width);
		return (time.valueOf() - conversion.offset) * conversion.scale;
	}
	else {
		const hidden = _isHidden(time, Core.body.hiddenDates);
		if (hidden.hidden == true) time = hidden.startDate;

		const duration = getHiddenDurationBetween(
			Core.body.hiddenDates, Core.range.start, Core.range.end);
		time = correctTimeForHidden(
			Core.options.moment, Core.body.hiddenDates, Core.range, time);

		const conversion = Core.range.conversion(width, duration);
		return (time.valueOf() - conversion.offset) * conversion.scale;
	}
}

/**
 * Replaces the core toTime methods
 * @param body
 * @param range
 * @param x
 * @param width
 * @returns {Date}
 */
export function toTime(Core, x, width) {
	if (Core.body.hiddenDates.length == 0) {
		var conversion = Core.range.conversion(width);
		return new Date(x / conversion.scale + conversion.offset);
	}
	else {
		var hiddenDuration = getHiddenDurationBetween(
			Core.body.hiddenDates, Core.range.start, Core.range.end);
		var totalDuration = Core.range.end - Core.range.start - hiddenDuration;
		var partialDuration = totalDuration * x / width;
		var accumulatedHiddenDuration = getAccumulatedHiddenDuration(
			Core.body.hiddenDates, Core.range, partialDuration);

		var newTime = new Date(accumulatedHiddenDuration + partialDuration + Core.range.start);
		return newTime;
	}
}


/**
 * Support function
 *
 * @param hiddenDates
 * @param range
 * @returns {number}
 */
export function getHiddenDurationBetween(hiddenDates, start, end) {
	var duration = 0;
	for (var i = 0; i < hiddenDates.length; i++) {
		var startDate = hiddenDates[i].start;
		var endDate = hiddenDates[i].end;
		// if time after the cutout, and the
		if (startDate >= start && endDate < end) {
			duration += endDate - startDate;
		}
	}
	return duration;
}


/**
 * Support function
 * @param moment
 * @param hiddenDates
 * @param range
 * @param time
 * @returns {{duration: number, time: *, offset: number}}
 */
export function correctTimeForHidden(moment, hiddenDates, range, time) {
	time = moment(time).toDate().valueOf();
	time -= getHiddenDurationBefore(moment, hiddenDates,range,time);
	return time;
}

export function getHiddenDurationBefore(moment, hiddenDates, range, time) {
	var timeOffset = 0;
	time = moment(time).toDate().valueOf();

	for (var i = 0; i < hiddenDates.length; i++) {
		var startDate = hiddenDates[i].start;
		var endDate = hiddenDates[i].end;
		// if time after the cutout, and the
		if (startDate >= range.start && endDate < range.end) {
			if (time >= endDate) {
				timeOffset += (endDate - startDate);
			}
		}
	}
	return timeOffset;
}

/**
 * sum the duration from start to finish, including the hidden duration,
 * until the required amount has been reached, return the accumulated hidden duration
 * @param hiddenDates
 * @param range
 * @param time
 * @returns {{duration: number, time: *, offset: number}}
 */
export function getAccumulatedHiddenDuration(
	hiddenDates, range, requiredDuration
) {
	var hiddenDuration = 0;
	var duration = 0;
	var previousPoint = range.start;
	
	for (var i = 0; i < hiddenDates.length; i++) {
		var startDate = hiddenDates[i].start;
		var endDate = hiddenDates[i].end;
		// if time after the cutout, and the
		if (startDate >= range.start && endDate < range.end) {
			duration += startDate - previousPoint;
			previousPoint = endDate;
			if (duration >= requiredDuration) {
				break;
			}
			else {
				hiddenDuration += endDate - startDate;
			}
		}
	}

	return hiddenDuration;
}



/**
 * used to step over to either side of a hidden block. Correction is disabled on tablets, might be set to true
 * @param hiddenDates
 * @param time
 * @param direction
 * @param correctionEnabled
 * @returns {*}
 */
export function snapAwayFromHidden(
	hiddenDates, time, direction, correctionEnabled
) {
	let _isHidden = isHidden(time, hiddenDates);
	if (_isHidden.hidden == true) {
		if (direction < 0) {
			if (correctionEnabled == true) {
				return _isHidden.startDate - (_isHidden.endDate - time) - 1;
			}
			else {
				return _isHidden.startDate - 1;
			}
		}
		else {
			if (correctionEnabled == true) {
				return _isHidden.endDate + (time - _isHidden.startDate) + 1;
			}
			else {
				return _isHidden.endDate + 1;
			}
		}
	}
	else {
		return time;
	}

}


/**
 * Check if a time is hidden
 *
 * @param time
 * @param hiddenDates
 * @returns {{hidden: boolean, startDate: Window.start, endDate: *}}
 */
export function isHidden(time, hiddenDates) {
	for (var i = 0; i < hiddenDates.length; i++) {
		var startDate = hiddenDates[i].start;
		var endDate = hiddenDates[i].end;

		// if the start is entering a hidden zone
		if (time >= startDate && time < endDate) { 
			return {hidden: true, startDate, endDate};
		}
	}
	return {hidden: false, startDate, endDate};
}