/** One shared deck rhythm for visible joints and wheel-contact feedback. */
export const BRIDGE_SEAM_SPACING=.8;
export function bridgeSeams(bridge){
  const seams=[];
  for(let z=bridge.minZ+BRIDGE_SEAM_SPACING;z<bridge.maxZ-.1;z+=BRIDGE_SEAM_SPACING)seams.push(z);
  return seams;
}
