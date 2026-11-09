// Original team research and the dated continuation have different provenance.
// Full claim and asset records: docs/hmi-*-20261108.md and refinement/SOURCE.json.
const path = 'assets/cases/workplace-mode/refinement/';
const p = text => ({type: 'paragraph', text});
const h = text => ({type: 'heading', text});
const table = (caption, headers, rows) => ({type: 'table', caption, headers, rows});
const points = items => ({type: 'points', items: items.map(([title, body]) => ({title, body}))});
const graphic = (file, width, height, alt, caption) => ({type: 'figure', visual: {src: path + file, width, height, alt, caption}});
const audioGraphic = (file, width, height, alt, caption) => ({type: 'figure', visual: {src: 'assets/cases/workplace-mode/audio-refinement/' + file, width, height, alt, caption}});
const chapter = (id, title, blocks) => ({id, title, body: [], blocks});

export const WORKPLACE_SOURCES = [
  {title: '[1] NHTSA · Visual–Manual Driver Distraction Guidelines (2013), Section V.J', href: 'https://www.govinfo.gov/content/pkg/FR-2013-04-26/html/2013-09883.htm', note: 'Voluntary US guidance for original-equipment visual–manual secondary tasks. Interruptibility and retained input are established recommendations, not a novelty claim or Indian approval.'},
  {title: '[2] Cooper et al. · Age-Related Differences in IVIS Demands (2020)', href: 'https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.01154/full', note: 'Original on-road study, 125 participants and six vehicles. Voice preference, duration and demand were different questions. US context; age is not digital literacy.'},
  {title: '[3] Louveton, McCall & Engel · Touchscreen Menu Depth, Breadth and Tasks', href: 'https://arxiv.org/html/2404.11469v1', note: 'Inspected arXiv manuscript, 28 drivers in a simulator, four layouts and three tasks. Task-dependent effects; no universal menu optimum or verified journal-publication claim.'},
  {title: '[4] Villing · Now, Where Was I? (2010)', href: 'https://aclanthology.org/P10-1082.pdf', note: 'Eight-person human dialogue study, ACL pp.798–805. Informs resumption questions; did not test this prototype or an automated return card.'},
  {title: '[5] Transport Canada · Visual Display Distraction Guidelines (2019)', href: 'https://tc.canada.ca/en/road-transportation/stay-safe-when-driving/transport-canada-guidelines-limit-distraction-visual-displays-vehicles', note: 'Official voluntary guidance on driver-paced tasks, feedback, interruption and resumption. Stopped in traffic still counts as driving; this is not a desktop compliance test.'},
  {title: '[6] Google · Templated App Requirements', href: 'https://developers.google.com/cars/design/create-apps/ux-requirements/templated-apps', note: 'Platform requirements checked November 2026. Task exits, explicit route changes and scope-specific limits; not proof of a vehicle integration.'},
  {title: '[7] NEXA · Baleno Variant Specifications', href: 'https://www.nexaexperience.com/content/dam/msil/nexa/in/en/assets/documents/brochure/NEXA-Baleno-Brochure-15-07.pdf', note: 'PDF page 8 identifies Zeta’s 7-inch SmartPlay Pro and steering audio controls. Current retrieved specifications do not establish the hardware or firmware in the participant’s 2024 car.'},
  {title: '[8] Google · Android Auto System Widgets', href: 'https://developers.google.com/cars/design/android-auto/product-experience/system-ui/widgets', note: 'Media controls and navigation context already exist. These capabilities inform a competent comparison, rather than a claim that another Next button is a new invention.'},
  {title: '[9] Google · Media Design Responsibilities', href: 'https://developers.google.com/cars/design/create-apps/media-apps/overview', note: 'Google and car makers control important parts of the media interface; media-app developers have bounded responsibilities. The desktop prototype is not permission or an API for changing Android Auto’s system UI.'},
];

const WORKPLACE_SOURCE_STORY = {
  intro: 'I studied how drivers experience in-car interfaces with a four-author academic team. In November 2026, I returned to one account: a song change lagged, and the driver kept checking. I built two ways to explain that response while keeping navigation available. The comparison is ready to try; driver evaluation is still ahead.',
  readingTime: 13,
  prototype: {url: './design/workplace-audio-lab-20261108/', label: 'Try the audio/navigation prototype'},
  sections: [
    chapter('challenge', 'Problem and scope', [
      p('One driver described difficulty switching between music and navigation. In a separate account, he described checking again when a song change lagged. I brought these accounts together into one question: how can the screen explain a delayed track change while keeping route information available?'),
      p('Our paper compares 20 digitally confident drivers with 14 commercial drivers in Indian driving conditions. Their occupation, age and experience also differ, so digital familiarity alone cannot explain the differences between the groups.'),
      points([
        ['Original work', 'A four-author academic study and an earlier Workplace Mode concept. Neither established that the proposed interface improved driving performance.'],
        ['Current continuation · November 2026', 'Source review, secondary research, explicit synthesis, competing concepts and a desktop comparison prototype. Framework outputs below were created during this continuation.'],
        ['What the project can deliver now', 'A traceable interaction hypothesis and a testable prototype. Vehicle signals, provider integration and real driving benefits remain outside the demonstrated work.'],
      ]),
    ]),
    chapter('research', 'User research', [
      p('We used two adapted questionnaires with agreement ratings, categorical questions and open responses. Our paper records 34 survey responses. The earlier project handoff separately records 13 interviews; the overlap between those groups is unknown. I keep those method counts separate rather than reporting 47 participants.'),
      p('The digital-comfort topics include smartphone-use frequency, exploring unfamiliar features and connecting unfamiliar devices. The private-driver instrument describes six stress/context items, four interaction-friction items and three safety/preference items. These topics make the questionnaire inspectable; the paper does not fully specify a validated literacy measure or the thresholds used to classify drivers. (Paper pp.9–10.)'),
      graphic('study-scope.svg', 1000, 820, 'Two separate source records: the paper reports 34 surveys, 20 digitally confident and 14 commercial drivers; the handoff reports 13 interviews, six private and seven commercial. Overlap is unknown.', 'Study scope · New source diagram. Paper pp.8–14 and earlier handoff. Methods are shown separately; these are not 47 unique participants.'),
      table('How collection affects interpretation', ['Source detail', 'What it means for this case'], [
        ['Private-driver form · English, online', 'Digital comfort and interface experience are self-reported; no objective literacy or attention test is established.'],
        ['Commercial-driver form · English/Hindi adaptation', 'Simplified functional wording helps contextual fit. Equivalent measurement across forms is not established merely by using the same response scale.'],
        ['Thematic analysis · paper pp.11–18', 'The report describes a six-phase process and four core themes. The original affinity board uses seven clusters. These are different documented groupings; their exact coding relationship is not recorded.'],
        ['Numerical summaries', 'Several chart/prose values and percentage denominators need reconciliation with raw responses. They are not used here as precise effect sizes or concept-selection scores.'],
      ]),
      p('The earlier handoff describes private-driver interviews by video and commercial-driver conversations around refuelling queues, with questions read aloud in Hindi or English where needed. These collection details come from that record, rather than being inferred from the paper. Different settings and administration modes matter when interpreting group differences.'),
      p('The study is small, cross-sectional and largely self-reported. It offers useful accounts of difficulty; it does not provide eye-tracking results, crash outcomes or a test of these concept screens. The paper’s “representative quotes” lack stable participant identifiers, so they are not reproduced here as verified verbatim interviews.'),
    ]),
    chapter('findings', 'Research findings', [
      p('The report groups the findings into context-related stress, interaction depth, physical or visual displacement, and a preference for useful simplicity. A lower reported error count can coexist with avoiding the screen. That makes “more completed tasks” an incomplete definition of success.'),
      {type: 'figure', visual: {src: 'assets/cases/workplace-mode/evidence/affinity-map-original.jpg', previewSrc: 'assets/cases/workplace-mode/evidence/affinity-map-preview.webp', width: 2000, height: 2301, alt: 'Original project affinity board groups research notes into seven clusters.', caption: 'Original affinity artifact · Seven clusters from the earlier case; the paper reports four themes. Their exact coding relationship is not recorded. Notes are research excerpts, not newly verified verbatim quotations.'}},
      table('Reported pattern → interpretation to investigate', ['Reported in the paper', 'Interpretation and boundary'], [
        ['Menu steps and switching · pp.17–18', 'Task structure may create unnecessary search. The exact task and existing shortest route still need inspection.'],
        ['Freezing, lag or unexpected responses · pp.14, 19', 'Feedback uncertainty is one possible mechanism. Network delay, a frozen display and a wrong action need different remedies.'],
        ['Leaning or reaching · pp.18, 25', 'The seat, display and target arrangement matter. A desktop screen cannot establish a physical reach improvement.'],
        ['Avoiding interaction · p.24', 'Leaving the screen alone can be an adaptive response. It must not automatically be counted as failure.'],
      ]),
      p('Preferences also resist a single answer. The paper reports mixed responses to physical controls and voice, rather than a universal replacement for touch. The redesign therefore starts from a specific task, not a rule that one modality suits everyone.'),
    ]),
    chapter('secondary', 'Secondary research', [
      p('I used published research to challenge my design: keep existing shortcuts, let people leave optional work, and explain what is actually known. These sources changed the comparison requirements; their participants are separate from our study.'),
      table('External evidence → design consequence', ['Finding and source', 'Decision for this project'], [
        ['Interrupted tasks should retain input and make resumption understandable · NHTSA [1]', 'Use a state-preserving baseline. Adding a Resume button is not sufficient differentiation.'],
        ['Preference, time and interaction demand can diverge · Cooper et al. [2]', 'Evaluate understanding, errors and effort separately. Voice is not automatically low demand, and easier use may encourage more engagement.'],
        ['Menu effects depend on the task · Louveton et al. [3]', 'Compare a matched task with its required information. Fewer taps alone do not establish a better or safer interaction.'],
        ['Resumption uses task context · Villing [4]', 'Investigate the smallest useful reminder. The eight-person dialogue study did not validate an automated return feature.'],
        ['Driver-paced interaction and retained input · Transport Canada [5]', 'Allow leaving optional work. A deliberate no-return path remains valid.'],
        ['Platform constraints determine available behaviour · Google [6]', 'Keep an exit during waiting and distinguish reviewing a destination from applying a route change.'],
        ['Baleno variants use different equipment · NEXA [7]', 'Use Zeta’s 7-inch SmartPlay Pro as a provisional reference; do not mix Studio and Pro+ screens or claim the participant’s firmware is verified.'],
        ['Navigation and playback controls already coexist · Google [8]', 'Keep media widgets, recent-app access and supported steering controls. Test feedback meaning rather than removing competent shortcuts.'],
        ['System and app responsibilities differ · Google [9]', 'Treat the receipt as a system-level design exploration. Implementation needs the relevant platform owners and state interfaces, beyond a third-party media screen.'],
      ]),
      p('These sources inform a new design direction. They do not establish that Workplace Mode reduces distraction, works for every Indian driver, or meets an automotive approval process.'),
    ]),
    chapter('synthesis', 'Design requirements', [
      p('I grouped the findings by the work they create: finding a function, understanding its response, reaching it, or deciding whether to continue. That gave me five requirements for the comparison below. This is new synthesis, not fresh coding of raw survey rows or one journey followed by every participant.'),
      graphic('evidence-to-requirements.svg', 1000, 1050, 'Four evidence-to-requirement links: menu search to predictable access; unreliable response to truthful state; reaching to physical verification; avoidance to voluntary disengagement.', 'New synthesis · Each requirement keeps its source and its unresolved question. This diagram does not represent a completed intervention test.'),
      table('Requirements that can fail a concept', ['ID / requirement', 'Acceptance question'], [
        ['R1 · Predictable access', 'Does the comparison retain the shortest supported route and necessary context without adding another navigation detour?'],
        ['R2 · Truthful state', 'Can someone distinguish a received command, pending response, confirmed playback and an unknown result?'],
        ['R3 · Deliberate control', 'Can someone leave optional interaction without repeating a command or implying that an outstanding request was cancelled?'],
        ['R4 · Continuity', 'Does the existing media widget or steering control already meet the task? Navigation and request state must survive changing views.'],
        ['R5 · Appropriate scope', 'Can the central benefit be demonstrated with desktop/Figma resources? Reach and driving-attention claims require different equipment.'],
      ]),
    ]),
    chapter('framing', 'Refined design question', [
      p('When a music change responds slowly, what does the driver need to understand without losing navigation context? The six questions below narrow this investigation. The recorded account describes repeated checking; repeated tapping and the value of a new receipt remain questions to test.'),
      table('5W1H · new framing', ['Question', 'Working answer'], [
        ['Who?', 'Drivers with different tasks and digital familiarity. Do not infer an individual’s ability from their occupation.'],
        ['What?', 'Changing an unwanted track, understanding the response and retaining or returning to guidance. This combined task is a new synthesis of related accounts.'],
        ['When?', 'Around a delayed playback response or a view change. Optional audio interaction can be left alone.'],
        ['Where?', 'A desktop model informed by existing Android Auto patterns; provisional Maruti reference: Baleno Zeta, 7-inch SmartPlay Pro. Exact participant firmware remains unverified.'],
        ['Why?', 'Reduce avoidable search and misunderstanding while preserving the choice not to engage.'],
        ['How?', 'Compare ordinary clear feedback with an explicit action receipt, using the same task, controls and simulated response states.'],
      ]),
      h('Five Whys: follow different explanations'),
      graphic('causal-branches.svg', 1000, 1020, 'Four bounded causal branches stop at missing evidence: menu structure, response layer, physical geometry and value of returning to a task.', 'New branching Five Whys analysis · A branch stops when its next answer is unknown. Five confident answers are not manufactured.'),
      p('The recorded song-change account supports examining response clarity. It does not establish the cause of the lag or prove that more status text will help. The candidate must improve understanding beyond the existing controls without adding another task.'),
    ]),
    chapter('opportunities', 'Task goals', [
      p('The current analysis focuses on two goals: find a familiar control without unnecessary searching, and understand an action well enough to wait, leave or return. These task stories guide the design; they are not participant quotes or the results of new interviews.'),
      points([
        ['Find the control', 'When I need a familiar adjustment, I want a predictable route to it so I can avoid searching across unrelated functions.'],
        ['Understand and leave an action', 'When an action does not respond as expected, I want to understand what happened and whether anything still needs my input, so I can wait, leave it or return deliberately.'],
      ]),
      table('Proposed task breakdown', ['Goal / plan', 'Question the baseline must answer'], [
        ['0 · Resolve or leave a secondary task', 'Is this task necessary now, postponable or unnecessary?'],
        ['1 · Find the function', 'Which steps are genuinely required and which are navigation detours?'],
        ['2 · Request a track change', 'Was the command captured locally, and what playback response is still outstanding?'],
        ['3 · Understand the result', 'What is confirmed, failed or unknown? Last confirmed playback may be stale.'],
        ['4 · Leave or return', 'Does navigation remain available? Returning must not repeat the relative Next command.'],
      ]),
      p('This is a proposed goal model with conditional plans, not an observed click path. The opportunity map follows three distinct branches: remove unnecessary search; make known and unknown state understandable; preserve useful context. Physical reach remains a separate investigation because a desktop preference test cannot settle it.'),
      graphic('opportunity-map.svg', 1000, 980, 'Proposed outcome branches into predictable access, truthful state and useful continuity, with a candidate mechanism and a disconfirming test for each.', 'New opportunity hypothesis map · Links explain what each mechanism would test. Importance and satisfaction were not measured, so no numerical opportunity score is implied.'),
    ]),
    chapter('task', 'Choosing the task', [
      p('I chose music/navigation switching because GD02 described both frustrating switching and repeated checking after a delayed song change. I combined those related accounts into a test scenario. The notes do not establish that both happened in one episode, or that repeated checking meant repeated tapping.'),
      audioGraphic('task-evidence.svg', 1000, 1010, 'GD02 interview-derived account and the paper’s task-switching theme support a newly synthesized music/navigation comparison task, with private-to-commercial transfer still to test.', 'Task selection · The combined scenario is new analysis. GD02 is a private driver in a shared-household Maruti context; the exact car for each episode is not recorded.'),
      table('Task choice and boundaries', ['Evidence or decision', 'What changes in the prototype'], [
        ['Primary task · change music and retain guidance', 'Use an unwanted-track change and a delayed response. Do not inflate this into playlist search or a reconstructed commercial ride incident.'],
        ['Current comparison context · existing Android Auto patterns', 'Keep widgets, recent-app access and steering controls. A real unit/version check is still needed before claiming a faithful product baseline.'],
        ['Provisional manufacturer reference · Baleno Zeta', 'The paper lists a 2024 Zeta; the current brochure identifies 7-inch SmartPlay Pro. That is a documentation choice, not proof of the participant’s installed firmware.'],
        ['Competing task · parked phone/projection setup', 'GD01’s Fronx account gives this a concrete basis. Investigate it if current playback controls already solve the primary task.'],
      ]),
      p('The commercial affinity artifact mentions GPS and passenger-requested music, but it does not establish the same delayed-song episode. Transfer to commercial drivers needs follow-up. Reported difficulty also does not provide an objective task-by-task cognitive-load ranking.'),
      p('Maruti’s native shell, Android Auto’s projected interface and the playback app have different responsibilities. This is a system-level interaction exploration. Shipping it would require the relevant platform owners and reliable playback-state interfaces; a browser drawing is not an Android Auto extension API. [9]'),
    ]),
    chapter('alternatives', 'Concept alternatives', [
      p('The earlier proposal combined a commercial work layer with inferred driving states and request holding. The continuation separates those dependencies and explores eight alternatives. They are new proposals, not directions all generated or tested during the original study.'),
      table('Candidate comparison · desktop-only scope', ['Direction / intended value', 'Main weakness / current disposition'], [
        ['Departure Plan · optional preparation before a trip', 'Existing setup flows already cover much of this. Keep only if a specific preparation failure is found.'],
        ['Return Point · resume a local draft deliberately', 'Ordinary persistence may already solve it. Investigate only against a competent baseline; no automatic replay.'],
        ['Reach Fit · a stable, physically suitable control arrangement', 'Strong link to reported reaching, but physical benefit needs a seat/display setup. Defer that claim.'],
        ['Phone Handover · explicit ownership during a device change', 'Needs an actual handover conflict and supported platform behaviour. Do not assume either.'],
        ['Decision-Cost Routes · preview route demands before setting off', 'Local data quality and established route features limit differentiation. No “safer route” score.'],
        ['Passenger Task Pass · bounded assistance for optional tasks', 'Assistance and permission needs require their own evidence. No access to critical controls.'],
        ['Car Familiarity Check · optional model-specific rehearsal', 'Could transfer burden to the driver instead of fixing the interface. Needs a verified unfamiliar-car problem.'],
        ['Repair Replay · review supported technical events after a drive', 'Useful only with real event capture and a service recipient. A report receipt is not a diagnosis or fix.'],
      ]),
      p('We set the comparison criteria before choosing a direction: support from the evidence, practical value, feasibility, failure handling, differentiation and what we could test. An option must show the true status and leave the decision to the user, whatever its overall score.'),
      p('Return Point ranked highest in an earlier broad concept review. The later task trace changed the direction: a delayed song change has a specific source account, while lost destination drafts do not. The current proposal therefore investigates playback-response clarity. The earlier ranking is not a result for this new design.'),
    ]),
    chapter('states', 'Comparison prototype', [
      p('The new desktop prototype compares two feedback approaches for the same music/navigation task. Both retain navigation context, media shortcuts and simulated steering controls. The proposed action receipt separates a captured command from a confirmed playback change, with no extra approval step for a normal track skip.'),
      audioGraphic('audio-comparison.svg', 1000, 1030, 'A competent existing-pattern comparison and an explicit action receipt share navigation, playback controls and response states; the proposed difference is the meaning of feedback.', 'Matched comparison · Original illustrative interface informed by documented patterns. This is not a verified Maruti firmware screen or an Android Auto integration.'),
      table('What each alternative must demonstrate', ['Approach', 'Keep it only if…'], [
        ['A · Existing-pattern comparison', 'The best existing routes remain available, with ordinary clear pending, failure and unknown feedback. Do not hide shortcuts or silence all feedback to make it lose.'],
        ['B · Explicit action receipt', 'People understand the command and result more accurately without extra reading, extra controls or an unwanted action when returning.'],
      ]),
      audioGraphic('audio-state-contract.svg', 1000, 1220, 'Confirmed, locally received, pending, failed and unknown playback states stay distinct; matching responses or an authoritative state read establish the result without replaying Next.', 'Proposed state contract · Last confirmed playback may be stale when the result is unknown. A local output mute is independent of a remote track request.'),
      p('The simulation includes delayed, failed and unknown results. It models one relative track command at a time: returning or reloading cannot send another Next. Reading playback state requests information rather than repeating the action. Local mute changes the modeled output state; it does not cancel or confirm the track request.'),
      p('This is a silent model. In a real car, hearing the next song is also feedback. The first desktop evaluation can examine displayed-state understanding; it cannot establish how much the receipt changes real listening or repeated screen checking.'),
      {type: 'sources', items: [{title: 'Open the audio/navigation prototype', href: './design/workplace-audio-lab-20261108/', note: 'Compare both feedback approaches and the researcher-controlled response states. Track names and route drawing are illustrative; no audio, live navigation or vehicle is connected.'}]},
      p('The old Calm/Busy/Critical classifier and “held ride” story are not carried forward as validated behaviour. A screen cannot guarantee a provider reservation, infer a safe moment from its label, or repair a display process that cannot render.'),
    ]),
    chapter('constraints', 'Failure and recovery', [
      p('A track change can be pending, fail or lose its response. Playback can also change elsewhere while the screen has old information. The following responses belong to a new design contract, not a completed automotive safety assessment.'),
      h('Test the assumptions that could invalidate the direction'),
      p('First: does the current interface still leave the person uncertain? Second: can the relevant playback system expose truthful state? Third: does the receipt improve understanding beyond ordinary clear feedback? If those assumptions fail, revise or remove the extra receipt.'),
      table('Risk → design response → remaining check', ['Failure to examine', 'Proposed response / verification'], [
        ['Last confirmed track mistaken for current playback', 'Qualify last-known information when a result is unknown. Ask what the person believes is playing and what the system actually knows.'],
        ['Local input mistaken for confirmed completion', 'Show pending separately from confirmed. Verify the system responsible for the result, not just a local tap animation.'],
        ['Response lost after an action', 'Show an unknown result. No automatic replay; require authoritative reconciliation before a consequential retry.'],
        ['A delayed response arrives after newer information', 'Match request identifiers and state versions. Do not let an old response silently replace a fresher authoritative state.'],
        ['Mute mistaken for cancelled Skip', 'Keep local output state and the outstanding playback request separate. Muting must not announce that a remote command was cancelled.'],
        ['Display cannot render or connection is unavailable', 'Do not imply that another label fixes the underlying failure. Declare which states are simulated and which capabilities are unavailable.'],
        ['The receipt increases reading or checking', 'Compare the same task with ordinary feedback. Reject the extra explanation if it creates more work without useful understanding.'],
      ]),
    ]),
    chapter('reflection', 'Results and testing plan', [
      p('I narrowed a broad work-layer idea to one source-backed task and built two functional feedback approaches. That is the completed design output; there are no new participant results yet. Drivers from the original study are available for follow-up, and I still need to arrange and conduct those sessions.'),
      p('A separate observation sheet now follows the same tasks, response conditions and approach labels. It records the person’s actual explanation, assistance and misunderstandings without treating a simulated response or a blank field as a result. The original Maruti decision and task choice are retained; exact participant firmware and a real baseline walkthrough remain unverified.'),
      {type: 'sources', items: [{title: 'Open the driver-session observation sheet', href: './design/workplace-audio-lab-20261108/session-sheet.html', note: 'Researcher tool · Blank, local-only records. Use the existing stationary protocol; no participant sessions have been conducted.'}]},
      table('Planned formative evaluation · not conducted', ['Check', 'Method and decision'], [
        ['Problem and baseline fit', 'Reconstruct a real recent task with an intended driver, inspect the actual product and record its existing shortcuts, persistence and failure states. Drop a concept whose problem is absent.'],
        ['Matched desktop tasks', 'Use the same unwanted track, navigation context, shortcuts and response conditions. Alternate A/B order; record familiarity, assistance and the actual participants.'],
        ['State comprehension', 'Ask what the system received, which playback state is confirmed and what remains unknown. Record critical misunderstandings before preference.'],
        ['Interruption and return', 'Use a declared stationary interruption. Check whether the person regains guidance and understands the outstanding request without it being sent again.'],
        ['Delay, failure and unknown', 'Inject each state explicitly. Check whether the person waits, leaves, cancels or repeats a consequential action. Do not infer system status from confidence alone.'],
        ['Progression beyond desktop', 'Only after useful formative findings: select actual hardware and an appropriate controlled study for reach, glance behaviour, workload and primary-task performance.'],
      ]),
      p('Success would mean a meaningful improvement over the real baseline in the chosen task, with fewer critical misunderstandings and no added control burden. The acceptable difference and decision rules should be set before collecting comparison results, once the baseline and participant access are known. Faster completion alone is not evidence of safer driving.'),
      p('The change in direction is deliberate: a broad work layer became one source-backed task, and a destination-draft demo became a comparison of playback feedback. If the best existing controls already meet the need, the parked phone-connection problem remains a stronger next investigation than adding another layer.'),
    ]),
    chapter('sources', 'Sources', [
      p('Our primary study is Cognitive Load Across Automobile HMI Systems in Indian Driving Conditions, a 28-page academic paper by Ayushi Gupta, Lakshya Chopkar, Pranali Kasar and Vibha Shree MS. Study scope: pp.8–14; themes: pp.17–18; avoidance: p.24; limitations: pp.25–26. Publication and peer-review status are not established.'),
      p('Earlier project records: HMI_Case_Study_Handoff.md, MASTER_CONCEPT.md and the standalone Workplace Mode case, including its original affinity board. These preserve the earlier research and concept history; they do not establish that the November continuation was part of the original study.'),
      {type: 'sources', items: WORKPLACE_SOURCES},
      p('The original study, external publications, new analytical diagrams and proposed evaluation are separate evidence layers. Secondary research supplies context and constraints; it does not add participants to our study or become a measured result for this prototype.'),
    ]),
  ],
};

// Keep the full analytical record, but let a recruiter follow the task decision
// without opening three separate framework chapters. Existing chapter IDs for
// the chosen task and all its evidence remain stable.
const sourceSections = new Map(WORKPLACE_SOURCE_STORY.sections.map(section => [section.id, section]));
const disclosure = (title, blocks) => ({type: 'details', title, blocks});
export const WORKPLACE_STORY = {
  ...WORKPLACE_SOURCE_STORY,
  readingTime: 11,
  sections: WORKPLACE_SOURCE_STORY.sections.filter(section => !['framing', 'opportunities'].includes(section.id)).map(section => {
    if (section.id === 'research') return {...section, blocks: [
      section.blocks[0],
      table('What each research record establishes', ['Record', 'Known base', 'Use and boundary'], [
        ['Academic paper · pp.8–14', '34 survey responses: 20 digitally confident and 14 commercial drivers', 'Reported experience and broad themes; group differences also involve occupation, age and experience.'],
        ['Earlier interview handoff', '13 interviews: six private and seven commercial drivers', 'Collection context and surviving accounts. Overlap with survey respondents is unknown; these are not 47 unique participants.'],
        ['GD02 task account', 'One private driver; related accounts, not one verified combined episode', 'Reason to investigate delay and switching, not a task-frequency ranking or a commercial-driver result.'],
      ]),
      section.blocks[2],
      disclosure('Questionnaires, collection and interpretation limits', [section.blocks[1], ...section.blocks.slice(3)]),
    ]};
    if (section.id === 'task') return {...section, title: 'Why this task', blocks: [
      ...section.blocks,
      h('What I need to learn before keeping the receipt'),
      p('First I need to check the shortest ordinary route on an actual system. Steering controls, media widgets and audible playback may already resolve the task. The desktop comparison asks a narrower question: does the extra receipt help someone understand what is confirmed without adding unnecessary reading?'),
      disclosure('How I framed the question', sourceSections.get('framing').blocks),
      disclosure('Task goals and opportunity hypotheses', sourceSections.get('opportunities').blocks),
    ]};
    if (section.id === 'states') {
      const prototype = section.blocks.find(block => block.type === 'sources');
      return {...section, blocks: [
        section.blocks[0],
        h('Compare the same delayed track change'),
        p('Start both approaches on City morning, request Next toward Open coast, and choose the delayed response. Both keep the route, controls and last-confirmed track. Neither can call Open coast confirmed while the request is pending.'),
        table('Same condition, different explanation · current desktop model', ['Approach', 'What stays the same', 'What to inspect'], [
          ['A · Existing-pattern comparison', 'City morning remains last confirmed; the same Next request is pending and the same route stays available.', 'Ordinary pending feedback already explains that playback has not confirmed the change. This is a competent comparison, not an interface made silent to lose.'],
          ['B · Explicit action receipt', 'The same request, service response, controls and route context.', 'An added receipt separates input received locally from playback confirmation. It must earn its extra reading by improving understanding.'],
        ]),
        p('Switch both to an unknown outcome to inspect the harder case: the last-known track may be stale. Reading the current playback state must request information, not send Next again. These are annotated model states to try, not driver findings or OEM screenshots.'),
        prototype,
        ...section.blocks.slice(1).filter(block => block !== prototype),
      ]};
    }
    return section;
  }),
};
