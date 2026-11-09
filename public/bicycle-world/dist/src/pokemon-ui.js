import {POKEMON} from './pokemon-habitats.js';

/** Optional controls stay in Help; the riding view keeps its existing space. */
export function mountPokemonControls(help,audio,onUnavailable,onPreference){
  const section=document.createElement('section');section.setAttribute('aria-label','Pokémon companions');
  section.innerHTML=`<label class="motion-option"><input type="checkbox" id="pokemon-sounds" aria-describedby="pokemon-sound-note"> Nearby Pokémon voices</label>
    <p class="ride-sound-note" id="pokemon-sound-note">Short calls as you ride past. Four anime calls; their dub is unverified. Articuno and Vaporeon use game cries. Snorlax stays quiet.</p>
    <details class="help-destinations"><summary>About the Pokémon companions <span aria-hidden="true">+</span></summary>
    <p>Pokémon was part of Lakshya’s childhood. Pokémon GO brought that wish to explore a world with Pokémon a little closer.</p>
    <ul>${POKEMON.map(p=>`<li>${p.name} — ${p.habitat}.</li>`).join('')}</ul>
    <p>Click a companion to say hello, or ring the bicycle bell with <kbd>R</kbd> nearby. Every project is available independently of the companions.</p>
    <p><a href="${new URL('../pokemon-credits.html',import.meta.url).href}" target="_blank" rel="noopener">Model and audio credits</a></p></details>`;
  const preferences = help.querySelector('.field-guide-settings');
  if (preferences) preferences.append(section);
  else help.querySelector('.help-actions').before(section);
  const checkbox=section.querySelector('input');
  let changeIntent=0,disposed=false;
  const change=async()=>{const request=++changeIntent,requested=checkbox.checked;onPreference?.(requested);const enabled=await audio.setEnabled(requested);if(disposed||request!==changeIntent)return;checkbox.checked=audio.enabled;if(requested&&!enabled)onUnavailable?.();};
  checkbox.addEventListener('change',change);
  return {sync(){checkbox.checked=audio.enabled;},dispose(){disposed=true;changeIntent++;checkbox.removeEventListener('change',change);section.remove();}};
}
