import type { Appearance } from '@/features/character-creator/model';
import { Pomin } from './pomin';
export function Nursery({
  appearance,
  className = '',
}: {
  appearance?: Appearance;
  className?: string;
}) {
  return (
    <div className={`nursery ${className}`} aria-label="Um quarto acolhedor em Vila Aurora">
      <svg className="nursery-scene" viewBox="0 0 700 440" aria-hidden="true">
        <defs>
          <linearGradient id="wall" x2="0" y2="1">
            <stop stopColor="#efdfd1" />
            <stop offset="1" stopColor="#f8ece0" />
          </linearGradient>
          <linearGradient id="sky" x2="0" y2="1">
            <stop stopColor="#b1c4cf" />
            <stop offset="1" stopColor="#f1d9c5" />
          </linearGradient>
        </defs>
        <path fill="url(#wall)" d="M0 0h700v440H0z" />
        <path fill="#ddc4aa" d="M0 339h700v101H0z" />
        <path
          d="M0 350h700M30 398h640M130 339l-30 101m160-101-10 101m180-101 10 101m150-101 30 101"
          stroke="#b79b82"
          opacity=".25"
          fill="none"
        />
        <rect x="414" y="33" width="197" height="245" rx="98" fill="#c1a68d" />
        <path d="M427 269V132a85 85 0 0 1 170 0v137Z" fill="url(#sky)" />
        <circle cx="552" cy="100" r="29" fill="#fcf2d8" />
        <path d="M428 211q50-67 93 0t76-5v62H428" fill="#acbbb0" />
        <path d="M428 245q60-56 106-5t63-4v33H428" fill="#8fa595" />
        <path d="M511 48v222m-84-111h171" stroke="#f1e4d5" strokeWidth="8" />
        <path
          d="M397 35q45 100 10 240l-28 17q36-149 0-257m235 0q-33 115-7 239l31 19q-27-156-2-258"
          fill="#d4b4a6"
        />
        <path
          d="M73 41v100m0-70 104 27m-63-17v48m63-31v54"
          stroke="#a38e73"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="m73 135 5 10 11 2-8 8 2 12-10-6-10 6 2-12-8-8 11-2m46-30 4 8 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1"
          fill="#e1bd78"
        />
        <path d="M177 142a14 14 0 1 0 11 22 12 12 0 0 1-11-22" fill="#b6a0cb" />
        <rect x="37" y="245" width="108" height="95" rx="8" fill="#c4b19b" />
        <path d="M45 287h92m-47-24h13m-13 44h13" stroke="#f3e8d5" strokeWidth="3" />
        <path d="M80 244v-36m-25 0h50l-9-43H65Z" fill="#f1d7ad" stroke="#b6a080" strokeWidth="2" />
        <ellipse cx="360" cy="386" rx="177" ry="32" fill="#ece1c9" />
        <ellipse
          cx="360"
          cy="386"
          rx="153"
          ry="23"
          fill="none"
          stroke="#c6b5a0"
          strokeDasharray="4 5"
        />
        <path d="M219 245q132-46 263 0v102H219Z" fill="#c5a382" />
        <path d="M226 247q125-39 250 0v24H226Z" fill="#f5ead6" />
        <path
          d="M215 251v111m273-111v111M215 293h273"
          stroke="#ad8969"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {[237, 265, 293, 321, 349, 377, 405, 433, 461].map((x) => (
          <path key={x} d={`M${x} 291v50`} stroke="#b58f6e" strokeWidth="6" strokeLinecap="round" />
        ))}
        <path
          d="M622 337v-74m-1 54q-41-11-38-44 37 3 38 44m1-28q33-1 33-35-30 1-33 35m0-8q-23-12-18-38 27 7 18 38"
          fill="#839879"
          stroke="#74866b"
          strokeWidth="3"
        />
        <path d="M600 322h46l-7 38h-31Z" fill="#c58e79" />
        <rect x="255" y="80" width="60" height="76" rx="4" fill="#b69b80" />
        <rect x="262" y="87" width="46" height="62" fill="#f5e9cf" />
        <path d="M275 128q13-30 21 0m-20-1h21" stroke="#b1bba0" strokeWidth="5" fill="none" />
        <circle cx="348" cy="93" r="3" fill="#fff1d2" />
        <path d="m372 158 3 6 7 1-5 4 1 7-6-3-6 3 1-7-5-4 7-1Z" fill="#d9b57c" />
      </svg>
      <Pomin appearance={appearance} className="nursery-pomin" sleeping />
      <span className="scene-caption">VILA AURORA · UM NOVO COMEÇO</span>
    </div>
  );
}
