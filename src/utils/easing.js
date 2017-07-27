export default {
  ease: (t) => {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  },
  dEase: (t) => t < 0.5 ? 12 * t * t : 12 * (t - 1) * (t - 1),
};