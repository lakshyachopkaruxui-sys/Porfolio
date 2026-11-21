const key = 'visitor-ride-review-progress';
const destinations = new Set(['about', 'projects', 'music', 'cloud']);

// Keep progress when the visitor briefly switches to Portfolio and comes back.
export function createRideReviewProgress(storage) {
  let stage = '';
  try { stage = storage()?.getItem(key) ?? ''; } catch {}
  return {
    get canInvite() { return stage === 'ready'; },
    visit(stop) {
      const next = stop === 'work' && stage !== 'ready' ? 'hobbies'
        : stage === 'hobbies' && destinations.has(stop) ? 'ready' : stage;
      if (next === stage) return;
      stage = next;
      try { storage()?.setItem(key, stage); } catch {}
    },
  };
}
