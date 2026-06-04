import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'sm' | 'toolbar';

type BaseProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

type ButtonAsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-950 text-white hover:bg-slate-800 focus-visible:ring-slate-950 disabled:bg-slate-300 disabled:text-white',
  secondary:
    'border border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:text-slate-950 focus-visible:ring-[var(--accent)] disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
  ghost:
    'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-[var(--accent)] disabled:text-slate-400',
};

const sizeClasses: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-sm',
  sm: 'min-h-10 px-4 text-sm',
  toolbar:
    'min-h-9 px-3.5 text-[13px] leading-none sm:min-h-10 sm:px-4 sm:text-sm',
};

function buildClasses(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return [
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(' ');
}

export function Button(props: ButtonProps) {
  const {
    children,
    className,
    variant = 'primary',
    size = 'md',
    icon,
    ...rest
  } = props;

  const classes = buildClasses(variant, size, className);

  if ('href' in props && props.href) {
    const { href, ...anchorProps } = rest as AnchorHTMLAttributes<HTMLAnchorElement>;

    return (
      <a href={href} className={classes} {...anchorProps}>
        {icon}
        <span>{children}</span>
      </a>
    );
  }

  return (
    <button className={classes} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
