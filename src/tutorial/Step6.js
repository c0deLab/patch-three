import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		
		const cv = this.props.manager.cv;

		cv.surface.stop();
		cv.restoreSurface();

		cv.preventKeysExceptTutorial = true;
	}

	render() {
		return (
			<div>
				<h1>Control Points</h1>
				<p>Finally, you can adjust control points of the surface to manually change its form. There are four end points &mdash; the corners of the surface &mdash; and eight remaining control points that determine the surface’s boundary curves.</p>
				<p>Press <b>P</b> to activate or deactivate the control points. Then, rotate the control knob to choose which control point to manipulate.</p>
				<p>Once you have your control point selected, press <b>X</b>, <b>Y</b>, or <b>Z</b> to turn on that axis. Then, rotate the control knob to move the point along that axis. You will see the surface update as you adjust the control points.</p>
				<p>Press <b>TUT</b> to try it out now, then press <b>TUT</b> again when you're ready to continue.</p>
			</div>
		);
	}
};