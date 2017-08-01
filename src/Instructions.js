import React, { Component } from 'react';

import './Instructions.css';

export default class Instructions extends Component {

	constructor() {
		super();
		this.state = {
			active: false
		};
		this.toggleActive = this.toggleActive.bind(this);
	}

	toggleActive() {
		this.setState({
			active: !this.state.active
		});
	}

	render() {
		return this.state.active ? (
			<div className="instructions">
				<div className="instructions__overlay">
					<p><b>CLICK</b> anywhere to morph the surface.</p>
					<p><b>SPACE BAR</b> to toggle control points.</p>
					<p><b>ENTER</b> to activate numeric controls.</p>
					<p>...if numeric controls <b>are not</b> active:</p>
					<ul>
						<li><b>ARROW KEYS</b> to rotate the surface in space.</li>
						<li><b>WHEEL</b> to zoom in and out.</li>
					</ul>
					<p>...if numeric controls <b>are</b> active:</p>
					<ul>
						<li><b>ARROW KEYS</b> to select dimension or move cursor within input.</li>
						<li><b>WHEEL</b> to move to next/previous control point.</li>
						<li><b>NUMBER KEYS</b> to change value.</li>
					</ul>
				</div>
				<span className="instructions__marker instructions__marker--close" onClick={this.toggleActive}>&times;</span>
			</div>
		) : (
			<div className="instructions instructions__marker" onClick={this.toggleActive}>
				<span>?</span>
			</div>
		);
	}
}