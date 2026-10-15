import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { centsToMaskedInput, digitsToCents, type Cents } from '@/lib/money'

interface FieldShellProps {
  label: string
  hint?: string
  error?: string | null
  optional?: boolean
  htmlFor?: string
  children: ReactNode
}

export function FieldShell({ label, hint, error, optional, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="flex items-baseline gap-2 px-0.5">
        <span className="text-[0.8125rem] font-medium text-ink-2 tracking-[0.01em]">{label}</span>
        {optional && <span className="text-[0.75rem] text-ink-3">opcional</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="px-0.5 text-[0.8125rem] text-danger">{error}</p>
      ) : hint ? (
        <p className="px-0.5 text-[0.8125rem] text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

const inputBase =
  'w-full h-[3.25rem] px-4 rounded-md bg-surface text-ink placeholder:text-ink-3 ' +
  'border border-line shadow-soft outline-none ' +
  'transition-[border-color,box-shadow] duration-200 ' +
  'focus:border-accent focus:ring-4 focus:ring-accent/12'

interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'password'
  hint?: string
  error?: string | null
  optional?: boolean
  autoComplete?: string
  maxLength?: number
}

export function TextField({
  label, value, onChange, placeholder, type = 'text',
  hint, error, optional, autoComplete, maxLength,
}: TextFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} htmlFor={id}>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBase, error && 'border-danger focus:border-danger focus:ring-danger/12')}
      />
    </FieldShell>
  )
}

interface TextAreaFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  rows?: number
  maxLength?: number
}

export function TextAreaField({ label, value, onChange, placeholder, optional, rows = 3, maxLength = 280 }: TextAreaFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} optional={optional} htmlFor={id}>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBase, 'h-auto py-3.5 resize-none leading-relaxed')}
      />
    </FieldShell>
  )
}

interface MoneyFieldProps {
  label: string
  cents: Cents
  onChange: (cents: Cents) => void
  error?: string | null
  autoFocus?: boolean
}

/**
 * Os dígitos entram pela direita, como numa maquininha: digitar "5", "0", "0"
 * vira R$ 5,00. Não existe estado em que a vírgula esteja no lugar errado.
 */
export function MoneyField({ label, cents, onChange, error, autoFocus }: MoneyFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} error={error} htmlFor={id}>
      <div
        className={cn(
          'flex items-baseline gap-2 rounded-lg border border-line bg-surface px-5 py-4 shadow-soft',
          'transition-[border-color,box-shadow] duration-200',
          'focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/12',
          error && 'border-danger focus-within:border-danger focus-within:ring-danger/12',
        )}
      >
        <span className="font-display text-xl text-ink-3 select-none">R$</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={centsToMaskedInput(cents)}
          placeholder="0,00"
          aria-invalid={error ? true : undefined}
          onChange={(e) => onChange(digitsToCents(e.target.value))}
          className="numeric font-display min-w-0 flex-1 bg-transparent text-[2rem] leading-none tracking-[-0.02em] text-ink outline-none placeholder:text-ink-3/60"
        />
      </div>
    </FieldShell>
  )
}

interface DateFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  optional?: boolean
  hint?: string
  min?: string
}

export function DateField({ label, value, onChange, optional, hint, min }: DateFieldProps) {
  const id = useId()
  return (
    <FieldShell label={label} optional={optional} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputBase, 'numeric appearance-none')}
      />
    </FieldShell>
  )
}
