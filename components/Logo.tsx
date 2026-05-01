export function Logo({ size = 36 }: { size?: number }) {
  const fontSize = Math.round(size * 0.6);
  const radius = Math.round(size * 0.22);
  return (
    <span className="logo-mark" aria-label="Recipe Box">
      <span
        className="glyph"
        style={{ width: size, height: size, borderRadius: radius, fontSize }}
        aria-hidden="true"
      >
        R
      </span>
      <span className="word">
        <b>Recipe</b>Box
      </span>
    </span>
  );
}

export function GlyphOnly({ size = 36 }: { size?: number }) {
  const fontSize = Math.round(size * 0.6);
  const radius = Math.round(size * 0.22);
  return (
    <span className="logo-mark" aria-hidden="true">
      <span
        className="glyph"
        style={{ width: size, height: size, borderRadius: radius, fontSize }}
      >
        R
      </span>
    </span>
  );
}
