import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = true;
	}

	render() {
		return (
			<div>
				<h1>Morphing</h1>
				<p>To see the surface in action, you can morph it to take on complex forms.</p>
				<p>Press the control knob (like pushing a button) down to morph the surface.</p>
				<p>Morph the surface as many times as you like, and remember that you can move the camera around it for a better view.</p>
				<p>Press <b>TUT</b> to try it out now, then press <b>TUT</b> again when you're ready to continue.</p>
			</div>
		);
	}
};