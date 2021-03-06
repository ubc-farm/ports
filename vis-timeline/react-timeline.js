import React, { Component, PropTypes } from 'react'
import {
	difference,
	intersection,
	each,
	assign,
	omit,
	keys
} from './lodash/index.es.js';
import VisTimeline from './src/timeline/Timeline.js';
import DataSet from './src/DataSet.js';
//import 'vis/dist/vis.css'

const noop = function() {}
const events = [
	'currentTimeTick',
	'click',
	'contextmenu',
	'doubleClick',
	'groupDragged',
	'changed',
	'rangechange',
	'rangechanged',
	'select',
	'timechange',
	'timechanged'
]

const eventPropTypes = {}
const eventDefaultProps = {}

each(events, event => {
	eventPropTypes[event] = PropTypes.func,
	eventDefaultProps[`${event}Handler`] = noop
})

export default class Timeline extends Component {

	componentWillMount() {
		this.state = {
			// NOTE we store custom times on the state to enable us to diff with new
			// custom times and add or remove the elements with visjs
			customTimes: []
		}
	}

	componentDidMount() {
		this.init()
		console.log(this.TimelineElement);
	}

	shouldComponentUpdate(nextProps) {
		const propKeys = Object.keys(this.props);

		if (propKeys.length !== Object.keys(nextProps).length) return true;

		return propKeys.reduce(
			(bool, prop) => bool || nextProps[prop] !== this.props[prop]
		);
	}

	componentDidUpdate() {
		this.init()
	}

	componentWillUnmount() {
		this.TimelineElement.destroy()
	}

	// create timeline element
	// set custom time(s)
	// set data set

	init() {
		const container = this._container
		let $el = this.TimelineElement

		const {items,	options, groups, customTimes, animate = true} = this.props

		const timelineItems = new DataSet(items)
		const timelineGroups = new DataSet(groups);
		const timelineExists = !!$el

		if (timelineExists) {
			$el.setItems(timelineItems)

			let updatedOptions

			// If animate option is set, we should animate the timeline to any new
			// start/end values instead of jumping straight to them
			if (animate) {
				updatedOptions = omit(options, 'start', 'end')
				$el.setWindow(options.start, options.end, { animation: animate })
			}

			$el.setOptions(updatedOptions)

		} else {
			$el = this.TimelineElement = new VisTimeline(container, 
				timelineItems, timelineGroups, options)

			events.forEach(event => {
				$el.on(event, this.props[`${event}Handler`])
			})
		}

		// diff the custom times to decipher new, removing, updating
		const customTimeKeysPrev = keys(this.state.customTimes)
		const customTimeKeysNew = keys(customTimes)
		const customTimeKeysToAdd = difference(customTimeKeysNew, customTimeKeysPrev)
		const customTimeKeysToRemove = difference(customTimeKeysPrev, customTimeKeysNew)
		const customTimeKeysToUpdate = intersection(customTimeKeysPrev, customTimeKeysNew)

		// NOTE this has to be in arrow function so context of `this` is based on
		// $el and not `each`
		each(customTimeKeysToRemove, id => $el.removeCustomTime(id))
		each(customTimeKeysToAdd, id => {
			const datetime = customTimes[id]
			$el.addCustomTime(datetime, id)
		})
		each(customTimeKeysToUpdate, id => {
			const datetime = customTimes[id]
			$el.setCustomTime(datetime, id)
		})

		// store new customTimes in state for future diff
		this.setState({ customTimes })


	}

	render() {
		return <div ref={c => this._container = c} />
	}
}

Timeline.propTypes = assign({
	items: PropTypes.array,
	groups: PropTypes.array,
	options: PropTypes.object,
	customTimes: PropTypes.shape({
		datetime: PropTypes.instanceOf(Date),
		id: PropTypes.string
	}),
	animate: PropTypes.oneOfType([
		PropTypes.bool,
		PropTypes.object,
	]),
}, eventPropTypes)

Timeline.defaultProps = assign({
	items: [],
	options: {},
	customTimes: {},
}, eventDefaultProps)