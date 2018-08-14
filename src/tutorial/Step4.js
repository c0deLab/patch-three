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
				<h1>Changing the camera position</h1>
				<p>Lastly, you will learn how to change the position of the “camera” in the scene. You can rotate the camera around the surface by pressing <b>←→</b> on the keypad, and you can adjust its elevation by pressing <b>↑↓</b>. You will see the action update in the upper-left corner of the screen.</p>
				<p>Then, you may use the control knob to move the camera. Additionally, you may press <b>ZOOM</b> to change the distance of the camera to the patch. If you ever zoom too far in or out, press <b>FIT</b> to fit the surface within the camera view.</p>
				<p>Press <b>TUT</b> on the keypad to try using <b>←→</b>, <b>↑↓</b>, <b>ZOOM</b>, and the knob to change the camera’s position or <b>EXIT</b> to exit the tutorial.</p>
			</div>
		);
	}
};