export const statusMeta = {
  confirmed: { label: 'Confirmed', short: 'Confirmed', className: 'status-confirmed' },
  conflicting: { label: 'Conflicting', short: 'Conflict', className: 'status-conflicting' },
  unverified: { label: 'Unverified', short: 'Unverified', className: 'status-unverified' },
  missing: { label: 'Missing information', short: 'Missing', className: 'status-missing' },
  irrelevant: { label: 'Irrelevant', short: 'Irrelevant', className: 'status-irrelevant' }
}

export function getReviewProgress(claims) { return claims.length ? Math.round((claims.filter((claim) => claim.reviewed).length / claims.length) * 100) : 0 }
export function getClaimCounts(claims) { return claims.reduce((counts, claim) => { counts[claim.status] = (counts[claim.status] || 0) + 1; return counts }, {}) }

export function buildBrief(caseData) {
  const activeClaims = caseData.claims.filter((claim) => claim.status !== 'irrelevant')
  const by = (status) => activeClaims.filter((claim) => claim.status === status)
  const notes = activeClaims.filter((claim) => claim.note?.trim()).map((claim) => ({ claim: claim.text, note: claim.note.trim() }))
  return { overview: caseData.description, confirmed: by('confirmed'), conflicting: by('conflicting'), unverified: by('unverified'), missing: by('missing'), notes, recommendation: 'Investigate the terminal battery level and connectivity logs before assuming the cause of the failure.', approved: caseData.briefApproved, openRisk: by('conflicting').length + by('unverified').length }
}

export function briefAsMarkdown(caseData) {
  const brief = buildBrief(caseData)
  const list = (items) => items.length ? items.map((item) => `- ${item.text}`).join('\n') : '- None recorded'
  const notes = brief.notes.length ? brief.notes.map((item) => `- **${item.claim}** — ${item.note}`).join('\n') : '- No human notes yet'
  return `# Proofline decision brief\n\n## ${caseData.title}\n\n${brief.overview}\n\n**Status:** ${brief.approved ? 'Approved by human reviewer' : 'Draft — human approval required'}\n\n## Supported facts\n${list(brief.confirmed)}\n\n## Conflicting explanations\n${list(brief.conflicting)}\n\n## Unverified claims\n${list(brief.unverified)}\n\n## Missing information\n${list(brief.missing)}\n\n## Recommended next action\n${brief.recommendation}\n\n## Human review notes\n${notes}\n`
}
