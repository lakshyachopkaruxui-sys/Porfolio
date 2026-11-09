// Research-prepared component references, not photographs of the Giggles build.
// Exact manufacturers and revisions require comparison with the owner's hardware.
const base = 'assets/cases/giggles/components/';

export const GIGGLES_COMPONENT_REFERENCES = [
  {
    id: 'esp32', title: 'ESP32 controller',
    purpose: 'Runs the game states, reads physical inputs and serves the phone interface over local Wi-Fi.',
    status: 'Component family confirmed; board variant is representative.',
    sourcePage: 'https://documentation.espressif.com/esp-dev-kits/en/latest/esp32/esp32-devkitc/user_guide.html',
    credit: 'Reference photograph: Espressif Systems.',
    visual: {src: `${base}esp32-reference.webp`, width: 1000, height: 501,
      alt: 'Espressif ESP32-DevKitC V4 reference board; not a photograph of the Giggles prototype.',
      caption: 'ESP32 controller · Reference photograph: Espressif Systems.'},
  },
  {
    id: 'rc522', title: 'RC522 reader and RFID cards',
    purpose: 'Reads a physical card’s UID so the game can check the answer or control input.',
    status: 'MFRC522 / RC522 family confirmed; supplier and pictured kit accessories are representative.',
    sourcePage: 'https://www.sunfounder.com/collections/raspberry-pi-store/products/rfid-kit-blue',
    credit: 'Reference photograph: SunFounder.',
    visual: {src: `${base}rc522-reference.webp`, width: 700, height: 700,
      alt: 'SunFounder RC522 reader with a blank RFID card and key fob as component references, not actual Giggles answer cards.',
      caption: 'RC522 reader and RFID card · Reference photograph: SunFounder.'},
  },
  {
    id: 'touch', title: 'Touch inputs',
    purpose: 'Triggers the Communication, Emotion, Shape and Finish inputs from the board.',
    status: 'Touch-sensor input confirmed; the pictured TTP223B module is an example, not a verified build model.',
    sourcePage: 'https://www.sunfounder.com/products/ttp223-touch-sensor-module',
    credit: 'Reference photograph: SunFounder.',
    visual: {src: `${base}touch-reference.webp`, width: 700, height: 700,
      alt: 'SunFounder TTP223B touch-sensor reference module; the actual Giggles sensor model is not yet established.',
      caption: 'Touch input · Representative module photograph: SunFounder.'},
  },
  {
    id: 'button', title: 'Physical shape buttons',
    purpose: 'A Circle or Square press answers an active shape question.',
    status: 'Physical buttons confirmed; switch mechanism and dimensions are unspecified. Pictured switch is representative.',
    sourcePage: 'https://www.adafruit.com/product/1119',
    credit: 'Reference photograph: Adafruit Industries.',
    visual: {src: `${base}button-reference.webp`, width: 970, height: 728,
      alt: 'Adafruit tactile switch on a breadboard as a generic physical-button reference; not the actual Giggles shape-button assembly.',
      caption: 'Physical button input · Representative photograph: Adafruit Industries.'},
  },
  {
    id: 'led-red', title: 'Red feedback',
    purpose: 'Provides physical incorrect-answer feedback alongside the phone response.',
    status: 'Red LEDs confirmed; package and supplier are representative.',
    sourcePage: 'https://www.adafruit.com/product/299',
    credit: 'Reference photograph: Adafruit Industries.',
    visual: {src: `${base}led-red-reference.webp`, width: 970, height: 728,
      alt: 'Adafruit red LED as a representative feedback component, not a photograph of the installed Giggles LED.',
      caption: 'Red feedback LED · Representative photograph: Adafruit Industries.'},
  },
  {
    id: 'led-green', title: 'Green feedback',
    purpose: 'Provides physical correct-answer feedback alongside the phone response.',
    status: 'Green LEDs confirmed; package and supplier are representative.',
    sourcePage: 'https://www.adafruit.com/product/298',
    credit: 'Reference photograph: Adafruit Industries.',
    visual: {src: `${base}led-green-reference.webp`, width: 970, height: 728,
      alt: 'Adafruit green LED as a representative feedback component, not a photograph of the installed Giggles LED.',
      caption: 'Green feedback LED · Representative photograph: Adafruit Industries.'},
  },
];

export const GIGGLES_COMPONENT_REFERENCE_NOTE = 'Component reference images explain each part’s role. They are separate from photographs of our actual build.';
