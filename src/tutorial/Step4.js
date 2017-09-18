import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = true;
	}

	render() {
		return (
			<div>
				<h1>Camera: Zoom</h1>
				<p>You might want to zoom the camera out, if the surface has grown too big to fit on the screen, or zoom in for a better look at an interesting area.</p>
				<p>Pressing <b>ZOOM</b> on the keypad. Then, rotate the control knob to move the camera up and down.</p>
				<p>If you ever zoom too far in or out, press <b>FIT</b> to fit the surface within the camera view.</p>
				<p>Press <b>TUT</b> to try it out now, then press <b>TUT</b> again when you're ready to continue.</p>
			</div>
		);
	}
};