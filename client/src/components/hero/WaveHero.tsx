import { useThemeStore } from '../../store/themeStore'

// Wave paths: each wave has two morph states (A and B).
// Paths use identical structure (M + 3 × C) so SMIL animate can interpolate.
const WAVES = [
  // W1 — bottommost, thick, slow
  {
    pathA: 'M -10 520 C 200 495 420 540 660 512 C 900 484 1140 530 1450 510',
    pathB: 'M -10 530 C 200 558 420 510 660 536 C 900 562 1140 520 1450 545',
    dur: 20, begin: 0, strokeW: 2.5, opacity: 0.45, grad: 'wg1',
  },
  // W2
  {
    pathA: 'M -10 455 C 220 430 440 468 680 445 C 920 422 1160 460 1450 440',
    pathB: 'M -10 465 C 220 490 440 448 680 470 C 920 492 1160 455 1450 472',
    dur: 17, begin: -3, strokeW: 2, opacity: 0.38, grad: 'wg1',
  },
  // W3
  {
    pathA: 'M -10 385 C 210 358 450 398 690 372 C 930 346 1170 388 1450 368',
    pathB: 'M -10 398 C 210 422 450 378 690 400 C 930 422 1170 398 1450 415',
    dur: 14, begin: -1.5, strokeW: 1.5, opacity: 0.30, grad: 'wg3',
  },
  // W4 — middle
  {
    pathA: 'M -10 310 C 240 278 480 328 720 295 C 960 262 1200 310 1450 285',
    pathB: 'M -10 325 C 240 355 480 308 720 335 C 960 362 1200 325 1450 352',
    dur: 11, begin: -4, strokeW: 2, opacity: 0.35, grad: 'wg2',
  },
  // W5
  {
    pathA: 'M -10 235 C 220 208 480 248 720 220 C 960 192 1200 232 1450 210',
    pathB: 'M -10 248 C 220 275 480 228 720 252 C 960 276 1200 248 1450 272',
    dur: 9, begin: -2, strokeW: 1.5, opacity: 0.28, grad: 'wg2',
  },
  // W6
  {
    pathA: 'M -10 158 C 240 132 480 168 720 142 C 960 116 1200 152 1450 128',
    pathB: 'M -10 172 C 240 198 480 152 720 175 C 960 198 1200 165 1450 188',
    dur: 7, begin: -0.8, strokeW: 1, opacity: 0.22, grad: 'wg3',
  },
  // W7 — topmost, thin, fast
  {
    pathA: 'M -10 80 C 220 56 460 90 700 64 C 940 38 1180 72 1450 50',
    pathB: 'M -10 94 C 220 120 460 78 700 102 C 940 126 1180 94 1450 118',
    dur: 5.5, begin: -3.2, strokeW: 0.8, opacity: 0.18, grad: 'wg2',
  },
]

interface Props {
  children: React.ReactNode
  tickerContent?: string
  minHeight?: string
}

export default function WaveHero({ children, tickerContent, minHeight = '520px' }: Props) {
  const { dark } = useThemeStore()

  // Wave gradient stop colours — picked per mode
  const c1 = dark ? '#5b7cff' : '#ec4899'
  const c2 = dark ? '#a855f7' : '#8b5cf6'
  const c3 = dark ? '#22d3ee' : '#38bdf8'

  const ticker = tickerContent ?? 'TopSeed  ·  Tournament Platform'

  return (
    <section
      className="relative overflow-hidden bg-tok-bg"
      style={{ minHeight }}
    >
      {/* ── Layer 1: colour blobs ────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Blob A — top-right, accent-1 */}
        <div
          className="absolute animate-blob1"
          style={{
            width: 620, height: 520,
            top: -100, right: -80,
            background: `radial-gradient(circle, var(--blob-1), transparent 70%)`,
            filter: 'blur(90px)',
            borderRadius: '50%',
          }}
        />
        {/* Blob B — left-center, accent-2 */}
        <div
          className="absolute animate-blob2"
          style={{
            width: 560, height: 560,
            top: '35%', left: -100,
            background: `radial-gradient(circle, var(--blob-2), transparent 70%)`,
            filter: 'blur(90px)',
            borderRadius: '50%',
          }}
        />
        {/* Blob C — bottom-right, accent-3 */}
        <div
          className="absolute animate-blob3"
          style={{
            width: 460, height: 400,
            bottom: 20, right: '12%',
            background: `radial-gradient(circle, var(--blob-3), transparent 70%)`,
            filter: 'blur(90px)',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* ── Layer 2: SVG wave lines ──────────────────── */}
      <svg
        viewBox="0 0 1440 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
          <linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={c2} />
            <stop offset="100%" stopColor={c3} />
          </linearGradient>
          <linearGradient id="wg3" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={c1} />
            <stop offset="100%" stopColor={c3} />
          </linearGradient>
        </defs>

        {WAVES.map((w, i) => (
          <path
            key={i}
            d={w.pathA}
            fill="none"
            stroke={`url(#${w.grad})`}
            strokeWidth={w.strokeW}
            opacity={w.opacity}
          >
            <animate
              attributeName="d"
              values={`${w.pathA};${w.pathB};${w.pathA}`}
              dur={`${w.dur}s`}
              begin={`${w.begin}s`}
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.45 0.05 0.55 0.95;0.45 0.05 0.55 0.95"
            />
          </path>
        ))}
      </svg>

      {/* ── Layer 3: film grain ──────────────────────── */}
      <div className="hero-grain absolute inset-0" aria-hidden="true" />

      {/* ── Foreground content ───────────────────────── */}
      <div className="relative z-10">
        {children}
      </div>

      {/* ── Ticker strip ─────────────────────────────── */}
      <div
        className="absolute bottom-0 inset-x-0 overflow-hidden border-t border-tok py-2"
        style={{ background: 'var(--surface)' }}
        aria-hidden="true"
      >
        <div className="animate-ticker inline-flex whitespace-nowrap">
          {/* Duplicate twice for seamless loop */}
          {[ticker, ticker].map((t, i) => (
            <span key={i} className="mono-label text-tok-muted px-10">
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
