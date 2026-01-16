import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  icon?: string; // Class name for FontAwesome icon (e.g., 'fas fa-envelope')
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <i className={icon}></i>
          </div>
        )}
        <input
          className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors text-slate-900 placeholder-slate-400 ${
            error ? 'border-red-500' : 'border-slate-300'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};