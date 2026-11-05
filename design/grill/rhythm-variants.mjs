#!/usr/bin/env node
// design/grill/rhythm-variants.mjs — the R6 options, in one place.
//
// Both instruments read this: `design/rhythm.mjs` prices each option in a table, and `design/round15.mjs`
// measures and photographs the same page under the same stylesheet. Two copies of the css is how a specimen
// ends up arguing for an option the gate never measured (the D160 failure this repo already paid for once with
// a crop recipe).
//
// Why these selectors. The band's own `aria-label` is the stable handle: its class list carries Tailwind
// utilities that change with any spacing ruling, and the `data-astro-cid-*` attribute appears or disappears
// depending on whether the component has a <style> block — that is exactly what silently voided a render-gate
// planting (D192). An option aimed at a class name is an option that stops testing the thing it names.
//
// Why `!important`: these have to beat Tailwind utilities (`md:mt-32`, `py-16`) from one injected style, and an
// override that loses silently measures the shipped page (round15 throws when a mutation changes nothing).

export const BAND = 'section[aria-label="Plates from public-domain mathematics books"]';
export const SCHED = 'section[aria-labelledby="when-we-meet"]';

export const VARIANTS = [

  {
    label: 'edges',
    what: 'declared edges only: hero margins 128/96 -> 64/64, every band py-16 (64) -> 48',
    css: `main { margin-top: 64px !important; margin-bottom: 64px !important; }
section.bg-panel, section.bg-paper { padding-top: 48px !important; padding-bottom: 48px !important; }`,
  },
  {
    label: 'edges-rules',
    what: 'the same trims, with a 1px rule at each band boundary instead of the lost air',
    css: `main { margin-top: 64px !important; margin-bottom: 64px !important; }
section.bg-panel, section.bg-paper { padding-top: 48px !important; padding-bottom: 48px !important;
  border-top: 1px solid var(--color-rule) !important; }`,
  },
  {
    label: 'rows',
    what: 'inside surfaces only: reasons grid mt-8/gap-x-12/li.py-3 -> 24/32/py-2, schedule space-y-6/li.py-3 -> 16/py-2, section mt-12 -> 24',
    css: `${SCHED} > div > div.mt-12 { margin-top: 24px !important; }
${SCHED} ul { row-gap: 16px !important; }
${SCHED} ul > * { margin-top: 0 !important; }
${SCHED} ul > li { padding-top: 8px !important; padding-bottom: 8px !important; }
section.bg-panel ul { margin-top: 24px !important; column-gap: 32px !important; }
section.bg-panel ul > li { padding-top: 8px !important; padding-bottom: 8px !important; }`,
  },
  {
    label: 'band-sm',
    what: 'the horizon shelf shows from 640px instead of 1024px (640/390/320 currently show no plates at all)',
    css: `@media (min-width: 640px) { ${BAND} { display: block !important; } }`,
  },
  {
    label: 'band-up',
    what: 'same shelf, same size, moved up: it sits under the hero instead of between the reasons and the schedule, where the measured emptiness is (160px + 196px at 1240)',
    css: `body { display: flex !important; flex-direction: column !important; }
${BAND} { order: -1; }`,
  },
  {
    label: 'band-any',
    what: 'the shelf shows at every width, wrapping so a phone gets plates wider than 140px',
    css: `${BAND} { display: block !important; }
@media (max-width: 767px) {
  .horizon { flex-wrap: wrap !important; }
  .horizon__plate { flex: 1 1 45% !important; min-width: 140px !important; }
}`,
  },
  {
    label: 'band-bleed',
    what: 'the shelf keeps its height but spans the viewport instead of the 1280px container — only visible above 1280, which is why 1440 is in the width set',
    css: `${BAND} > div { max-width: none !important; padding-left: 24px !important; padding-right: 24px !important; }`,
  },
  {
    label: 'all',
    what: 'edges + rows + band-sm together, to see the ceiling of the code-only option',
    css: `main { margin-top: 64px !important; margin-bottom: 64px !important; }
section.bg-panel, section.bg-paper { padding-top: 48px !important; padding-bottom: 48px !important; }
${SCHED} > div > div.mt-12 { margin-top: 24px !important; }
${SCHED} ul { row-gap: 16px !important; }
${SCHED} ul > * { margin-top: 0 !important; }
${SCHED} ul > li { padding-top: 8px !important; padding-bottom: 8px !important; }
section.bg-panel ul { margin-top: 24px !important; column-gap: 32px !important; }
section.bg-panel ul > li { padding-top: 8px !important; padding-bottom: 8px !important; }
@media (min-width: 640px) { ${BAND} { display: block !important; } }`,
  },
];
