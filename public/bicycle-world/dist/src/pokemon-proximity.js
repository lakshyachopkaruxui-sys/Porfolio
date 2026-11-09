const SUPPORTED = new Set(['pikachu', 'bulbasaur', 'charmander', 'charizard', 'vaporeon', 'articuno']);
const FLYING = new Set(['fly', 'flying', 'flight']);
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

/** One nearby greeting per encounter, evaluated at most ten times each second. */
export function createPokemonProximity({play}) {
  const encounters = new Map();
  let lastUpdate = -Infinity, lastAttempt = -Infinity, pending = false, generation = 0, wasActive = true;

  function reset() {
    generation++; pending = false; lastUpdate = -Infinity; lastAttempt = -Infinity;
    encounters.clear();
  }

  function update({time, player, sources, active = true}) {
    if (!active) {
      if (wasActive) { generation++; pending = false; }
      wasActive = false;
      return false;
    }
    wasActive = true;
    if (!Number.isFinite(time) || !Number.isFinite(player?.x) || !Number.isFinite(player?.z)) return false;
    if (time < lastUpdate) reset();
    if (time - lastUpdate < .1 - 1e-8) return false;
    lastUpdate = time;
    const moving = Number.isFinite(player.speed) && Math.abs(player.speed) > .35;
    const headY = (Number.isFinite(player.y) ? player.y : 0) + 3;
    let closest = null, closestDistance = Infinity, closestExit = 17;

    for (const source of sources ?? []) {
      if (!source?.ready || !SUPPORTED.has(source.id) || !source.key || !Number.isFinite(source.x) || !Number.isFinite(source.z)) continue;
      let encounter = encounters.get(source.key);
      if (!encounter) { encounter = {inside: false, fired: false, lastAttempt: -Infinity}; encounters.set(source.key, encounter); }
      const flying = FLYING.has(source.kind), enter = flying ? 30 : 12, exit = flying ? 40 : 17;
      const dx = source.x - player.x, dz = source.z - player.z;
      const dy = flying ? (Number.isFinite(source.y) ? source.y : 0) - headY : 0;
      const distance = Math.hypot(dx, dy, dz);
      if (distance > exit) { encounter.inside = false; encounter.fired = false; }
      else if (distance <= enter) encounter.inside = true;
      if (!moving || !encounter.inside || encounter.fired || distance > enter || time - encounter.lastAttempt < 24) continue;
      if (distance < closestDistance) { closest = {source, encounter, dx, dz}; closestDistance = distance; closestExit = exit; }
    }
    if (!closest || pending || time - lastAttempt < 8) return false;

    const {source, encounter, dx, dz} = closest;
    // Reserve the encounter before any asynchronous fetch so failures cannot spam retries.
    encounter.fired = true; encounter.lastAttempt = time; lastAttempt = time;
    pending = true;
    const request = generation, heading = Number.isFinite(player.heading) ? player.heading : 0;
    const horizontalDistance = Math.hypot(dx, dz);
    const pan = horizontalDistance > .001 ? clamp((dx * Math.cos(heading) - dz * Math.sin(heading)) / horizontalDistance, -1, 1) : 0;
    const gain = clamp(1 - .75 * (closestDistance / closestExit) ** 2, .25, 1);
    try {
      Promise.resolve(play(source.id, {gain, pan})).catch(() => false).finally(() => { if (request === generation) pending = false; });
    } catch { pending = false; }
    return true;
  }

  return {update, reset};
}
