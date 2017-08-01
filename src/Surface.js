import easing from './utils/easing';
import { 
  p,
  boundaryMaterial,
  interiorMaterial,
  controlMaterial,
  controlPtMaterial,
  activeControlPointMaterial
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
  }

  setActiveControlPoint(i) {
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

  toggleControls() {
    this.controls = !this.controls;
    this.update();
  }

  addControlPt(pt) {

    const isActive = this.controlPointsList.indexOf(pt) === this.activeControlPoint;

    // pt an array from this.controlPointsList,
    // index 0 = curve name
    // index 1 = vertex name
    // index 2 = size of sphere
    const crv = this[pt[0]];
    const v = crv.__bez[pt[1]];
    const size = isActive ? 6 : pt[2];

    const d = 0.006 * size;

    const controlPtGeo = new THREE.SphereGeometry(d, 8, 8); // BoxGeometry(d, d, d);
    const controlPt = new THREE.Mesh(controlPtGeo, isActive ? activeControlPointMaterial : controlPtMaterial);
    controlPt.position.set(v.x, v.y, v.z);
    this.scene.add(controlPt);
  }

  addControlLine(v1, v2) {
    const lineGeo = new THREE.Geometry();
    lineGeo.vertices.push(v1, v2);
    lineGeo.computeLineDistances();
    this.scene.add(new THREE.Line(lineGeo, controlMaterial));
  }

  setScene(scene) { this.scene = scene; }
  
  update() {

  	// tear down all existing scene objects
    const children = this.scene.children;
    // clean up
    while (children.length > 0) {
      const child = children.pop();
      this.scene.remove(child);
      child.geometry.dispose();
      child.material.dispose();
    }

  	// add interior curves
  	const step = 0.04;

  	for (let u = 0; u < 1 + step; u += step) {

      if (u > 1) u = 1;

  		let u_crv = new THREE.Geometry();
      let v_crv = new THREE.Geometry();
  		
  		for (let v = 0; v < 1 + step; v += step) {

        if (v > 1) v = 1;

	  		let u_pt = this.patch(u, v);
        let v_pt = this.patch(v, u);

	  		u_crv.vertices.push(u_pt);
        v_crv.vertices.push(v_pt);
	  	}

      let material = (u === 0 || u === 1) ? boundaryMaterial : interiorMaterial;

  		this.scene.add(new THREE.Line(u_crv, material));
      this.scene.add(new THREE.Line(v_crv, material));
  	}

    if (this.controls) {

      // add control points
      this.controlPointsList.forEach(pt => this.addControlPt(pt));

      this.addControlLine(this.v0.__bez.v0, this.v0.__bez.v1);
      this.addControlLine(this.v0.__bez.v0, this.u0.__bez.v1);

      this.addControlLine(this.v0.__bez.v3, this.v0.__bez.v2);
      this.addControlLine(this.v0.__bez.v3, this.u1.__bez.v1);

      this.addControlLine(this.v1.__bez.v0, this.v1.__bez.v1);
      this.addControlLine(this.v1.__bez.v0, this.u0.__bez.v2);

      this.addControlLine(this.v1.__bez.v3, this.v1.__bez.v2);
      this.addControlLine(this.v1.__bez.v3, this.u1.__bez.v2);
    }
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

    const Lu = u0.getPoint(u).multiplyScalar(1 - v).add(u1.getPoint(u).multiplyScalar(v));
    const Lv = v0.getPoint(v).multiplyScalar(1 - u).add(v1.getPoint(v).multiplyScalar(u));
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

    if (t < duration && cb) {
      window.requestAnimationFrame(() => {
        cb();
        this.step(t + 1, duration, cb);
      });
    }
  }

  randomize(duration, cb) {

    let r = () => Math.random();
    let rp = () => p(r(), r(), r());

    // target surface to morph toward
    let s = this.clone();

    ["u0", "u1", "v0", "v1"].forEach((k) => {

      let b = this[k].__bez; // boundary curve

      ["v0", "v1", "v2", "v3"].forEach((pt) => {
        // add a random value to it
        s[k].__bez[pt] = b[pt].clone().add(rp());
      });
    });

    // now that we have the target surface, step toward it
    this.morph(s, duration, cb);
  }

  morph(targetSrf, duration, cb) {

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

    // now that we our dx, dy, dz, step toward it
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
}

export default Surface;
