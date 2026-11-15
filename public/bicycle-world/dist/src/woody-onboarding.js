/** Persistent, explicit onboarding choices. Rendering and audio belong to the host. */
export function createWoodyOnboarding({onQuestion = () => {}, onGuide = () => {}, onDepart = () => {}, onState = () => {}} = {}) {
  let phase = 'hello', answer = null, disposed = false, revision = 0;
  const snapshot = () => Object.freeze({phase, answer});

  function transition(next, effect) {
    if (disposed) return false;
    phase = next;
    const currentRevision = ++revision;
    onState(snapshot());
    // State observers may synchronously reset, leave or dispose this flow.
    // Never run an obsolete effect after such a cancellation.
    if (!disposed && revision === currentRevision) effect?.();
    return true;
  }
  function depart() {
    const choice = answer;
    return transition('departing', () => onDepart(Object.freeze({choice})));
  }

  return {
    get snapshot() { return snapshot(); },
    requestGardenGuide() {
      if(disposed || phase !== 'riding' || answer !== null) return false;
      return transition('choice', () => onQuestion(snapshot()));
    },
    requestRide() {
      if (disposed || !['hello', 'ready'].includes(phase)) return false;
      if (answer !== null) return depart();
      return transition('choice', () => onQuestion(snapshot()));
    },
    choose(value) {
      if (disposed || phase !== 'choice' || !['yes', 'no'].includes(value)) return false;
      answer = value;
      return value === 'yes' ? transition('guide', () => onGuide(snapshot())) : depart();
    },
    continueFromGuide() {
      if (disposed || phase !== 'guide') return false;
      return depart();
    },
    cancelDeparture() {
      if (disposed || phase !== 'departing') return false;
      return transition('ready');
    },
    leaveGuide() {
      if (disposed || phase !== 'guide') return false;
      return transition('ready');
    },
    back() {
      if (disposed || phase !== 'choice') return false;
      return transition('hello');
    },
    markRiding() {
      if (disposed || phase === 'riding') return false;
      return transition('riding');
    },
    reset() {
      if (disposed) return false;
      answer = null;
      return transition('hello');
    },
    dispose() {
      if (disposed) return false;
      disposed = true;
      phase = 'disposed';
      revision++;
      return true;
    },
  };
}
