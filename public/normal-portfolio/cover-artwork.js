// Static composition of unchanged project artwork. The case reader retains
// original full-size images and the team's UI-design attribution.
export function mountGigglesCover(figure) {
  if (!figure?.matches?.('.art-giggles.is-project-cover')) return;
  const board = figure.querySelector('img');
  // Complete presentation renders already contain the phone and board.
  if (!board?.src?.endsWith('/assets/projects/giggles.png')) return;
  if (!board || figure.querySelector('.giggles-device')) return;

  figure.classList.add('has-giggles-composition');
  board.classList.add('giggles-board-art');
  board.alt = 'Original Giggles board-layout artwork with shape answers and a communication, emotion and press activity path; not a photograph of working hardware.';

  const device = document.createElement('div');
  device.className = 'giggles-device';
  device.setAttribute('aria-hidden', 'true');
  const screen = document.createElement('div');
  screen.className = 'giggles-device-screen';
  const preview = document.createElement('img');
  preview.className = 'giggles-start-preview';
  preview.src = new URL('./assets/cases/giggles/child-interface.png', import.meta.url).href;
  preview.alt = '';
  preview.width = 1650;
  preview.height = 1821;
  preview.loading = 'lazy';
  preview.decoding = 'async';

  screen.append(preview);
  device.append(screen);
  figure.append(device);
}
