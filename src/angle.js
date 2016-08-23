/**
 * Replaces jsts.algorithm.Angle since it seems to be missing right now.
 * Utility functions for working with angles. Unless otherwise noted, 
 * methods in this class express angles in radians.
 * @see http://bjornharrtell.github.io/jsts/doc/api/jsts.algorithm.Angle.html
 */

/** @alias module:lib/angle.toDegrees */
export function toDegrees(radians) {
	return radians * 180 / Math.PI;
}

/** @alias module:lib/angle.normalize */
export function normalize(angle) {
	while (angle > Math.PI) angle -= PI_TIMES_2;
	while (angle <= -Math.PI) angle += PI_TIMES_2;
	return angle;
}

/** @alias module:lib/angle.angle */
export function angle(...args) {
	if (args.length === 1) {
		const [p] = args;
		return Math.atan2(p.y, p.x);
	} else if (args.length === 2) {
		const [p0, p1] = args;
		const dx = p1.x - p0.x;
		const dy = p1.y - p0.y;
		return Math.atan2(dy, dx);
	}
}

export function isAcute(p0, p1, p2) {
	const dx0 = p0.x - p1.x;
	const dy0 = p0.y - p1.y;
	const dx1 = p2.x - p1.x;
	const dy1 = p2.y - p1.y;
	const dotprod = dx0 * dx1 + dy0 * dy1;
	return dotprod > 0;
}

export function isObtuse(p0, p1, p2) {
	const dx0 = p0.x - p1.x;
	const dy0 = p0.y - p1.y;
	const dx1 = p2.x - p1.x;
	const dy1 = p2.y - p1.y;
	const dotprod = dx0 * dx1 + dy0 * dy1;
	return dotprod < 0;
}

export function interiorAngle(p0, p1, p2) {
	const anglePrev = angle(p1, p0);
	const angleNext = angle(p1, p2);
	return Math.abs(angleNext - anglePrev);
}

/** @alias module:lib/angle.normalizePositive */
export function normalizePositive(angle) {
	if (angle < 0.0) {
		while (angle < 0.0) angle += PI_TIMES_2;
		if (angle >= PI_TIMES_2) angle = 0.0;
	} else {
		while (angle >= PI_TIMES_2) angle -= PI_TIMES_2;
		if (angle < 0.0) angle = 0.0;
	}
	return angle;
}

export function angleBetween(tip1, tail, tip2) {
	const a1 = angle(tail, tip1);
	const a2 = angle(tail, tip2);
	return diff(a1, a2);
}

export function diff(ang1, ang2) {
	let delAngle = null;
	if (ang1 < ang2) {
		delAngle = ang2 - ang1;
	} else {
		delAngle = ang1 - ang2;
	}
	if (delAngle > Math.PI) {
		delAngle = 2 * Math.PI - delAngle;
	}
	return delAngle;
}

/** @alias module:lib/angle.toRadians */
export function toRadians(angleDegrees) {
	return angleDegrees * Math.PI / 180.0;
}

export function getTurn(ang1, ang2) {
	const crossproduct = Math.sin(ang2 - ang1);
	if (crossproduct > 0) {
		return COUNTERCLOCKWISE;
	}
	if (crossproduct < 0) {
		return CLOCKWISE;
	}
	return NONE;
}

export function angleBetweenOriented(tip1, tail, tip2) {
	const a1 = angle(tail, tip1);
	const a2 = angle(tail, tip2);
	const angDel = a2 - a1;
	if (angDel <= -Math.PI) return angDel + PI_TIMES_2;
	else if (angDel > Math.PI) return angDel - PI_TIMES_2;
	else return angDel;
}

/** @alias module:lib/angle.PI_TIMES_2 */
export const PI_TIMES_2 = 2.0 * Math.PI;
export const PI_OVER_2 = Math.PI / 2.0;
export const PI_OVER_4 = Math.PI / 4.0;
export const COUNTERCLOCKWISE = 1;
export const CLOCKWISE = -1;
export const NONE = 0;