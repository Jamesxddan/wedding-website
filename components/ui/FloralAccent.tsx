interface Props {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  size?: number;
  opacity?: number;
  animate?: "float" | "sway" | "none";
  className?: string;
}

const ROTATIONS = {
  "top-left": "-rotate-12",
  "top-right": "rotate-12",
  "bottom-left": "-rotate-6",
  "bottom-right": "rotate-6",
};

const POSITIONS = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

export default function FloralAccent({
  position = "top-right",
  size = 120,
  opacity = 0.18,
  animate = "float",
  className = "",
}: Props) {
  const animClass = animate === "float" ? "floral-float" : animate === "sway" ? "floral-sway" : "";

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none absolute ${POSITIONS[position]} ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${ROTATIONS[position]} ${animClass}`}
        style={{ opacity }}
      >
        {/* Centre */}
        <circle cx="60" cy="60" r="10" fill="#B56576" />
        {/* 8 petals */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
          <ellipse
            key={angle}
            cx="60"
            cy="60"
            rx="8"
            ry="22"
            fill="#F4C2C2"
            transform={`rotate(${angle} 60 60) translate(0 -20)`}
          />
        ))}
        {/* Small leaves */}
        {[22, 112, 202, 292].map((angle) => (
          <ellipse
            key={`leaf-${angle}`}
            cx="60"
            cy="60"
            rx="5"
            ry="15"
            fill="#87A878"
            transform={`rotate(${angle} 60 60) translate(0 -30)`}
          />
        ))}
      </svg>
    </div>
  );
}
