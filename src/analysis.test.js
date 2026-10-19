import { describe, expect, it } from 'vitest'
import { buildBrief, briefAsMarkdown, getReviewProgress } from './analysis.js'
import { cloneDemoCase } from './data.js'

describe('Proofline evidence workflow', () => {
  it('builds the demo brief with the unresolved cause visible', () => {
    const data = cloneDemoCase()
    const brief = buildBrief(data)

    expect(brief.confirmed).toHaveLength(2)
    expect(brief.conflicting[0].text).toContain('network failure')
    expect(brief.unverified[0].text).toContain('battery')
    expect(brief.missing[0].text).toContain('logs')
    expect(brief.recommendation).toContain('battery level and connectivity logs')
  })

  it('preserves source links and original excerpts for a conflicting claim', () => {
    const data = cloneDemoCase()
    const conflict = data.claims.find((claim) => claim.status === 'conflicting')

    expect(conflict.sourceIds).toEqual(['report-a', 'report-b', 'report-c'])
    expect(conflict.evidence.map((item) => item.reportId)).toEqual(['report-a', 'report-b', 'report-c'])
    expect(conflict.evidence[1].quote).toContain('Wi-Fi appeared normal')
  })

  it('updates the brief immediately when a human edits and reviews a claim', () => {
    const data = cloneDemoCase()
    const claim = data.claims.find((item) => item.id === 'claim-battery-cause')
    claim.text = 'Battery status needs verification before drawing a conclusion.'
    claim.status = 'confirmed'
    claim.reviewed = true
    claim.note = 'Ask the venue technician to photograph the battery indicator.'

    const brief = buildBrief(data)
    expect(brief.confirmed.map((item) => item.text)).toContain('Battery status needs verification before drawing a conclusion.')
    expect(brief.notes[0].note).toContain('photograph')
    expect(getReviewProgress(data.claims)).toBe(20)
  })

  it('exports a truthful markdown brief with approval state', () => {
    const data = cloneDemoCase()
    const markdown = briefAsMarkdown(data)

    expect(markdown).toContain('Draft — human approval required')
    expect(markdown).toContain('Conflicting explanations')
    expect(markdown).toContain('Investigate the terminal battery level')
    expect(markdown).not.toContain('confidence score')
  })
})
