import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = true;
		cv.setState({ helperText: "" });
	}

	render() {
		return (
			<div>
				<h1>Manual transformation: Control Points</h1>
				<p>The key to Coons’ method is its capacity to manipulate a surface based on four bounding curves. By manipulating the curves’ control points, you can manually change its form. Press <b>PT</b> to toggle on or off the control points. Once the points are visible, you may use the control knob to choose which point you would like to move. Press <b>X</b>, <b>Y</b>, or <b>Z</b> to select the axis of motion for that point, and use the control knob again to move the point along that axis. You will see the surface update as you adjust the control points.</p>
				<p>Press <b>TUT</b> on the keypad to try using <b>PT</b>, <b>X</b>, <b>Y</b>, <b>Z</b>, and the knob to manually modify the surface or <b>EXIT</b> to exit the tutorial.</p>
			</div>
		);
	}
};