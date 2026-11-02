// gen-r6-cfg.mjs - regenerate contrast/cfg-r6.json (the round-6 colour question set).
// The config is generated rather than hand-written so the pairs stay re-runnable after a token
// changes, and so the *banned* pairs stay in the table as explicit red lines.
import { writeFile } from 'node:fs/promises';
const tokens = {
  paper:'oklch(98.5% 0.006 85)', panel:'oklch(97% 0.008 85)', tint:'oklch(95% 0.03 152)',
  paperDeep:'oklch(94.7% 0.008 85)', ink:'oklch(32% 0.045 152)', ink2:'oklch(45% 0.035 152)',
  ink3:'oklch(52% 0.028 152)', rule:'oklch(65.5% 0.03 152)', goldInk:'oklch(55% 0.12 62)',
  goldDark:'oklch(76% 0.06 84)', bandText:'oklch(93% 0.008 152)', bandPanel:'oklch(28.5% 0.012 152)',
  p1:'oklch(50% 0.11 205)', p2:'oklch(47% 0.15 315)', p3:'oklch(50% 0.14 35)', p4:'oklch(50% 0.10 105)',
  p1t:'oklch(95% 0.03 205)', p2t:'oklch(95% 0.03 315)', p3t:'oklch(95% 0.03 35)', p4t:'oklch(95% 0.03 105)',
  bp1:'oklch(70% 0.11 205)', bp2:'oklch(72% 0.15 315)', bp3:'oklch(71% 0.14 35)', bp4:'oklch(69% 0.10 105)',
  recessCyan:'oklch(22% 0.05 205)', hoverInk:'oklch(40% 0.055 152)', chipTrack:'oklch(89.5% 0.008 152)',
  greyBorder:'rgba(128,128,128,0.35)'
};
const T=(name,fg,bg,bar=4.5)=>({kind:'text',name,fg,bg,bar});
const K=(name,fg,bg)=>({kind:'keyline',name,fg,bg,bar:3});
const L=(name,fill,ground,bar=1.35)=>({kind:'layer',name,fill,ground,bar});
const O=(name,top,onto,label,bar=4.5)=>({kind:'over',name,top,onto,label,bar});
const pairs=[
  T('ink body text on paper','@ink','@paper'), T('ink-2 secondary on paper','@ink2','@paper'),
  T('ink-3 muted on paper','@ink3','@paper'), K('rule hairline on paper','@rule','@paper'),
  T('gold-ink as text on paper','@goldInk','@paper'), K('gold-ink as keyline on paper','@goldInk','@paper'),
  T('gold-ink on panel (hover target)','@goldInk','@panel'),
  T('GOLD ON TINT (the banned pair)','@goldInk','@tint'),
  T('ink on tint (what a tint fill carries)','@ink','@tint'), T('ink-2 on tint chip','@ink2','@tint'),
  T('gold-ink on panel deepened to a layer','@goldInk','@paperDeep'),
  K('rule on that deepened panel','@rule','@paperDeep'), K('rule on panel','@rule','@panel'),
  T('primary: band-text on ink','@bandText','@ink'), T('primary hover: band-text on ink(40%)','@bandText','@hoverInk'),
  T('secondary: ink on paper','@ink','@paper'), K('secondary keyline: rule on paper','@rule','@paper'),
  T('secondary hover: ink on tint','@ink','@tint'), T('quiet: gold-ink on paper','@goldInk','@paper'),
  K('quiet keyline: gold-ink on paper','@goldInk','@paper'), T('chip label: ink-2 on chip track','@ink2','@chipTrack'),
  T('path cyan on paper','@p1','@paper'), T('path plum on paper','@p2','@paper'),
  T('path coral on paper','@p3','@paper'), T('path olive on paper','@p4','@paper'),
  T('path cyan label on its chip','@p1','@p1t'), T('path plum label on its chip','@p2','@p2t'),
  T('path coral label on its chip','@p3','@p3t'), T('path olive label on its chip','@p4','@p4t'),
  T('band text on band','@bandText','@ink'), T('gold numerals on band','@goldDark','@ink'),
  K('SAME rule token as a band hairline','@rule','@ink'),
  T('band text on band panel (recess)','@bandText','@bandPanel'), K('rule on band panel','@rule','@bandPanel'),
  T('band path cyan on band','@bp1','@ink'), T('band path plum on band','@bp2','@ink'),
  T('band path coral on band','@bp3','@ink'), T('band path olive on band','@bp4','@ink'),
  T('band path cyan on cyan recess','@bp1','@recessCyan'),
  T('ink-3 muted on band (expect FAIL)','@ink3','@ink',4.5),
  T('rule as text on band (expect FAIL at 4.5)','@rule','@ink',4.5),
  T('gold label on a tint fill (a gold secondary hover)','@goldInk','@tint'),
  T('FIX: band secondary ink on tint','@ink','@tint'),
  O('grey border rgba(128,128,128,.35) over paper','@greyBorder','@paper','@ink2',3),
  O('gold-ink label over that grey edge','@greyBorder','@paper','@goldInk'),
  L('panel vs paper','@panel','@paper'), L('band panel vs band','@bandPanel','@ink'),
  L('cyan recess vs band','@recessCyan','@ink'), L('paper card on band','@paper','@ink'),
  L('tint chip on paper','@tint','@paper'), L('chip track vs paper','@chipTrack','@paper'),
  L('primary hover vs primary','@hoverInk','@ink'), L('path chip vs paper','@p1t','@paper'),
  L('deepened panel vs paper (the trap)','@paperDeep','@paper')
];
const solves=[
  {label:'band path cyan',C:0.11,H:205,against:'@ink',target:4.5,near:68},
  {label:'band path plum',C:0.15,H:315,against:'@ink',target:4.5,near:71},
  {label:'band path coral',C:0.14,H:35,against:'@ink',target:4.5,near:71},
  {label:'band path olive',C:0.10,H:105,against:'@ink',target:4.5,near:69},
  {label:'rule on paper',C:0.03,H:152,against:'@paper',target:3.0,near:65.5},
  {label:'rule on band (same token)',C:0.03,H:152,against:'@ink',target:3.0,near:65.5},
  {label:'gold-ink on paper',C:0.12,H:62,against:'@paper',target:4.5,near:55},
  {label:'gold-ink on panel',C:0.12,H:62,against:'@panel',target:4.5,near:55},
  {label:'gold-ink on tint',C:0.12,H:62,against:'@tint',target:4.5,near:55},
  {label:'gold-ink on deepened panel',C:0.12,H:62,against:'@paperDeep',target:4.5,near:55},
  {label:'rule on deepened panel',C:0.03,H:152,against:'@paperDeep',target:3.0,near:65.5},
  {label:'band recess fill (darker)',C:0.012,H:152,against:'@ink',target:1.35,near:28.5,darker:true},
  {label:'ink on paper (keep 11.9?)',C:0.045,H:152,against:'@paper',target:11.5,near:32},
  {label:'primary hover ink',C:0.055,H:152,against:'@bandText',target:4.5,near:40}
];
await writeFile(new URL('./cfg-r6.json', import.meta.url), JSON.stringify({ page:'blank', width:600, tokens, pairs, solves }, null, 1));
console.log(`cfg-r6.json: ${pairs.length} pairs, ${solves.length} solves`);
