import { forwardRef } from 'react';

/**
 * Accessible FormInput component with built-in accessibility features
 * - Proper label association via htmlFor
 * - autocomplete support
 * - aria-describedby for error messages
 * - spellCheck disabled for usernames/emails
 */
const FormInput = forwardRef(({
    label,
    id,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
    error,
    icon,
    autoComplete,
    required = false,
    disabled = false,
    spellCheck = true,
    className = '',
    ...props
}, ref) => {
    const inputId = id || name;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
        <div className={className}>
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <i
                        className={`${icon} absolute left-4 top-1/2 -translate-y-1/2 text-gray-400`}
                        aria-hidden="true"
                    />
                )}
                <input
                    ref={ref}
                    id={inputId}
                    name={name}
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder ? `${placeholder}…` : undefined}
                    autoComplete={autoComplete}
                    required={required}
                    disabled={disabled}
                    spellCheck={spellCheck}
                    aria-describedby={errorId}
                    aria-invalid={error ? 'true' : undefined}
                    className={`
                        w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl 
                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all
                        dark:bg-slate-800 dark:text-white
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${icon ? 'pl-11 pr-4' : 'px-4'}
                        ${error ? 'border-red-500 focus:ring-red-500' : ''}
                    `}
                    {...props}
                />
            </div>
            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
                >
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true" />
                    {error}
                </p>
            )}
        </div>
    );
});

FormInput.displayName = 'FormInput';

export default FormInput;
