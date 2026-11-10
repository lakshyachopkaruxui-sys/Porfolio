// Owner-supplied biography and current Normal-portfolio facts. Provenance and
// editorial limits are recorded in docs/about-journal-story-20261110.md.
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
  intro:'My story, the way I work and the things I use to turn a question into something people can try.',
  chapters:[
    {
      id:'meet',label:'Meet me',title:'Hi, I’m Lakshya.',
      lead:'I’m a UX & Product Designer studying User Experience at MIT ADT University in Pune. My background is in Electronics & Telecommunication.',
      pages:[
        {title:'The person behind the work',blocks:[
          {type:'photo',photoId:'lakshya-by-the-water',caption:'Hi, I’m Lakshya.'},
          {type:'text',body:'I enjoy getting an idea out of my head and into someone’s hands, from an app prototype to a working game board. Research, interfaces and physical prototyping all have a place in my work.'}
        ]},
        {title:'Usually the one starting a conversation.',blocks:[
          {type:'text',body:'I love meeting new people and making friends. Empathy is something I learned from my mother. I pay attention to pauses, hesitation and small changes in expression; they give me a reason to ask another question.'},
          {type:'photo',photoId:'lakshya-a-quieter-moment',caption:'There’s a quieter side to the energy, too.'}
        ]}
      ]
    },
    {
      id:'journey',label:'My journey',title:'Electronics, then experience design.',
      lead:'My technical education, design training and project work meet in the way I approach a problem today.',
      pages:[
        {title:'Learning to design',blocks:[
          {type:'timeline',entries:[
            {date:'2019–2022',title:'B.Tech · Electronics & Telecommunication',body:'SSIPMT Raipur. My technical background still supports the physical prototypes and electronics I build.'},
            {date:'Jul 2025–Jul 2027 · expected',title:'M.Des · User Experience',body:'Pursuing my master’s at MIT ADT University, Pune, working across research, interfaces and tangible experiences.'}
          ]},
          {type:'text',title:'DesignBoat bootcamp',body:'I also trained at DesignBoat, where Vignesh Pujar taught and mentored me. It is another part of my route into design.'},
          {type:'text',title:'Learning along the way',body:'I’ve also studied UX and graphic design through courses and workshops from Google, Internshala, GrowthSchool, the University of Colorado Boulder and California Institute of the Arts.'}
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
      id:'approach',label:'My approach',title:'The next question shapes my process.',
      lead:'I choose methods around the people, the situation and what I need to understand next. New observations can take me back to an earlier decision.',
      pages:[
        {title:'Understand what is getting in the way',blocks:[
          {type:'text',title:'Start with the experience',body:'I want to understand what someone is trying to do and where it becomes difficult. Interviews, observation, contextual inquiry or a survey can help answer different parts of that question.'},
          {type:'text',title:'Give the question a form',body:'A user flow, storyboard, wireframe or physical model makes an idea easier to discuss. I use the level of detail that lets me explore the uncertain part.'},
          {type:'photo',photoId:'observing-a-comparison',caption:'Listening while a participant compares printed logo options.'}
        ]},
        {title:'Make it possible to try',blocks:[
          {type:'text',title:'Watch what happens',body:'A working prototype lets people respond through their actions. I look for hesitation, missed controls and unexpected choices, alongside what they tell me.'},
          {type:'text',title:'Go back with a better question',body:'The next iteration might change a screen, a physical control or the question I started with. I return to the evidence when choosing what to change.'},
          {type:'photo',photoId:'listening-at-the-table',caption:'Gathering preferences on printed logo patterns.'}
        ]}
      ]
    },
    {
      id:'decisions',label:'Decisions in practice',title:'What that looks like in my projects.',
      lead:'A finding matters when it changes a decision. These two examples show a refinement we made and a direction for the next prototype.',
      pages:[
        {title:'ConnectAid · A route people already tried',blocks:[
          {type:'text',body:'I built the core Figma design system used across our shared screens. The team’s remote usability study gave us specific navigation and input problems to work on.'},
          {type:'decision',title:'Search by the specialty they know',friction:'Participants tried searching for a doctor’s specialty instead of following the intended category route.',decision:'We added specialty search alongside category browsing, giving the terms people tried a place in the flow.',next:'Retest doctor discovery, and check that the two routes use consistent labels and destinations.',projectId:'connectaid'}
        ]},
        {title:'Giggles · Make the answer surface clear',blocks:[
          {type:'text',body:'I built the electronics, embedded game logic and working prototype. Teammates designed the interfaces, which I helped review.'},
          {type:'decision',title:'The screen looked like the place to answer',friction:'During teacher-supported play, children tried touching the phone instead of tapping their card on the RFID reader.',decision:'For the next version, we proposed an on-screen direction, a spoken “Tap your card here” cue and a light on the reader.',next:'Build those cues into the next prototype, then try the turn again with learners and teachers.',projectId:'giggles'},
          {type:'photo',photoId:'giggles-recognition-at-meraki',caption:'Our game, Giggles, received Best Project at Meraki.'}
        ]}
      ]
    },
    {
      id:'toolkit',label:'My toolkit',title:'Different questions. Different tools.',
      lead:'I move between research, interfaces and working prototypes. I choose the tools that help answer the question in front of me.',
      pages:[
        {title:'Understand and shape',blocks:[
          {type:'toolkit',groups:[
            {title:'Research with people',body:'Interviews, contextual inquiry, surveys, usability testing and synthesis help me understand an experience.',tools:['Miro','Notion','FigJam','Google Forms']},
            {title:'Shape the experience',body:'Information architecture, user flows, wireframes and prototypes make the structure and interactions visible.',tools:['Figma','Framer','ProtoPie','Illustrator','Photoshop','Figma Make']},
            {title:'Think in systems',body:'Journey mapping, service design and systems mapping help me examine relationships across touchpoints.',tools:[]}
          ]}
        ]},
        {title:'Build, connect and explore',blocks:[
          {type:'toolkit',groups:[
            {title:'Work across disciplines',body:'My electronics background supports collaboration across interfaces, physical models and working prototypes.',tools:['GitHub','Maya','3D printing','Arduino C++','ESP32','RFID (MFRC522)']},
            {title:'Code to explore',body:'With AI support, I build working prototypes and review their behaviour against the design intent.',tools:['GitHub','Xcode','VS Code','GitHub Copilot','Antigravity']},
            {title:'Think and make with AI',body:'I use AI for thinking, exploring ideas and prototyping, then review what it produces.',tools:['ChatGPT','Gemini','Claude','Figma Make','GitHub Copilot','Midjourney','Perplexity','NotebookLM (Google)','Antigravity','Google Search (AI Mode)','LLM Arena']}
          ]}
        ]}
      ]
    },
    {
      id:'next',label:'Where next',title:'Meet me in the work.',
      lead:'The projects show how these interests become research, design decisions and things people can try.',
      pages:[
        {title:'A little more of me',blocks:[
          {type:'photo',photoId:'lakshya-a-little-colour',caption:'A little colour.'},
          {type:'text',body:'I’m an energetic, sociable person who likes making things with other people. This garden brings that side of me together with the work.'}
        ]},
        {title:'Choose a direction',blocks:[
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
