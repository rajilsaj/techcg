/** Round member picture (Gravatar URL built on the server by avatarUrl). */
export function Avatar({ src, size = 20, className = "" }: { src: string; size?: number; className?: string }) {
  return (
    // Plain <img>: Gravatar already serves the right size, no need for the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`inline-block shrink-0 rounded-full bg-bg-secondary object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
