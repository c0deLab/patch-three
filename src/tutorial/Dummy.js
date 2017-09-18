import { Component } from 'react';

/**
 *	A dummy step to allow key presses again
 */
export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = false;
	}

	render() {
		return null;
	}
};