// @flow

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import * as THREE from 'three';
import OrbitControls from 'three-orbit-controls';
import _ from 'lodash';

import Surface from './Surface';
import { Controls, ControlsManager } from './Controls';
import Coordinates from './Coordinates';
import Tutorial from './Tutorial';
import tutorialManager from './tutorial/tutorialManager';

import { axisX, axisY, axisZ } from './utils/canvas-helpers';
import easing from './utils/easing';

type State = {
	action: null | string,
	i: number,
	coordinates: boolean,
	lastInteraction: Date,
	tutorial: number,
	lastTutorial: number,
	idles: number
};

/**
 * Responsible for maintaining app state, including the Surface,
 * handling user interactions, and drawing to the screen.
 */
export default class CanvasView extends Component<{}, State> {

	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
	canvas: null | HTMLCanvasElement = null;
	renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
	scene: THREE.Scene = new THREE.Scene();
	surface: Surface = new Surface();
	controlsManager: ControlsManager = new ControlsManager();

	/**
	 * These two numbers determine camera location.
	 * Camera is always looking at the origin with z-axis = up.
	 * See .positionCamera()
	 */
	azimuth: number = Math.PI / 8;
	altitude: number = Math.PI / 4;

	actions: Object = {
		TOGGLE: _.throttle(this.toggle.bind(this), 250),
		"←→": this.rotateCameraXY.bind(this),
		"↑↓": this.rotateCameraZ.bind(this),
		ZOOM: this.zoom.bind(this),
		X_AXIS: this.updateControlPoint.bind(this, "x"),
		Y_AXIS: this.updateControlPoint.bind(this, "y"),
		Z_AXIS: this.updateControlPoint.bind(this, "z")
	};

	/**
	 * Bind class methods that use `this` as calling context.
	 */
	iter: Function = this.iter.bind(this);
	checkLastInteraction: Function = this.checkLastInteraction.bind(this);
	onResize: Function = _.debounce(this.onResize.bind(this), 250); // debounced because expensive
	onClick: Function = this.onClick.bind(this);
	onMove: Function = this.onMove.bind(this);
	draw: Function = this.draw.bind(this);
	updateControlPoint: Function = this.updateControlPoint.bind(this);
	positionCamera: Function = this.positionCamera.bind(this);
	restoreSurface: Function = this.restoreSurface.bind(this);
	tutorial: Function = this.tutorial.bind(this);
	zoomToFit: Function = this.zoomToFit.bind(this);
	
	// If true, no keys except `tutorial` will be recognized
	preventKeysExceptTutorial: boolean = false;
	
	constructor() {

		super();

		/**
		 * Initial state:
		 * - no action selected (wheel does nothing)
		 * - iteration set to 0
		 * - coordinates not visible
		 * - last interaction happened at this precise moment
		 */
		this.state = {
			action: null,
			i: 0,
			coordinates: false,
			lastInteraction: new Date(),
			tutorial: -1, // stage of tutorial (-1 for not active),
			lastTutorial: -1,
			idles: 0,
		};

		tutorialManager.cv = this;
	}

	/**
	 * Method that increases iteration state.
	 * Useful in that it triggers .render()
	 * without any other side effects.
	 */
	iter() {
		this.setState({ i: this.state.i + 1 });
	}

	checkLastInteraction() {

		const timeout = 25 * 1000; // 25 seconds

		const t = new Date();

		if (t - this.state.lastInteraction > timeout && this.state.tutorial < 0) {

			// if 10 or more idles, to prevent slowing down, reload everything
			if (this.state.idles > 9) window.location.reload(true);

			this.setState({ idles: this.state.idles + 1 });

			this.surface.stop();

			this.surface.randomizeCloseToOriginal(500, (t) => {
				this.rotateCameraXY(1.5 * easing.dEase(t));
				this.draw();
			});
		}

		window.setTimeout(this.checkLastInteraction, timeout);
	}

	updateLastInteraction(cb: Function = _.noop) {
		this.setState({
			lastInteraction: new Date(),
			idles: 0
		}, cb);
	}

	onResize() {

		this.updateLastInteraction();

		const canvas = this.canvas;
		const renderer = this.renderer;
		if (canvas === null || renderer === null) return;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.camera.aspect = canvas.width / canvas.height;
		this.camera.updateProjectionMatrix();
		renderer.setSize( canvas.width, canvas.height );
		renderer.render(this.scene, this.camera);

		this.positionCoordinates();
	}

	onClick() {
		this.updateLastInteraction();
		this.surface.stop();
		this.surface.randomize(60, this.draw);
	}

	onMove() {
		this.draw();
	}

	draw() {

		console.log(this.camera.up);

		// a little messy, but this.surface removes all children
		// from the scene when this.surface.update() is called...
		// thus need to re-add the axes to the scene whenever the surface
		// might possibly have updated.
		this.scene.add(axisX);
		this.scene.add(axisY);
		this.scene.add(axisZ);

		// this.positionCamera();
		this.positionCoordinates();

		this.renderer.render(this.scene, this.camera);
	}

	rotateCameraXY(delta) {
		let angle = 0.001 * delta;
		this.azimuth += angle;
	}

	rotateCameraZ(delta) {
		let angle = 0.0008 * delta;
		this.altitude += angle;

		// for max altitude = PI / 2, looking straight down
		// for min altitude = -PI / 2, looking straight up
		// (higher or lower is not allowed)
		this.altitude = _.clamp(this.altitude, -Math.PI / 2, Math.PI / 2);
	}

	restoreSurface() {
		this.updateLastInteraction();
		this.surface.stop();
		this.surface.restore(60, this.draw);
	}

	toggle(delta) {
		if (Math.abs(delta) < 6) return;
		this.surface.setActiveControlPointIndex(delta > 0 ? 1 : -1);
		this.draw();
	}

	positionCoordinates() {

		// get active control point location in screen space
		// to decide where to show Coordinates
		let pt = this.surface.getActiveControlPoint();
		if (_.isNil(pt)) return;

		const node = ReactDOM.findDOMNode(this.refs.Coordinates);
		const width = Math.round(node.getBoundingClientRect().width);
		const height = Math.round(node.getBoundingClientRect().height);

		pt = pt.clone();
		pt.project(this.camera);

		// depending on which 'quadrant' it is in,
		// move toward the outside of the screen
		const dx = (pt.x < 0 ? -1 :  1) * width  / 2 + (pt.x < 0 ? -1 :  1) * 15;
		const dy = (pt.y < 0 ?  1 : -1) * height / 2 + (pt.y < 0 ?  1 : -1) * 15;

		pt.x = Math.round(( pt.x + 1) * this.canvas.width / (2 * window.devicePixelRatio)) + dx;
		pt.y = Math.round((-pt.y + 1) * this.canvas.height / (2 * window.devicePixelRatio)) + dy;

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
			coordinatesX: pt.x,
			coordinatesY: pt.y,
		});
	}

	updateControlPoint(axis, delta) {

		const p = this.surface.getActiveControlPoint();
		if (_.isNil(p)) return;

		let q = p.clone(); 
		q[axis] += 0.005 * delta;

		this.surface.setActiveControlPoint(q, axis);
		this.surface.update();
		this.positionCoordinates();
		this.draw();
	}

	positionCamera() {

		let x = 2 * Math.cos(this.azimuth) * Math.cos(this.altitude);
		let y = 2 * Math.sin(this.azimuth) * Math.cos(this.altitude);
		let z = 2 * Math.sin(this.altitude);

		this.camera.position.set(x, y, z);
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		// this.camera.up = new THREE.Vector3(0, 0, 1);

		this.camera.updateProjectionMatrix();
	}

	zoom(delta) {
		const zoomOut = delta > 0;     // boolean
		const factor = zoomOut ? 1.1 : 0.9; // number
		this.camera.zoom *= factor;
		this.camera.updateProjectionMatrix();
	}

	// TODO
	zoomToFit() {
		
		// assume that we do NOT need to zoom out...
		let inView = true;

		// assume that we MIGHT need to zoom in...
		let closeFit = false;
		
		["u0", "u1", "v0", "v1"].forEach((crv) => {
			
			const bez = this.surface[crv].__bez;
			
			["v0", "v1", "v2", "v3"].forEach((pt) => {
				
				// if a control point is out of view of the camera,
				// then we DO need to zoom out
				const controlPt = bez[pt].clone();
				controlPt.project(this.camera);

				let ax = Math.abs(controlPt.x);
				let ay = Math.abs(controlPt.y);

				if (ax > 1 || ay > 1) inView = false;

				if (Math.abs(ax - 1) < 0.1 || Math.abs(ay - 1) < 0.1) {
					closeFit = true;
				}
			});
		});

		// possibly zoom in?
		if (inView) {
			// if a close fit, we're done
			if (closeFit) return;
			// zoom in a bit
			this.zoom(1);
		} else {
			// zoom out a bit
			this.zoom(-1);
		}

		window.requestAnimationFrame(() => {
			this.zoomToFit();
			this.draw();
		});
	}

	componentDidMount() {

		// set up canvas
		const canvas = this.refs.canvas;
		
		const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);

		const renderer = new THREE.WebGLRenderer({
			canvas: this.refs.canvas,
			antialias: true
		});

		const ThreeOrbitControls = OrbitControls(THREE);
		const controls = new ThreeOrbitControls( camera, canvas );
		controls.mouseButtons = {
			ORBIT: THREE.MOUSE.LEFT,
			PAN: THREE.MOUSE.RIGHT
		};
	
		controls.maxPolarAngle = Math.PI / 2;
		controls.maxDistance = 8000;
		controls.damping = 0.5;

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );

		this.canvas = canvas;
		this.camera = camera;
		this.renderer = renderer;
		
		this.onResize();

		this.surface.setScene(this.scene);
		this.surface.init();
		this.surface.update();
		
		// even though .draw() calls .positionCamera(), for some reason if we don't
		// call it here, camera is messed up at beginning
		// TODO: probably should figure this out :-|
		this.positionCamera();

		this.draw();

		this.checkLastInteraction();

		// add event listeners
		window.addEventListener('resize', this.onResize);
		
		this.controlsManager.on('morph', this.onClick);
		this.controlsManager.on('restore', () => {
			this.surface.stop();
			this.restoreSurface();
		});
	}

	tutorial(stage: number) {

		// if we're past the final step of the tutorial,
		// exit
		if (tutorialManager.steps > 0 && stage >= tutorialManager.steps) {
			
			this.setState({ 
				lastTutorial: -1,
				tutorial: -1 
			});

		// otherwise, progress
		} else {

			this.setState({ 
				lastTutorial: this.state.tutorial,
				tutorial: stage 
			});
		}
	}

	render() {

		const coordinatesStyle = {
			display: this.state.coordinates ? 'block' : 'none',
			left: this.state.coordinatesX,
			top: this.state.coordinatesY,
		};

		const helperText = () => {
			return { __html: this.state.helperText };
		};

		return (
			<div onMouseMove={this.onMove}>
				<canvas ref="canvas" />
				{/* <Coordinates 
					ref="Coordinates"
					surface={this.surface} 
					style={coordinatesStyle}
					active={this.state.coordinates} />
				<div className="action">{this.state.action}</div>
				<Tutorial step={this.state.tutorial} manager={tutorialManager} />
				<div className="helper-text" dangerouslySetInnerHTML={helperText()}></div>
				<Controls manager={this.controlsManager} /> */}
			</div>
		)
	}
};