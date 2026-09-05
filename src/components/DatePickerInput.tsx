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

    // Converte valor para formato visual no campo de texto se tiver vindo como YYYY-MM-DD
    const getDisplayValue = (): string => {
      if (!value) return '';
      const str = value.trim();
      if (mode === 'month') {
        if (/^\d{4}-\d{2}$/.test(str)) {
          const [y, m] = str.split('-');
          return `${m}/${y}`;
        }
        return str;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [y, m, d] = str.split('-');
        return `${d}/${m}/${y}`;
      }
      return str;
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

    const handleNativePickerClick = (e: React.MouseEvent<HTMLInputElement>) => {
      if (disabled) return;
      try {
        if (typeof (e.target as HTMLInputElement).showPicker === 'function') {
          (e.target as HTMLInputElement).showPicker();
        }
      } catch (err) {
        // Deixa o clique padrão nativo atuar
      }
    };

    const defaultPlaceholder = mode === 'month' ? 'MM/AAAA' : 'DD/MM/AAAA';

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-semibold text-black block">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            value={getDisplayValue()}
            onChange={handleTextInputChange}
            placeholder={placeholder || defaultPlaceholder}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full rounded-md border border-muted/30 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-black/30 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
              value ? 'pr-20' : 'pr-12',
              error && 'border-red-500 focus:ring-red-500/50 bg-red-50/10',
              className
            )}
            {...props}
          />

          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-20">
            {/* Botão de limpar quando houver valor preenchido */}
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Limpar data"
                title="Limpar data"
                className="w-7 h-7 flex items-center justify-center text-muted/60 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors focus:outline-none cursor-pointer"
              >
                <span className="text-xs font-bold leading-none">✕</span>
              </button>
            )}

            {/* Container do botão de abrir calendário com o input nativo sobreposto */}
            <div
              className={cn(
                "relative w-9 h-9 flex items-center justify-center rounded-md hover:bg-black/10 active:bg-black/15 transition-colors cursor-pointer",
                disabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
              )}
              title="Abrir calendário"
            >
              <Calendar className="w-4 h-4 text-black pointer-events-none" />

              {/* Input nativo sobreposto cobrindo toda a área clicável do ícone, permitindo toque direto e showPicker no mobile/desktop */}
              <input
                ref={hiddenDateInputRef}
                type={mode === 'month' ? 'month' : 'date'}
                value={getNativePickerValue()}
                onChange={handleNativePickerChange}
                onClick={handleNativePickerClick}
                disabled={disabled}
                tabIndex={-1}
                aria-label={`Selecionar ${label || 'data'} no calendário`}
                title="Abrir calendário"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    );
  }
);

DatePickerInput.displayName = 'DatePickerInput';
