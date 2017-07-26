import React, { Component } from 'react';

export default class CanvasView extends Component {
	
	constructor() {
		super();

		this.onResize = this.onResize.bind(this);
	}

	onResize() {

		const canvas = this.canvas;
		const context = this.context;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		context.fillStyle = 'black';
		context.fillRect(0, 0, canvas.width, canvas.height);
	}

	componentDidMount() {

		const canvas = this.refs.canvas;
		const context = canvas.getContext('2d');

		this.canvas = canvas;
		this.context = context;
		
		this.onResize();

		window.addEventListener('resize', this.onResize);
	}

	render() {
		return <canvas ref="canvas" />
	}
};