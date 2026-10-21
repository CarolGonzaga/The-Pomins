import type { Appearance } from '@/features/character-creator/model';
import { defaultAppearance } from '@/features/character-creator/model';
export function Pomin({
  appearance = defaultAppearance,
  className = '',
  label = 'Um pequeno Pomin',
  sleeping = false,
}: {
  appearance?: Appearance;
  className?: string;
  label?: string;
  sleeping?: boolean;
}) {
  const a = appearance;
  return (
    <svg viewBox="0 0 260 300" role="img" aria-label={label} className={className}>
      <ellipse cx="130" cy="270" rx="70" ry="12" fill="#655444" opacity=".09" />
      <path
        d="M86 184 Q62 210 77 245 Q88 268 130 269 Q174 268 184 244 Q199 211 172 184"
        fill={a.outfit}
      />
      <path
        d="M96 208 Q130 228 167 208 M86 237 Q125 250 177 236"
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        opacity=".35"
      />
      <ellipse cx="82" cy="212" rx="14" ry="11" fill={a.skin} />
      <ellipse cx="178" cy="212" rx="14" ry="11" fill={a.skin} />
      {a.species === 'alien' && (
        <>
          <path
            d="M96 85 Q70 39 79 30 M165 85 Q193 43 182 30"
            fill="none"
            stroke={a.skin}
            strokeWidth="8"
            strokeLinecap="round"
            opacity={a.antennas ? 1 : 0}
          />
          {a.antennas && (
            <>
              <circle cx="79" cy="29" r="10" fill={a.outfit} />
              <circle cx="182" cy="29" r="10" fill={a.outfit} />
            </>
          )}
        </>
      )}
      <ellipse cx="62" cy="141" rx={a.species === 'alien' ? 21 : 13} ry="18" fill={a.skin} />
      <ellipse cx="198" cy="141" rx={a.species === 'alien' ? 21 : 13} ry="18" fill={a.skin} />
      <path
        d="M62 132 Q60 70 130 68 Q200 70 198 132 L195 158 Q190 206 130 210 Q70 206 65 158Z"
        fill={a.skin}
      />
      {a.hair !== 'none' && (
        <g fill={a.hairColor}>
          {a.hair === 'tuft' && (
            <path d="M107 79 Q93 58 116 58 Q118 37 138 48 Q155 48 147 69 Q168 69 159 83 Q134 73 107 79Z" />
          )}
          {a.hair === 'swept' && (
            <path d="M65 120 Q58 62 119 60 Q188 49 198 112 Q165 84 151 88 Q138 119 94 118 Q111 103 115 91 Q92 94 65 120Z" />
          )}
          {a.hair === 'curly' && (
            <>
              {[75, 97, 119, 142, 165, 184].map((x, i) => (
                <circle key={x} cx={x} cy={i === 0 || i === 5 ? 101 : 78} r="21" />
              ))}
            </>
          )}
        </g>
      )}
      <g stroke={a.eyeColor} strokeWidth="5" strokeLinecap="round" fill="none">
        {sleeping || a.eyes === 'sleepy' ? (
          <>
            <path d="M91 145 Q102 155 113 145" />
            <path d="M147 145 Q158 155 169 145" />
          </>
        ) : (
          <>
            <ellipse
              cx="103"
              cy="143"
              rx={a.species === 'alien' ? 8 : 5}
              ry="9"
              fill={a.eyeColor}
              stroke="none"
            />
            <ellipse
              cx="157"
              cy="143"
              rx={a.species === 'alien' ? 8 : 5}
              ry="9"
              fill={a.eyeColor}
              stroke="none"
            />
            {a.eyes === 'sparkle' && (
              <g stroke="#fff" strokeWidth="2">
                <path d="M103 137v7m-3-3h6M157 137v7m-3-3h6" />
              </g>
            )}
          </>
        )}
      </g>
      <ellipse cx="87" cy="163" rx="13" ry="7" fill="#d78485" opacity=".38" />
      <ellipse cx="173" cy="163" rx="13" ry="7" fill="#d78485" opacity=".38" />
      <path d="M125 155q-5 7 3 7" fill="none" stroke="#865c50" strokeWidth="2" opacity=".45" />
      <path
        d="M120 178q10 10 20 0"
        fill="none"
        stroke="#80524b"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {a.marks && (
        <g fill={a.outfit}>
          <circle cx="79" cy="145" r="3" />
          <circle cx="182" cy="145" r="3" />
          <path d="m130 110 5 8-5 8-5-8Z" />
        </g>
      )}
      {a.accessory === 'bow' && (
        <g fill="#d78ca5">
          <path d="M157 85Q139 60 134 78Q136 94 157 88Q182 104 181 82Q177 66 157 85Z" />
          <circle cx="157" cy="85" r="5" fill="#b96582" />
        </g>
      )}
      {a.accessory === 'star' && (
        <path d="m174 91 4 8 9 1-7 7 2 9-8-4-8 4 2-9-7-7 9-1Z" fill="#f3d48d" />
      )}
      <path d="m127 232 3-6 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5Z" fill="#fff" opacity=".7" />
    </svg>
  );
}
