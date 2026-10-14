/** A profile's photo, or its initials on a soft blue tile when there is none. */
export function ProfilePhoto({
  src,
  initials,
  className = "",
  textClass = "text-5xl",
  alt = "",
  lazy = false,
}: {
  src: string | null;
  initials: string;
  className?: string;
  textClass?: string;
  alt?: string;
  lazy?: boolean;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} referrerPolicy="no-referrer" loading={lazy ? "lazy" : undefined} className={`bg-bg-secondary object-cover ${className}`} />;
  }
  return (
    <span
      role={alt ? "img" : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`grid place-items-center bg-bg bg-gradient-to-br from-accent/15 to-accent/5 font-semibold tracking-tight text-accent ${textClass} ${className}`}
    >
      {initials}
    </span>
  );
}
