// @vitest-environment jsdom
import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))
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
    expect(screen.getByRole('heading', { name: originalClaim, level: 2 })).toBeTruthy()
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
    expect(screen.getByRole('heading', { name: revisedClaim, level: 2 })).toBeTruthy()
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
    const search = screen.getByRole('textbox', { name: 'Search claims' })
    // This phrase exists in the source excerpt, but not in the claim wording.
    change(search, 'unrelated access-point issue')
    expect(screen.getByRole('button', { name: new RegExp(originalClaim) })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Cash registration remained available/ })).toBeNull()
    change(search, 'no source contains this phrase')
    expect(screen.getByText('No claims found')).toBeTruthy()
    change(search, '')
    expect(screen.getByRole('button', { name: /Cash registration remained available/ })).toBeTruthy()
  })

  it('regenerates unreviewed suggestions when a report is added, edited, and removed', () => {
    click(/^✓?\s*Confirmed$/)
    expect(screen.getByText('Human reviewed')).toBeTruthy()
    // There are two visible add controls; use the icon control's exact label.
    fireEvent.click(screen.getAllByRole('button', { name: 'Add source report' })[0])
    let dialog = screen.getByRole('dialog', { name: 'Add a source report' })
    change(within(dialog).getByRole('textbox', { name: 'Source name' }), 'Battery inspector')
    change(within(dialog).getByRole('textbox', { name: 'Label' }), 'Report D')
    change(within(dialog).getByRole('textbox', { name: 'Report text' }), 'Battery measured at 8 percent.')
    fireEvent.click(within(dialog).getByRole('button', { name: /Save report/ }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Battery inspector' })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Battery measured at 8 percent/ }).textContent).toContain('Suggestion')
    expect(screen.queryByText('Human reviewed')).toBeNull()
    expect(screen.queryByRole('button', { name: new RegExp(originalClaim) })).toBeNull()

    click('Edit Report D')
    dialog = screen.getByRole('dialog', { name: 'Edit report' })
    change(within(dialog).getByRole('textbox', { name: 'Report text' }), 'Battery measured at 12 percent.')
    fireEvent.click(within(dialog).getByRole('button', { name: /Save report/ }))
    expect(screen.queryByRole('button', { name: /Battery measured at 8 percent/ })).toBeNull()
    expect(screen.getByRole('button', { name: /Battery measured at 12 percent/ }).textContent).toContain('Suggestion')

    click('Remove Report D')
    expect(window.confirm).toHaveBeenCalledWith(expect.stringMatching(/Remove this source/))
    expect(screen.queryByRole('heading', { name: 'Battery inspector' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Battery measured at 12 percent/ })).toBeNull()
    // Removing the extra source restores the curated demo suggestions.
    expect(screen.getByRole('button', { name: new RegExp(originalClaim) }).textContent).toContain('Suggestion')
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
    fireEvent.click(screen.getAllByRole('button', { name: 'Add source report' })[0])
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
})
