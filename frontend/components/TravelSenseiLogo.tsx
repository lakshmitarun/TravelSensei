import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export default function TravelSenseiLogo({ className = "h-10", iconOnly = false }: LogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* TS Compass + Jet + Mountain Emblem */}
      <svg
        viewBox="0 0 500 500"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto aspect-square flex-shrink-0 drop-shadow-md"
      >
        <defs>
          <linearGradient id="tsTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#0d9488" />
            <stop offset="100%" stopColor="#0f4c47" />
          </linearGradient>
          <linearGradient id="tsDarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="100%" stopColor="#092825" />
          </linearGradient>
          <linearGradient id="starGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {/* Outer Compass Rose Ring & Points */}
        <circle cx="250" cy="230" r="165" stroke="url(#tsDarkGrad)" strokeWidth="16" fill="none" />
        
        {/* North Arrow */}
        <polygon points="250,25 275,85 250,70 225,85" fill="#0d9488" />
        {/* South Arrow (Pin Apex) */}
        <polygon points="250,475 285,395 250,420 215,395" fill="#092825" />
        {/* East Arrow */}
        <polygon points="440,230 380,255 395,230 380,205" fill="#0d9488" />
        {/* West Arrow */}
        <polygon points="60,230 120,205 105,230 120,255" fill="#0d9488" />

        {/* Stylized 'T' Bar (Top Horizontal Wing) */}
        <path
          d="M 120 135 C 120 135, 180 130, 310 135 C 330 135, 340 145, 320 160 C 290 180, 230 180, 230 180 L 150 180 Z"
          fill="url(#tsTealGrad)"
        />

        {/* Stylized 'T' Vertical Stem & Base Curve */}
        <path
          d="M 180 180 L 180 340 C 180 370, 200 400, 230 420 L 250 435 C 240 400, 220 360, 220 320 L 220 180 Z"
          fill="url(#tsTealGrad)"
        />

        {/* Stylized 'S' Ribbon Flowing into Airplane */}
        <path
          d="M 310 145 C 230 145, 210 210, 260 250 C 330 300, 390 320, 340 400 C 310 440, 260 440, 250 435 C 290 430, 320 380, 300 340 C 270 280, 190 260, 230 190 C 250 155, 290 155, 310 145 Z"
          fill="url(#tsTealGrad)"
        />

        {/* Airplane Silhouette at S-curve Top Right */}
        <g transform="translate(305, 145) rotate(-25) scale(0.75)">
          <path
            d="M0,0 L25,-12 L45,-5 L30,5 L50,12 L35,18 L15,10 L-10,20 L-5,10 Z"
            fill="#092825"
          />
        </g>

        {/* Golden Star Accent */}
        <polygon
          points="390,190 396,204 410,210 396,216 390,230 384,216 370,210 384,204"
          fill="url(#starGrad)"
        />

        {/* Mountain Silhouettes at Base */}
        <polygon points="210,380 240,330 270,380" fill="#0d9488" opacity="0.9" />
        <polygon points="250,380 275,340 300,380" fill="#092825" opacity="0.8" />
        <polygon points="180,390 215,350 240,390" fill="#0f766e" opacity="0.85" />
      </svg>

      {!iconOnly && (
        <span className="font-extrabold text-2xl tracking-tight text-on-surface font-sans">
          TravelSensei
        </span>
      )}
    </div>
  );
}
