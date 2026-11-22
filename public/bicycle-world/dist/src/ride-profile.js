// Loaded only on an explicitly requested measurement run.
export function createRideProfile() {
  const host = document.documentElement;
  const meter = document.createElement('div');
  meter.id = 'ride-performance';
  meter.setAttribute('aria-live', 'off');
  meter.style.cssText = 'position:fixed;bottom:8px;left:8px;z-index:10000;pointer-events:none;padding:6px 10px;border-radius:8px;background:#19251e;color:white;font:14px/1.4 system-ui';
  meter.textContent = 'Ride timing · waiting for the garden';
  document.body.append(meter);
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
      meter.textContent = readings.fps + ' FPS · 95th percentile ' + readings.p95FrameMs + ' ms · ' + readings.frames + ' frames';
      console.info('Ride performance', readings);
      reset();
    },
    dispose() {
      active = false;
      meter.remove();
      delete host.dataset.ridePerformance;
      reset();
    },
  };
}
