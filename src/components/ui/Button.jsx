import { forwardRef } from 'react';

/**
 * Button — botão base da Estante Livre.
 *
 * Variantes:
 *  - primary   → verde musgo, ação principal (ex: "Alugar agora")
 *  - secondary → terracota, ação de destaque/alternativa (ex: "Reservar")
 *  - ghost     → contorno em madeira, ações neutras (ex: "Cancelar")
 *
 * Tamanhos: sm | md | lg
 */
const VARIANT_STYLES = {
  primary: `
    bg-moss-600 text-parchment
    shadow-[0_2px_6px_-1px_rgba(79,107,57,0.45)]
    hover:bg-moss-700 hover:shadow-[0_6px_16px_-3px_rgba(79,107,57,0.55)]
    active:bg-moss-800 active:shadow-[0_1px_3px_-1px_rgba(79,107,57,0.4)]
    focus-visible:outline-moss-400
  `,
  secondary: `
    bg-terracotta-500 text-parchment
    shadow-[0_2px_6px_-1px_rgba(176,74,40,0.45)]
    hover:bg-terracotta-600 hover:shadow-[0_6px_16px_-3px_rgba(176,74,40,0.55)]
    active:bg-terracotta-700 active:shadow-[0_1px_3px_-1px_rgba(176,74,40,0.4)]
    focus-visible:outline-terracotta-400
  `,
  ghost: `
    bg-transparent text-wood-700 border border-wood-300
    shadow-none
    hover:bg-wood-100 hover:border-wood-400
    active:bg-wood-200
    focus-visible:outline-wood-400
  `,
};

const SIZE_STYLES = {
  sm: 'px-3.5 py-1.5 text-xs gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-base gap-2.5',
};

const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    icon = null,
    iconPosition = 'left',
    isLoading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`
        group relative inline-flex select-none items-center justify-center
        rounded-md font-sans font-semibold tracking-wide
        transition-all duration-300 ease-out
        hover:-translate-y-0.5 active:translate-y-0
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0
        ${VARIANT_STYLES[variant]}
        ${SIZE_STYLES[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...rest}
    >
      {/* Leve brilho diagonal no hover — como reflexo em capa de couro */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
      >
        <span
          className="absolute -inset-y-4 -left-1/2 w-1/3 -skew-x-12 bg-white/20
                     opacity-0 transition-all duration-500 ease-out
                     group-hover:left-[120%] group-hover:opacity-100"
        />
      </span>

      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin text-current"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}

      {!isLoading && icon && iconPosition === 'left' && (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      )}

      <span className="relative">{children}</span>

      {!isLoading && icon && iconPosition === 'right' && (
        <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      )}
    </button>
  );
});

export default Button;
