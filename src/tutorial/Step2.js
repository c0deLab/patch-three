import React, { Component } from 'react';

export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = true;
	}	

	render() {
		return (
			<div>
				<h1>Automatic transformation: Morphing</h1>
				<p>First, let’s see the “Coons Patch” in action. In order to transform the surface in a random way, use the <b>MORPH</b> key on the keypad. You can do this as many times as you like. In order to go back to a simple plane, you can press <b>RES</b> at any time.</p>
				<p>Press <b>TUT</b> on the keypad to try using the <b>MORPH</b> command to automatically change the surface or <b>EXIT</b> to exit the tutorial.</p>
			</div>
		);
	}
};