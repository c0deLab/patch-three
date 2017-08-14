import React, { Component } from 'react';

import './Coordinates.css';

export default class Coordinates extends Component {

	format(v) {
		let s = (Math.round(v * 1000) / 1000).toString();
		if (s.split('.').length === 1) s += ".0";
		return s;
	}

	render() {

		const pt = this.props.surface.getActiveControlPoint() || { x: '---', y: '---', z: '---' };

		let className = "coordinates";
		if (this.props.active) className += " coordinates--active";

		return (
			<div className={className} style={this.props.style}>
				({this.format(pt.x)}, {this.format(pt.y)}, {this.format(pt.z)})
			</div>
		);
	}
};