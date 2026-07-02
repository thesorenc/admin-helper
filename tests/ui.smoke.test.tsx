import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CaseBuilder } from '../src/routes/CaseBuilder'
import { Library } from '../src/routes/Library'
import { ExamBuilder } from '../src/routes/ExamBuilder'
import { useCaseStore } from '../src/state/useCaseStore'
import { useExamStore } from '../src/state/useExamStore'
import { PE_SYSTEMS } from '../src/lib/exam/content'

describe('UI smoke', () => {
  it('Case builder: adding a procedure generates a document with Copy', () => {
    useCaseStore.getState().reset()
    render(
      <MemoryRouter>
        <CaseBuilder />
      </MemoryRouter>,
    )
    expect(screen.getByText('Case builder')).toBeInTheDocument()
    expect(screen.getByText('Attending')).toBeInTheDocument() // encounter bar
    // empty state until a procedure is added
    expect(screen.getByText(/No procedures yet/)).toBeInTheDocument()

    const procButtons = screen.getAllByRole('button')
    const proc = procButtons.find((b) => /ORIF|Extraction|BSSO|Implant|All-On/i.test(b.textContent ?? ''))
    expect(proc).toBeTruthy()
    fireEvent.click(proc!)

    expect(screen.getByRole('button', { name: 'Copy text' })).toBeInTheDocument()
    // document tabs
    expect(screen.getByRole('tab', { name: 'Operative Note' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pre-op' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Post-op' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Rx' })).toBeInTheDocument()
  })

  it('Exam builder: "All systems normal" marks every PE system and builds output', () => {
    useExamStore.getState().reset()
    render(
      <MemoryRouter>
        <ExamBuilder />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'All systems normal' }))
    const { pe } = useExamStore.getState()
    for (const sys of PE_SYSTEMS) {
      for (const el of sys.elements) expect(pe[sys.id].marks[el.id]).toBe('-')
    }
    expect(screen.getByText('PHYSICAL EXAMINATION')).toBeInTheDocument()
    useExamStore.getState().reset()
  })

  it('Library renders items and a count', () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    )
    expect(screen.getByText(/items$/)).toBeInTheDocument()
  })
})
