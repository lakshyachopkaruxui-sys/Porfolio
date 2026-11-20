// Loaded only when the existing localhost rideProfile flag is enabled.
export function createRideProfile() {
  const host = document.documentElement;
  const samples = [];
  let elapsed = 0;
  let active = false;
  function reset() {
    samples.length = 0;
    elapsed = 0;
  }
  return {
    sample({frameMs, riding}) {
      if (!riding || !Number.isFinite(frameMs) || frameMs <= 0) {
        active = false;
        reset();
        return;
      }
      // Skip the first interval after a menu, tab switch or initial loading.
      if (!active) {
        active = true;
        return;
      }
      samples.push(frameMs);
      elapsed += frameMs;
      if (elapsed < 2000 && samples.length < 1000) return;
      samples.sort((a, b) => a-b);
      const readings = {
        frames: samples.length,
        fps: Math.round(samples.length*1000/elapsed),
        p95FrameMs: Number(samples[Math.ceil(samples.length*.95)-1].toFixed(1)),
      };
      host.dataset.ridePerformance = JSON.stringify(readings);
      console.info('Local ride performance', readings);
      reset();
    },
    dispose() {
      active = false;
      delete host.dataset.ridePerformance;
      reset();
    },
  };
}
