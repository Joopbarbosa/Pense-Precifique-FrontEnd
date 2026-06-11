interface LogoProps {
  size?: number;
}

function Logo({ size = 40 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt="Pense & Precifique"
      style={{
        display: "block",
        objectFit: "contain",
        transform: "translateX(3%)",
      }}
    />
  );
}

interface WordmarkProps {
  size?: number;
  darkMode?: boolean;
}

function Wordmark({ size = 17, darkMode = false }: WordmarkProps) {
  const pense = darkMode ? "#ffffff" : "#2A9D8F";
  const amp = darkMode ? "#FFD9BF" : "#F97316";
  const precifique = darkMode ? "#ffffff" : "#3A372F";

  return (
    <span
      style={{
        fontWeight: 700,
        letterSpacing: "-0.01em",
        lineHeight: 1.05,
        fontSize: size,
      }}
    >
      <span style={{ color: pense }}>Pense</span>
      <span style={{ color: amp, margin: "0 1px" }}>&amp;</span>
      <span style={{ color: precifique }}>Precifique</span>
    </span>
  );
}

export { Logo, Wordmark };
