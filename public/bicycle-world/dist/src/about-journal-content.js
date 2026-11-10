// Owner-supplied biography and current Normal-portfolio facts. Provenance and
// editorial limits are recorded in docs/about-journal-story-20261110.md.
// The concise spread structure is documented in about-journal-content-balance-20261110.md.
const freeze=value=>{
  if(value&&typeof value==='object'&&!Object.isFrozen(value)){
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const ABOUT_JOURNAL=freeze({
  title:'A little about Lakshya',
  role:'UX & Product Designer',
  intro:'My journey, my approach and the tools behind my work.',
  chapters:[
    {
      id:'meet',label:'Meet me',title:'Hi, I’m Lakshya.',
      lead:'I’m a UX & Product Designer studying User Experience at MIT ADT University, Pune. I came to design through Electronics & Telecommunication.',
      pages:[
        {blocks:[
          {type:'photo',photoId:'lakshya-by-the-water'}
        ]},
        {title:'People come first.',blocks:[
          {type:'text',body:'I love meeting people and making friends. I learned empathy from my mother. Pauses, hesitation and small changes in expression give me a reason to ask another question.'},
          {type:'photo',photoId:'lakshya-a-quieter-moment'}
        ]}
      ]
    },
    {
      id:'journey',label:'My journey',title:'My path into UX.',suppressOpeningLabel:true,
      lead:'',
      pages:[
        {title:'Learning to design',blocks:[
          {type:'timeline',entries:[
            {date:'2019–2022 · B.Tech',title:'Electronics & Telecommunication',body:'SSIPMT Raipur.'},
            {date:'Jul 2025–Jul 2027 · expected',title:'M.Des · User Experience',body:'Pursuing my master’s at MIT ADT University, Pune.'}
          ]},
          {type:'text',title:'DesignBoat bootcamp',body:'Vignesh Pujar taught and mentored me during my DesignBoat bootcamp.'},
          {type:'text',body:'I’ve also taken UX and graphic design courses and workshops from Google, Internshala, GrowthSchool, the University of Colorado Boulder and California Institute of the Arts.'}
        ]},
        {title:'Putting it into practice',blocks:[
          {type:'timeline',entries:[
            {date:'Jul–Aug 2023',title:'Product Design Intern · Novae Avenue',body:'Designed a data portal, landing page, brochure and customer-facing app screens for a 4G dashcam product.'},
            {date:'Nov 2023–Jan 2024',title:'Product Designer · Baragaun',body:'Contract work on responsive website layouts, research, app flows and an interactive prototype, including handoff for development.'}
          ]},
          {type:'photo',photoId:'presenting-the-syringe-redesign',caption:'Explaining our 20 cc syringe redesign at Meraki.'}
        ]}
      ]
    },
    {
      id:'approach',label:'My approach',title:'How I approach design.',
      lead:'',
      pages:[
        {blocks:[
          {type:'text',title:'Start with the experience',body:'I ask what someone is trying to do and where it becomes difficult. I choose interviews, observation, contextual inquiry or surveys around that question.'},
          {type:'text',title:'Make the idea possible to try',body:'A flow, storyboard, wireframe or working model gives an uncertain idea a form people can respond to, on screen or in their hands.'},
          {type:'photo',photoId:'observing-a-comparison',caption:'Listening while a participant compares printed logo options.'}
        ]},
        {blocks:[
          {type:'text',title:'Watch what happens',body:'I watch what people do with a prototype: hesitation, missed controls and unexpected choices matter alongside what they tell me.'},
          {type:'text',title:'Return to the evidence',body:'What I learn can change a screen, a physical control or the question itself. I revisit that evidence before choosing what to try next.'},
          {type:'photo',photoId:'listening-at-the-table',caption:'Gathering preferences on printed logo patterns.'}
        ]}
      ]
    },
    {
      id:'decisions',label:'Decisions in practice',title:'What changed, and why.',openingTitle:'ConnectAid: search by specialty',pairLogicalPages:true,
      lead:'',
      pages:[
        {title:'ConnectAid: search by specialty',blocks:[
          {type:'text',body:'I built the core Figma design system used across our shared screens. The team’s remote usability study revealed a different route to finding a doctor.'},
          {type:'decision',friction:'Participants tried searching by a doctor’s specialty instead of following the intended category route.',decision:'We added specialty search alongside category browsing.',next:'Retest doctor discovery and check that both routes use consistent labels and destinations.',projectId:'connectaid',projectLabel:'ConnectAid'}
        ]},
        {title:'Giggles: make the answer surface clear',blocks:[
          {type:'text',body:'I built the electronics, embedded game logic and working prototype. Teammates designed the interfaces, which I helped review.'},
          {type:'decision',friction:'During teacher-supported play, children tried touching the phone instead of tapping their card on the RFID reader.',decision:'For the next version, we proposed an on-screen direction, a spoken “Tap your card here” cue and a reader light.',next:'Build those cues into the next prototype and try the turn again with learners and teachers.',projectId:'giggles',projectLabel:'Giggles'},
          {type:'photo',photoId:'giggles-recognition-at-meraki',caption:'Our game, Giggles, received Best Project at Meraki.'}
        ]}
      ]
    },
    {
      id:'toolkit',label:'My toolkit',title:'Tools I work with.',
      lead:'',
      pages:[
        {blocks:[
          {type:'toolkit',groups:[
            {title:'Research with people',body:'Interviews, contextual inquiry, surveys, usability testing and synthesis help me understand people’s experiences.',tools:['Miro','Notion','FigJam','Google Forms']},
            {title:'Shape the experience',body:'Flows, information architecture, wireframes and prototypes help me work through structure and interaction.',tools:['Figma','Framer','ProtoPie','Illustrator','Photoshop','Figma Make']},
            {title:'Think in systems',body:'Journey mapping, service design and systems mapping connect the touchpoints.',tools:[]}
          ]}
        ]},
        {blocks:[
          {type:'toolkit',groups:[
            {title:'Work across disciplines',body:'Electronics, physical models and interfaces let me work across disciplines.',tools:['GitHub','Maya','3D printing','Arduino C++','ESP32','RFID (MFRC522)']},
            {title:'Code to explore',body:'With AI support, I build working prototypes and review their behaviour against the design intent.',tools:['GitHub','Xcode','VS Code','GitHub Copilot','Antigravity']},
            {title:'Think and make with AI',body:'AI helps me think, explore and prototype. I review what it produces.',tools:['ChatGPT','Gemini','Claude','Figma Make','GitHub Copilot','Midjourney','Perplexity','NotebookLM (Google)','Antigravity','Google Search (AI Mode)','LLM Arena']}
          ]}
        ]}
      ]
    },
    {
      id:'next',label:'Where next',title:'See where this leads.',
      lead:'',
      pages:[
        {blocks:[
          {type:'photo',photoId:'lakshya-a-little-colour'},
          {type:'text',body:'I’m energetic and sociable, and I like making things with other people. This garden brings that part of me into my work.'}
        ]},
        {blocks:[
          {type:'text',body:'I’m open to internships and full-time roles from January 2027, after my juries, in any location, remote or in office.'},
          {type:'links',items:[
            {label:'See my projects',destination:'projects'},
            {label:'Visit Singing & Garba',destination:'work'},
            {label:'How this garden was made',destination:'music'},
            {label:'Explore my photography',destination:'cloud'}
          ]}
        ]}
      ]
    }
  ]
});
