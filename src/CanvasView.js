import React, { Component } from 'react';
import _ from 'lodash';

import Surface from './Surface';
import NumericControls from './NumericControls';
import Instructions from './Instructions';

import { axisX, axisY, axisZ } from './utils/canvas-helpers';

const THREE = require('three');

export default class CanvasView extends Component {
	
	constructor() {

		super();

		this.state = {
			i: 0,
			numericControlsActive: false,
			numericControlsX: -1,
			numericControlsY: -1,
			numericControlIndex: 0,
		};

		this.surface = new Surface();

		// gets passed to NumericControls
		this.surfaceManager = {
			update: (pt) => {
				this.surface.setActiveControlPoint(pt);
				this.surface.update();
				this.positionNumericControls();
				this.draw();
			}
		};

		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, ESC: 27, ENTER: 13, SHIFT: 16 };
		this.keysDown = [];

		this.iter = this.iter.bind(this);
		this.onResize = _.debounce(this.onResize.bind(this), 250);
		this.onClick = this.onClick.bind(this);
		this.onMouseWheel = this.onMouseWheel.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
		this.draw = this.draw.bind(this);
		this.rotateCamera = this.rotateCamera.bind(this);
		this.toggleSurfaceControls = this.toggleSurfaceControls.bind(this);
		this.restoreSurface = this.restoreSurface.bind(this);
		this.toggleNumericControls = this.toggleNumericControls.bind(this);
		this.positionNumericControls = this.positionNumericControls.bind(this);
		this.goToNumericControl = this.goToNumericControl.bind(this);
	}

	iter() {
		this.setState({ i: this.state.i + 1 });
	}

	onResize() {

		const canvas = this.canvas;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.camera.aspect = canvas.width / canvas.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( canvas.width, canvas.height );
		this.renderer.render(this.scene, this.camera);

		this.positionNumericControls();
	}

	onClick(e) {
		this.surface.randomize(60, () => {
			this.draw();
			this.positionNumericControls();
		});
	}

	onKeyDown(e) {

		const code = e.keyCode;

		Object.values(this.keys).forEach((key) => {
			if (code === key) this.keysDown.push(code);
		});
		
		// remove duplicates
		this.keysDown = _.uniq(this.keysDown);

		// arrow keys
		if (code >= 37 && code <= 40) {
			if (this.state.numericControlsActive) {
				switch (code) {
					case this.keys.UP:
						this.goToNumericControl(-1);
						break;
					case this.keys.DOWN:
						this.goToNumericControl(1);
						break;
					default:
				}
			} else {
				if (!this.isRotating) this.rotateCamera();
			}
		}

		// others
		if (_.indexOf(this.keysDown, this.keys.SPACE) >= 0) this.toggleSurfaceControls();
		if (_.indexOf(this.keysDown, this.keys.ESC) >= 0) this.restoreSurface();
		if (_.indexOf(this.keysDown, this.keys.ENTER) >= 0) this.toggleNumericControls();
	}

	onKeyUp(e) {
		const code = e.keyCode;
		this.keysDown = this.keysDown.filter(key => key !== code);
	}

	onMouseWheel(e) {

		e.preventDefault();

		// scrub through control points
		if (this.state.numericControlsActive) {

			this.surface.setActiveControlPointIndex(e.deltaY > 0 ? 1 : -1);
			this.positionNumericControls();

		// zooming
		} else {
			const zoomOut = e.deltaY > 0;     // boolean
	    const factor = zoomOut ? 1.1 : 0.9; // number
	    this.camera.position.multiplyScalar(factor);
		}

    this.draw();
	}

	draw() {

		this.scene.add(axisX);
		this.scene.add(axisY);
		this.scene.add(axisZ);

		this.renderer.render(this.scene, this.camera);
	}

	rotateCamera() {

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

			this.camera.position.applyAxisAngle(axis, angle);
			this.camera.lookAt(new THREE.Vector3(0, 0, 0));
			this.camera.up = new THREE.Vector3(0, 0, 1);

			this.draw();
			
			window.requestAnimationFrame(this.rotateCamera);
		} else {
			this.isRotating = false;
		}
	}

	toggleSurfaceControls() {
		// don't toggle if numeric controls active
		if (this.state.numericControlsActive) return;
		this.surface.toggleControls();
		this.draw();
	}

	restoreSurface() {
		this.surface.restore(60, () => {
			this.draw();
			this.positionNumericControls();
		});
	}

	positionNumericControls() {
		// get active control point location in screen space
		// to decide where to show NumericControls
		let pt = this.surface.getActiveControlPoint();
		if (_.isNil(pt)) return;

		// ACHTUNG: these numbers are hardcoded in NumericControls.css
		const width = 200;
		const height = 174;

		pt = pt.clone();
		pt.project(this.camera);

		// depending on which 'quadrant' it is in,
		// move toward the outside of the screen
		const dx = (pt.x < 0 ? -1 :  1) * width  / 2 + (pt.x < 0 ? -1 :  1) * 15;
		const dy = (pt.y < 0 ?  1 : -1) * height / 2 + (pt.y < 0 ?  1 : -1) * 15;

		pt.x = Math.round(( pt.x + 1) * this.canvas.width / 2) + dx;
		pt.y = Math.round((-pt.y + 1) * this.canvas.height / 2) + dy;

		// keep it on the screen...
		// right
		if (pt.x + width / 2 > this.canvas.width) pt.x = this.canvas.width - width / 2;
		// left
		if (pt.x - width / 2 < 0) pt.x = width / 2;
		// bottom
		if (pt.y + height / 2 > this.canvas.height) pt.y = this.canvas.height - height / 2;
		// top
		if (pt.y - height / 2 < 0) pt.y = height / 2;

		this.setState({
			numericControlsX: pt.x,
			numericControlsY: pt.y,
		});
	}

	toggleNumericControls() {

		this.setState({
			numericControlsActive: !this.state.numericControlsActive
		}, () => {
			if (this.state.numericControlsActive) {
				this.surface.activateControls();
				this.positionNumericControls();
			} else {
				this.surface.deactivateControlPoint();
			}
			this.draw();
		});
	}

	goToNumericControl(dir) {
		this.setState({
			numericControlIndex: (this.state.numericControlIndex + dir + 3) % 3
		});
	}

	componentDidMount() {

		// set up canvas
		const canvas = this.refs.canvas;
		this.canvas = canvas;

		// set up scene, camera, renderer
		this.scene = new THREE.Scene();
		
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
		this.camera.position.set(0, 0, 2);
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.refs.canvas,
			antialias: true
		});

		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		
		this.onResize();

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

		const numericControlsStyle = {
			display: this.state.numericControlsActive ? 'block' : 'none',
			left: this.state.numericControlsX,
			top: this.state.numericControlsY,
		};

		return (
			<div>
				<canvas ref="canvas" />
				<NumericControls 
					surface={this.surface} 
					surfaceManager={this.surfaceManager}
					style={numericControlsStyle}
					active={this.state.numericControlsActive} 
					activeIndex={this.state.numericControlIndex} />
				<Instructions />
			</div>
		)
	}
};