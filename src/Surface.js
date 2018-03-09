// @flow

import * as THREE from 'three';
import _ from 'lodash';

import easing from './utils/easing';
import {
  p,
  boundaryMaterial,
  interiorMaterial,
  controlMaterial,
  controlPtMaterial,
  activeControlPointMaterial,
  axisX,
  axisY,
  axisZ
} from './utils/surface-helpers';

const v =  () => new THREE.Vector3()

class Curve extends THREE.Line {

  __bez: THREE.CubicBezierCurve3;

  constructor(v0: THREE.Vector3 = v(), v1: THREE.Vector3 = v(), v2: THREE.Vector3 = v(), v3: THREE.Vector3 = v()) {

    const bez = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
    const geo = new THREE.Geometry();
    geo.vertices = bez.getPoints(50);

    super(geo, boundaryMaterial);

	  this.__bez = bez;
  }
};

class ControlPoint {

  name: string;
  pt: 'v0' | 'v1' | 'v2' | 'v3';
  crv: 'u0' | 'u1' | 'v0' | 'v1';
  size: number;

  static makeName(crv: 'u0' | 'u1' | 'v0' | 'v1', pt: 'v0' | 'v1' | 'v2' | 'v3'): string {
    return 'control-pt-' + crv + '-' + pt;
  }

  constructor(crv: 'u0' | 'u1' | 'v0' | 'v1', pt: 'v0' | 'v1' | 'v2' | 'v3', size: number) {
    this.pt = pt;
    this.crv = crv;
    this.size = size;
    this.name = ControlPoint.makeName(crv, pt);
  }
};

/*
 * A patched surface from four boundary Bezier curves.
 */
class Surface {

  curves = {
    'u0': Curve,
    'u1': Curve,
    'v0': Curve,
    'v1': Curve,
  };

  stepSize: number = 0.04;

  controlPointsList: Array<ControlPoint> = [
    new ControlPoint('v0', 'v0', 3),
    new ControlPoint('v0', 'v1', 2),
    new ControlPoint('v0', 'v2', 2),
    new ControlPoint('v0', 'v3', 3),
    new ControlPoint('u1', 'v1', 2),
    new ControlPoint('u1', 'v2', 2),
    new ControlPoint('v1', 'v3', 3),
    new ControlPoint('v1', 'v2', 2),
    new ControlPoint('v1', 'v1', 2),
    new ControlPoint('v1', 'v0', 3),
    new ControlPoint('u0', 'v2', 2),
    new ControlPoint('u0', 'v1', 2)
  ];

  controlPoints: Array<THREE.Mesh> = [];

  animationFrame: number;
  activeControlPoint: number = -1;
  lastActiveControlPoint: number = -1;

  axis: null | string = null;
  controls: boolean = true;
  scene: THREE.Scene;

  u_crvs: Array<THREE.Line> = [];
  v_crvs: Array<THREE.Line> = [];
  // controlLine = null;
  // controlPt = null;

  static U_AND_V: number = 0;
  static U_ONLY: number = 1;
  static V_ONLY: number = 2;

  display: number = Surface.U_AND_V;

  constructor() {

    const u0_v0 = p(0, 0);
    const u0_v1 = p(0.333, 0);
    const u0_v2 = p(0.667, 0);
    const u0_v3 = p(1, 0);

    const u1_v0 = p(0, 1);
    const u1_v1 = p(0.333, 1);
    const u1_v2 = p(0.667, 1);
    const u1_v3 = p(1, 1);

    const v0_v1 = p(0, 0.333);
    const v0_v2 = p(0, 0.667);

    const v1_v1 = p(1, 0.333);
    const v1_v2 = p(1, 0.667);

    /*
     * Default Surface: square from 0-1, control points evenly spaced
     */
    this.curves.u0 = new Curve(u0_v0, u0_v1, u0_v2, u0_v3);
    this.curves.u1 = new Curve(u1_v0, u1_v1, u1_v2, u1_v3);
    this.curves.v0 = new Curve(u0_v0, v0_v1, v0_v2, u1_v0);
    this.curves.v1 = new Curve(u0_v3, v1_v1, v1_v2, u1_v3);
  }

  getCurve(crv: 'u0' | 'u1' | 'v0' | 'v1'): Curve {
    if (this.curves[crv] instanceof Curve) {
      return this.curves[crv];
    } else {
      throw new Error('Must get u0, u1, v0, or v1');
    }
  }

  activateControls() {
    // if there was a last active control point, use that
    this.activeControlPoint = this.lastActiveControlPoint >= 0 ? this.lastActiveControlPoint : 0;
    this.controls = true;
    this.update();
  }

  deactivateControls() {
    this.controls = false;
    this.deactivateControlPoint();
    this.setAxis(null);
    this.update();
  }

  setActiveControlPointIndex(i: number) {
    const l = this.controlPointsList.length;
    this.activeControlPoint = (this.activeControlPoint + i + l) % l;
    this.update();
  }

  deactivateControlPoint() {
    this.lastActiveControlPoint = this.activeControlPoint;
    this.activeControlPoint = -1;
    this.update();
  }

  controlPointFromIndex(i: number): THREE.Vector3 {
    const controlPt: ControlPoint = this.controlPointsList[i];
    const crv = this.getCurve(controlPt.crv);
    const v = crv.__bez[controlPt.pt];
    return v;
  }

  getActiveControlPoint(): null | THREE.Vector3 {
    if (this.activeControlPoint === -1) return null;
    return this.controlPointFromIndex(this.activeControlPoint);
  }

  setActiveControlPoint(point: THREE.Vector3, axis: 'x' | 'y' | 'z') {

    this.setAxis(axis);

    const index = this.activeControlPoint;
    if (index === -1) return;

    const controlPt = this.controlPointsList[index];
    let { pt, crv } = controlPt;
    let v = this.getCurve(crv).__bez[pt];

    // set the point
    v.set(point.x, point.y, point.z);

    // if at a corner point, find the matching one and set it as well
    let matchingPt = null;
    switch (crv) {
      case 'u0':
        if (pt === 'v0') matchingPt = ['v0', 'v0'];
        if (pt === 'v3') matchingPt = ['v1', 'v0'];
        break;
      case 'u1':
        if (pt === 'v0') matchingPt = ['v0', 'v3'];
        if (pt === 'v3') matchingPt = ['v1', 'v3'];
        break;
      case 'v0':
        if (pt === 'v0') matchingPt = ['u0', 'v0'];
        if (pt === 'v3') matchingPt = ['u1', 'v0'];
        break;
      case 'v1':
        if (pt === 'v0') matchingPt = ['u0', 'v3'];
        if (pt === 'v3') matchingPt = ['u1', 'v3'];
        break;
      default:
    }

    if (!matchingPt) return;

    crv = this.getCurve(matchingPt[0]);
    v = crv.__bez[matchingPt[1]];

    v.set(point.x, point.y, point.z);

    this.positionAxes(v);

    this.update();
  }

  toggleControls() {
    this.controls = !this.controls;
    this.update();
  }

  addControlPt(controlPoint: ControlPoint) {

    const { pt, crv, size } = controlPoint;

    const curve = this.getCurve(crv);
    const v = curve.__bez[pt];

    const d = 0.006 * size;

    const controlPtGeo = new THREE.SphereGeometry(d, 8, 8);
    const controlPtMesh = new THREE.Mesh(controlPtGeo, controlPtMaterial);
    controlPtMesh.position.set(v.x, v.y, v.z);
    controlPtMesh.userData.crv = crv
    controlPtMesh.userData.pt = pt;

    this.controlPoints.push(controlPtMesh);
    this.scene.add(controlPtMesh);
  }

  setPoint(name: string, position: THREE.Vector3) {

    const idx = this.controlPoints.map(c => c.name).indexOf(name);
    if (idx === -1) return;

    const controlPt = this.controlPoints[idx];
    controlPt.position.set(position.x, position.y, position.z);

    this.update();
  }

  addControlLine(
    crv_1: 'u0' | 'u1' | 'v0' | 'v1',
    pt_1: 'v0' | 'v1' | 'v2' | 'v3',
    crv_2: 'u0' | 'u1' | 'v0' | 'v1',
    pt_2: 'v0' | 'v1' | 'v2' | 'v3'
  ) {

    const v1 = this.getCurve(crv_1).__bez[pt_1];
    const v2 = this.getCurve(crv_2).__bez[pt_2];

    const lineGeo = new THREE.Geometry();
    lineGeo.vertices.push(v1, v2);

    const lineMesh = new THREE.Line(lineGeo, controlMaterial);
    lineMesh.computeLineDistances();
    lineMesh.visible = false;
    lineMesh.name = crv_1 + '-' + pt_1 + '-' + crv_2 + '-' + pt_2;
    this.scene.add(lineMesh);
  }

  positionControlLine(
    crv_1: 'u0' | 'u1' | 'v0' | 'v1',
    pt_1: 'v0' | 'v1' | 'v2' | 'v3',
    crv_2: 'u0' | 'u1' | 'v0' | 'v1',
    pt_2: 'v0' | 'v1' | 'v2' | 'v3'
  ) {

    const v1 = this.getCurve(crv_1).__bez[pt_1];
    const v2 = this.getCurve(crv_2).__bez[pt_2];
    const line = this.scene.getObjectByName(crv_1 + '-' + pt_1 + '-' + crv_2 + '-' + pt_2);

    if (!this.controls) {
      line.visible = false;
      return;
    }

    line.visible = true;

    line.geometry.verticesNeedUpdate = true;

    line.geometry.vertices[0].set(v1.x, v1.y, v1.z);
    line.geometry.vertices[1].set(v2.x, v2.y, v2.z);
  }

  positionAxes(pt: THREE.Vector3) {
    if (_.isNil(pt)) return;
    axisX.position.set(pt.x, pt.y, pt.z);
    axisY.position.set(pt.x, pt.y, pt.z);
    axisZ.position.set(pt.x, pt.y, pt.z);
  }

  setScene(scene: THREE.Scene) { this.scene = scene; }

  setAxis(axis: 'x' | 'y' | 'z' | null, p: THREE.Vector3 = v()) {

    this.axis = axis;

    axisX.visible = false;
    axisY.visible = false;
    axisZ.visible = false;

    if (axis === null) return;

    let which = new THREE.Group();

    if (axis === 'x') which = axisX;
    if (axis === 'y') which = axisY;
    if (axis === 'z') which = axisZ;
    which.visible = true;

    which.position.set(p.x, p.y, p.z);
  }

  // call after setting scene
  init() {

    // add control points
    this.controlPointsList.forEach(pt => this.addControlPt(pt));

    // add axes, assume they are not being shown
    this.scene.add(axisX);
    this.scene.add(axisY);
    this.scene.add(axisZ);

    // add interior curves
    const step = this.stepSize;

    for (let u = 0; u < 1 + step; u += step) {

      if (u > 1) u = 1;

      let u_crv = new THREE.Geometry();
      let v_crv = new THREE.Geometry();

      for (let v = 0; v < 1 + step; v += step) {

        if (v > 1) v = 1;

        let u_pt = this.patch(u, v);
        let v_pt = this.patch(v, u);

        if (this.display < 2)    u_crv.vertices.push(u_pt);
        if (this.display !== 1)  v_crv.vertices.push(v_pt);
      }

      const material = (u === 0 || u === 1) ? boundaryMaterial : interiorMaterial;

      const u_line = new THREE.Line(u_crv, material);
      const v_line = new THREE.Line(v_crv, material);

      this.u_crvs.push(u_line);
      this.v_crvs.push(v_line);

      this.scene.add(u_line);
      this.scene.add(v_line);
    }

    this.addControlLine("v0", "v0", "v0", "v1");
    this.addControlLine("v0", "v0", "u0", "v1");

    this.addControlLine("v0", "v3", "v0", "v2");
    this.addControlLine("v0", "v3", "u1", "v1");

    this.addControlLine("v1", "v0", "v1", "v1");
    this.addControlLine("v1", "v0", "u0", "v2");

    this.addControlLine("v1", "v3", "v1", "v2");
    this.addControlLine("v1", "v3", "u1", "v2");
  }

  update(point: ?THREE.Mesh) {

    if ( point instanceof THREE.Mesh ) {
      const { crv, pt } = point.userData;
      const pos = point.position;
      this.getCurve(crv).__bez[pt].set(pos.x, pos.y, pos.z);
    }

    // axisX.visible = false;
    // axisY.visible = false;
    // axisZ.visible = false;

    // update interior curves
    const step = this.stepSize;

    this.u_crvs.forEach((crv, i) => {
      crv.geometry.verticesNeedUpdate = true;
      crv.geometry.vertices.forEach((pt: THREE.Vector3, j: number) => {
        const u = j * step;
        const v = i * step;
        const s = this.patch(v, u);
        pt.set(s.x, s.y, s.z);
      });
    });

    this.v_crvs.forEach((crv, i) => {
      crv.geometry.verticesNeedUpdate = true;
      crv.geometry.vertices.forEach((pt: THREE.Vector3, j: number) => {
        const u = j * step;
        const v = i * step;
        const s = this.patch(u, v);
        pt.set(s.x, s.y, s.z);
      });
    });

    this.positionControlLine("v0", "v0", "v0", "v1");
    this.positionControlLine("v0", "v0", "u0", "v1");

    this.positionControlLine("v0", "v3", "v0", "v2");
    this.positionControlLine("v0", "v3", "u1", "v1");

    this.positionControlLine("v1", "v0", "v1", "v1");
    this.positionControlLine("v1", "v0", "u0", "v2");

    this.positionControlLine("v1", "v3", "v1", "v2");
    this.positionControlLine("v1", "v3", "u1", "v2");
  }

  /**
   * Evaluate a pair of u/v coordinates on the surface, returning
   * a `Point` in world space.
   * @param {Number} u The u parameter, between 0 and 1 (inclusive).
   * @param {Number} v The v parameter, between 0 and 1 (inclusive).
   * @returns {Point} The `Point` on the surface (in world space).
   */
  patch(u: number, v: number): THREE.Vector3 {

  	// reference bezier curves, not curve objects
    const u0 = this.getCurve('u0').__bez;
    const u1 = this.getCurve('u1').__bez;
    const v0 = this.getCurve('v0').__bez;
    const v1 = this.getCurve('v1').__bez;

    const Lu = u0.getPoint(u).multiplyScalar(1 - v).add( u1.getPoint(u).multiplyScalar(v) );
    const Lv = v0.getPoint(v).multiplyScalar(1 - u).add( v1.getPoint(v).multiplyScalar(u) );
    const B = u0.getPoint(0).multiplyScalar((1 - u) * (1 - v))
            .add(u0.getPoint(1).multiplyScalar(u * (1 - v)))
            .add(u1.getPoint(0).multiplyScalar((1 - u) * v))
            .add(u1.getPoint(1).multiplyScalar(u * v));

    const C = Lu.add(Lv).add(B.multiplyScalar(-1));
    return C;
  }

  step(t: number, duration: number, cb: Function) {

    ['u0', 'u1', 'v0', 'v1'].forEach((k) => {

      let b = this.getCurve(k).__bez; // boundary curve

      ['v0', 'v1', 'v2', 'v3'].forEach((pt) => {

        let srfPt = b[pt];

        srfPt.x += easing.dEase(t / duration) * srfPt.__dx / duration;
        srfPt.y += easing.dEase(t / duration) * srfPt.__dy / duration;
        srfPt.z += easing.dEase(t / duration) * srfPt.__dz / duration;
      });
    });

    this.update(); // update interior curves
    if (this.activeControlPoint > -1) this.positionAxes(this.getActiveControlPoint());

    if (t < duration && cb) {
      this.animationFrame = window.requestAnimationFrame(() => {
        cb(t / duration);
        this.step(t + 1, duration, cb);
      });
    }
  }

  randomize(duration: number, cb: Function) {

    let r = () => Math.random() - 0.5;
    let rp = () => new THREE.Vector3(r(), r(), r());

    // target surface to morph toward
    let s = this.clone();

    ['u0', 'u1', 'v0', 'v1'].forEach((k) => {

      let b = this.getCurve(k).__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {
        // add a random value to it --
        // it's ok if corners don't match here since
        // morph calls .resolve() on the targetSrf
        s.getCurve(k).__bez[pt] = b[pt].clone().add(rp());
      });
    });

    // now that we have the target surface, step toward it
    this.morph(s, duration, cb);
  }

  randomizeCloseToOriginal(duration: number, cb: Function) {

    let r = () => Math.random() * 0.8 - 0.4;
    let rp = () => new THREE.Vector3(r(), r(), r());

    // target surface to morph toward
    let s = this.clone();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = (new Surface())[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {
        // add a random value to it --
        // it's ok if corners don't match here since
        // morph calls .resolve() on the targetSrf
        s[k].__bez[pt] = b[pt].add(rp());
      });
    });

    // now that we have the target surface, step toward it
    this.morph(s, duration, cb);
  }

  morph(targetSrf: Surface, duration: number, cb: Function) {

    targetSrf.resolve();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this.getCurve(k).__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {

        // for legibility, this is the point on the target surface
        // corresponding to the current boundary curve's control point
        let srfPt = b[pt];
        let targetPt = targetSrf.getCurve(k).__bez[pt];

        // resolve corner cases
        if (k === "v0" && pt === "v0") targetPt = targetSrf.getCurve('u0').__bez.v0;
        if (k === "v0" && pt === "v3") targetPt = targetSrf.getCurve('u1').__bez.v0;
        if (k === "v1" && pt === "v0") targetPt = targetSrf.getCurve('u0').__bez.v3;
        if (k === "v1" && pt === "v3") targetPt = targetSrf.getCurve('u1').__bez.v3;

        srfPt.__dx = targetPt.x - srfPt.x;
        srfPt.__dy = targetPt.y - srfPt.y;
        srfPt.__dz = targetPt.z - srfPt.z;
      });
    });

    // now that we have our dx, dy, dz, step toward it
    this.step(0, duration, cb);
  }

  restore(duration, cb) {
    this.morph(new Surface(), duration, cb);
  }

  rotate(axis, angle) {
    ["u0", "v0", "u1", "v1"].forEach((b) => {

      let crv = this[b].__bez;

      ["v0", "v1", "v2", "v3"].forEach((k) => {
        let pt = crv[k];
        pt.applyAxisAngle(axis, angle);
      });
    });

    this.update();
  }

  clone() {

    const s = new Surface();

    s.u0 = this.u0.clone();
    s.u0.__bez = Object.assign({}, this.u0.__bez);
    s.u1 = this.u1.clone();
    s.u1.__bez = Object.assign({}, this.u1.__bez);
    s.v0 = this.v0.clone();
    s.v0.__bez = Object.assign({}, this.v0.__bez);
    s.v1 = this.v1.clone();
    s.v1.__bez = Object.assign({}, this.v1.__bez);

    s.activeControlPoint = this.activeControlPoint;

    return s;
  }

  /*
   * If there's a chance that a surface's corner points don't match,
   * pass it through this function to in-place resolve corner cases
   * (u curve control points overwrite those of v curves)
   */
  resolve() {
    ["u0", "u1", "v0", "v1"].forEach((k) => {
      ["v0", "v1", "v2", "v3"].forEach((pt) => {
        // resolve corner cases
        if (k === "v0" && pt === "v0") this[k].__bez[pt] = this.u0.__bez.v0;
        if (k === "v0" && pt === "v3") this[k].__bez[pt] = this.u1.__bez.v0;
        if (k === "v1" && pt === "v0") this[k].__bez[pt] = this.u0.__bez.v3;
        if (k === "v1" && pt === "v3") this[k].__bez[pt] = this.u1.__bez.v3;
      });
    });
  }

  nextDisplay() {
    this.display += 1;
    this.display = this.display % 3;
    this.update();
  }

  stop() {
    window.cancelAnimationFrame(this.animationFrame);
  }
}

export default Surface;
