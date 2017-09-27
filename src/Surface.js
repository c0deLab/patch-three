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

const THREE = require('three');

/*
 *	Returns a curve object to be added to a scene.
 */
const Curve = (v0, v1, v2, v3) => {

	const bez = new THREE.CubicBezierCurve3(v0, v1, v2, v3);
	
	const geo = new THREE.Geometry();
	geo.vertices = bez.getPoints(50);
	
	let crv = new THREE.Line(geo, boundaryMaterial);
	crv.__bez = bez;

	return crv;
};

/*
 * A patched surface from four boundary Bezier curves.
 */
class Surface {

  constructor() {

    /*
     * Default Surface: square from 0-1, control points evenly spaced
     */

    const u0 = Curve(p(0, 0), p(0.333, 0), p(0.667, 0), p(1, 0));
    const u1 = Curve(p(0, 1), p(0.333, 1), p(0.667, 1), p(1, 1));
    const v0 = Curve(p(0, 0), p(0, 0.333), p(0, 0.667), p(0, 1));
    const v1 = Curve(p(1, 0), p(1, 0.333), p(1, 0.667), p(1, 1));

    this.u0 = u0;
    this.u1 = u1;
    this.v0 = v0;
    this.v1 = v1;

    this.stepSize = 0.04;

    this.controlPointsList = [
      ["v0", "v0", 3],
      ["v0", "v1", 2],
      ["v0", "v2", 2],
      ["v0", "v3", 3],
      ["u1", "v1", 2],
      ["u1", "v2", 2],
      ["v1", "v3", 3],
      ["v1", "v2", 2],
      ["v1", "v1", 2],
      ["v1", "v0", 3],
      ["u0", "v2", 2],
      ["u0", "v1", 2]
    ];

    this.activeControlPoint = -1;
    this.lastActiveControlPoint = -1;

    this.controls = false;
    this.axis = null;

    this.u_crvs = [];
    this.v_crvs = [];
    this.controlLine = null;
    this.controlPt = null;

    // 0 = show both U and V
    // 1 = show just U
    // 2 = show just V
    this.display = 0;
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

  setActiveControlPointIndex(i) {
    const l = this.controlPointsList.length;
    this.activeControlPoint = (this.activeControlPoint + i + l) % l;
    this.update();
  }

  deactivateControlPoint() {
    this.lastActiveControlPoint = this.activeControlPoint;
    this.activeControlPoint = -1;
    this.update();
  }

  controlPointFromIndex(i) {
    const pt = this.controlPointsList[i];
    const crv = this[pt[0]];
    const v = crv.__bez[pt[1]];
    return v;
  }

  getActiveControlPoint() {
    if (this.activeControlPoint === -1) return null;
    return this.controlPointFromIndex(this.activeControlPoint);
  }

  setActiveControlPoint(pt, axis) {

    this.setAxis(axis);

    const index = this.activeControlPoint;
    if (index === -1) return;

    const arr = this.controlPointsList[index];
    let crv = arr[0];
    let v = this[crv].__bez[arr[1]];

    // set the point
    v.set(pt.x, pt.y, pt.z);

    // if at a corner point, find the matching one and set it as well
    let matchingPt = null;
    switch (crv) {
      case "u0":
        if (arr[1] === "v0") matchingPt = ["v0", "v0"];
        if (arr[1] === "v3") matchingPt = ["v1", "v0"];
        break;
      case "u1":
        if (arr[1] === "v0") matchingPt = ["v0", "v3"];
        if (arr[1] === "v3") matchingPt = ["v1", "v3"];
        break;
      case "v0":
        if (arr[1] === "v0") matchingPt = ["u0", "v0"];
        if (arr[1] === "v3") matchingPt = ["u1", "v0"];
        break;
      case "v1":
        if (arr[1] === "v0") matchingPt = ["u0", "v3"];
        if (arr[1] === "v3") matchingPt = ["u1", "v3"];
        break;
      default:
    }

    if (!matchingPt) return;

    crv = this[matchingPt[0]];
    v = crv.__bez[matchingPt[1]];
    
    v.set(pt.x, pt.y, pt.z);

    this.positionAxes(v);

    this.update();
  }

  toggleControls() {
    this.controls = !this.controls;
    this.update();
  }

  addControlPt(pt) {

    // pt an array from this.controlPointsList,
    // index 0 = curve name
    // index 1 = vertex name
    // index 2 = size of sphere
    const crv = this[pt[0]];
    const v = crv.__bez[pt[1]];
    const size = pt[2];

    const d = 0.006 * size;

    const controlPtGeo = new THREE.SphereGeometry(d, 8, 8);
    const controlPt = new THREE.Mesh(controlPtGeo, controlPtMaterial);
    controlPt.position.set(v.x, v.y, v.z);
    controlPt.name = "control-pt-" + pt[0] + "-" + pt[1];
    controlPt.visible = false;
    this.scene.add(controlPt);
  }

  positionControlPt(pt) {
    
    const isActive = this.controlPointsList.indexOf(pt) === this.activeControlPoint;
    
    const name = "control-pt-" + pt[0] + "-" + pt[1];
    const controlPt = this.scene.getObjectByName(name);

    if (!this.controls) {
      controlPt.visible = false;
      return;
    }

    controlPt.visible = true;
    
    const crv = this[pt[0]];
    const v = crv.__bez[pt[1]];

    controlPt.position.set(v.x, v.y, v.z);
    
    if (isActive) {
      controlPt.scale.set(1.6, 1.6, 1.6);
      controlPt.material = activeControlPointMaterial;
    } else {
      controlPt.scale.set(1, 1, 1);
      controlPt.material = controlPtMaterial;
    }
  }

  addControlLine(crv_1, pt_1, crv_2, pt_2) {

    const v1 = this[crv_1].__bez[pt_1];
    const v2 = this[crv_2].__bez[pt_2];

    const lineGeo = new THREE.Geometry();
    lineGeo.vertices.push(v1, v2);
    lineGeo.computeLineDistances();
    
    const lineMesh = new THREE.Line(lineGeo, controlMaterial);
    lineMesh.visible = false;
    lineMesh.name = crv_1 + "-" + pt_1 + "-" + crv_2 + "-" + pt_2;
    this.scene.add(lineMesh);
  }

  positionControlLine(crv_1, pt_1, crv_2, pt_2) {
    
    const v1 = this[crv_1].__bez[pt_1];
    const v2 = this[crv_2].__bez[pt_2];
    const line = this.scene.getObjectByName(crv_1 + "-" + pt_1 + "-" + crv_2 + "-" + pt_2);

    if (!this.controls) {
      line.visible = false;
      return;
    }

    line.visible = true;

    line.geometry.verticesNeedUpdate = true;
    
    line.geometry.vertices[0].set(v1.x, v1.y, v1.z);
    line.geometry.vertices[1].set(v2.x, v2.y, v2.z);
  }

  positionAxes(pt) {
    if (_.isNil(pt)) return;
    axisX.position.set(pt.x, pt.y, pt.z);
    axisY.position.set(pt.x, pt.y, pt.z);
    axisZ.position.set(pt.x, pt.y, pt.z);
  }

  setScene(scene) { this.scene = scene; }

  setAxis(axis) { this.axis = axis; }

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
  
  update() {
    
    // position control points
    this.controlPointsList.forEach(pt => this.positionControlPt(pt));

    axisX.visible = false;
    axisY.visible = false;
    axisZ.visible = false;

    if (this.controls) {

      this.positionAxes(this.getActiveControlPoint());

      if (this.axis === "x") axisX.visible = true;
      if (this.axis === "y") axisY.visible = true;
      if (this.axis === "z") axisZ.visible = true;
    }

    // update interior curves
    const step = this.stepSize;

    this.u_crvs.forEach((crv, i) => {
      crv.geometry.verticesNeedUpdate = true;
      crv.geometry.vertices.forEach((pt, j) => {
        const u = j * step;
        const v = i * step;
        const s = this.patch(v, u);
        pt.set(s.x, s.y, s.z);
      });
    });

    this.v_crvs.forEach((crv, i) => {
      crv.geometry.verticesNeedUpdate = true;
      crv.geometry.vertices.forEach((pt, j) => {
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
  patch(u: number, v: number): Point {

  	// reference bezier curves, not curve objects
    const u0 = this.u0.__bez;
    const u1 = this.u1.__bez;
    const v0 = this.v0.__bez;
    const v1 = this.v1.__bez;

    const Lu = u0.getPoint(u).multiplyScalar(1 - v).add( u1.getPoint(u).multiplyScalar(v) );
    const Lv = v0.getPoint(v).multiplyScalar(1 - u).add( v1.getPoint(v).multiplyScalar(u) );
    const B = u0.getPoint(0).multiplyScalar((1 - u) * (1 - v))
            .add(u0.getPoint(1).multiplyScalar(u * (1 - v)))
            .add(u1.getPoint(0).multiplyScalar((1 - u) * v))
            .add(u1.getPoint(1).multiplyScalar(u * v));

    const C = Lu.add(Lv).add(B.multiplyScalar(-1));
    return C;
  }

  step(t, duration, cb) {
    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {

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

  randomize(duration, cb) {

    let r = () => Math.random() - 0.5;
    let rp = () => new THREE.Vector3(r(), r(), r());

    // target surface to morph toward
    let s = this.clone();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {
        // add a random value to it --
        // it's ok if corners don't match here since
        // morph calls .resolve() on the targetSrf
        s[k].__bez[pt] = b[pt].clone().add(rp());
      });
    });

    // now that we have the target surface, step toward it
    this.morph(s, duration, cb);
  }

  randomizeCloseToOriginal(duration, cb) {

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

  morph(targetSrf, duration, cb) {

    targetSrf.resolve();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {

        // for legibility, this is the point on the target surface
        // corresponding to the current boundary curve's control point
        let srfPt = b[pt];
        let targetPt = targetSrf[k].__bez[pt];

        // resolve corner cases
        if (k === "v0" && pt === "v0") targetPt = targetSrf.u0.__bez.v0;
        if (k === "v0" && pt === "v3") targetPt = targetSrf.u1.__bez.v0;
        if (k === "v1" && pt === "v0") targetPt = targetSrf.u0.__bez.v3;
        if (k === "v1" && pt === "v3") targetPt = targetSrf.u1.__bez.v3;

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
