export default function EcoPlasticLogo({ light = false, size = 32, showText = true, textClass = "" }) {
  const textColor = light ? "#ffffff" : "#113324";
  const leafColor = light ? "#4ade80" : "#008F5A";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", userSelect: "none" }}>
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Organic leaf background */}
        <path
          d="M32 4C48 4 60 16 60 32C60 48 48 60 32 60C16 60 4 48 4 32C4 16 16 4 32 4Z"
          fill={leafColor}
          fillOpacity={light ? "0.2" : "0.12"}
        />
        {/* Leaf contour */}
        <path
          d="M18 42C16 30 24 16 46 12C48 30 40 44 26 48C21 50 19 46 18 42Z"
          fill={leafColor}
        />
        {/* Internal recycling arrows (white) */}
        <path
          d="M30 22L34 26L30 30"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M26 26H34C37 26 39 28 39 31V33"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M40 38L36 34L40 30"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M44 34H36C33 34 31 32 31 29V27"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="35" cy="35" r="2.5" fill="#ffffff" />
      </svg>

      {showText && (
        <span
          className={textClass}
          style={{
            fontSize: size >= 32 ? "1.38rem" : "1.15rem",
            fontWeight: 800,
            color: textColor,
            letterSpacing: "-0.03em",
            fontFamily: "Inter, sans-serif"
          }}
        >
          Eco<span style={{ color: light ? "#4ade80" : "#008F5A" }}>Plastic</span>
        </span>
      )}
    </div>
  );
}
