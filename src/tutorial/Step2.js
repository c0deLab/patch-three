import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = true;
	}	

	render() {
		return (
			<div>
				<h1>Camera</h1>
				<p>You can rotate the camera around the surface by pressing <b>←→</b> on the keypad. You will see the action update in the upper-left corner of the screen.</p>
				<p>Then, rotate the control knob to move the camera.</p>
				<p>Press <b>TUT</b> to try it out now, then press <b>TUT</b> again when you're ready to continue.</p>
			</div>
		);
	}
};