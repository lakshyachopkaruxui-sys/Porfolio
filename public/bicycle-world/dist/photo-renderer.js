// When WebGL is unavailable, present the original capture in the same navigation.
export function createPhotoRenderer(currentCapture) {
  const surface = document.createElement('div');
  surface.className = 'photo-surface';
  const image = new Image();
  surface.append(image);
  let width = 1, height = 1, lastId = null;
  const noop = () => {};
  return {
    domElement: surface, shadowMap: {}, info: {render: {calls: 0, triangles: 0}},
    capabilities: {getMaxAnisotropy: () => 1},
    getSize: vector => vector.set(width, height),
    setSize(w, h) { width = w; height = h; },
    getPixelRatio: () => 1, setPixelRatio: noop,
    getViewport: rect => rect.set(0, 0, width, height), setViewport: noop,
    getScissor: rect => rect.set(0, 0, width, height), setScissor: noop,
    getScissorTest: () => false, setScissorTest: noop,
    getClearColor: color => color.set(0), getClearAlpha: () => 1, setClearColor: noop,
    getRenderTarget: () => null, setRenderTarget: noop,
    render() {
      const capture = currentCapture();
      if (!capture || capture.id === lastId) return;
      lastId = capture.id;
      image.alt = capture.name + ' from Lakshya’s Pokémon GO collection';
      image.src = capture.image;
    }
  };
}
