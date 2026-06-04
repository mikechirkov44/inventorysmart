import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Password input with show/hide toggle.
 * Props: same as standard <input type="password"> plus className
 */
export default function PasswordInput({ value, onChange, placeholder, className = '', disabled = false, required = false, name, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`password-input-wrapper ${className}`}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        name={name}
        autoComplete={autoComplete}
        className="password-input-field"
      />
      <button type="button" className="password-toggle" onClick={() => setVisible(!visible)} tabIndex={-1}>
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
