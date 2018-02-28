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
	
	// If true, no keys except `tutorial` will be recognized
	preventKeysExceptTutorial: boolean = false;
	
	constructor() {

		super();

		/**
		 * Initial state:
		 * - no action selected (wheel does nothing)
		 * - iteration set to 0
		 * - coordinates not visible
		 */
		this.state = {
			action: null,
			i: 0,
			coordinates: false,
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
	iter: Function = () => {
		this.setState({ i: this.state.i + 1 });
	}

	onResize: Function = () => {

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

	onClick: Function = () => {
		this.surface.stop();
		this.surface.randomize(60, this.draw);
	}

	onMove: Function = () => {
		this.draw();
	}

	draw: Function = () => {

		// a little messy, but this.surface removes all children
		// from the scene when this.surface.update() is called...
		// thus need to re-add the axes to the scene whenever the surface
		// might possibly have updated.
		this.scene.add(axisX);
		this.scene.add(axisY);
		this.scene.add(axisZ);

		this.positionCoordinates();

		this.renderer.render(this.scene, this.camera);
	}

	restoreSurface: Function = () => {
		this.surface.stop();
		this.surface.restore(60, this.draw);
	}

	toggle: Function = (delta: number) => {
		if (Math.abs(delta) < 6) return;
		this.surface.setActiveControlPointIndex(delta > 0 ? 1 : -1);
		this.draw();
	}

	positionCoordinates: Function = () => {

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

	updateControlPoint: Function = (axis, delta) => {

		const p = this.surface.getActiveControlPoint();
		if (_.isNil(p)) return;

		let q = p.clone(); 
		q[axis] += 0.005 * delta;

		this.surface.setActiveControlPoint(q, axis);
		this.surface.update();
		this.positionCoordinates();
		this.draw();
	}

	// TODO
	zoomToFit: Function = () => {
		
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

		camera.position.set(0.7, 1, 1.2);

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
		
		controls.addEventListener('change', this.draw);

		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );

		this.canvas = canvas;
		this.camera = camera;
		this.renderer = renderer;
		
		this.onResize();

		this.surface.setScene(this.scene);
		this.surface.init();
		this.surface.update();

		this.draw();

		// add event listeners
		window.addEventListener('resize', this.onResize);
		
		this.controlsManager.on('morph', this.onClick);
		this.controlsManager.on('restore', () => {
			this.surface.stop();
			this.restoreSurface();
		});
	}

	tutorial: Function = (stage: number) => {

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
			<div>
				<canvas ref="canvas" />
				<Coordinates 
					ref="Coordinates"
					surface={this.surface} 
					style={coordinatesStyle}
					active={this.state.coordinates} />
				<div className="helper-text" dangerouslySetInnerHTML={helperText()}></div>
				<Controls manager={this.controlsManager} />
			</div>
		)
	}
};