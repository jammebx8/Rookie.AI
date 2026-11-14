'use client';
import React from 'react';

/* Question-paper sheets + floating formulas from the original landing page.
   Content and placement are carried over as-is; they now breathe (slow float)
   and stay static. Colours: landing.css vars. */

type Q = { n: string; marks: string; text: string; math?: string; opts?: string[] };
type Paper = {
  id: string; w: number; rotate: string; o: number; keep: boolean; depth: number;
  top?: string; right?: string; bottom?: string; left?: string;
  header: string; section: string; questions: Q[];
};

const HERO_PAPERS: Paper[] = [
  { id: 'p1', w: 300, top: '-10px', right: '2%', rotate: '1.2deg', o: 0.78, keep: true, depth: 14,
    header: 'JEE Advanced 2023 — Paper 2', section: 'Section 2 (One or more correct)',
    questions: [
      { n: '1.', marks: '[4, –2]', text: 'Let α, β (α < β) be roots of x⁴ – (k+3)x + 8 = 0 with 1/α + 1/β = 3/2. The admissible values of k are', math: 'x⁴ – (k + 3)x + 8 = 0', opts: ['(A) 2', '(B) 6', '(C) 5', '(D) 4'] },
      { n: '2.', marks: '[4]', text: 'An ideal gas expands isothermally from P to 1 atm in n discrete steps. Work done is', math: 'W = –nRT Σᵢ 1/(P + 1 – i)' },
    ] },
  { id: 'p2', w: 272, top: '34px', right: '25%', rotate: '-1.8deg', o: 0.64, keep: false, depth: 8,
    header: 'JEE Advanced 2022 — Physics', section: 'Section A',
    questions: [
      { n: '3.', marks: '[3]', text: 'Fermi level of an n-type semiconductor at temperature T is given by', math: 'E_f = E_c – kT ln(N_c / N_d)' },
      { n: '4.', marks: '[3]', text: 'The V–I characteristic of a p–n junction diode is best explained by', opts: ['(a) Forward bias', '(b) Reverse bias', '(c) Zener breakdown', '(d) Avalanche'] },
    ] },
  { id: 'p3', w: 288, bottom: '8px', right: '2%', rotate: '0.8deg', o: 0.62, keep: true, depth: 12,
    header: 'JEE Main 2024 — Mathematics', section: 'Section B — Integer type',
    questions: [
      { n: '5.', marks: '[4]', text: 'The area bounded by y = |sin x| and the x-axis on [0, 2π] equals', math: 'A = ∫₀^{2π} |sin x| dx = 4' },
      { n: '6.', marks: '[4]', text: 'If ∇²ψ = 0 everywhere inside a region, the flux through any closed surface in it is', math: '∮ ∇ψ · dS = 0', opts: ['(a) 0', '(b) 1', '(c) ∞', '(d) –1'] },
    ] },
  { id: 'p4', w: 258, bottom: '-6px', right: '22%', rotate: '-1.2deg', o: 0.52, keep: false, depth: 6,
    header: 'JEE Advanced 2021 — Physics', section: 'Paragraph type',
    questions: [
      { n: '7.', marks: '[3]', text: 'For Newton’s rings, the diameter of the n-th dark ring satisfies', math: 'D²ₙ = 4nλR' },
      { n: '8.', marks: '[3]', text: 'Acceptance angle of an optical fibre with n₁ = 1.75, n₂ = 1.70 is', math: 'θₐ = sin⁻¹ √(n₁² – n₂²)' },
    ] },
  { id: 'p5', w: 248, top: '54%', right: '0%', rotate: '2deg', o: 0.46, keep: false, depth: 10,
    header: 'JEE Main 2025 — Physics', section: 'Section A',
    questions: [
      { n: '9.', marks: '[4]', text: 'The continuity equation for current density in a conducting medium reads', math: '∂ρ/∂t + ∇·J = 0' },
      { n: '10.', marks: '[4]', text: 'The Hall coefficient of a semiconductor of carrier density n is', math: 'R_H = 1/(nq)' },
    ] },
  { id: 'p6', w: 262, top: '9%', right: '14%', rotate: '-0.6deg', o: 0.44, keep: false, depth: 5,
    header: 'JEE Main 2023 — Chemistry', section: 'Section A',
    questions: [
      { n: '11.', marks: '[4]', text: 'Work done in a reversible isothermal expansion of an ideal gas is', math: 'W = –nRT ln(V₂ / V₁)' },
      { n: '12.', marks: '[4]', text: 'For N₂ + 3H₂ ⇌ 2NH₃, the relation between K_p and K_c is', math: 'K_p = K_c (RT)⁻²' },
    ] },
];

/* Closing CTA: two sheets framing the headline, one each side. */
const CLOSE_PAPERS: Paper[] = [
  { ...HERO_PAPERS[0], id: 'c1', top: '14%', right: undefined, left: '3%', rotate: '-3deg', o: 0.6, keep: true },
  { ...HERO_PAPERS[2], id: 'c2', top: undefined, bottom: '10%', right: '3%', rotate: '2.4deg', o: 0.56, keep: true },
  { ...HERO_PAPERS[5], id: 'c3', top: '-30px', right: '20%', rotate: '1.2deg', o: 0.34, keep: false },
];

/* Hero shows at most 3 sheets behind the sign-up card; more was distracting.
   p4–p6 stay defined because the closing section reuses them. */
const HERO_SET = HERO_PAPERS.filter(p => ['p1', 'p2', 'p3'].includes(p.id));

type F = { expr: string; sz: number; rot: string; keep: boolean; top?: string; bottom?: string; right?: string; left?: string };
const HERO_FLOATS: F[] = [
  { expr: 'iħ ∂ψ/∂t = Ĥψ',              top: '11%',    right: '50%', sz: 15, rot: '-3deg',   keep: true  },
  { expr: '∮ B·dl = μ₀I + μ₀ε₀ dΦ_E/dt', top: '32%',    right: '46%', sz: 12, rot: '2.2deg',  keep: false },
  { expr: '∫ e^{–x²} dx = √π',            bottom: '30%', right: '49%', sz: 13, rot: '-1.6deg', keep: true  },
  { expr: '∇²ψ + k²ψ = 0',                top: '61%',    right: '42%', sz: 12, rot: '2.6deg',  keep: false },
  { expr: 'd/dt (∂L/∂q̇) – ∂L/∂q = 0',    top: '6%',     right: '40%', sz: 12, rot: '-2deg',   keep: false },
  { expr: 'dS ≥ δQ/T',                    bottom: '11%', right: '46%', sz: 12, rot: '1.4deg',  keep: true  },
  { expr: 'F = q(E + v × B)',             top: '79%',    right: '38%', sz: 11, rot: '-2deg',   keep: false },
  { expr: 'ζ(s) = Σ n⁻ˢ',                 top: '45%',    right: '55%', sz: 12, rot: '1.8deg',  keep: false },
  { expr: 'lim_{x→0} (sin x)/x = 1',      bottom: '46%', right: '36%', sz: 11, rot: '-1.2deg', keep: false },
];
const CLOSE_FLOATS: F[] = [
  { expr: '∫ e^{–x²} dx = √π', top: '18%', left: '30%', sz: 14, rot: '-2deg', keep: true },
  { expr: 'F = q(E + v × B)',  bottom: '20%', left: '24%', sz: 12, rot: '1.6deg', keep: false },
  { expr: 'dS ≥ δQ/T',         top: '24%', right: '28%', sz: 13, rot: '2deg', keep: true },
];

function Sheet({ p }: { p: Paper }) {
  return (
    <div
      className={`rk-ps${p.keep ? '' : ' rk-sm-hide'}`}
      style={{
        width: p.w, top: p.top, right: p.right, bottom: p.bottom, left: p.left,
        ['--rot' as string]: p.rotate, ['--o' as string]: p.o, ['--depth' as string]: p.depth,
      } as React.CSSProperties}
    >
      <div className="rk-ps-in">
        <div className="rk-ps-head">{p.header}</div>
        <div className="rk-ps-sec">{p.section}</div>
        {p.questions.map(q => (
          <div key={q.n} className="rk-ps-block">
            <div className="rk-ps-q"><span>{q.n} {q.text}</span><span className="rk-ps-marks">{q.marks}</span></div>
            {q.math && <div className="rk-ps-math">{q.math}</div>}
            {q.opts && <div className="rk-ps-opts">{q.opts.map(o => <span key={o}>{o}</span>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaperBackdrop({ set = 'hero' }: { set?: 'hero' | 'close' }) {
  const papers = set === 'hero' ? HERO_SET : CLOSE_PAPERS;
  const floats = set === 'hero' ? HERO_FLOATS : CLOSE_FLOATS;

  return (
    <div className={`rk-papers rk-papers-${set}`} aria-hidden="true">
      {papers.map(p => <Sheet key={p.id} p={p} />)}
      {floats.map(m => (
        <span key={m.expr}
          className={`rk-mf${m.keep ? '' : ' rk-sm-hide'}`}
          style={{ top: m.top, bottom: m.bottom, right: m.right, left: m.left, fontSize: m.sz,
            ['--rot' as string]: m.rot } as React.CSSProperties}
        >{m.expr}</span>
      ))}
    </div>
  );
}
