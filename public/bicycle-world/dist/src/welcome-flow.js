/** One welcome per page visit. The reading/playing mode switch does not replay it. */
export function createWelcomeFlow({departureDuration = .85} = {}) {
  const duration = Number.isFinite(departureDuration) && departureDuration > 0
    ? Math.min(departureDuration, 1) : .85;
  let phase = 'welcome', elapsed = 0, guidanceConsumed = false;

  function snapshot() {
    return Object.freeze({
      phase,
      departureProgress: phase === 'riding' ? 1 : phase === 'departing' ? Math.min(elapsed / duration, 1) : 0,
      guidanceAvailable: phase === 'riding' && !guidanceConsumed,
    });
  }
  function begin({reduced = false} = {}) {
    if (phase !== 'welcome') return snapshot();
    elapsed = 0;
    phase = reduced ? 'riding' : 'departing';
    return snapshot();
  }
  function advance(dt) {
    if (phase !== 'departing' || !Number.isFinite(dt) || dt <= 0) return snapshot();
    elapsed = Math.min(duration, elapsed + dt);
    if (elapsed >= duration - 1e-10) phase = 'riding';
    return snapshot();
  }
  function consumeGuidance() {
    if (phase !== 'riding' || guidanceConsumed) return false;
    guidanceConsumed = true;
    return true;
  }
  function skip() {
    phase = 'riding'; elapsed = duration;
    return snapshot();
  }
  function cancelDeparture() {
    if (phase === 'departing') { phase = 'welcome'; elapsed = 0; }
    return snapshot();
  }
  return {get snapshot() { return snapshot(); }, begin, advance, consumeGuidance, skip, cancelDeparture};
}
