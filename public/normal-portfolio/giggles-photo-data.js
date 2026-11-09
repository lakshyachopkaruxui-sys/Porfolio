const photo = (file, width, height, kind, alt, caption) => ({src:`assets/cases/giggles/build-photos/${file}`, width, height, kind, alt, caption});

export const GIGGLES_BUILD_PHOTOS = [
  photo('IMG-20261007-WA0008.jpg',960,1280,'product','The unfinished Giggles board on a workshop table, with orange phone and card holders, four raised shapes, switches and wiring.','The physical board during assembly · Holders, shape controls and input positions before the printed artwork was applied.'),
  photo('IMG-20260815-WA0009.jpg',899,1599,'planning','Handwritten Giggles interaction notes with physical inputs, outcomes and sketches.','Early interaction notes · Mapping physical inputs to what happens next.'),
  photo('IMG-20260815-WA0010.jpg',899,1599,'planning','A notebook page with a board sketch and a connected sequence of interaction notes.','Working through the sequence · Board layout and game behaviour in the notebook.'),
  photo('IMG-20260816-WA0018.jpg',877,960,'assembly','An ESP32 development board mounted between two breadboards before wiring.','Starting the electronics · The ESP32 on the breadboard assembly.'),
  photo('IMG-20261007-WA0005.jpg',720,1280,'interaction','A green-capped physical push button held in a hand while selecting components.','Choosing physical inputs · Exploring push-button hardware.'),
  photo('IMG-20261007-WA0006.jpg',960,1280,'interaction','A blank RFID card with a handwritten identifier and card number13.','Mapping an RFID card · Recording identifiers so the program could recognise physical cards.'),
  photo('IMG-20261007-WA0007.jpg',720,1280,'assembly','An orange prototype part inside the enclosed build area of a 3D printer.','Fabricating the holders · A prototype part in the 3D printer.'),
  photo('IMG-20261007-WA0010.jpg',1200,1600,'wiring','A working notebook page with sensor, button and RFID-to-ESP32 pin assignments. Some assignments differ from the final firmware.','Working wiring notes · The notebook differs from the final firmware; the table below records the final connections.'),
  photo('IMG-20261007-WA0012.jpg',2160,3840,'assembly','A hand holding a blue single-pad touch module and a red panel of six touch-pad modules.','Comparing touch modules · Actual component photograph from the project.'),
];

export const GIGGLES_FIELD_VISIT = {
  src:'assets/cases/giggles/field-visit/foundation-team.jpg',width:1288,height:966,kind:'field-visit',
  alt:'Lakshya wearing a cap with his teammates and a Foundation representative during the Giggles usability-testing visit.',
  caption:'With the team at Vishvansh Foundation during our Giggles usability-testing visit.',
};
