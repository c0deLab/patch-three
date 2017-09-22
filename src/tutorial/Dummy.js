import _ from 'lodash';

import { Component } from 'react';

/**
 *	A dummy step to allow key presses again
 */
export default class Step extends Component {

	componentDidMount() {
		const cv = this.props.manager.cv;
		cv.preventKeysExceptTutorial = false;

		if (_.isString(this.props.helperText)) {
			cv.setState({
				helperText: this.props.helperText
			});
		}
	}

	render() {
		return null;
	}
};