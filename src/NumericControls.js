import React, { Component } from 'react';

import './NumericControls.css';

export default class NumericControls extends Component {

	constructor() {
		
		super();
		
		this.state = {
			point: null
		};

		this.update = this.update.bind(this);
	}

	setPoint(point) {
		this.setState({ point });
	}

	update(e) {

		// wait for a reasonable value...
		if (isNaN(+e.target.value)) return console.error('Bad value...');
		
		// hand off new point to the surfaceManager to update	
		const newPt = {
			x: +this.refs.x.value,
			y: +this.refs.y.value,
			z: +this.refs.z.value,
		}

		this.props.surfaceManager.update(newPt);
	}

	componentDidMount() {
		this.refs.x.addEventListener('keyup', this.update);
		this.refs.y.addEventListener('keyup', this.update);
		this.refs.z.addEventListener('keyup', this.update);
	}

	componentDidUpdate() {

		// update the input that is currently displayed?

		// mousewheel from CanvasView will focus different inputs
		switch (this.props.activeIndex) {
			case 0:
				this.refs.x.focus();
				break;
			case 1:
				this.refs.y.focus();
				break;
			case 2:
				this.refs.z.focus();
				break;
			default:
		}
	}

	format(v) {
		let s = (Math.round(v * 10000) / 10000).toString();
		if (s.split('.').length === 1) s += ".0";
		return s;
	}

	render() {

		const pt = this.props.surface.getActiveControlPoint() || { x: '---', y: '---', z: '---' };

		let className = "numeric-controls";
		if (this.props.active) className += " numeric-controls--active";

		return (
			<div className={className} style={this.props.style}>
				<input ref="x" name="x" value={this.format(pt.x)} onChange={this.update} />
				<input ref="y" name="y" value={this.format(pt.y)} onChange={this.update} />
				<input ref="z" name="z" value={this.format(pt.z)} onChange={this.update} />
			</div>
		);
	}
};