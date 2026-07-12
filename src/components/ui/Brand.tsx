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
      className="block object-contain translate-x-[3%]"
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
      className="font-bold leading-[1.05] tracking-[-0.01em]"
      style={{ fontSize: size }}
    >
      <span style={{ color: pense }}>Pense</span>
      <span className="mx-px" style={{ color: amp }}>&amp;</span>
      <span style={{ color: precifique }}>Precifique</span>
    </span>
  );
}

export { Logo, Wordmark };
