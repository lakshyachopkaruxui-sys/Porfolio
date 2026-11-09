/** The Works interior owns project imagery. Keep the existing world lifecycle
 * contract without allocating four outdoor canvas textures or image requests. */
export function createStudioDisplays(){
  return {
    ready:Promise.resolve([]),
    setActive(){},
    update(){},
    dispose(){},
  };
}
