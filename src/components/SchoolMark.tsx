export function SchoolMark({
  light = false,
  large = false,
}: {
  light?: boolean;
  large?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full border font-display font-semibold leading-none",
        large ? "h-16 w-16 text-2xl" : "h-10 w-10 text-lg",
        light
          ? "border-paper/40 bg-paper/10 text-paper"
          : "border-forest/30 bg-forest-mist text-forest",
      ].join(" ")}
    >
      S
    </span>
  );
}
