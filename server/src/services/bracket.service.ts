/**
 * Generates single-elimination and double-elimination brackets.
 *
 * Seeding follows the standard tournament model: top seeds are spread so
 * that, if all favourites win, seed 1 and seed 2 only meet in the final.
 */

export interface BracketEntry {
  id: string
  seed: number | null
}

export interface GeneratedMatch {
  round: number
  matchNumber: number
  bracketSlot: string
  entry1Id: string | null   // null = BYE (auto-advance)
  entry2Id: string | null
  nextMatchId: string | null      // index into returned array
  nextMatchSlot: number | null    // 1 or 2
  loserNextMatchId: string | null // double-elim only
  loserNextMatchSlot: number | null
  isThirdPlace: boolean
}

function nextPow2(n: number): number {
  let p = 1
  while (p < n) p <<= 1
  return p
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Returns bracket positions for a bracket of size N following standard seeding rules:
 * - Seed 1 at top (position 1), Seed 2 at bottom (position N)
 * - Odd seeds (1,3,5,...) in top half, even seeds (2,4,6,...) in bottom half
 * - Seeds 3 & 1 meet in SF1, Seeds 4 & 2 meet in SF2 — never before
 * - Seeds 5-8 and 9-16 are randomly shuffled within their allocated half/quarter
 */
function bracketPositions(n: number): number[] {
  if (n <= 1) return [1]
  if (n === 2) return [1, 2]

  // Build deterministic base recursively:
  // top half  → odd positions  (2p-1): 1,3,5,7,...  — Seed 1 top, Seed 3 bottom of top half
  // bottom half → even positions: Seed 4 top of bottom half, Seed 2 at very bottom, 6,8,10,... fill rest
  const half = bracketPositions(n / 2)
  const topHalf = half.map(p => 2 * p - 1)
  const bottomHalf = half.map(p => p === 1 ? 4 : p === 2 ? 2 : 2 * p)
  const base = [...topHalf, ...bottomHalf]

  // Randomly shuffle seeds 5-16 within their allocated slots (1-4 positions stay fixed)
  const randomGroups = [
    [5, 7],            // top half — can swap freely with each other
    [6, 8],            // bottom half
    [9, 11, 13, 15],   // top half
    [10, 12, 14, 16],  // bottom half
  ]

  for (const group of randomGroups) {
    const slots = group.map(v => base.indexOf(v)).filter(s => s >= 0)
    if (slots.length < 2) continue
    const shuffled = shuffleArray(slots.map(s => base[s]))
    slots.forEach((slot, i) => { base[slot] = shuffled[i] })
  }

  return base
}

/**
 * Ensures BYEs go to the highest seeds first.
 * Mutates the positions array so that each of the top `numByes` seeds
 * (rank 1..numByes) faces a BYE (rank > n) in round 1.
 */
function assignByesToTopSeeds(positions: number[], n: number): void {
  const N = positions.length
  const numByes = N - n
  if (numByes === 0) return

  const playersToDisplace: number[] = []
  const freeByes: number[] = []

  for (let i = 0; i < N; i += 2) {
    const leftRank = positions[i]
    const rightRank = positions[i + 1]
    const leftIsTop = leftRank <= numByes
    const rightIsTop = rightRank <= numByes
    const leftIsBye = leftRank > n
    const rightIsBye = rightRank > n

    // Top seed paired with a real player — the real player needs to move
    if (leftIsTop && !rightIsBye) playersToDisplace.push(i + 1)
    if (rightIsTop && !leftIsBye) playersToDisplace.push(i)

    // BYE that is NOT adjacent to any top seed — available to give to a top seed
    if (!leftIsTop && !rightIsTop) {
      if (leftIsBye) freeByes.push(i)
      if (rightIsBye) freeByes.push(i + 1)
    }
  }

  for (let k = 0; k < playersToDisplace.length; k++) {
    const a = playersToDisplace[k]
    const b = freeByes[k]
    ;[positions[a], positions[b]] = [positions[b], positions[a]]
  }
}

export function generateSingleElimination(
  entries: BracketEntry[],
  includeThirdPlace = true
): GeneratedMatch[] {
  const n = entries.length
  if (n < 2) throw new Error('Need at least 2 entries')

  const N = nextPow2(n)
  const numRounds = Math.log2(N)

  // Sort: seeded entries first (ascending seed), unseeded randomly shuffled
  const seeded = entries.filter(e => e.seed !== null).sort((a, b) => a.seed! - b.seed!)
  const unseeded = shuffleArray(entries.filter(e => e.seed === null))
  const ordered = [...seeded, ...unseeded]

  // Map bracket positions to actual entry IDs (null = bye)
  const positions = bracketPositions(N)
  assignByesToTopSeeds(positions, n) // top seeds always face BYEs first
  const slotToEntry = (pos: number): string | null => {
    const idx = pos - 1
    return idx < n ? ordered[idx].id : null
  }

  const matches: GeneratedMatch[] = []
  let matchNumber = 0

  // ── Round 1 ──────────────────────────────────────────────────
  const r1Count = N / 2
  // When there's only 1 round (2 players), R1 IS the final — label it correctly
  const r1SlotPrefix = numRounds === 1 ? 'F' : 'R1'
  for (let i = 0; i < r1Count; i++) {
    const e1 = slotToEntry(positions[i * 2])
    const e2 = slotToEntry(positions[i * 2 + 1])
    matches.push({
      round: 1,
      matchNumber: ++matchNumber,
      bracketSlot: `${r1SlotPrefix} M${i + 1}`,
      entry1Id: e1,
      entry2Id: e2,
      nextMatchId: null,
      nextMatchSlot: null,
      loserNextMatchId: null,
      loserNextMatchSlot: null,
      isThirdPlace: false,
    })
  }

  // ── Subsequent rounds ─────────────────────────────────────────
  let prevRoundStart = 0
  let prevRoundCount = r1Count

  for (let round = 2; round <= numRounds; round++) {
    const roundCount = prevRoundCount / 2
    const slotName = roundSlotName(round, numRounds)
    for (let i = 0; i < roundCount; i++) {
      const idx = matches.length
      matches.push({
        round,
        matchNumber: ++matchNumber,
        bracketSlot: `${slotName} M${i + 1}`,
        entry1Id: null,
        entry2Id: null,
        nextMatchId: null,
        nextMatchSlot: null,
        loserNextMatchId: null,
        loserNextMatchSlot: null,
        isThirdPlace: false,
      })

      // Wire previous-round matches to feed into this one
      const prev1 = prevRoundStart + i * 2
      const prev2 = prevRoundStart + i * 2 + 1
      matches[prev1].nextMatchId = String(idx)
      matches[prev1].nextMatchSlot = 1
      matches[prev2].nextMatchId = String(idx)
      matches[prev2].nextMatchSlot = 2
    }
    prevRoundStart += prevRoundCount
    prevRoundCount = roundCount
  }

  // ── 3rd place match ───────────────────────────────────────────
  // Only when there are 4+ real entries — with 3 players one SF is a BYE,
  // so 3rd place is automatic (no match needed).
  if (includeThirdPlace && n >= 4) {
    // Before adding 3rd place: matches[-1] = Final, matches[-2] = SF2, matches[-3] = SF1
    const sf1 = matches.length - 3
    const sf2 = matches.length - 2
    const idx = matches.length
    matches.push({
      round: numRounds,
      matchNumber: ++matchNumber,
      bracketSlot: '3rd Place',
      entry1Id: null,
      entry2Id: null,
      nextMatchId: null,
      nextMatchSlot: null,
      loserNextMatchId: null,
      loserNextMatchSlot: null,
      isThirdPlace: true,
    })
    // Losers of both semi-finals play here (set in match service when match completes)
    matches[sf1].loserNextMatchId = String(idx)
    matches[sf1].loserNextMatchSlot = 1
    matches[sf2].loserNextMatchId = String(idx)
    matches[sf2].loserNextMatchSlot = 2
  }

  // ── Auto-advance byes ─────────────────────────────────────────
  // Any round-1 match where one slot is null means the other entry has a bye.
  // The match service will handle auto-populating the next round when it saves matches.

  return matches
}

export function generateDoubleElimination(entries: BracketEntry[]): GeneratedMatch[] {
  const n = entries.length
  if (n < 2) throw new Error('Need at least 2 entries')

  const N = nextPow2(n)
  const numWBRounds = Math.log2(N)
  const lbRounds = 2 * (numWBRounds - 1)

  // Winners bracket (no 3rd place match)
  const wb = generateSingleElimination(entries, false)
  const wbLen = wb.length

  // LB match counts per round (1-indexed round r):
  //   R1         : N/4  (pair up the N/2 WB R1 losers)
  //   Even rounds: same count as previous round (receive WB drop-ins, same number)
  //   Odd rounds≥3: half of previous round (pure LB survivor matches)
  const lbMatchesPerRound: number[] = []
  for (let r = 1; r <= lbRounds; r++) {
    if (r === 1) {
      lbMatchesPerRound.push(N >> 2)
    } else if (r % 2 === 0) {
      lbMatchesPerRound.push(lbMatchesPerRound[r - 2])
    } else {
      lbMatchesPerRound.push(Math.max(1, lbMatchesPerRound[r - 2] >> 1))
    }
  }

  // Absolute start index in the final array for each LB round (0-indexed)
  const lbRoundStart: number[] = []
  let cursor = wbLen
  for (let r = 0; r < lbRounds; r++) {
    lbRoundStart.push(cursor)
    cursor += lbMatchesPerRound[r]
  }
  const gfIdx = cursor

  // Create LB match stubs
  const lb: GeneratedMatch[] = []
  let matchNumber = wbLen
  for (let r = 1; r <= lbRounds; r++) {
    for (let i = 0; i < lbMatchesPerRound[r - 1]; i++) {
      lb.push({
        round: numWBRounds + r,
        matchNumber: ++matchNumber,
        bracketSlot: `LB R${r} M${i + 1}`,
        entry1Id: null,
        entry2Id: null,
        nextMatchId: null,
        nextMatchSlot: null,
        loserNextMatchId: null,
        loserNextMatchSlot: null,
        isThirdPlace: false,
      })
    }
  }

  const gf: GeneratedMatch = {
    round: numWBRounds + lbRounds + 1,
    matchNumber: ++matchNumber,
    bracketSlot: 'Grand Final',
    entry1Id: null,
    entry2Id: null,
    nextMatchId: null,
    nextMatchSlot: null,
    loserNextMatchId: null,
    loserNextMatchSlot: null,
    isThirdPlace: false,
  }

  const all = [...wb, ...lb, gf]

  // Returns the absolute start index of WB round k (1-indexed)
  const wbRoundStart = (k: number): number => {
    let s = 0
    for (let j = 1; j < k; j++) s += N >> j
    return s
  }

  // ── Wire WB R1 losers → LB R1 (2 WB losers per LB match) ──────────────────
  const wbR1Count = N >> 1
  for (let i = 0; i < wbR1Count; i++) {
    all[i].loserNextMatchId = String(lbRoundStart[0] + (i >> 1))
    all[i].loserNextMatchSlot = (i % 2) + 1
  }

  // ── Wire LB R1 winners → LB R2 slot 1 ─────────────────────────────────────
  for (let i = 0; i < lbMatchesPerRound[0]; i++) {
    all[lbRoundStart[0] + i].nextMatchId = String(lbRoundStart[1] + i)
    all[lbRoundStart[0] + i].nextMatchSlot = 1
  }

  // ── Wire WB Rk (k≥2) losers → LB R(2k-2) slot 2 ──────────────────────────
  // Even LB rounds receive exactly one WB loser per LB match in slot 2
  for (let k = 2; k <= numWBRounds; k++) {
    const lbTargetRound = 2 * k - 2       // 1-indexed LB round
    const lbTargetStart = lbRoundStart[lbTargetRound - 1]
    const wbStart = wbRoundStart(k)
    const wbCount = N >> k
    for (let i = 0; i < wbCount; i++) {
      all[wbStart + i].loserNextMatchId = String(lbTargetStart + i)
      all[wbStart + i].loserNextMatchSlot = 2
    }
  }

  // ── Wire LB even rounds → LB odd rounds (halving: pairs → one match) ───────
  for (let j = 1; j <= numWBRounds - 2; j++) {
    const evenRound = 2 * j        // 1-indexed
    const oddRound = 2 * j + 1
    const evenStart = lbRoundStart[evenRound - 1]
    const oddStart = lbRoundStart[oddRound - 1]
    for (let i = 0; i < lbMatchesPerRound[evenRound - 1]; i++) {
      all[evenStart + i].nextMatchId = String(oddStart + (i >> 1))
      all[evenStart + i].nextMatchSlot = (i % 2) + 1
    }
  }

  // ── Wire LB odd rounds (k≥2) survivors → next even LB round slot 1 ─────────
  for (let k = 2; k <= numWBRounds - 1; k++) {
    const oddRound = 2 * k - 1    // 1-indexed
    const evenRound = 2 * k
    const oddStart = lbRoundStart[oddRound - 1]
    const evenStart = lbRoundStart[evenRound - 1]
    for (let i = 0; i < lbMatchesPerRound[oddRound - 1]; i++) {
      all[oddStart + i].nextMatchId = String(evenStart + i)
      all[oddStart + i].nextMatchSlot = 1
    }
  }

  // ── Wire LB Final winner → GF slot 2 ───────────────────────────────────────
  all[lbRoundStart[lbRounds - 1]].nextMatchId = String(gfIdx)
  all[lbRoundStart[lbRounds - 1]].nextMatchSlot = 2

  // ── Wire WB Final winner → GF slot 1 ───────────────────────────────────────
  all[wbLen - 1].nextMatchId = String(gfIdx)
  all[wbLen - 1].nextMatchSlot = 1

  return all
}

function roundSlotName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round
  if (remaining === 0) return 'F'
  if (remaining === 1) return 'SF'
  if (remaining === 2) return 'QF'
  return `R${round}`
}
