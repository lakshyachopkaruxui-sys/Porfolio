const ease=t=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x);};

/** The HTML veil hides the scene handoff underneath the shared WebGL canvas. */
export function mountCloudCurtain(root){
  root.innerHTML='<div class="cloud-veil"></div>';
  const veil=root.firstElementChild;
  function render({active,phase,coverProgress=0,revealProgress=0}){
    root.hidden=!active;root.dataset.phase=phase;
    root.dataset.revealStep=String(Math.floor(revealProgress*10));
    if(!active)return;
    veil.style.opacity=String(phase==='revealing'?1-ease(revealProgress/.18):ease((coverProgress-.55)/.45));
  }
  function dispose(){root.hidden=true;root.replaceChildren();}
  return {render,dispose};
}
