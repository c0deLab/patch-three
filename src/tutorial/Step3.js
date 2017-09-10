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
				<p>You can also adjust the elevation of the camera by pressing <b>↑↓</b>. Then, rotate the control knob to move the camera up and down.</p>
				<p>Press <b>TUT</b> to try it out now, then press <b>TUT</b> again when you're ready to continue.</p>
			</div>
		);
	}
};