import React from 'react';
import { Calendar } from 'lucide-react';
import { cn, maskDate, maskMonthYear } from '../utils';

interface DatePickerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string) => void;
  mode?: 'date' | 'month';
  className?: string;
}

export const DatePickerInput = React.forwardRef<HTMLInputElement, DatePickerInputProps>(
  ({ label, error, value = '', onChange, mode = 'date', placeholder, className, disabled, ...props }, ref) => {
    const hiddenDateInputRef = React.useRef<HTMLInputElement>(null);

    // Converte valor em formato visual (DD/MM/AAAA ou MM/AAAA) para formato nativo do picker (YYYY-MM-DD ou YYYY-MM)
    const getNativePickerValue = (): string => {
      if (!value) return '';
      const str = value.trim();

      if (mode === 'month') {
        // Formato esperado no visual: MM/AAAA
        if (str.includes('/')) {
          const [m, y] = str.split('/');
          if (m && y && y.length === 4) return `${y}-${m.padStart(2, '0')}`;
        }
        if (str.includes('-')) {
          const [y, m] = str.split('-');
          if (y && m) return `${y}-${m.padStart(2, '0')}`;
        }
        return '';
      }

      // Mode: date (DD/MM/AAAA)
      if (str.includes('/')) {
        const [d, m, y] = str.split('/');
        if (d && m && y && y.length === 4) {
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
      }
      if (str.includes('-')) {
        const parts = str.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) return str; // YYYY-MM-DD
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return '';
    };

    const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const formatted = mode === 'month' ? maskMonthYear(raw) : maskDate(raw);
      onChange?.(formatted);
    };

    const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const picked = e.target.value; // YYYY-MM-DD ou YYYY-MM ou vazio
      if (!picked) {
        onChange?.('');
        return;
      }

      if (mode === 'month') {
        const [y, m] = picked.split('-');
        if (y && m) {
          onChange?.(`${m}/${y}`);
        }
      } else {
        const [y, m, d] = picked.split('-');
        if (y && m && d) {
          onChange?.(`${d}/${m}/${y}`);
        }
      }
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange?.('');
      if (hiddenDateInputRef.current) {
        hiddenDateInputRef.current.value = '';
      }
    };

    const openCalendarPicker = () => {
      if (disabled) return;
      try {
        if (hiddenDateInputRef.current) {
          if (typeof hiddenDateInputRef.current.showPicker === 'function') {
            hiddenDateInputRef.current.showPicker();
          } else {
            hiddenDateInputRef.current.focus();
            hiddenDateInputRef.current.click();
          }
        }
      } catch (err) {
        // Fallback para navegadores mais antigos
        hiddenDateInputRef.current?.click();
      }
    };

    const defaultPlaceholder = mode === 'month' ? 'MM/AAAA' : 'DD/MM/AAAA';

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-semibold text-primary block">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={handleTextInputChange}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-muted/30 bg-white px-3 py-2 pr-16 text-sm ring-offset-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
              error && 'border-red-500 focus:ring-red-500/50 bg-red-50/10',
              className
            )}
            {...props}
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Botão de limpar quando houver valor preenchido */}
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpar data"
                title="Limpar data"
                className="p-1 text-muted/60 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors focus:outline-none cursor-pointer"
              >
                <span className="text-xs font-bold leading-none">✕</span>
              </button>
            )}

            {/* Botão de abrir calendário */}
            <button
              type="button"
              onClick={openCalendarPicker}
              disabled={disabled}
              aria-label={`Selecionar ${label || 'data'} no calendário`}
              title="Abrir calendário"
              className={cn(
                "p-1 text-primary/70 hover:text-primary hover:bg-primary/10 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer",
                disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
            >
              <Calendar className="w-4 h-4 text-primary" />
            </button>
          </div>

          {/* Input nativo oculto para disparar o seletor visual nativo com suporte completo */}
          <input
            ref={hiddenDateInputRef}
            type={mode === 'month' ? 'month' : 'date'}
            value={getNativePickerValue()}
            onChange={handleNativePickerChange}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only absolute pointer-events-none opacity-0"
          />
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

DatePickerInput.displayName = 'DatePickerInput';
