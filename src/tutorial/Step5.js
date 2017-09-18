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
				<h1>Morphing</h1>
				<p>To see the surface in action, you can morph it to take on complex forms.</p>
				<p>Press the <b>MORPH</b> key to morph the surface.</p>
				<p>Morph the surface as many times as you like, and remember that you can move the camera around it for a better view.</p>
				<p>You can also press <b>RES</b> at any time to restore the surface to a simple plane.</p>
				<p>Press <b>TUT</b> to try it out now, then press <b>TUT</b> again when you're ready to continue.</p>
			</div>
		);
	}
};