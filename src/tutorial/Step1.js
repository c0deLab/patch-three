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
				<h1>Coons Patch</h1>
				<p>The surface you see here might look very complex. It can take the shape of a simple plane or a self-intersecting form that would be very difficult to draw by hand, let alone fabricate in physical form.</p>
				<p>But, from a computational perspective, it's actually very succinct! Every form the surface takes can be defined by just 36 numbers. It would be a lot to keep in your head, but for a computer, it's no sweat.</p>
				<p>Using the controls here, you can manipulate the surface. First, you'll learn how to move the camera around the surface.</p>
				<p>Press <b>TUT</b> on the keypad to continue.</p>
			</div>
		);
	}
};