import React, { Component } from 'react';

import './Tutorial.css';

import Step1 from './tutorial/Step1';

export default class Tutorial extends Component {

	render() {

		let containerClass = "tutorial";

		let steps = [
			<Step1 />,

			<p>hello here is step 1</p>,

			<p>and finally step 2</p>
		];

		if (this.props.step >= 0 && this.props.step < steps.length) containerClass += " tutorial--active";

		return (
			<div className={containerClass}>
				<div className="tutorial__overlay">
					{steps[this.props.step]}
				</div>
			</div>
		);
	}
}