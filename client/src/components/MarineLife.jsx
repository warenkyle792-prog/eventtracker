/**
 * Marine life ambience for the page background.
 *
 * Six species drift across the viewport behind the content, drawn as flat
 * silhouettes so they never compete with the text:
 *
 *   fish        · reef fish with caudal, dorsal, anal and pectoral fins
 *   school      · eight small fish trailing in a loose line
 *   manta ray   · broad wings with a flap cycle and a long whip tail
 *   sea turtle  · scuted shell, paddling front flipper, slow and unhurried
 *   jellyfish   · scalloped bell, frilly oral arms, trailing thin tentacles
 *   bubbles     · rising in a lazy sway
 *
 * Realism here is careful geometry rather than detail: correct proportions,
 * fins and appendages in the right places, and believable speeds (a turtle is
 * much slower than a fish; a jellyfish pulses instead of swimming). Depth comes
 * from scale, blur and opacity — near creatures are larger and sharper, far
 * ones are smaller, softer and fainter.
 *
 * Colour is per species — copper reef fish, a gold school, plum rays, a green
 * turtle and brick jellyfish, with lighter fins, wing tips, flippers and oral
 * arms for a second tone. Every tint comes from the theme's own warm range and
 * sits at the same low opacity as before, so the water gains colour without
 * ever competing with the page.
 *
 * Everything animates with CSS transforms only, so there is no per-frame
 * JavaScript and the whole layer costs almost nothing.
 */

/* ---------------------------------------------------------------- shapes */

function ReefFish() {
  return (
    <svg viewBox="0 0 96 44" role="presentation" focusable="false" className="sea-fish">
      {/* caudal (tail) fin */}
      <path d="M28 17 C20 9 12 3.5 4 3 C9 13 9 31 4 41 C12 40.5 20 35 28 27 Z" fill="var(--sea-fish-fin)" fillOpacity="0.78" />
      {/* dorsal fin */}
      <path d="M40 9 C48 2.5 60 1.5 68 7 C58 8.5 48 9 40 9 Z" fill="var(--sea-fish-fin)" fillOpacity="0.82" />
      {/* anal fin */}
      <path d="M50 35.5 C56 41 66 42.5 72 38.5 C64 37.5 56 36.5 50 35.5 Z" fill="var(--sea-fish-fin)" fillOpacity="0.6" />
      {/* pectoral fin */}
      <path d="M78 25 C71 30.5 62 34.5 54 35.5 C61 30 68 26.5 74 23.5 Z" fill="var(--sea-fish-fin)" fillOpacity="0.55" />
      {/* body */}
      <path d="M92 22 C86 11 70 6 52 7.5 C40 8.5 31 12 27 16.5 L27 27.5 C31 32 40 35.5 52 36.5 C70 38 86 33 92 22 Z" />
      {/* gill line */}
      <path d="M76 12.5 C71.5 18 71.5 26 76 31.5" fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.1" />
      {/* eye, punched out in the background colour */}
      <circle cx="83" cy="19" r="2.1" fill="var(--bg-0)" />
    </svg>
  );
}

function SmallFish() {
  return (
    <svg viewBox="0 0 96 44" role="presentation" focusable="false">
      <path d="M28 17 C20 9 12 3.5 4 3 C9 13 9 31 4 41 C12 40.5 20 35 28 27 Z" fillOpacity="0.7" />
      <path d="M40 9 C48 2.5 60 1.5 68 7 C58 8.5 48 9 40 9 Z" fillOpacity="0.7" />
      <path d="M92 22 C86 11 70 6 52 7.5 C40 8.5 31 12 27 16.5 L27 27.5 C31 32 40 35.5 52 36.5 C70 38 86 33 92 22 Z" />
      <circle cx="83" cy="19" r="2" fill="var(--bg-0)" />
    </svg>
  );
}

function MantaRay() {
  return (
    <svg viewBox="0 0 160 92" role="presentation" focusable="false" className="sea-manta">
      {/* whip tail */}
      <path d="M66 46 C46 46.5 20 47.3 2 46 C20 44.7 46 45.5 66 46 Z" fill="var(--sea-ray-tip)" fillOpacity="0.8" />
      <g className="sea-manta__wings">
        {/* upper wing */}
        <path d="M150 46 C140 29 116 15 78 10 C50 7 28 12 14 23 C34 25 58 31 80 39 C104 48 130 47 150 46 Z" fillOpacity="0.95" />
        {/* lower wing */}
        <path d="M150 46 C140 63 116 77 78 82 C50 85 28 80 14 69 C34 67 58 61 80 53 C104 44 130 45 150 46 Z" fillOpacity="0.95" />
        {/* body + cephalic fins */}
        <path d="M152 46 C147 37 130 31 108 31 C88 31 72 37 64 46 C72 55 88 61 108 61 C130 61 147 55 152 46 Z" />
        <path d="M148 42 C139 37 128 35 119 38 C130 40 141 41 148 43 Z" fill="var(--sea-ray-tip)" fillOpacity="0.85" />
        <path d="M148 50 C139 55 128 57 119 54 C130 52 141 51 148 49 Z" fill="var(--sea-ray-tip)" fillOpacity="0.85" />
      </g>
    </svg>
  );
}

function SeaTurtle() {
  return (
    <svg viewBox="0 0 132 92" role="presentation" focusable="false" className="sea-turtle">
      {/* rear flipper */}
      <path d="M44 53 C36 61 24 70 19 78 C25 81 36 74 43 65 C46 61 46 56 45 53 Z" fill="var(--sea-turtle-fin)" fillOpacity="0.85" />
      {/* front flipper — paddles */}
      <g className="sea-turtle__flipper">
        <path d="M84 47 C94 48 108 57 113 68 C109 75 96 70 88 59 C84 53 83 49 84 47 Z" fill="var(--sea-turtle-fin)" fillOpacity="0.85" />
      </g>
      {/* tail */}
      <path d="M30 50 C24 49 17 47 12 44 C18 50 24 53 30 54 Z" fill="var(--sea-turtle-fin)" fillOpacity="0.75" />
      {/* carapace */}
      <path d="M26 52 C26 32 42 19 62 19 C82 19 98 32 98 50 C98 56 94 59 88 59 L36 59 C30 59 26 56 26 52 Z" />
      <path d="M62 21 L62 57 M45 23 L49 57 M79 24 L75 57" fill="none" stroke="var(--bg-0)" strokeOpacity="0.22" strokeWidth="1.5" />
      <path d="M33 45 C48 39 78 39 91 45" fill="none" stroke="var(--bg-0)" strokeOpacity="0.16" strokeWidth="1.3" />
      {/* head */}
      <path d="M93 42 C100 33 116 32 122 38 C126 43 122 51 112 53 C103 55 96 52 94 47 Z" />
      <circle cx="114" cy="40" r="1.6" fill="var(--bg-0)" />
    </svg>
  );
}

function Jellyfish() {
  return (
    <svg viewBox="0 0 76 96" role="presentation" focusable="false" className="sea-jelly">
      <g className="sea-jelly__tentacles">
        <g fill="none" stroke="var(--sea-jelly-arm)" strokeLinecap="round" strokeOpacity="0.5">
          <path d="M12 38 C9 52 13 66 9 84" strokeWidth="1.1" />
          <path d="M19 40 C16 56 20 70 16 90" strokeWidth="1.1" />
          <path d="M26 41 C24 58 27 72 23 92" strokeWidth="1.1" />
          <path d="M33 42 C32 60 34 74 30 94" strokeWidth="1.1" />
          <path d="M43 42 C44 60 41 74 45 94" strokeWidth="1.1" />
          <path d="M50 41 C52 58 49 72 53 92" strokeWidth="1.1" />
          <path d="M57 40 C60 56 56 70 60 90" strokeWidth="1.1" />
          <path d="M64 38 C67 52 64 66 68 84" strokeWidth="1.1" />
        </g>
        {/* four frilly oral arms */}
        <g fill="none" stroke="var(--sea-jelly-arm)" strokeLinecap="round" strokeOpacity="0.78">
          <path d="M22 41 C26 50 20 56 25 64 C29 71 23 76 27 84" strokeWidth="3.2" />
          <path d="M32 42 C36 52 30 58 35 66 C39 73 33 78 37 86" strokeWidth="3.2" />
          <path d="M44 42 C48 52 42 58 47 66 C51 73 45 78 49 86" strokeWidth="3.2" />
          <path d="M54 41 C58 50 52 56 57 64 C61 71 55 76 59 84" strokeWidth="3.2" />
        </g>
      </g>
      {/* scalloped bell */}
      <g className="sea-jelly__bell">
        <path d="M38 3 C20 3 5 16 5 32 C5 36 7 39 11 39
                 C15 42 19 42 23 39 C27 42 31 42 35 39 C39 42 43 42 47 39
                 C51 42 55 42 59 39 C63 42 67 42 71 39 C75 39 71 32 71 32
                 C71 16 56 3 38 3 Z" />
        <path d="M13 30 C25 36 51 36 63 30" fill="none" stroke="var(--bg-0)" strokeOpacity="0.22" strokeWidth="1.4" />
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------- layout */

/*
 * lane      vertical position on screen
 * width     rendered size in px (also reads as depth)
 * o / blur  opacity and depth-of-field — bigger blur means further away
 * dur/bob   travel time across the viewport / swim-cycle length
 * far       hidden on small screens to keep phones light
 */
const SWIMMERS = [
  { id: 'f1', kind: 'fish', lane: '16%', width: 150, dur: 118, delay: -12, o: 0.17, blur: 0.4, bob: 9.5 },
  { id: 'f2', kind: 'fish', lane: '37%', width: 96, flip: true, dur: 92, delay: -44, o: 0.14, blur: 1.1, bob: 11 },
  { id: 'f3', kind: 'fish', lane: '64%', width: 132, flip: true, dur: 132, delay: -80, o: 0.12, blur: 2.4, bob: 13, far: true },
  { id: 'f4', kind: 'fish', lane: '78%', width: 78, dur: 78, delay: -26, o: 0.16, blur: 0.6, bob: 8.5 },
  { id: 'f5', kind: 'fish', lane: '10%', width: 62, flip: true, dur: 150, delay: -104, o: 0.09, blur: 3, bob: 15, far: true },
];

const RAYS = [
  { id: 'r1', lane: '28%', width: 260, dur: 190, delay: -58, o: 0.11, blur: 2.6, bob: 16, flap: 7.5, far: true },
  { id: 'r2', lane: '70%', width: 150, dur: 240, delay: -150, o: 0.08, blur: 3.4, bob: 20, flap: 9, far: true },
];

const TURTLES = [
  { id: 't1', lane: '58%', width: 168, dur: 224, delay: -96, o: 0.15, blur: 0.5, bob: 12, paddle: 4.4 },
];

const JELLIES = [
  { id: 'j1', lane: '44%', left: '78%', width: 116, dur: 132, delay: -20, o: 0.16, blur: 0.4, bob: 7, pulse: 6.5 },
  { id: 'j2', lane: '68%', left: '22%', width: 74, dur: 168, delay: -88, o: 0.1, blur: 2.2, bob: 9, pulse: 8.4, far: true },
];

/* Bubbles rise in loose strands rather than one even curtain. */
const BUBBLES = [
  { id: 'b1', x: '18%', size: 4, dur: 34, delay: -6, sway: 6, o: 0.18 },
  { id: 'b2', x: '19.4%', size: 3, dur: 31, delay: -2, sway: 5, o: 0.14 },
  { id: 'b3', x: '31%', size: 3, dur: 44, delay: -24, sway: 8, o: 0.13, far: true },
  { id: 'b4', x: '47%', size: 5, dur: 52, delay: -38, sway: 7, o: 0.15 },
  { id: 'b5', x: '48.6%', size: 3, dur: 48, delay: -41, sway: 6, o: 0.11, far: true },
  { id: 'b6', x: '66%', size: 4, dur: 40, delay: -16, sway: 6, o: 0.16 },
  { id: 'b7', x: '82%', size: 3, dur: 58, delay: -34, sway: 9, o: 0.12, far: true },
  { id: 'b8', x: '92%', size: 4, dur: 36, delay: -12, sway: 5, o: 0.17 },
];

function swimmerVars(item) {
  return {
    '--lane': item.lane,
    '--w': `${item.width}px`,
    '--dur': `${item.dur}s`,
    '--delay': `${item.delay}s`,
    '--o': item.o,
    '--blur': `${item.blur}px`,
    ...(item.bob ? { '--bob': `${item.bob}s` } : {}),
    ...(item.flap ? { '--flap': `${item.flap}s` } : {}),
    ...(item.paddle ? { '--paddle': `${item.paddle}s` } : {}),
    ...(item.pulse ? { '--pulse': `${item.pulse}s` } : {}),
    ...(item.left ? { '--left': item.left } : {}),
  };
}

export default function MarineLife() {
  return (
    <div className="app-bg__sea" aria-hidden="true">
      {SWIMMERS.map((fish) => (
        <span
          key={fish.id}
          className={`sea-item sea-item--fish ${fish.flip ? 'sea-item--flip sea-item--rtl' : ''} ${fish.far ? 'sea-item--far' : ''}`}
          style={swimmerVars(fish)}
        >
          <span className="sea-item__inner"><ReefFish /></span>
        </span>
      ))}

      {RAYS.map((ray) => (
        <span
          key={ray.id}
          className={`sea-item sea-item--ray ${ray.far ? 'sea-item--far' : ''}`}
          style={swimmerVars(ray)}
        >
          <span className="sea-item__inner"><MantaRay /></span>
        </span>
      ))}

      {TURTLES.map((turtle) => (
        <span key={turtle.id} className="sea-item sea-item--turtle" style={swimmerVars(turtle)}>
          <span className="sea-item__inner"><SeaTurtle /></span>
        </span>
      ))}

      {/* Eight small fish trailing each other. */}
      <span
        className="sea-item sea-item--school"
        style={swimmerVars({ lane: '22%', width: 200, dur: 124, delay: -52, o: 0.15, blur: 0.7, bob: 7 })}
      >
        <span className="sea-item__inner">
          {Array.from({ length: 8 }, (_, index) => (
            <span
              key={index}
              className="sea-school__fish"
              style={{
                '--i': index,
                '--s': 1 - index * 0.07,
                '--d': `${index * 0.5}s`,
                '--dy': `${index * 7}px`,
                '--dx': `${index * -26}px`,
              }}
            >
              <SmallFish />
            </span>
          ))}
        </span>
      </span>

      {JELLIES.map((jelly) => (
        <span
          key={jelly.id}
          className={`sea-item sea-item--jelly ${jelly.far ? 'sea-item--far' : ''}`}
          style={swimmerVars(jelly)}
        >
          <span className="sea-item__inner"><Jellyfish /></span>
        </span>
      ))}

      {BUBBLES.map((bubble) => (
        <span
          key={bubble.id}
          className={`sea-bubble ${bubble.far ? 'sea-bubble--far' : ''}`}
          style={{
            '--x': bubble.x,
            '--size': `${bubble.size}px`,
            '--dur': `${bubble.dur}s`,
            '--delay': `${bubble.delay}s`,
            '--sway': `${bubble.sway}s`,
            '--o': bubble.o,
          }}
        >
          <span />
        </span>
      ))}
    </div>
  );
}
