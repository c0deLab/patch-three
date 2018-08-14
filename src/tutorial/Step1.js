import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		
		const cv = this.props.manager.cv;

		cv.surface.stop();
		cv.restoreSurface();

		cv.preventKeysExceptTutorial = true;

		cv.setState({ helperText: "" });
	}

	render() {
		return (
			<div>
				<h1>Coons Patch</h1>
				<p>This interactive application reconstructs the “Coons patch,” a pioneering mathematical method for describing curved surfaces in the computer. It was originally developed by Steven A. Coons, a mechanical engineering professor at MIT, in the early 1960s. The “Coons patch” creates a smooth surface between any four parametrically-defined curves. Depending on the curves, the “patches” can be geometrically complex, or simple. The “Coons patch” allowed early CAD researchers to see the computer as a powerful modeling tool with applications in aircraft, car design, architecture, and other fields.</p>
				<p>This tutorial will show you how to use this application to create and manipulate your own “Coons
				patches.”</p>
				<p>Press <b>TUT</b> on the keypad to continue or <b>EXIT</b> to exit the tutorial.</p>
			</div>
		);
	}
};