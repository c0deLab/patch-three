import React, { Component } from 'react';
import _ from 'lodash';

import Surface from './Surface';

const THREE = require('three');

export default class CanvasView extends Component {
	
	constructor() {

		super();

		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
		this.keysDown = [];

		this.onResize = _.debounce(this.onResize.bind(this), 250);
		this.onClick = this.onClick.bind(this);
		this.onMouseWheel = this.onMouseWheel.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
		this.draw = this.draw.bind(this);
		this.rotateSurface = this.rotateSurface.bind(this);
	}

	onResize() {

		const canvas = this.canvas;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.camera.aspect = canvas.width / canvas.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( canvas.width, canvas.height );
		this.renderer.render(this.scene, this.camera);
	}

	onClick(e) {
		this.surface.morph(60, this.draw);
	}

	onKeyDown(e) {

		Object.values(this.keys).forEach((key) => {
			if (e.keyCode === key) this.keysDown.push(e.keyCode);
		});
		
		// remove duplicates
		this.keysDown = _.uniq(this.keysDown);

		if (!this.isRotating) this.rotateSurface();
	}

	onKeyUp(e) {
		this.keysDown = this.keysDown.filter(key => key !== e.keyCode);
	}

	onMouseWheel(e) {
		e.preventDefault();

		const zoomOut = e.deltaY > 0;     // boolean
    const factor = zoomOut ? 1.1 : 0.9; // number

    this.camera.position.multiplyScalar(factor);

    this.draw();
	}

	draw() {
		this.renderer.render(this.scene, this.camera);
	}

	rotateSurface() {

		let angle = 0;
		let axis = new THREE.Vector3(0, 1, 0);

		const key = _.last(this.keysDown);

		if (key === this.keys.RIGHT) angle = 1;
		if (key === this.keys.LEFT) angle = -1;
		if (key === this.keys.UP) {
			angle = 1;
			axis = new THREE.Vector3(1, 0, 0);
		}
		if (key === this.keys.DOWN) {
			angle = -1;
			axis = new THREE.Vector3(1, 0, 0);
		}

		angle *= 0.02;

		if (angle !== 0) {

			this.isRotating = true;

			let surface = this.surface;

			surface.rotate(axis, angle);

			this.draw();
			
			window.requestAnimationFrame(this.rotateSurface);
		} else {
			this.isRotating = false;
		}
	}

	componentDidMount() {

		// set up canvas
		const canvas = this.refs.canvas;
		this.canvas = canvas;

		// set up scene, camera, renderer
		this.scene = new THREE.Scene();
		
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 200);
		this.camera.position.set(0, 0, -2);
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.refs.canvas,
			antialias: true
		});

		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		
		this.onResize();

		this.surface = new Surface();
		this.surface.setScene(this.scene);
		this.surface.update();
		
		this.draw();

		window.addEventListener('resize', this.onResize);
		this.refs.canvas.addEventListener('click', this.onClick);
    this.refs.canvas.addEventListener('wheel', this.onMouseWheel.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
	}

	render() {
		return <canvas ref="canvas" />
	}
};