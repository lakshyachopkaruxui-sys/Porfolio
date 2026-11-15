// Compact original-artifact previews. Full cases retain the complete evidence and limitations.
const comparisonSource = './assets/cases/connectaid/evidence/testing-input-search-original.webp';
const originalSource = './assets/cases/connectaid/evidence/testing-input-search-original.webp';
// Display windows into the unchanged original sheet; never redraw controls or invent states.
function controlExcerpt(label, x, y, width, height) {
  return `<figure class="control-excerpt"><figcaption>${label}</figcaption><a href="${originalSource}" target="_blank" rel="noopener noreferrer" aria-label="Inspect ${label} in the original study artifact, opens in a new tab"><svg viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="${label}, detail from the original ConnectAid study artifact"><image href="${comparisonSource}" width="1800" height="1013"/></svg></a></figure>`;
}
export function projectEvidencePeek(id) {
  if (id === 'giggles') return `<section class="evidence-feature evidence-giggles" id="evidence-giggles" aria-labelledby="evidence-giggles-title">
    <header class="evidence-heading"><p class="evidence-kicker">Giggles · Electronics into interaction</p><h2 id="evidence-giggles-title">One question. A physical answer. Feedback.</h2></header>
    <ol class="evidence-turn" aria-label="One documented Giggles Communication turn">
      <li><h3>Read the situation</h3><p>“Someone keeps taking your pencil.” The phone asks what you would say.</p><figure><a href="./assets/cases/giggles/build-photos/IMG-20261007-WA0008.jpg" target="_blank" rel="noopener noreferrer" aria-label="Open original Giggles board photograph at full size in a new tab"><img src="./assets/cases/giggles/build-photos/IMG-20261007-WA0008.jpg" width="960" height="1280" loading="lazy" decoding="async" alt="Giggles board during assembly, with orange holders, raised shapes and wiring."></a><figcaption>The actual board during assembly; the phone sits in the orange holder.</figcaption></figure></li>
      <li><h3>Choose and tap</h3><p>Tap the orange <strong>“Please stop”</strong> RFID card. The controller checks its identifier.</p><figure><a href="./assets/cases/giggles/final-documentation/communication-cards.webp" target="_blank" rel="noopener noreferrer" aria-label="Open original Giggles answer cards at full size in a new tab"><img src="./assets/cases/giggles/final-documentation/communication-cards.webp" width="1324" height="491" loading="lazy" decoding="async" alt="Four Communication answer cards, with the expected orange Please stop card at the right."></a><figcaption>Original card designs · Expected answer at right.</figcaption></figure></li>
      <li><h3>Respond and continue</h3><p>Green feedback and positive speech confirm the answer; the turn advances.</p><figure><a href="./assets/cases/giggles/evidence/child-correct.webp" target="_blank" rel="noopener noreferrer" aria-label="Open original Giggles feedback interface at full size in a new tab"><img src="./assets/cases/giggles/evidence/child-correct.webp" width="720" height="360" loading="lazy" decoding="async" alt="Original phone interface for the pencil situation showing green Right Answer feedback."></a><figcaption>Original interface design · Correct-response state.</figcaption></figure></li>
    </ol>
    <p class="project-evidence-note">Illustrated sequence from documented rules, not a live demonstration. I built the electronics and game logic; teammates designed the interfaces. Learning gains remain unvalidated.</p>
    <a class="evidence-case-link" href="#project-giggles">Full Giggles case: build, retry rules and testing</a>
  </section>`;
  if (id === 'connectaid') return `<section class="evidence-feature evidence-connectaid" id="evidence-connectaid" aria-labelledby="evidence-connectaid-title">
    <header class="evidence-heading"><p class="evidence-kicker">ConnectAid · Decisions from testing</p><h2 id="evidence-connectaid-title">What testing changed.</h2></header>
    <div class="evidence-decisions">
      <article><h3>A date you already know</h3><p>Calendar browsing caused difficulty. Separate day, month and year choices replaced it.</p><div class="control-pair">${controlExcerpt('Before · Calendar browsing',1148,212,177,248)}${controlExcerpt('After · Day, month, year',769,205,220,222)}</div></article>
      <article><h3>The route people actually tried</h3><p>Participants searched by specialty. Search now sits alongside category browsing.</p><div class="control-pair">${controlExcerpt('Before · Category route',1218,605,147,310)}${controlExcerpt('After · Specialty search',805,605,147,310)}</div></article>
    </div>
    <p class="evidence-original-link"><a href="${originalSource}" target="_blank" rel="noopener noreferrer">Inspect the complete original before-and-after artifact</a> · Details above are excerpts from this unchanged source.</p>
    <p class="project-evidence-note">Six participants, eleven tasks. I coordinated testing and built the core design system. These prototype changes have no measured comparative improvement.</p>
    <a class="evidence-case-link" href="#project-connectaid">Full ConnectAid case: findings, decisions and original screens</a>
  </section>`;
  return '';
}
