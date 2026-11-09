/** Older saves have no entry flag. Only a real ride away from arrival counts. */
export function hasEnteredGarden(saved, {mapVersion, spawn}) {
  if (!saved || typeof saved !== 'object') return false;
  if (typeof saved.enteredGarden === 'boolean') return saved.enteredGarden;
  return saved.mapVersion === mapVersion
    && [saved.x, saved.z, saved.heading].every(Number.isFinite)
    && Math.hypot(saved.x - spawn.x, saved.z - spawn.z) > .1;
}
