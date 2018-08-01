import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import * as THREE from 'three';

import Surface from './Surface';
import Coordinates from './Coordinates';
import Tutorial from './Tutorial';
import tutorialManager from './tutorial/tutorialManager';

import { axisX, axisY, axisZ } from './utils/canvas-helpers';
import easing from './utils/easing';

/**
 * Responsible for maintaining app state, including the Surface,
 * handling user interactions, and drawing to the screen.
 */
export default class CanvasView extends Component {
	
	constructor() {

		super();

		/**
		 * Initial state:
		 * - no action selected (control knob does nothing)
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

		this.surface = new Surface();
		tutorialManager.cv = this;

		this.actionNames = {
			SELECT: "Select Control Point",
			CAMERA_XY: "XY Camera Rotation (←→)",
			CAMERA_Z: "YZ Camera Rotation (↑↓)",
			ZOOM: "Zoom",
			MOVE_X: "Move Control Point Along X Axis",
			MOVE_Y: "Move Control Point Along Y Axis",
			MOVE_Z: "Move Control Point Along Z Axis",
			TUTORIAL: "TUTORIAL",
			DISPLAY: "DISPLAY",
			RESTORE: "RESTORE",
			EXIT: "EXIT",
			MORPH: "MORPH",
			ZOOMTOFIT: "ZOOMTOFIT",
			DOWNLOAD_SVG: "DOWNLOAD_SVG"
		};

		this.actions = {
			[this.actionNames.SELECT]: _.throttle(this.toggle, 250),
			[this.actionNames.CAMERA_XY]: this.rotateCameraXY,
			[this.actionNames.CAMERA_Z]: this.rotateCameraZ,
			[this.actionNames.ZOOM]: this.zoom,
			[this.actionNames.MOVE_X]: this.updateControlPoint.bind(this, "x"),
			[this.actionNames.MOVE_Y]: this.updateControlPoint.bind(this, "y"),
			[this.actionNames.MOVE_Z]: this.updateControlPoint.bind(this, "z")
		};

		this.keys = { 
			85: this.actionNames.CAMERA_XY,
			86: this.actionNames.CAMERA_Z,
			73: this.actionNames.SELECT,
			87: this.actionNames.ZOOM,
			69: this.actionNames.DISPLAY,
			74: this.actionNames.MOVE_X,
			75: this.actionNames.MOVE_Y,
			76: this.actionNames.MOVE_Z,
			66: this.actionNames.RESTORE,
			72: this.actionNames.EXIT,
			68: this.actionNames.TUTORIAL,
			65: this.actionNames.MORPH,
			88: this.actionNames.ZOOMTOFIT,
			192: this.actionNames.DOWNLOAD_SVG
		};

		/**
		 * These two numbers determine camera location.
		 * Camera is always looking at the origin with z-axis = up.
		 * See .positionCamera()
		 */
		this.azimuth = Math.PI / 8;
		this.altitude = Math.PI / 4;

		this.preventKeysExceptTutorial = false;
	}

	/**
	 * Method that increases iteration state.
	 * Useful in that it triggers .render()
	 * without any other side effects.
	 */
	iter = () => {
		this.setState({ i: this.state.i + 1 });
	}

	checkLastInteraction = () => {

		const timeout = 25 * 1000; // 25 seconds

		const t = new Date();

		if (t - this.state.lastInteraction > timeout && this.state.tutorial < 0) {

			// if 10 or more idles, to prevent slowing down, reload everything
			if (this.state.idles > 9) window.location.reload(true);

			this.setState({ idles: this.state.idles + 1 });

			this.surface.stop();

			this.surface.randomizeCloseToOriginal(500, (t) => {
				this.rotateCameraXY(0.25 * easing.dEase(t));
				this.draw();
			}, () => {
				this.zoomToFit(0.01);
			});
		}

		window.setTimeout(this.checkLastInteraction, timeout);
	}

	updateLastInteraction = (cb) => {
		this.setState({
			lastInteraction: new Date(),
			idles: 0
		}, cb);
	}

	onResize = _.debounce(() => {

		this.updateLastInteraction();

		const canvas = this.canvas;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		this.camera.aspect = canvas.width / canvas.height;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize( canvas.width, canvas.height );
		this.renderer.render(this.scene, this.camera);

		this.positionCoordinates();
	}, 250)

	onClick = (e) => {
		this.updateLastInteraction();
		this.surface.stop();
		this.surface.randomize(60, this.draw, () => {
			this.zoomToFit(0.1);
		});
	}

	onKeyDown = (e) => {

		this.updateLastInteraction();

		const code = e.keyCode;
		const { actionNames } = this;

		if (!(code in this.keys)) return;

		let action = this.keys[code];

		if (action === this.state.action && action !== actionNames.TUTORIAL) action = null;
		if (this.preventKeysExceptTutorial && action !== actionNames.TUTORIAL) return;

		if (action === actionNames.EXIT) {
			window.location.reload(true);
		} if (action !== actionNames.TUTORIAL) {
			this.setState({ 
				lastTutorial: this.state.tutorial >= 0 ? this.state.tutorial : this.state.lastTutorial,
				tutorial: -1
			});
		} else {
			let step = this.state.tutorial;
			if (this.state.lastTutorial >= 0 && this.state.tutorial === -1) step = this.state.lastTutorial;
			step++;
			this.tutorial(step);
			return;
		}

		if (_.isFunction(this.actions[action]) || action === null) this.setState({ action });

		// some keys should trigger changes by themselves,
		// not just setting the action for the wheel to handle
		if (action === actionNames.MORPH) {

			this.onClick();

		} else if (action === actionNames.ZOOMTOFIT) {

			this.zoomToFit();

		} else if (action === actionNames.DOWNLOAD_SVG) {
			
			this.downloadSVG();

		} else if (action === actionNames.SELECT) {

			if (!this.surface.controls) {

				this.surface.activateControls();

				this.setState({ coordinates: true });
				this.positionCoordinates();
			} else {
				this.surface.setAxis(null);
				this.surface.update();
			}

		} else if ([actionNames.MOVE_X, actionNames.MOVE_Y, actionNames.MOVE_Z].indexOf(action) > -1) {

			this.surface.stop();

			let axis = action === actionNames.MOVE_X ? "x" : action === actionNames.MOVE_Y ? "y" : "z";

			this.surface.setAxis(axis);
			
			if (!this.surface.controls) {
				this.surface.activateControls();
				this.setState({ coordinates: true });
				this.positionCoordinates();
			}

			this.surface.update();

		} else if (action === actionNames.RESTORE) {
			this.surface.stop();
			this.restoreSurface();
		} else if (action === actionNames.DISPLAY) {
			this.surface.nextDisplay();
		} else {
			this.setState({ coordinates: false });
			this.surface.deactivateControls();
		}

		this.draw();
	}

	onWheel = (e) => {

		e.preventDefault();

		this.updateLastInteraction();

		const action = this.state.action;

		if (!(action in this.actions)) return;

		this.actions[action](-e.deltaY);

		this.draw();
	}

	draw = () => {

		// a little messy, but this.surface removes all children
		// from the scene when this.surface.update() is called...
		// thus need to re-add the axes to the scene whenever the surface
		// might possibly have updated.
		this.scene.add(axisX);
		this.scene.add(axisY);
		this.scene.add(axisZ);

		this.positionCamera();
		this.positionCoordinates();

		this.renderer.render(this.scene, this.camera);
	}

	rotateCameraXY = (delta) => {
		let angle = 0.006 * delta;
		this.azimuth += angle;
	}

	rotateCameraZ = (delta) => {
		let angle = 0.005 * delta;
		this.altitude += angle;

		// for max altitude = PI / 2, looking straight down
		// for min altitude = -PI / 2, looking straight up
		// (higher or lower is not allowed)
		this.altitude = _.clamp(this.altitude, -Math.PI / 2, Math.PI / 2);
	}

	restoreSurface = () => {
		this.surface.restore(60, this.draw, () => this.zoomToFit(0.3));
	}

	toggle = (delta) => {
		if (Math.abs(delta) < 1.8) return;
		this.surface.setActiveControlPointIndex(delta > 0 ? 1 : -1);
		this.draw();
	}

	positionCoordinates = () => {

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

	updateControlPoint = (axis, delta) => {

		const p = this.surface.getActiveControlPoint();
		if (_.isNil(p)) return;

		let q = p.clone(); 
		q[axis] += 0.005 * delta;

		this.surface.setActiveControlPoint(q, axis);
		this.surface.update();
		this.positionCoordinates();
		this.draw();
	}

	positionCamera = () => {

		let x = 2 * Math.cos(this.azimuth) * Math.cos(this.altitude);
		let y = 2 * Math.sin(this.azimuth) * Math.cos(this.altitude);
		let z = 2 * Math.sin(this.altitude);

		this.camera.position.set(x, y, z);
		this.camera.lookAt(new THREE.Vector3(0, 0, 0));

		this.camera.up = new THREE.Vector3(0, 0, 1);

		this.camera.updateProjectionMatrix();
	}

	zoom = (delta) => {
		const zoomOut = delta > 0;     // boolean
		const factor = zoomOut ? 1.1 : 0.9; // number
		this.camera.zoom *= factor;
		this.camera.updateProjectionMatrix();
	}

	zoomToFit = (speed = 1) => {
		
		// assume that we do NOT need to zoom out...
		let inView = true;

		// assume that we MIGHT need to zoom in...
		let closeFit = false;

		let maxX = -Infinity;
		let maxY = -Infinity;
		let minX = Infinity;
		let minY = Infinity;

		const virtualMinLower = -0.95;
		const virtualMinUpper = -0.9;
		const virtualMaxLower = 0.9;
		const virtualMaxUpper = 0.95;

		function isBad(x) {
			return x < virtualMinLower || x > virtualMaxUpper;
		}

		for (let u = 0; u <= 1; u += 0.1) {

			for (let v = 0; v <= 1; v += 0.1) {

				const pt = this.surface.patch(u, v).clone().project(this.camera);

				const { x, y } = pt;

				if ( isBad(x) || isBad(y) ) {
					inView = false;
					break;
				}

				if (x > maxX) maxX = x;
				if (x < minX) minX = x;
				if (y > maxY) maxY = y;
				if (y < minY) minY = y;
			}
		}

		function inMinRange(x) {
			return x > virtualMinLower && x < virtualMinUpper;
		}

		function inMaxRange(x) {
			return x > virtualMaxLower && x < virtualMaxUpper;
		}

		if (inMinRange(minX) || inMaxRange(maxX) || inMinRange(minY) || inMaxRange(maxY)) {
			closeFit = true;
		}

		// possibly zoom in?
		let factor;
		if (inView) {
			// if a close fit, we're done
			if (closeFit) return;
			// zoom in a bit
			factor = 1 + 0.1 * speed;
		} else {
			// zoom out a bit
			factor = 1 - 0.1 * speed;
		}

		this.camera.zoom *= factor;
		this.camera.updateProjectionMatrix();

		window.requestAnimationFrame(() => {
			this.zoomToFit(speed);
			this.draw();
		});
	}

	downloadSVG = () => {
		
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const { canvas } = this;
		const { width, height } = canvas;
		
		svg.setAttribute('viewBox', `-${width} -${height} ${2 * width} ${2 * height}`);
		svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

		// background
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', -width);
		rect.setAttribute('y', -height);
		rect.setAttribute('width', 2 * width);
		rect.setAttribute('height', 2 * height);
		rect.setAttribute('fill', 'black');
		svg.appendChild(rect);

		const renderAxis = (x, y, z) => {
			const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			const max = (new THREE.Vector3(x, y, z)).multiplyScalar(0.01).project(this.camera);
			const min = (new THREE.Vector3(-x, -y, -z)).multiplyScalar(0.01).project(this.camera);
			do {
				max.multiplyScalar(1.1);
			} while (Math.abs(max.x) < 1 && Math.abs(max.y) < 1);
			do {
				min.multiplyScalar(1.1);
			} while (Math.abs(min.x) < 1 && Math.abs(min.y) < 1);

			line.setAttribute('x1', z === 0 ? width * max.x : 0);
			line.setAttribute('y1', z === 0 ? -height * max.y : height);
			line.setAttribute('x2', z === 0 ? width * min.x : 0);
			line.setAttribute('y2', z === 0 ? -height * min.y : -height);
			line.setAttribute('stroke', '#fff');
			line.setAttribute('stroke-width', window.devicePixelRatio / 2);
			svg.appendChild(line);
		};

		renderAxis(1, 0, 0);
		renderAxis(0, 1, 0);
		renderAxis(0, 0, 1);
		
		const { u_crvs, v_crvs } = this.surface;

		const renderCurve = curve => {
			const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			let pathString = '';
			curve.geometry.vertices.forEach((v, i) => {
				let { x, y } = v.clone().project(this.camera);
				x = width * Math.round(x * 1000) / 1000;
				y = -height * Math.round(y * 1000) / 1000;
				if (i === 0) {
					pathString += `M ${x} ${y}`;
				} else {
					pathString += ` L ${x} ${y}`;
				}
			});
			path.setAttribute('d', pathString);
			path.setAttribute('fill', 'none');
			path.setAttribute('stroke', '#fff');
			path.setAttribute('stroke-width', window.devicePixelRatio);
			svg.appendChild(path);
		}
		
		for (let u of u_crvs) renderCurve(u);
		for (let v of v_crvs) renderCurve(v);

		const svgBlob = new Blob([svg.outerHTML], {type:"image/svg+xml;charset=utf-8"});
		const svgUrl = URL.createObjectURL(svgBlob);
		const a = document.createElement('a');
		a.href = svgUrl;
		a.download = 'test_n.svg';
		a.click();
	}

	componentDidMount() {

		// set up canvas
		const canvas = this.refs.canvas;
		this.canvas = canvas;

		// set up scene, camera, renderer
		this.scene = new THREE.Scene();
		
		this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.refs.canvas,
			antialias: true
		});

		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		
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
		window.addEventListener('click', this.onClick);
		window.addEventListener('wheel', this.onWheel);
		window.addEventListener('keydown', this.onKeyDown);
	}

	tutorial = (stage) => {

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
				<div className="action">{this.state.action}</div>
				<Tutorial step={this.state.tutorial} manager={tutorialManager} />
				<div className="helper-text" dangerouslySetInnerHTML={helperText()}></div>
			</div>
		)
	}
};