import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { CouponArtwork } from './couponPresentation';

const star = 'M0-9Q1-1 9 0Q1 1 0 9Q-1 1-9 0Q-1-1 0-9Z';
const twinkles = [[48, 140, .65], [97, 70, .38], [234, 92, .78], [296, 154, .5], [287, 320, .38]];

function noise(index: number, seed: number) {
  const value = Math.sin((index + 1) * 74.82 + seed * 38.91) * 43758.54;
  return value - Math.floor(value);
}

function Particles({ gold = false }: { gold?: boolean }) {
  return (
    <div className="gk-coupon-particles" data-palette={gold ? 'gold' : 'snow'}>
      {Array.from({ length: gold ? 30 : 72 }, (_, index) => {
        const pace = noise(index, 6);
        const duration = gold ? 7 + pace * 5 : (4.3 + pace * 4.5) / .75;
        const style = {
          '--gk-x': `${noise(index, 1) * 100}%`,
          '--gk-y': gold ? `${noise(index, 2) * 100}%` : '-10%',
          '--gk-rest-y': `${noise(index, 2) * 100}%`,
          '--gk-size': `${1.5 + noise(index, 3) * 3.8}px`,
          '--gk-drift': `${(noise(index, 4) - .43) * 74}px`,
          '--gk-delay': `${-noise(index, 5) * duration}s`,
          '--gk-duration': `${duration}s`,
          '--gk-opacity': (.42 + noise(index, 7) * .53).toFixed(2),
        } as CSSProperties;
        return <i key={index} style={style} data-shape={gold && index % 3 === 0 ? 'spark' : 'dot'}
          data-soft={!gold && index % 7 === 0 ? 'true' : undefined} />;
      })}
    </div>
  );
}

function Gift({ id, wrap, lid, transform }: { id: string; wrap: string; lid: string; transform: string }) {
  return (
    <g transform={transform}>
      <defs>
        <linearGradient id={`${id}-wrap`} x2=".95" y2="1">
          <stop stopColor={wrap} /><stop offset="1" stopColor="#110d1d" stopOpacity=".9" />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x2="1" y2=".5">
          <stop stopColor="#a96328" /><stop offset=".38" stopColor="#f4cc7e" />
          <stop offset=".58" stopColor="#ffe9b7" /><stop offset="1" stopColor="#b27432" />
        </linearGradient>
      </defs>
      <path d="M0 35 89 53v85L0 119Z" fill={`url(#${id}-wrap)`} />
      <path d="m89 53 43-25v82l-43 28Z" fill={wrap} />
      <path d="m89 53 43-25v82l-43 28Z" fill="#141020" opacity=".42" />
      <path d="m0 38 89 18 43-25v11L89 67 0 50Z" fill="#080d19" opacity=".22" />
      <path d="m-4 29 49-26 91 20-46 28Z" fill={lid} />
      <path d="m-4 29 94 22v14L-4 43Z" fill={wrap} />
      <path d="m90 51 46-28v14L90 65Z" fill={lid} />
      <path d="m-3 29 93 21 45-27" fill="none" stroke="#fff0d3" strokeOpacity=".58" />
      <path d="m34 38 16 4v87l-16-4ZM107 41l13-8v85l-13 8Z" fill={`url(#${id}-ribbon)`} />
      <path d="m2 26 16-9 101 16-12 8ZM34 38 82 11l17 4-49 27Z" fill={`url(#${id}-ribbon)`} />
      <path d="M72 24C49 28 28 19 34 6c5-11 23-8 39 15 8-22 28-33 36-22 10 13-16 26-36 27Z" fill={`url(#${id}-ribbon)`} />
      <path d="M68 21C52 20 43 15 45 9c1-4 12-1 23 12Zm10-1c11-14 20-18 22-13 2 4-8 10-22 13Z" fill="#793f22" opacity=".67" />
      <path d="M69 22c-8 10-20 15-30 16l10 5-5 5c15-7 23-14 30-21 6 10 13 15 26 17l-5-6 9-3c-11 0-20-5-27-14Z" fill={`url(#${id}-ribbon)`} />
      <ellipse cx="74" cy="23" rx="8" ry="5" fill="#f6d28c" transform="rotate(-12 74 23)" />
    </g>
  );
}

function Christmas({ id }: { id: string }) {
  return (
    <>
      <svg className="gk-coupon-artwork" viewBox="0 0 350 400" aria-hidden="true">
        <defs>
          <radialGradient id={`${id}-snowbank`}>
            <stop stopColor="#b7c7f6" stopOpacity=".34" /><stop offset="1" stopColor="#bbcfff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="170" cy="338" rx="156" ry="32" fill={`url(#${id}-snowbank)`} />
        <path d="M32 362c55-26 135-13 194-28 29-7 63-9 111-3M71 357c19-3 40-4 57-4m102-12c26-7 51-12 81-12" fill="none" stroke="#b6c6eb" strokeOpacity=".22" />
        <g fill="#7590a8" opacity=".18">
          <path d="M30 131 5 198l17-6L0 223l23-8L0 256l34-11 29 11-19-37 15 4-22-33 15 5Zm277-41-28 70 14-3-24 39 21-6-29 48 46-13 41 13-24-43 17 5-24-39 13 2Z" />
          <path d="m62 149-19 52 13-5-17 31 18-6-19 31 26-8 25 8-17-30 14 4-20-31 14 5Z" />
        </g>
        {twinkles.map(([x, y, size], index) => (
          <g fill={index < 3 ? '#efcd89' : '#d9e9ff'} transform={`translate(${x} ${y}) scale(${size})`} key={x}>
            <path className="gk-coupon-twinkle" style={{ animationDelay: `${index * .19}s` }} d={star} />
          </g>
        ))}
        <ellipse cx="172" cy="331" rx="108" ry="19" fill="#04060e" opacity=".63" />
        <Gift id={`${id}-red`} wrap="#983a49" lid="#c66568" transform="translate(47 198) rotate(-9) scale(.96)" />
        <Gift id={`${id}-green`} wrap="#266650" lid="#5a9674" transform="translate(151 168) rotate(7) scale(1.16)" />
      </svg>
      <Particles />
    </>
  );
}

function BlackFriday({ id }: { id: string }) {
  return (
    <>
      <svg className="gk-coupon-artwork" viewBox="0 0 350 400" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-tag`} x2=".85" y2="1">
            <stop stopColor="#3f2c1d" /><stop offset=".42" stopColor="#211812" /><stop offset="1" stopColor="#0c0b0b" />
          </linearGradient>
          <linearGradient id={`${id}-foil`} x2="1" y2="1">
            <stop stopColor="#87521c" /><stop offset=".35" stopColor="#ffe1a3" />
            <stop offset=".68" stopColor="#cb8d41" /><stop offset="1" stopColor="#f7d08c" />
          </linearGradient>
        </defs>
        <ellipse cx="166" cy="310" rx="121" ry="17" fill="#050402" opacity=".59" />
        <path d="M-12 309c76-22 99-93 180-158 67-55 114-69 187-80m-364 258c97-24 118-86 204-164 49-43 111-65 167-73" fill="none" stroke="#dea65f" strokeOpacity=".18" />
        <g transform="rotate(13 175 198)">
          <path d="M77 131h163l49 46v46l-49 46H77q-10 0-10-10V141q0-10 10-10Z"
            fill="#2d1d12" stroke="#b98247" strokeOpacity=".6" />
        </g>
        <g transform="rotate(-15 175 198)">
          <path d="M64 128h173l54 48v41l-54 49H64q-10 0-10-10V138q0-10 10-10Z"
            transform="translate(0 5)" fill="#382512" />
          <path d="M64 128h173l54 48v41l-54 49H64q-10 0-10-10V138q0-10 10-10Z"
            fill={`url(#${id}-tag)`} stroke={`url(#${id}-foil)`} strokeWidth="1.45" />
          <path d="M69 139h164l46 42v32l-46 42H69q-4 0-4-4V143q0-4 4-4Z"
            fill="none" stroke="#eac180" strokeOpacity=".27" />
          <circle cx="265" cy="196" r="9" fill="#140e0a" stroke="#b98142" strokeWidth="1.5" />
          <text x="151" y="214" textAnchor="middle" fill={`url(#${id}-foil)`} fontFamily="system-ui, sans-serif" fontSize="57" fontWeight="800" letterSpacing="-.8">SALE</text>
          <path d="M111 230h78m-52 7h26" stroke="#ebba72" strokeOpacity=".36" strokeLinecap="round" />
          <path d="M265 195c22-11 51-36 49-64-2-17-20-19-27-5s13 39 34 37" fill="none" stroke="#ce965b" strokeWidth="2" strokeLinecap="round" />
          <g transform="translate(233 137) scale(.7)"><path className="gk-coupon-twinkle" d={star} fill="#ffcf82" /></g>
        </g>
      </svg>
      <Particles gold />
    </>
  );
}

function Firework({ x, y, launchX, radius, color, delay, seed }: {
  x: number; y: number; launchX: number; radius: number; color: string; delay: number; seed: number;
}) {
  return (
    <g stroke={color} fill={color} style={{ '--gk-delay': `${delay}s` } as CSSProperties}>
      <path className="gk-coupon-rocket" d={`M${launchX} 350 Q${launchX} ${(350 + y) / 2} ${x} ${y}`}
        pathLength="100" fill="none" strokeWidth="1.4" strokeLinecap="round" />
      <g transform={`translate(${x} ${y})`}>
        <g className="gk-coupon-burst">
          {Array.from({ length: 24 }, (_, index) => {
            const angle = (index / 24) * Math.PI * 2 + noise(index, seed) * .12;
            const reach = radius * (.64 + noise(index, seed + 1) * .36);
            const dx = Math.cos(angle) * reach;
            const dy = Math.sin(angle) * reach;
            return (
              <g key={index} opacity={.53 + noise(index, seed + 2) * .44}>
                <path d={`M${dx * .27} ${dy * .27}Q${dx * .7} ${dy * .61 - 3} ${dx} ${dy + 4}`} fill="none" strokeWidth=".95" strokeLinecap="round" />
                {index % 3 !== 0 && <circle cx={dx * 1.13} cy={dy * 1.13 + 7} r=".95" stroke="none" />}
              </g>
            );
          })}
          <circle r="2.8" fill="#fff4e8" />
        </g>
      </g>
    </g>
  );
}

function NewYear() {
  return (
    <svg className="gk-coupon-artwork" viewBox="0 0 350 400" aria-hidden="true">
      <g fill="#aaa4df" opacity=".5">
        {Array.from({ length: 32 }, (_, index) => <circle key={index} cx={14 + noise(index, 9) * 320} cy={21 + noise(index, 10) * 270} r={.4 + noise(index, 11) * .85} />)}
      </g>
      <Firework x={204} y={114} launchX={136} radius={91} color="#ffda9c" delay={-.75} seed={12} />
      <Firework x={74} y={173} launchX={93} radius={59} color="#bcc8ff" delay={-2.9} seed={13} />
      <Firework x={278} y={232} launchX={235} radius={47} color="#f8b4c6" delay={-5.05} seed={14} />
      <path d="M0 353h14v-20h15v9h9v-35h18v28h22v-18h11v-27h9v27h11v39h16v-19h14v-7h14v18h15v-37h20v20h13v-10h16v24h15v-35h8v-28h5v28h10v43h16v-20h13v11h12v-28h23v28h20v-14h11v70H0Z" fill="#090b1f" />
      <path d="M53 327h2m45 19h3m1-14h2m74-12h2m7 31h2m45-20h2m69-6h2M12 370h79m36 3h49m61 11h78" stroke="#deb192" strokeWidth="1.25" strokeOpacity=".54" />
    </svg>
  );
}

export function CouponBannerArtwork({ artwork }: { artwork: CouponArtwork }) {
  const id = useId();
  if (artwork === 'default') return null;

  return (
    <div className="gk-coupon-scene" aria-hidden="true">
      {artwork === 'christmas' ? <Christmas id={id} />
        : artwork === 'black-friday' ? <BlackFriday id={id} />
        : artwork === 'new-year' ? <NewYear />
        : artwork === 'cyber-monday' ? (
          <svg className="gk-coupon-artwork" viewBox="0 0 350 400" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="1.4">
              <path opacity=".4" d="M0 114h57l62 62M0 150h46l72 72m232-134h-48l-68 68m116 103h-60l-55-55M350 291h-49l-58-58H110L42 301H0" />
              <path d="M129 145h82l21 21v70l-21 21h-82l-21-21v-70Z" fill="#091f30" />
              <path d="M150 173h42l13 13v32l-13 13h-42l-13-13v-32Z" opacity=".55" />
              <path d="m166 182-14 24h16v15l20-26h-17l7-13Z" fill="currentColor" stroke="none" />
              <circle cx="57" cy="114" r="4" /><circle cx="302" cy="88" r="4" /><circle cx="290" cy="259" r="4" />
            </g>
          </svg>
        ) : (
          <svg className="gk-coupon-artwork" viewBox="0 0 350 400" aria-hidden="true">
            <defs>
              <linearGradient id={`${id}-sun`} x2="0" y2="1"><stop stopColor="#ffda8d" /><stop offset="1" stopColor="#e98271" /></linearGradient>
            </defs>
            <circle cx="173" cy="196" r="67" fill={`url(#${id}-sun)`} />
            <path d="M-5 270q76-28 158-35t204-54v240H-5Z" fill="#2a3653" />
            <path d="M0 316q93-72 183-53t175-25v163H0Z" fill="#1c263b" />
            <path d="M-7 350q85-79 176-68t190-19M0 373q94-62 172-67t176-27" fill="none" stroke="#f2ae8a" strokeWidth="1.1" opacity=".54" />
          </svg>
        )}
    </div>
  );
}
