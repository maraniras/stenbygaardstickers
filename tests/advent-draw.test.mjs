import assert from 'node:assert/strict'
import test from 'node:test'
import { setup } from './helpers/economy-harness.mjs'

const now = new Date('2026-12-01T03:00:00Z')
const names = [
  'Mathias',
  'Tobias Frost',
  'Frederik Prip',
  'Emil',
  'Norsk',
  'Anna',
  'Nicole',
  'Morten',
  ...Array.from({ length: 25 }, (_, i) => `Ven ${i}`),
]
const users = names.map((name) => ({ name, createdAt: '2026-11-07T12:00:00Z' }))
function harness(redis = false) {
  const h = setup(redis, ['server/utils/advent.ts', 'server/utils/advent-draw.ts'])
  h.api.structuredClone = structuredClone
  h.api.listUsers = async () => users
  h.api.process = { env: {} }
  return h
}
const prizes = (plan) => plan.flatMap((d) => [d.prize, ...(d.extras ?? [])])
const isBottle = (reward) => ['uno-x-bottle', 'visma-bottle'].includes(reward)

test('100 seeded calendars respect all stocks, exclusions and individual count bounds', () => {
  const { api: a } = harness()
  for (let seed = 0; seed < 100; seed++) {
    const draw = a.createAdventDraw(users, String(seed), now)
    const all = Object.values(draw.plans).flatMap(prizes)
    for (const [reward, count] of [
      ['mix-max', 5],
      ['red-wine', 1],
      ['white-wine', 1],
      ['uno-x-bottle', 1],
      ['visma-bottle', 1],
      ['snowglobe', 1],
      ['faxe-kondi', 2],
      ['vampiri', 2],
      ['juleskum', 1],
      ['rta-mug', 1],
      ['santa', 1],
    ])
      assert.equal(all.filter((p) => p.reward === reward).length, count)
    for (const [owner, plan] of Object.entries(draw.plans)) {
      assert.equal(plan.length, 24)
      assert.ok(plan.every((day) => !day.extras?.length))
      const items = prizes(plan)
      const count = (id) => items.filter((p) => p.reward === id).length
      assert.ok(owner === 'norsk' ? count('elf') === 7 : count('elf') >= 1 && count('elf') <= 5)
      assert.ok(count('friend-gift') >= 1 && count('friend-gift') <= 3)
      assert.ok(count('self-gift') >= 1 && count('self-gift') <= 3)
      assert.ok(count('banana-large') >= 2)
      if (owner === 'mathias')
        assert.equal(
          items.filter(
            (p) => (p.kind === 'physical' && !isBottle(p.reward)) || p.reward === 'santa',
          ).length,
          0,
        )
      if (owner === 'frederik prip')
        assert.equal(
          items.filter(
            (p) =>
              (p.kind === 'physical' && !isBottle(p.reward) && p.reward !== 'mix-max') ||
              p.reward === 'santa',
          ).length,
          0,
        )
      if (owner === 'tobias frost')
        assert.equal(items.filter((p) => p.kind === 'physical' || p.reward === 'santa').length, 0)
      if (owner === 'emil') assert.equal(items.filter((p) => isBottle(p.reward)).length, 0)
      for (const day of plan)
        if (prizes([day]).some((p) => ['red-wine', 'white-wine'].includes(p.reward)))
          assert.equal(day.day, 24)
      assert.equal(JSON.stringify(a.buildAdventPlan(owner, draw)), JSON.stringify(plan))
    }
  }
})

test('named prizes keep their constraints across 100 seeds, including mixed case and missing users', () => {
  const { api: a } = harness()
  const roster = [
    'ANNA',
    'nOrSk',
    'EMIL',
    'Nicole',
    'Morten',
    'Ida',
    'Mathias',
    'Tobias Frost',
    'Ven',
  ].map((name) => ({ name, createdAt: '2026-11-01T00:00:00Z' }))
  for (let seed = 0; seed < 100; seed++) {
    const draw = a.createAdventDraw(roster, `named-${seed}`, now)
    const mix = draw.awards.filter((p) => p.reward === 'mix-max')
    assert.equal(mix.length, 5)
    assert.ok(mix.filter((p) => p.winner === 'nOrSk').length >= 2)
    assert.ok(mix.some((p) => p.winner === 'EMIL'))
    const foam = draw.awards.filter((p) => p.reward === 'juleskum')
    assert.equal(foam.length, 1)
    assert.equal(foam[0].winner, 'ANNA')
    assert.equal(foam[0].day, 3)
    const wine = draw.awards.filter((p) => ['red-wine', 'white-wine'].includes(p.reward))
    assert.equal(wine.length, 2)
    assert.equal(new Set(wine.map((p) => p.winner.toLocaleLowerCase('da'))).size, 2)
    assert.ok(
      wine.every(
        (p) => ['ANNA', 'nOrSk', 'EMIL', 'Nicole', 'Morten'].includes(p.winner) && p.day === 24,
      ),
    )
    assert.ok(!(wine.some((p) => p.winner === 'Nicole') && wine.some((p) => p.winner === 'nOrSk')))
    assert.ok(
      draw.awards
        .filter((p) => p.reward === 'faxe-kondi')
        .every((p) => ['Ida', 'ANNA', 'Morten', 'EMIL'].includes(p.winner)),
    )
    assert.ok(
      draw.awards
        .filter((p) => p.reward === 'rta-mug')
        .every((p) => ['ANNA', 'EMIL', 'Morten', 'Nicole', 'nOrSk'].includes(p.winner)),
    )
    for (const name of draw.participants) {
      const own = draw.awards.filter((p) => p.winner === name)
      assert.equal(new Set(own.map((p) => p.day)).size, own.length)
      const physical = own.filter((p) => draw.catalog[p.reward].kind === 'physical')
      if (physical.some((p) => !['cake', 'vampiri', 'juleskum', 'snowglobe'].includes(p.reward)))
        assert.ok(physical.some((p) => p.day === 24))
    }
  }
  const withoutAnna = a.createAdventDraw(
    roster.filter((p) => p.name !== 'ANNA'),
    'no-anna',
    now,
  )
  assert.equal(withoutAnna.awards.filter((p) => p.reward === 'juleskum').length, 0)
  const tooLate = a.createAdventDraw(
    ['Anna', 'Norsk', 'Emil'].map((name) => ({ name, createdAt: a.ADVENT_CUTOFF })),
    'late-named',
    now,
  )
  assert.equal(tooLate.awards.length, 0)
  const noWineCandidates = a.createAdventDraw(
    [{ name: 'Ida', createdAt: '2026-11-01T00:00:00Z' }],
    'no-wine',
    now,
  )
  assert.equal(
    noWineCandidates.awards.filter((p) => ['red-wine', 'white-wine'].includes(p.reward)).length,
    0,
  )
})

test('Strandsbjerg may win Mix Max but no other physical prizes or Santa', () => {
  const { api: a } = harness()
  for (const name of ['Strandsbjerg', 'STRANDSBJERG', 'sTrAnDsBjErG']) {
    const roster = [{ name, createdAt: '2026-11-01T00:00:00Z' }]
    for (let seed = 0; seed < 20; seed++) {
      const draw = a.createAdventDraw(roster, `strandsbjerg-${seed}`, now)
      assert.equal(draw.awards.length, 5)
      assert.ok(draw.awards.every((award) => award.winner === name && award.reward === 'mix-max'))
      assert.equal(
        prizes(draw.plans[name.toLocaleLowerCase('da')]).filter(
          (p) => p.kind === 'physical' && p.reward !== 'mix-max',
        ).length,
        0,
      )
    }
  }
})

test('Frederik Prip may win bottles and Mix Max, but no other limited prizes', () => {
  const { api: a } = harness()
  for (const name of ['Frederik Prip', 'FREDERIK PRIP', 'fReDeRiK pRiP']) {
    const roster = [{ name, createdAt: '2026-11-01T00:00:00Z' }]
    const draw = a.createAdventDraw(roster, 'frederik-eligible', now)
    assert.equal(draw.awards.filter((award) => award.reward === 'mix-max').length, 5)
    assert.equal(draw.awards.filter((award) => isBottle(award.reward)).length, 2)
    assert.ok(
      draw.awards.every(
        (award) => award.winner === name && (award.reward === 'mix-max' || isBottle(award.reward)),
      ),
    )
  }
})

test('calendar mug excludes an already decided crossword winner', () => {
  const { api: a } = harness()
  for (let seed = 0; seed < 60; seed++) {
    const winner = { name: 'nIcOlE', at: '2026-11-25T12:00:00Z' }
    const draw = a.createAdventDraw(users, `mug-winner-${seed}`, now, winner)
    const mug = draw.awards.filter((award) => award.reward === 'rta-mug')
    assert.equal(mug.length, 1)
    assert.notEqual(mug[0].winner, 'Nicole')
  }
  const nicole = [{ name: 'Nicole', createdAt: '2026-11-01T00:00:00Z' }]
  assert.equal(
    a
      .createAdventDraw(nicole, 'no-winner', now)
      .awards.filter((award) => award.reward === 'rta-mug').length,
    1,
  )
  assert.equal(
    a
      .createAdventDraw(nicole, 'future-winner', now, {
        name: 'Nicole',
        at: '2026-12-02T12:00:00Z',
      })
      .awards.filter((award) => award.reward === 'rta-mug').length,
    1,
  )
  assert.equal(
    a
      .createAdventDraw(nicole, 'known-winner', now, { name: 'Nicole', at: '2026-11-25T12:00:00Z' })
      .awards.filter((award) => award.reward === 'rta-mug').length,
    0,
  )
})

for (const redis of [false, true])
  test(`initial draw reads crossword winner and keeps existing plans frozen (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a, storage, hashes } = harness(redis)
    const crossword = { winner: { name: 'Nicole', at: '2026-11-25T12:00:00Z' } }
    if (redis) hashes.set('crossword-games', new Map([['1', JSON.stringify(crossword)]]))
    else storage.set('crossword-games:1', crossword)
    const draw = await a.ensureAdventDraw(now)
    assert.ok(
      draw.awards
        .filter((award) => award.reward === 'rta-mug')
        .every((award) => award.winner !== 'Nicole'),
    )
    const frozen = JSON.stringify(draw)
    const changed = { winner: { name: 'Anna', at: '2026-12-02T12:00:00Z' } }
    if (redis) hashes.set('crossword-games', new Map([['1', JSON.stringify(changed)]]))
    else storage.set('crossword-games:1', changed)
    assert.equal(JSON.stringify(await a.ensureAdventDraw(new Date('2026-12-03T12:00:00Z'))), frozen)
  })

test('snowglobe is unique before December 7 and Anna only enters the Visma bottle draw', () => {
  const { api: a } = harness()
  let annaWonVisma = false
  let annaWithoutBottle = false
  for (let seed = 0; seed < 100; seed++) {
    const draw = a.createAdventDraw(users, `named-bottles-${seed}`, now)
    const snowglobes = draw.awards.filter((award) => award.reward === 'snowglobe')
    assert.equal(snowglobes.length, 1)
    const globe = snowglobes[0]
    assert.ok(globe.day >= 1 && globe.day < 7)
    const prize = draw.plans[globe.winner.toLocaleLowerCase('da')][globe.day - 1].prize
    assert.equal(prize.reward, 'snowglobe')
    assert.equal(prize.amount, 50)
    assert.equal(a.adventPrizeIcon(prize), '/games/advent/rta-snowglobe-christmas-v1.webp')
    const annaBottles = draw.awards.filter(
      (award) => award.winner === 'Anna' && isBottle(award.reward),
    )
    assert.ok(annaBottles.every((award) => award.reward === 'visma-bottle'))
    annaWonVisma ||= annaBottles.length > 0
    annaWithoutBottle ||= annaBottles.length === 0
    for (const id of ['uno-x', 'visma']) {
      const award = draw.awards.find((award) => award.reward === `${id}-bottle`)
      const found = draw.plans[award.winner.toLocaleLowerCase('da')][award.day - 1].prize
      assert.equal(found.reward, `${id}-bottle`)
      assert.equal(found.amount, 50)
      assert.equal(a.adventPrizeIcon(found), `/games/advent/${id}-bottle-christmas-v1.webp`)
    }
  }
  assert.ok(annaWonVisma, 'Anna can win Visma')
  assert.ok(annaWithoutBottle, 'Anna is not guaranteed a bottle')
})

test('Mathias can win bottles but no other limited prizes; Emil and Tobias remain excluded from bottles', () => {
  const { api: a } = harness()
  for (const mathias of ['Mathias', 'MATHIAS', 'mAtHiAs']) {
    const roster = [mathias, 'Emil', 'Tobias Frost'].map((name) => ({
      name,
      createdAt: '2026-11-01T00:00:00Z',
    }))
    const draw = a.createAdventDraw(roster, 'mathias-bottles', now)
    const bottles = draw.awards.filter((a) => isBottle(a.reward))
    assert.equal(bottles.length, 2)
    assert.ok(bottles.every((a) => a.winner === mathias))
    assert.ok(draw.awards.filter((a) => a.winner === mathias).every((a) => isBottle(a.reward)))
    assert.equal(
      prizes(draw.plans[mathias.toLocaleLowerCase('da')]).filter((p) => isBottle(p.reward)).length,
      2,
    )
  }
  const late = a.createAdventDraw(
    [{ name: 'Mathias', createdAt: a.ADVENT_CUTOFF }],
    'late-mathias',
    now,
  )
  assert.equal(late.awards.filter((a) => isBottle(a.reward)).length, 0)
})

test('one person never gets overlapping prizes; invalid overlapping input is rejected', () => {
  const { api: a } = harness()
  const draw = a.createAdventDraw(
    [{ name: 'Norsk', createdAt: '2026-11-01T00:00:00Z' }],
    'one-winner',
    now,
  )
  assert.equal(draw.awards.length, 12)
  assert.equal(draw.awards.filter((p) => ['red-wine', 'white-wine'].includes(p.reward)).length, 1)
  assert.ok(draw.awards.every((p) => p.winner === 'Norsk'))
  const forced = { ...draw, awards: draw.awards.map((p) => ({ ...p, day: 24 })) }
  assert.throws(() => a.buildAdventPlan('Norsk', forced), /samme låge/)
  assert.equal(new Set(draw.awards.map((p) => p.day)).size, draw.awards.length)
  for (const name of ['Anna', 'Norsk', 'Emil']) {
    for (let seed = 0; seed < 100; seed++) {
      const crowded = a.createAdventDraw(
        [{ name, createdAt: '2026-11-01T00:00:00Z' }],
        `crowded-${seed}`,
        now,
      )
      const plan = crowded.plans[name.toLocaleLowerCase('da')]
      assert.ok(plan.every((day) => !day.extras?.length))
      const count = (reward) => prizes(plan).filter((p) => p.reward === reward).length
      assert.ok(count('friend-gift') >= 1 && count('friend-gift') <= 3)
      assert.ok(count('self-gift') >= 1 && count('self-gift') <= 3)
      assert.ok(count('banana-large') >= 2)
      assert.ok(name === 'Norsk' ? count('elf') === 7 : count('elf') >= 1 && count('elf') <= 5)
    }
  }
})

test('one optional cake prize belongs only to eligible Ida or Marc behind December10–18', () => {
  const { api: a } = harness()
  for (const candidates of [[], ['Ida'], ['Marc'], ['IDA', 'mArC']]) {
    for (let seed = 0; seed < 100; seed++) {
      const roster = [
        ...users,
        ...candidates.map((name) => ({ name, createdAt: '2026-11-20T00:00:00Z' })),
      ]
      const draw = a.createAdventDraw(roster, `cake-${seed}`, now)
      const cakes = draw.awards.filter((award) => award.reward === 'cake')
      assert.equal(cakes.length, candidates.length ? 1 : 0)
      assert.equal(
        Object.values(draw.plans)
          .flatMap(prizes)
          .filter((p) => p.reward === 'cake').length,
        cakes.length,
      )
      if (!cakes.length) continue
      const cake = cakes[0]
      assert.ok(candidates.includes(cake.winner))
      assert.ok(cake.day >= 10 && cake.day <= 18)
      const found = prizes([draw.plans[cake.winner.toLocaleLowerCase('da')][cake.day - 1]]).find(
        (p) => p.reward === 'cake',
      )
      assert.equal(found.kind, 'physical')
      assert.equal(found.amount, 50)
    }
  }
  const late = a.createAdventDraw(
    [
      ...users,
      { name: 'Ida', createdAt: '2026-11-30T23:00:00Z' },
      { name: 'Marc', createdAt: '2026-12-01T12:00:00Z' },
    ],
    'late-cake',
    now,
  )
  assert.equal(late.awards.filter((award) => award.reward === 'cake').length, 0)
})

test('Anna has no reserved cake prize; only the Ida/Marc prize remains', () => {
  const { api: a } = harness()
  for (const annaName of ['Anna', 'ANNA', 'aNnA']) {
    for (let seed = 0; seed < 30; seed++) {
      const roster = [
        ...users,
        ...['Ida', 'Marc', annaName].map((name) => ({ name, createdAt: '2026-11-20T00:00:00Z' })),
      ]
      const draw = a.createAdventDraw(roster, `anna-cake-${seed}`, now)
      const cakes = draw.awards.filter((award) => award.reward === 'cake')
      assert.equal(cakes.length, 1)
      assert.equal(cakes.filter((c) => ['Ida', 'Marc'].includes(c.winner)).length, 1)
      const anna = cakes.filter((c) => c.winner === annaName)
      assert.equal(anna.length, 0)
      const gifts = prizes(draw.plans[annaName.toLocaleLowerCase('da')]).filter(
        (p) => p.reward === 'cake',
      )
      assert.equal(gifts.length, 0)
    }
  }
  const onlyAnna = a.createAdventDraw(
    [...users, { name: 'Anna', createdAt: '2026-11-20T00:00:00Z' }],
    'only-anna',
    now,
  )
  assert.equal(onlyAnna.awards.filter((a) => a.reward === 'cake').length, 0)
  const late = a.createAdventDraw(
    [...users, { name: 'Anna', createdAt: a.ADVENT_CUTOFF }],
    'late-anna',
    now,
  )
  assert.equal(late.awards.filter((a) => a.reward === 'cake').length, 0)
})

test('Vampiri is reserved for Anna on 7–16 and Norsk on 18, never substitutes another winner', () => {
  const { api: a } = harness()
  for (let seed = 0; seed < 50; seed++) {
    const roster = ['ANNA', 'nOrSk', 'Nicole'].map((name) => ({
      name,
      createdAt: '2026-11-01T00:00:00Z',
    }))
    const draw = a.createAdventDraw(roster, `vampiri-${seed}`, now)
    const awards = draw.awards.filter((award) => award.reward === 'vampiri')
    assert.equal(awards.length, 2)
    const anna = awards.find((a) => a.winner === 'ANNA')
    const norsk = awards.find((a) => a.winner === 'nOrSk')
    assert.ok(anna.day >= 7 && anna.day <= 16)
    assert.equal(norsk.day, 18)
    for (const award of awards) {
      const items = prizes([draw.plans[award.winner.toLocaleLowerCase('da')][award.day - 1]])
      const found = items.filter((item) => item.reward === 'vampiri')
      assert.equal(found.length, 1)
      assert.equal(found[0].kind, 'physical')
      assert.equal(found[0].amount, 50)
      assert.equal(a.adventPrizeIcon(found[0]), '/games/advent/vampiri-christmas-v1.webp')
    }
    assert.equal(prizes(draw.plans.nicole).filter((p) => p.reward === 'vampiri').length, 0)
    assert.equal(
      JSON.stringify(a.createAdventDraw(roster, `vampiri-${seed}`, now)),
      JSON.stringify(draw),
    )
  }
  for (const roster of [
    [],
    [{ name: 'Anna', createdAt: a.ADVENT_CUTOFF }],
    [{ name: 'Norsk', createdAt: a.ADVENT_CUTOFF }],
  ]) {
    const draw = a.createAdventDraw(roster, 'no-vampiri', now)
    assert.equal(draw.awards.filter((a) => a.reward === 'vampiri').length, 0)
  }
})

for (const redis of [false, true])
  test(`cutoff, frozen participants and concurrent initialization (${redis ? 'Redis' : 'local'})`, async () => {
    const { api: a, storage, hashes } = harness(redis)
    assert.equal(await a.ensureAdventDraw(new Date('2026-11-30T22:59:59Z')), undefined)
    assert.equal(storage.size, 0)
    a.listUsers = async () => [...users, { name: 'For sent', createdAt: '2026-11-30T23:00:00Z' }]
    const results = await Promise.all(Array.from({ length: 8 }, () => a.ensureAdventDraw(now)))
    assert.ok(results.every((d) => d.seed === results[0].seed))
    assert.ok(!results[0].participants.includes('For sent'))
    const original = JSON.stringify(results[0])
    a.listUsers = async () => [{ name: 'Ny', createdAt: '2026-11-01T00:00:00Z' }]
    assert.equal(JSON.stringify(await a.ensureAdventDraw(now)), original)
    const late = await a.adventConfigsFor('For sent', now)
    assert.equal(
      prizes(late).filter((p) => p.kind === 'physical' || p.reward === 'santa').length,
      0,
    )
    assert.equal(JSON.stringify(await a.adventConfigsFor('For sent', now)), JSON.stringify(late))
    const dto = a.adventResponse(undefined, now, late)
    assert.ok(dto.doors.every((d) => d.opening === null && d.configured))
    assert.ok(!JSON.stringify(dto).includes(results[0].seed))
    void hashes
  })

test('every real calendar prize pays 50 bananas except Mix Max at 250, exactly once per door', () => {
  const { api: a } = harness()
  const draw = a.createAdventDraw(users, 'physical-bonuses', now)
  const entries = Object.entries(draw.catalog).filter(([, prize]) => prize.kind === 'physical')
  assert.equal(entries.length, 12)
  const plan = entries.map(([reward, prize], i) => {
    assert.equal(prize.amount, reward === 'mix-max' ? 250 : 50)
    return { day: i + 1, published: true, prize }
  })
  const wallet = a.freshEconomy()
  const ready = new Date('2026-12-24T03:00:00Z')
  for (const entry of plan) {
    a.openAdventDoor(wallet, 2026, entry.day, ready, plan)
    assert.equal(wallet.advent[2026][entry.day].amount, entry.prize.amount)
    assert.equal(wallet.advent[2026][entry.day].prize.kind, 'physical')
  }
  assert.equal(wallet.balance, 800)
  const saved = JSON.stringify(wallet)
  for (const entry of plan) a.openAdventDoor(wallet, 2026, entry.day, ready, plan)
  assert.equal(JSON.stringify(wallet), saved)
})

test('limited-stock bonuses, negative floors and calendar badges settle exactly once', async () => {
  const { api: a } = harness()
  const draw = a.createAdventDraw(users, 'settlement', now)
  const plan = draw.plans.norsk
  const ctx = { stickers: [], ratings: {}, comments: {} }
  const open = () =>
    a.mutateEconomy('Norsk', (w) => {
      a.settleEconomy(w, 'Norsk', ctx, now)
      for (let day = 1; day <= 24; day++)
        a.openAdventDoor(w, 2026, day, new Date('2026-12-24T03:00:00Z'), plan)
      a.settleEconomy(w, 'Norsk', ctx, new Date('2026-12-24T03:00:00Z'))
    })
  const first = await open(),
    balance = first.record.balance
  await Promise.all([open(), open()])
  const wallet = await a.readEconomy('Norsk')
  assert.equal(wallet.balance, balance)
  assert.equal(Object.keys(wallet.advent[2026]).length, 24)
  const badges = a
    .badgesFor('Norsk', [], {}, { economy: { norsk: a.publicEconomy(wallet) } })
    .filter((b) => b.id.startsWith('advent-'))
  assert.equal(badges.length, 7)
  for (const b of badges)
    assert.equal(b.kind === 'tier' ? b.steps.every((s) => s.points === 1) : b.worth === 1, true)
  assert.equal(badges.find((b) => b.id === 'advent-doors').points, 5)
  assert.ok(!badges.some((b) => b.name === 'Glædelig jul!'))
  assert.equal(a.publicEconomy(wallet).adventPlans, undefined)
})
