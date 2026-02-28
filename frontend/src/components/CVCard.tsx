import type { CVResult } from "../api/agents";

interface Props {
  cv: CVResult;
  onApply?: (cv: CVResult) => void;
  onDismiss?: () => void;
}

export default function CVCard({ cv, onApply, onDismiss }: Props) {
  return (
    <div className="bg-white border border-wsp-border relative">
      {/* Red left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-wsp-red" />

      <div className="pl-5 pr-4 pt-4 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display font-semibold text-wsp-dark text-sm tracking-wide">
                {cv.employee_name}
              </h4>
              {cv.requested_name !== cv.employee_name && (
                <span className="text-[10px] text-wsp-muted font-mono border border-wsp-border px-1.5 py-0.5">
                  matched for "{cv.requested_name}"
                </span>
              )}
            </div>
            <p className="text-xs text-wsp-red font-display font-medium tracking-wide mt-0.5">
              {cv.role_on_project}
            </p>
            <p className="text-[11px] text-wsp-muted font-mono mt-0.5">
              {cv.employee_id} · {cv.years_experience} yrs exp
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {onApply && (
              <button
                onClick={() => onApply(cv)}
                className="wsp-btn-primary text-[11px] px-3 py-1.5"
              >
                Add to Team
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="wsp-btn-ghost text-[11px] px-3 py-1.5"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <p className="text-xs text-wsp-mid font-body leading-relaxed mb-3">{cv.summary}</p>

        {/* Disciplines */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {cv.disciplines.map(d => (
            <span
              key={d}
              className="wsp-badge bg-wsp-bg-soft text-wsp-dark border border-wsp-border text-[10px] font-display tracking-wide"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Education */}
        <p className="text-[11px] text-wsp-muted font-body mb-3">
          <span className="font-display font-semibold tracking-wider uppercase text-[9px] text-wsp-muted mr-1.5">
            Education
          </span>
          {cv.education}
        </p>

        {/* Key projects */}
        {cv.key_projects.length > 0 && (
          <div>
            <p className="font-display font-semibold tracking-wider uppercase text-[9px] text-wsp-muted mb-1.5">
              Key Projects
            </p>
            <div className="space-y-1">
              {cv.key_projects.map((p, i) => (
                <div key={i} className="flex items-baseline gap-2 text-[11px]">
                  <span className="font-mono text-wsp-red shrink-0">{p.value}</span>
                  <span className="font-body text-wsp-dark">{p.name}</span>
                  <span className="text-wsp-muted">— {p.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
