// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { briefAsMarkdown } from './analysis.js'

// Capture the production entry point's App without changing its public exports.
// Testing Library still uses real React roots for every independent mount.
const entry = vi.hoisted(() => ({ element: null }))
vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    createRoot: (container, options) => container.id === 'root'
      ? { render: (element) => { entry.element = element } }
      : actual.createRoot(container, options),
  }
})

const originalClaim = 'A network failure caused the payment terminal outage.'
const revisedClaim = 'The cause requires terminal logs before a conclusion.'
// Use visible button labels for navigation. Global role/name queries recompute
// styles and accessible names for every claim, even when we only need one tab.
const click = (name) => fireEvent.click(screen.getByText(name, { selector: 'button' }))
const reviewPanel = () => within(screen.getByLabelText('Claim review', { selector: 'aside' }))
const evidenceMap = () => within(screen.getByLabelText('Evidence Map', { selector: 'section' }))
const claimButton = (text) => evidenceMap().getByText(text, { selector: 'h3' }).closest('button')
const queryClaimButton = (text) => evidenceMap().queryByText(text, { selector: 'h3' })?.closest('button') ?? null
const change = (element, value) => fireEvent.change(element, { target: { value } })
const openBrief = () => click(/^Decision brief/)
const backToEvidence = () => click(/Back to evidence map/)

beforeAll(async () => {
  const root = document.createElement('div')
  root.id = 'root'
  document.body.append(root)
  await import('./main.jsx')
  root.remove()
})

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  render(entry.element)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'clipboard')
  localStorage.clear()
})

describe('Proofline evidence-to-decision workflow', () => {
  it('starts with an unresolved demo conflict and the three original source excerpts', () => {
    expect(reviewPanel().getByRole('heading', { name: originalClaim, level: 2 })).toBeTruthy()
    expect(claimButton(originalClaim).getAttribute('aria-label')).toBe(originalClaim)
    expect(screen.getByText('Original evidence')).toBeTruthy()
    for (const quote of [
      'The terminal displayed a network error.',
      'The Wi-Fi appeared normal on nearby phones.',
      'The venue network was restarted at 10:20 AM after an unrelated access-point issue.',
    ]) {
      expect(screen.getByText(`“${quote}”`).tagName).toBe('BLOCKQUOTE')
    }
    openBrief()
    expect(screen.getByText('Conflicting explanations')).toBeTruthy()
    expect(screen.getByText(originalClaim)).toBeTruthy()
    expect(screen.getByText('5 open evidence risks.')).toBeTruthy()
    expect(screen.getByText('Review required')).toBeTruthy()
  })

  it('carries edited claim wording into the brief while retaining original evidence', () => {
    change(screen.getByDisplayValue(originalClaim), revisedClaim)
    expect(reviewPanel().getByRole('heading', { name: revisedClaim, level: 2 })).toBeTruthy()
    expect(screen.getByText('“The terminal displayed a network error.”')).toBeTruthy()
    openBrief()
    expect(screen.getByText(revisedClaim)).toBeTruthy()
    expect(screen.queryByText(originalClaim)).toBeNull()
    expect(screen.getByText('Review required')).toBeTruthy()
  })

  it('requires confirmation for risky approval and invalidates approval after an edit', () => {
    window.confirm.mockReturnValueOnce(false)
    openBrief()
    click(/Approve/)
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/5 unresolved or unreviewed claims/))
    expect(screen.getByText('Review required')).toBeTruthy()
    expect(screen.queryByText('Human approved')).toBeNull()

    click(/Approve/)
    expect(screen.getByText('Human approved')).toBeTruthy()
    expect(screen.getByText('5 open evidence risks.')).toBeTruthy()
    backToEvidence()
    change(screen.getByDisplayValue(originalClaim), revisedClaim)
    openBrief()
    expect(screen.queryByText('Human approved')).toBeNull()
    expect(screen.getByText('Review required')).toBeTruthy()
    expect(screen.getByText(revisedClaim)).toBeTruthy()
  })

  it('finds claims by original source excerpts and clears an empty search', () => {
    const search = screen.getByLabelText('Search claims')
    // This phrase exists in the source excerpt, but not in the claim wording.
    change(search, 'unrelated access-point issue')
    expect(claimButton(originalClaim)).toBeTruthy()
    expect(queryClaimButton('Cash registration remained available.')).toBeNull()
    change(search, 'no source contains this phrase')
    expect(screen.getByText('No claims found')).toBeTruthy()
    change(search, '')
    expect(claimButton('Cash registration remained available.')).toBeTruthy()
  })

  it('regenerates unreviewed suggestions when a report is added, edited, and removed', () => {
    const review = reviewPanel()
    const sources = within(screen.getByLabelText('Source reports', { selector: 'aside' }))
    const evidence = evidenceMap()
    // Claim button names include the entire card. Locate their unique headings
    // instead of recomputing accessible names/styles for every card on each check.
    const claimButton = (text) => evidence.getByText(text, { selector: 'h3' }).closest('button')
    const queryClaimButton = (text) => evidence.queryByText(text, { selector: 'h3' })?.closest('button') ?? null

    fireEvent.click(review.getByText('Confirmed', { selector: 'button span:last-child' }).closest('button'))
    expect(screen.getByText('Human reviewed')).toBeTruthy()
    // There are two visible add controls; use the icon control's exact label.
    fireEvent.click(sources.getByLabelText('Add source report', { selector: 'button' }))
    let dialog = screen.getByLabelText('Add a source report', { selector: '[role="dialog"]' })
    change(within(dialog).getByLabelText('Source name'), 'Battery inspector')
    change(within(dialog).getByLabelText('Label'), 'Report D')
    change(within(dialog).getByLabelText('Report text'), 'Battery measured at 8 percent.')
    fireEvent.click(within(dialog).getByText(/Save report/, { selector: 'button' }))
    expect(screen.queryByLabelText('Add a source report', { selector: '[role="dialog"]' })).toBeNull()
    expect(sources.getByText('Battery inspector', { selector: 'h4' })).toBeTruthy()
    expect(claimButton('Battery measured at 8 percent.').textContent).toContain('Suggestion')
    expect(screen.queryByText('Human reviewed')).toBeNull()
    expect(queryClaimButton(originalClaim)).toBeNull()

    fireEvent.click(sources.getByLabelText('Edit Report D', { selector: 'button' }))
    dialog = screen.getByLabelText('Edit report', { selector: '[role="dialog"]' })
    change(within(dialog).getByLabelText('Report text'), 'Battery measured at 12 percent.')
    fireEvent.click(within(dialog).getByText(/Save report/, { selector: 'button' }))
    expect(queryClaimButton('Battery measured at 8 percent.')).toBeNull()
    expect(claimButton('Battery measured at 12 percent.').textContent).toContain('Suggestion')

    fireEvent.click(sources.getByLabelText('Remove Report D', { selector: 'button' }))
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/Remove this source/))
    expect(sources.queryByText('Battery inspector', { selector: 'h4' })).toBeNull()
    expect(queryClaimButton('Battery measured at 12 percent.')).toBeNull()
    // Removing the extra source restores the curated demo suggestions.
    expect(claimButton(originalClaim).textContent).toContain('Suggestion')
    expect(screen.queryByText('Human reviewed')).toBeNull()
  })

  it('restores edited wording and approval from localStorage on a fresh mount', () => {
    change(screen.getByDisplayValue(originalClaim), revisedClaim)
    openBrief()
    click(/Approve/)
    expect(screen.getByText('Human approved')).toBeTruthy()
    cleanup()
    render(entry.element)
    expect(screen.getByDisplayValue(revisedClaim)).toBeTruthy()
    expect(screen.getByText('“The terminal displayed a network error.”')).toBeTruthy()
    openBrief()
    expect(screen.getByText('Human approved')).toBeTruthy()
    expect(screen.getByText(revisedClaim)).toBeTruthy()
  })

  it('reports clipboard success only after writing and gives an honest failure message', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    openBrief()
    click(/Copy Markdown/)
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('copied'))
    expect(writeText.mock.calls[0][0]).toContain('## Method')
    writeText.mockRejectedValueOnce(new Error('Denied'))
    click(/Copy Markdown/)
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('blocked'))
  })

  it('creates a Markdown download with citations and revokes its object URL', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:proofline')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('proofline-decision-brief.md')
      expect(this.href).toBe('blob:proofline')
    })
    openBrief()
    click(/Download .md/)
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:proofline')
  })

  it('focuses the source dialog and dismisses it with Escape', () => {
    fireEvent.click(screen.getByLabelText('Add source report', { selector: 'button' }))
    const dialog = screen.getByRole('dialog')
    expect(document.activeElement).toBe(within(dialog).getByRole('textbox', { name: 'Source name' }))
    fireEvent.keyDown(document.activeElement, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('restores original data when loading the demo after edits', () => {
    change(screen.getByDisplayValue(originalClaim), revisedClaim)
    click(/Load demo case/)
    expect(screen.getByDisplayValue(originalClaim)).toBeTruthy()
    expect(screen.queryByDisplayValue(revisedClaim)).toBeNull()
    expect(JSON.parse(localStorage.getItem('proofline-case')).briefApproved).toBe(false)
  })

  it('requires a deliberate review after wording, note, or classification changes', () => {
    const review = reviewPanel()
    fireEvent.click(review.getByText('Approve claim review', { selector: 'button' }))
    expect(screen.getByText('Human reviewed')).toBeTruthy()
    change(review.getByLabelText('Review note'), 'Check the terminal logs before choosing a cause.')
    expect(screen.queryByText('Human reviewed')).toBeNull()
    fireEvent.click(review.getByText('Approve claim review', { selector: 'button' }))
    openBrief()
    click(/Approve decision brief/)
    expect(screen.getByText('Human approved')).toBeTruthy()
    expect(screen.getByText('Check the terminal logs before choosing a cause.')).toBeTruthy()
    backToEvidence()
    change(reviewPanel().getByLabelText('Evidence classification'), 'unverified')
    expect(screen.queryByText('Human reviewed')).toBeNull()
    openBrief()
    expect(screen.queryByText('Human approved')).toBeNull()
    expect(screen.getByText('Review required')).toBeTruthy()
    const unverifiedSection = screen.getByText('Unverified claims').closest('section')
    expect(within(unverifiedSection).getByText(originalClaim)).toBeTruthy()
  })

  it('removes stale excerpts and approval after editing and deleting original demo sources', () => {
    openBrief()
    click(/Approve decision brief/)
    backToEvidence()
    fireEvent.click(screen.getByLabelText('Edit Report A', { selector: 'button' }))
    const dialog = screen.getByLabelText('Edit report', { selector: '[role="dialog"]' })
    change(within(dialog).getByLabelText('Report text'), 'The terminal battery was inspected at noon.')
    fireEvent.click(within(dialog).getByText(/Save report/, { selector: 'button' }))
    let stored = JSON.parse(localStorage.getItem('proofline-case'))
    expect(stored.briefApproved).toBe(false)
    expect(stored.claims.every((claim) => !claim.reviewed && claim.status === 'unverified')).toBe(true)
    expect(screen.queryByText('“The terminal displayed a network error.”')).toBeNull()
    expect(briefAsMarkdown(stored)).not.toContain('“The terminal displayed a network error.”')
    fireEvent.click(screen.getByLabelText('Remove Report B', { selector: 'button' }))
    stored = JSON.parse(localStorage.getItem('proofline-case'))
    expect(stored.claims.flatMap((claim) => claim.sourceIds)).not.toContain('report-b')
    for (const claim of stored.claims) for (const excerpt of claim.evidence) {
      expect(stored.reports.find((report) => report.id === excerpt.reportId).text).toContain(excerpt.quote)
    }
    openBrief()
    expect(screen.getByText(/Deterministic sentence extraction only/)).toBeTruthy()
    expect(screen.getByText('Review required')).toBeTruthy()
    expect(screen.queryByText(/Investigate the terminal battery level and connectivity logs/)).toBeNull()
  })
})
