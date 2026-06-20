import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCaseStore } from '@/state/useCaseStore'
import { useExamStore } from '@/state/useExamStore'

const tabs = [
  { to: '/', label: 'Case builder', end: true },
  { to: '/exam', label: 'Exam' },
  { to: '/library', label: 'Library' },
]

export default function App() {
  const path = useLocation().pathname
  const resetCase = useCaseStore((s) => s.reset)
  const resetExam = useExamStore((s) => s.reset)

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar no-print">
        <h1 className="sr-only">OMFS note builder</h1>
        <nav className="topnav" aria-label="Primary">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <span className="spacer" />
        {path === '/' && (
          <button
            className="btn-sm"
            onClick={() => {
              if (window.confirm('Reset the case? This clears all procedures, entered values, and the encounter details.'))
                resetCase()
            }}
          >
            Reset case
          </button>
        )}
        {path === '/exam' && (
          <button
            className="btn-sm"
            onClick={() => {
              if (window.confirm('Reset the exam? This clears all findings, +/− marks, and comments.'))
                resetExam()
            }}
          >
            Reset exam
          </button>
        )}
      </header>
      <div className="phi-strip no-print">
        Do not enter patient identifiers (name, MRN, DOB) — leave them as EHR placeholders. Nothing
        is transmitted anywhere; the current case is kept in this browser tab only and clears when
        the tab closes. Close the tab when you’re done on a shared workstation.
      </div>
      <main className="app-main" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
