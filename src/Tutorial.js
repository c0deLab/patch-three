import React, { Component } from 'react';

import './Tutorial.css';

import Step1 from './tutorial/Step1';
import Step2 from './tutorial/Step2';
import Step3 from './tutorial/Step3';
import Step4 from './tutorial/Step4';
import Step5 from './tutorial/Step5';
import Step6 from './tutorial/Step6';
import Dummy from './tutorial/Dummy';

export default class Tutorial extends Component {

	componentDidMount() {

		const manager = this.props.manager;

		this.steps = [
			<Step1 manager={manager} />,
			<Step2 manager={manager} />,
			<Dummy manager={manager} hide={true} />,
			<Step3 manager={manager} />,
			<Dummy manager={manager} hide={true} />,
			<Step4 manager={manager} />,
			<Dummy manager={manager} hide={true} />,
			<Step5 manager={manager} />,
			<Dummy manager={manager} hide={true} />,
			<Step6 manager={manager} />,
			<Dummy manager={manager} hide={true} />
		];

		this.props.manager.steps = this.steps.length;
	}

	render() {

		let containerClass = "tutorial";

		const active = this.props.step >= 0 && this.props.step < this.steps.length;
		const step = active ? this.steps[this.props.step] : null;

		if (active && !step.props.hide) containerClass += " tutorial--active";

		return (
			<div className={containerClass}>
				<div className="tutorial__overlay">
					{step}
				</div>
			</div>
		);
	}
}