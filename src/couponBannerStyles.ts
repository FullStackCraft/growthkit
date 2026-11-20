export const couponBannerStyles = `
.gk-coupon-dialog {
  --gk-surface:#fbfcff; --gk-ink:#131924; --gk-muted:#505e71; --gk-rule:#dbe1eb;
  --gk-tile:#f2f5fa; --gk-deep-accent:#854218; --gk-glow:#e2a24c3d;
  --gk-accent:#edb749; --gk-accent-soft:#ffe49a; --gk-button-end:#d79832; --gk-button-ink:#1d1205;
  --gk-outline:#4264d5; --gk-art-dark:#10182a; --gk-art-light:#344862; --gk-art-ink:#c3d6fc;
  box-sizing:border-box; position:fixed; inset:0; margin:auto; max-width:none;
  width:min(58rem,calc(100% - 2rem)); max-height:calc(100% - 2rem);
  overflow:auto; overscroll-behavior:contain; padding:0;
  border:1px solid var(--gk-rule); border-radius:23px; background:var(--gk-surface); color:var(--gk-ink);
  box-shadow:0 28px 100px #02051294; font:inherit; text-align:left;
}
.gk-coupon-dialog[data-appearance=dark] {
  --gk-surface:#0e131f; --gk-ink:#f8f9ff; --gk-muted:#a9b5c8; --gk-rule:#2e384a;
  --gk-tile:#161e2c; --gk-deep-accent:var(--gk-accent-soft); --gk-outline:var(--gk-accent-soft);
}
.gk-coupon-dialog[data-season=black-friday] {
  --gk-art-dark:#100c0b; --gk-art-light:#443022; --gk-art-ink:#efba70;
  --gk-accent:#efbb62; --gk-accent-soft:#ffe0a0; --gk-button-end:#d79537; --gk-glow:#e2a24c3d;
}
.gk-coupon-dialog[data-season=christmas] {
  --gk-art-dark:#0d1429; --gk-art-light:#2a4670; --gk-art-ink:#e0ecff;
}
.gk-coupon-dialog[data-season=new-year] {
  --gk-art-dark:#0b1026; --gk-art-light:#30264b; --gk-art-ink:#c2b3f2;
  --gk-accent:#a894ef; --gk-accent-soft:#ead8ff; --gk-button-end:#b3a0fa; --gk-button-ink:#1f1232;
  --gk-deep-accent:#6250a7; --gk-glow:#af95ef40;
}
.gk-coupon-dialog[data-season=cyber-monday] {
  --gk-art-dark:#071a29; --gk-art-light:#0e485e; --gk-art-ink:#7beced;
  --gk-accent:#67dfde; --gk-accent-soft:#b5faf6; --gk-button-end:#69d9eb; --gk-button-ink:#062d36;
  --gk-deep-accent:#17636e; --gk-glow:#69d9eb30;
}
.gk-coupon-dialog[data-season=labor-day] {
  --gk-art-dark:#172238; --gk-art-light:#634355; --gk-art-ink:#ffbf9f;
  --gk-accent:#f3a387; --gk-accent-soft:#ffdeaa; --gk-button-end:#f6ab94; --gk-button-ink:#3d1c19;
  --gk-deep-accent:#843c31; --gk-glow:#f6ab943a;
}
.gk-coupon-dialog[data-season=default] {
  --gk-accent:#91abff; --gk-accent-soft:#e0e8ff; --gk-button-end:#9aa8fa; --gk-button-ink:#142345;
  --gk-deep-accent:#404daa; --gk-glow:#778aff53;
}
.gk-coupon-dialog[data-appearance=dark] { --gk-deep-accent:var(--gk-accent-soft); }
.gk-coupon-dialog::backdrop { background:#030711bd; backdrop-filter:blur(4px); }
.gk-coupon-dialog *, .gk-coupon-dialog *::before, .gk-coupon-dialog *::after { box-sizing:border-box; }
.gk-coupon-layout { display:grid; grid-template-columns:minmax(0,.86fr) minmax(0,1.14fr); position:relative; }
.gk-coupon-art {
  position:relative; min-height:100%; overflow:hidden; isolation:isolate; color:var(--gk-art-ink);
  background:radial-gradient(ellipse at 52% 44%,var(--gk-art-light),transparent 75%),var(--gk-art-dark);
}
.gk-coupon-art::before {
  content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(circle,#b0b7db35 .6px,transparent 1.25px);
  background-size:22px 22px; mask-image:radial-gradient(ellipse at center,#000 10%,transparent 76%);
}
.gk-coupon-scene,.gk-coupon-artwork,.gk-coupon-art-image,.gk-coupon-particles {
  position:absolute; inset:0; width:100%; height:100%; pointer-events:none;
}
.gk-coupon-art-image { object-fit:cover; }
.gk-coupon-particles { overflow:hidden; color:#ecf4ff; }
.gk-coupon-particles[data-palette=snow] { container-type:size; }
.gk-coupon-particles[data-palette=gold] { color:#f2b960; }
.gk-coupon-particles i {
  position:absolute; left:var(--gk-x); top:var(--gk-y); width:var(--gk-size); height:var(--gk-size);
  border-radius:50%; background:currentColor; opacity:var(--gk-opacity);
  animation:gk-coupon-snow var(--gk-duration) linear var(--gk-delay) infinite;
}
.gk-coupon-particles i[data-soft=true] { filter:blur(.65px); }
.gk-coupon-particles[data-palette=gold] i {
  opacity:calc(var(--gk-opacity) * .72); box-shadow:0 0 9px currentColor;
  animation-name:gk-coupon-rise;
}
.gk-coupon-particles i[data-shape=spark] {
  width:calc(var(--gk-size) * 1.8); height:calc(var(--gk-size) * 1.8); border-radius:0;
  clip-path:polygon(50% 0,61% 39%,100% 50%,61% 61%,50% 100%,39% 61%,0 50%,39% 39%);
}
.gk-coupon-twinkle,.gk-coupon-burst { transform-box:fill-box; transform-origin:center; }
.gk-coupon-twinkle { animation:gk-coupon-twinkle 2.8s ease-in-out infinite; }
.gk-coupon-rocket,.gk-coupon-burst { animation-duration:6.4s; animation-delay:var(--gk-delay); animation-iteration-count:infinite; }
.gk-coupon-rocket { stroke-dasharray:12 112; animation-name:gk-coupon-launch; animation-timing-function:linear; }
.gk-coupon-burst {
  opacity:.85; filter:drop-shadow(0 0 3px #d9b8ff55);
  animation-name:gk-coupon-firework; animation-timing-function:cubic-bezier(.22,.61,.36,1);
}
@keyframes gk-coupon-snow {
  0% { opacity:0; transform:translate(0,0); }
  9%,88% { opacity:var(--gk-opacity); }
  100% {
    opacity:0; transform:translate(var(--gk-drift),36rem);
    transform:translate(var(--gk-drift),122cqh);
  }
}
@keyframes gk-coupon-rise {
  0% { opacity:0; transform:translate(0,47px); }
  22%,72% { opacity:var(--gk-opacity); }
  100% { opacity:0; transform:translate(var(--gk-drift),-60px); }
}
@keyframes gk-coupon-twinkle {
  0%,100% { opacity:.5; transform:scale(.8); }
  56% { opacity:1; transform:scale(1.13); }
}
@keyframes gk-coupon-firework {
  0%,22% { opacity:0; transform:scale(.08); }
  25% { opacity:1; }
  66%,100% { opacity:0; transform:scale(1.12); }
}
@keyframes gk-coupon-launch {
  0% { opacity:0; stroke-dashoffset:12; }
  7% { opacity:.82; }
  22% { opacity:.92; stroke-dashoffset:-92; }
  25%,100% { opacity:0; stroke-dashoffset:-100; }
}
.gk-coupon-content {
  position:relative; min-width:0; padding:2.5rem clamp(1.6rem,4vw,2.75rem) 2.25rem; overflow-wrap:anywhere;
}
.gk-coupon-close {
  position:absolute; right:.82rem; top:.82rem; z-index:2; display:grid; place-items:center;
  width:44px; height:44px; padding:0; border:1px solid var(--gk-rule); border-radius:50%;
  background:var(--gk-tile); color:var(--gk-ink); font:inherit; cursor:pointer;
}
.gk-coupon-close svg { width:16px; height:16px; }
.gk-coupon-close:hover {
  background:color-mix(in srgb,var(--gk-tile),var(--gk-ink) 7%);
  border-color:color-mix(in srgb,var(--gk-rule),var(--gk-ink) 24%);
}
.gk-coupon-copy:hover { border-color:var(--gk-deep-accent); }
.gk-coupon-header { margin:0 1.55rem .68rem 0; }
.gk-coupon-title {
  margin:0; color:color-mix(in srgb,var(--gk-ink) 82%,var(--gk-deep-accent));
  font-size:clamp(1.15rem,2.45vw,1.55rem); font-weight:660; letter-spacing:-.022em; line-height:1.2;
}
.gk-coupon-title:focus { outline:none; }
.gk-coupon-number { container-type:inline-size; margin:0; }
.gk-coupon-rate {
  display:flex; align-items:baseline; flex-wrap:wrap; gap:.1em .25em;
  color:var(--gk-ink); font-size:clamp(1.55rem,4vw,3.45rem); font-size:clamp(1.3rem,10.7cqi,3.45rem);
  font-weight:850; letter-spacing:-.04em; line-height:1.04; text-transform:uppercase;
  font-variant-numeric:tabular-nums;
}
.gk-coupon-amount { color:var(--gk-deep-accent); white-space:nowrap; }
.gk-coupon-scope {
  display:block; margin-top:.53rem; color:var(--gk-muted); font-size:clamp(.9rem,1.65vw,1.02rem);
  font-weight:530; line-height:1.4;
}
.gk-coupon-scope::first-letter { text-transform:uppercase; }
.gk-coupon-description { max-width:43ch; margin:.48rem 0 0; color:var(--gk-muted); font-size:.9rem; line-height:1.48; }
.gk-coupon-purchase {
  display:flex; flex-wrap:wrap; gap:.25rem .7rem; align-items:center; justify-content:space-between;
  border:1px solid var(--gk-rule); border-radius:10px; margin:.76rem 0 0; padding:.6rem .83rem;
  background:color-mix(in srgb,var(--gk-tile) 78%,transparent);
}
.gk-coupon-purchase-details { display:grid; gap:.1rem; min-width:0; }
.gk-coupon-purchase-title { font-size:.86rem; font-weight:680; }
.gk-coupon-price { display:flex; align-items:baseline; flex-wrap:wrap; gap:.18rem .48rem; font-variant-numeric:tabular-nums; }
.gk-coupon-price s { color:var(--gk-muted); font-size:.84rem; }
.gk-coupon-price strong { color:var(--gk-ink); font-size:1.12rem; letter-spacing:-.025em; }
.gk-coupon-purchase-terms { color:var(--gk-muted); font-size:.74rem; line-height:1.3; }
.gk-coupon-countdown { margin:1.12rem 0 1rem; }
.gk-coupon-countdown-heading { display:block; color:var(--gk-muted); margin:0 0 .43rem; font-size:.76rem; font-weight:700; }
.gk-coupon-countdown-cells { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.46rem; max-width:18rem; }
.gk-coupon-countdown-cell {
  display:grid; justify-items:center; min-width:0; padding:.46rem .24rem .43rem;
  border:1px solid var(--gk-rule); border-radius:9px;
  background:linear-gradient(180deg,color-mix(in srgb,var(--gk-tile),var(--gk-ink) 5%),var(--gk-tile)); line-height:1.08;
}
.gk-coupon-countdown-cell strong { font-size:1.46rem; font-weight:800; font-variant-numeric:tabular-nums; }
.gk-coupon-countdown-cell span { margin-top:.25rem; font-size:.63rem; color:var(--gk-muted); text-transform:uppercase; letter-spacing:.065em; }
.gk-coupon-countdown-cell[data-unit=sec] {
  border-color:color-mix(in srgb,var(--gk-rule),var(--gk-deep-accent) 48%);
  background:linear-gradient(180deg,color-mix(in srgb,var(--gk-tile),var(--gk-accent) 18%),var(--gk-tile));
}
.gk-coupon-countdown-cell[data-unit=sec] strong { color:var(--gk-deep-accent); }
.gk-coupon-code-row {
  display:flex; align-items:center; justify-content:space-between; gap:.45rem .8rem; margin:0 0 .83rem;
  background:color-mix(in srgb,var(--gk-tile) 62%,var(--gk-surface));
  border:1px dashed color-mix(in srgb,var(--gk-rule),var(--gk-deep-accent) 47%);
  border-radius:11px; padding:.4rem .48rem .4rem .86rem;
}
.gk-coupon-code { display:grid; min-width:0; gap:.12rem; }
.gk-coupon-code span { color:var(--gk-muted); font-size:.7rem; font-weight:680; }
.gk-coupon-code code { color:var(--gk-deep-accent); user-select:all; font:740 1.12rem/1.25 ui-monospace,monospace; letter-spacing:.1em; }
.gk-coupon-copy {
  display:inline-flex; align-items:center; justify-content:center; gap:.36rem; min-height:44px; padding:.34rem .63rem;
  border:1px solid var(--gk-rule); border-radius:7px; background:var(--gk-tile); color:var(--gk-ink);
  font:660 .8rem/1.1 system-ui,sans-serif; cursor:pointer;
}
.gk-coupon-copy svg { width:16px; height:16px; flex:none; }
.gk-coupon-action {
  display:flex; justify-content:center; align-items:center; gap:.7rem; min-height:52px;
  padding:.7rem .85rem; border-radius:10px; background:linear-gradient(115deg,var(--gk-accent-soft),var(--gk-button-end));
  box-shadow:0 8px 25px var(--gk-glow); color:var(--gk-button-ink);
  text-align:center; text-decoration:none; font-size:.96rem; font-weight:790; line-height:1.2;
}
.gk-coupon-action:hover { filter:brightness(1.04); color:var(--gk-button-ink); }
.gk-coupon-dialog :is(button,a):focus-visible { outline:2px solid var(--gk-outline); outline-offset:3px; }
.gk-coupon-status { color:var(--gk-muted); font-size:.76rem; }
.gk-coupon-status:not(:empty) { margin-top:.48rem; }
.gk-coupon-sr { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
.gk-coupon-dialog[data-layout=compact] { width:min(31rem,calc(100% - 2rem)); overflow-x:hidden; }
.gk-coupon-dialog[data-layout=compact] .gk-coupon-layout { grid-template-columns:minmax(0,1fr); }
.gk-coupon-dialog[data-layout=compact] .gk-coupon-content {
  --gk-gutter:clamp(1.6rem,4vw,2.5rem);
  padding-inline:var(--gk-gutter); border-top:3px solid var(--gk-accent);
  background:
    radial-gradient(ellipse at 66% -14%,var(--gk-glow),transparent 66%),
    linear-gradient(152deg,color-mix(in srgb,var(--gk-surface),var(--gk-accent) 8%),var(--gk-surface) 57%);
}
.gk-coupon-dialog[data-layout=compact] .gk-coupon-content::before {
  content:""; position:absolute; top:0; right:0; width:65%; height:12rem; pointer-events:none;
  background:repeating-linear-gradient(132deg,transparent 0 18px,color-mix(in srgb,var(--gk-accent) 26%,transparent) 19px 20px);
  mask-image:radial-gradient(ellipse at 86% 0%,#000,transparent 68%);
}
.gk-coupon-dialog[data-layout=compact] .gk-coupon-header { position:relative; }
.gk-coupon-dialog[data-layout=compact] .gk-coupon-deal {
  position:relative; margin:0 calc(-1 * var(--gk-gutter)); padding:.26rem var(--gk-gutter) 1.12rem;
  border-bottom:1px dashed color-mix(in srgb,var(--gk-rule),var(--gk-deep-accent) 38%);
}
.gk-coupon-dialog[data-layout=compact] .gk-coupon-deal::before,
.gk-coupon-dialog[data-layout=compact] .gk-coupon-deal::after {
  content:""; position:absolute; bottom:-8px; width:8px; height:15px;
  background:color-mix(in srgb,var(--gk-surface),var(--gk-ink) 32%);
  box-shadow:inset 0 0 0 1px var(--gk-rule); pointer-events:none;
}
.gk-coupon-dialog[data-layout=compact] .gk-coupon-deal::before { left:0; border-radius:0 8px 8px 0; }
.gk-coupon-dialog[data-layout=compact] .gk-coupon-deal::after { right:0; border-radius:8px 0 0 8px; }
@media(max-width:650px) {
  .gk-coupon-dialog,.gk-coupon-dialog[data-layout=compact] { width:min(27rem,calc(100% - 1.25rem)); max-height:calc(100% - 1.25rem); border-radius:18px; }
  .gk-coupon-layout { grid-template-columns:minmax(0,1fr); }
  .gk-coupon-art { height:clamp(8.25rem,38vw,11rem); min-height:0; }
  .gk-coupon-artwork { transform:scale(1.22); }
  .gk-coupon-content { padding:1.05rem 1.15rem 1.2rem; }
  .gk-coupon-dialog[data-layout=compact] .gk-coupon-content { --gk-gutter:1.15rem; padding-top:1.55rem; }
  .gk-coupon-description { font-size:.84rem; }
  .gk-coupon-countdown { margin:.88rem 0 .76rem; }
  .gk-coupon-code-row { margin-bottom:.63rem; }
}
@media(prefers-reduced-motion:reduce) {
  .gk-coupon-particles i,.gk-coupon-twinkle,.gk-coupon-burst,.gk-coupon-rocket { animation:none!important; }
  .gk-coupon-rocket { opacity:0; }
  .gk-coupon-particles[data-palette=snow] i { top:var(--gk-rest-y); }
}
`;
