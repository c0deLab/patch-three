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
	coordinatesX: number,
	coordinatesY: number,
	tutorial: number,
	lastTutorial: number,
	idles: number
};

/**
 * Responsible for maintaining app state, including the Surface,
 * handling user interactions, and drawing to the screen.
 */
export default class CanvasView extends Component<{}, State> {

  originalActiveControlPoint: THREE.Vector3;
  activeControlPoint: null | THREE.Object3D = null;
	camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
  canvas: HTMLCanvasElement;
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
  mouse: THREE.Vector2 = new THREE.Vector2();
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
			coordinatesX: -1,
			coordinatesY: -1,
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

		// this.positionCoordinates();
	}

	onClick: Function = () => {
		this.surface.stop();
		this.surface.randomize(60, this.draw);
  }

  onMouseDown: Function = (e: MouseEvent) => {

    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    this.mouse.x = ( e.clientX / w ) * 2 - 1;
    this.mouse.y = -( e.clientY / h ) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.surface.controlPoints);

    if (intersects.length > 0) {
      const { object } = intersects[0];
      this.activeControlPoint = object;
      this.originalActiveControlPoint = this.activeControlPoint.position.clone();
    }
  }

	onMouseMove: Function = (e: MouseEvent) => {

    const w = this.canvas.width / window.devicePixelRatio;
    const h = this.canvas.height / window.devicePixelRatio;
    this.mouse.x = ( e.clientX / w ) * 2 - 1;
    this.mouse.y = -( e.clientY / h ) * 2 + 1;

    const { activeControlPoint } = this;

    if (activeControlPoint !== null) {

      e.stopPropagation();

      const neighbors: Array<THREE.Vector3> = [
        this.originalActiveControlPoint.clone().add(new THREE.Vector3(0.1, 0, 0)),
        this.originalActiveControlPoint.clone().add(new THREE.Vector3(-0.1, 0, 0)),
        this.originalActiveControlPoint.clone().add(new THREE.Vector3(0, 0.1, 0)),
        this.originalActiveControlPoint.clone().add(new THREE.Vector3(0, -0.1, 0)),
        this.originalActiveControlPoint.clone().add(new THREE.Vector3(0, 0, 0.1)),
        this.originalActiveControlPoint.clone().add(new THREE.Vector3(0, 0, -0.1)),
      ];

      const index = this.surface.controlPoints.indexOf(activeControlPoint);
      this.surface.setActiveControlPointIndex(index);

      // x axis closest point
      let angle = Infinity;
      let closestNeighbor: null | THREE.Vector3 = null;

      neighbors.forEach(v => {

        const controlPointProj: THREE.Vector2 = this.originalActiveControlPoint.clone().project(this.camera);

        const tmp = v.clone().project(this.camera);
        const proj = new THREE.Vector2(tmp.x, tmp.y);

        // normalize neighbor point and mouse relative to projected closest point
        const normalizedMouse = this.mouse.clone().sub(controlPointProj);
        const normalizedProj = proj.sub(controlPointProj);
        const a = Math.abs(normalizedMouse.angle() - normalizedProj.angle());

        if (a < angle && a < 0.25) {
          angle = a;
          closestNeighbor = v;
        }
      });

      if (closestNeighbor === null) return;

      let dir = closestNeighbor;

      const isX = neighbors.indexOf(dir) < 2;
      if (isX) this.surface.setAxis('x', activeControlPoint.position);
      const isY = !isX && neighbors.indexOf(dir) < 4;
      if (isY) this.surface.setAxis('y', activeControlPoint.position);
      const isZ = !isX && !isY;
      if (isZ) this.surface.setAxis('z', activeControlPoint.position);

      dir = dir.clone().sub(this.originalActiveControlPoint).multiplyScalar(0.1);
      console.log(dir);

      let dist = Infinity;
      let nearest = dir;
      let theI;

      for (let i = -4; i < 6; i++) {

        const move = dir.clone().multiplyScalar(2 ** i);
        const pos = activeControlPoint.position.clone().add(move).project(this.camera);
        const proj = new THREE.Vector2(pos.x, pos.y);

        if (proj.distanceTo(this.mouse) < dist) {
          dist = proj.distanceTo(this.mouse);
          // console.log(dist);
          nearest = dir;
          theI = i;
        }
      }

      activeControlPoint.position.add(nearest);

      this.surface.update(activeControlPoint);
      this.draw();
    }
	}

	onMouseUp: Function = (e) => {
    this.activeControlPoint = null;
	}

	draw: Function = () => {

		// a little messy, but this.surface removes all children
		// from the scene when this.surface.update() is called...
		// thus need to re-add the axes to the scene whenever the surface
		// might possibly have updated.

		// this.positionCoordinates();

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

		const node = this.refs.Coordinates;
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
		if (p === null) return;

		let q = p.clone();
		q[axis] += 0.005 * delta;

		this.surface.setActiveControlPoint(q, axis);
		this.surface.update();
		// this.positionCoordinates();
		this.draw();
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

		this.scene.add(axisX);
		this.scene.add(axisY);
		this.scene.add(axisZ);

		this.onResize();

		this.surface.setScene(this.scene);
		this.surface.init();
		this.surface.update();

		this.draw();

		// add event listeners
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);

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

		return (
			<div>
				<canvas ref="canvas" />
				<Coordinates
					ref="Coordinates"
					surface={this.surface}
					style={coordinatesStyle}
					active={this.state.coordinates} />
				<Controls manager={this.controlsManager} />
			</div>
		)
	}
};
