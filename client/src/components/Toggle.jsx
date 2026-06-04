/**
 * Custom toggle switch — replaces native checkboxes for on/off settings.
 * Props:
 *   checked - boolean
 *   onChange - callback(checked)
 *   label - text label
 *   disabled - boolean
 */
export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <label className={`toggle-wrapper ${disabled ? 'toggle-disabled' : ''}`}>
      <span className="toggle-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`toggle-switch ${checked ? 'toggle-on' : ''}`}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span className="toggle-knob" />
      </button>
    </label>
  );
}
