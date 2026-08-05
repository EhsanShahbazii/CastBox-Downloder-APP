import React from 'react';
import { RemoteArtwork } from './RemoteArtwork';
import { Channel } from '../../types';
import justCoffeeReferenceArtwork from '../../assets/just-coffee-reference-artwork.png';
import coffeeBreakArtwork from '../../assets/reference-artwork/coffee-break.png';
import morningBrewArtwork from '../../assets/reference-artwork/morning-brew.png';
import slowSundaysArtwork from '../../assets/reference-artwork/slow-sundays.png';
import lateNightDriveArtwork from '../../assets/reference-artwork/late-night-drive.png';
import somewhereSomehowArtwork from '../../assets/reference-artwork/somewhere-somehow.png';
import littleMoreTimeArtwork from '../../assets/reference-artwork/little-more-time.png';
import blueHourArtwork from '../../assets/reference-artwork/blue-hour.png';

const usesReferenceArtwork = (key: Channel['artworkKey']) => key === 'just-coffee';
const referenceArtworkByKey: Partial<Record<Channel['artworkKey'], string>> = {
  'coffee-break': coffeeBreakArtwork,
  'morning-brew': morningBrewArtwork,
  'slow-sundays': slowSundaysArtwork,
  'late-night-drive': lateNightDriveArtwork,
  'somewhere-somehow': somewhereSomehowArtwork,
  'little-more-time': littleMoreTimeArtwork,
  'blue-hour': blueHourArtwork,
};

interface ArtworkImageProps {
  live?: boolean;
  artworkUrl?: string | null;
  artworkKey: Channel['artworkKey'];
  className?: string;
  alt?: string;
}

export const ArtworkImage: React.FC<ArtworkImageProps> = ({
  artworkKey, live = false, artworkUrl,
  className = 'w-full h-full object-cover',
  alt = 'Channel artwork',
}) => {
  if (live) return <RemoteArtwork url={artworkUrl} alt={alt} className={className}
    fallback={<ArtworkImage artworkKey={artworkKey} className={className} alt={alt} />} />;
  if (artworkKey === 'unavailable') return <div role="img" aria-label={`${alt}: artwork unavailable`} className={`${className} rounded-[inherit] bg-[var(--app-input-bg)]`} />;
  if (artworkKey === 'almost-episode') return <div role="img" aria-label={alt} className={`${className} rounded-[inherit] bg-no-repeat`} style={{ backgroundImage: `url(${justCoffeeReferenceArtwork})`, backgroundSize: '150% 150%', backgroundPosition: '100% 50%' }} />;
  if (usesReferenceArtwork(artworkKey)) return <img src={justCoffeeReferenceArtwork} className={`${className} overflow-hidden rounded-[inherit]`} alt={alt} />;
  const referenceArtwork = referenceArtworkByKey[artworkKey];
  if (referenceArtwork) return <img src={referenceArtwork} className={`${className} overflow-hidden rounded-[inherit]`} alt={alt} />;
  const svgClass = `${className} overflow-hidden rounded-[inherit]`;
  switch (artworkKey) {
    case 'just-coffee-cup':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="cup-wood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4A3423" />
              <stop offset="50%" stopColor="#301F14" />
              <stop offset="100%" stopColor="#1C1109" />
            </linearGradient>
            <radialGradient id="cup-glow" cx="45%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#B45309" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
            </radialGradient>
            <radialGradient id="cup-latte" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="25%" stopColor="#F5DEB3" />
              <stop offset="60%" stopColor="#B87333" />
              <stop offset="88%" stopColor="#6E3816" />
              <stop offset="100%" stopColor="#3B1C0B" />
            </radialGradient>
          </defs>

          {/* Table background */}
          <rect width="200" height="200" fill="url(#cup-wood)" />
          {/* Subtle wood grains */}
          <line x1="0" y1="45" x2="200" y2="42" stroke="#5C3F2B" strokeWidth="1" opacity="0.4" />
          <line x1="0" y1="120" x2="200" y2="116" stroke="#26170E" strokeWidth="1.5" opacity="0.6" />

          {/* Saucer */}
          <ellipse cx="100" cy="118" rx="72" ry="54" fill="#FAF6EE" filter="drop-shadow(0 12px 16px rgba(0,0,0,0.65))" />
          <ellipse cx="100" cy="116" rx="66" ry="48" fill="#EAE1D1" />
          <ellipse cx="100" cy="114" rx="52" ry="38" fill="#FAF6EE" />

          {/* Mug and Handle */}
          <g filter="drop-shadow(0 8px 12px rgba(0,0,0,0.5))">
            <path d="M142,92 C172,92 172,126 142,128" fill="none" stroke="#FAF6EE" strokeWidth="10" strokeLinecap="round" />
            <circle cx="100" cy="108" r="46" fill="#FAF6EE" />
            <circle cx="100" cy="108" r="43" fill="#E4D9C7" />
            {/* Coffee Fill */}
            <circle cx="100" cy="108" r="38" fill="url(#cup-latte)" />
            {/* Latte Art Heart */}
            <path d="M100,88 Q87,100 100,122 Q113,100 100,88 Z" fill="#FFFDF8" opacity="0.95" />
            <circle cx="93.5" cy="95" r="6" fill="#FFFDF8" opacity="0.95" />
            <circle cx="106.5" cy="95" r="6" fill="#FFFDF8" opacity="0.95" />
            <path d="M100,94 Q100,118 100,125" stroke="#7A3D14" strokeWidth="1.2" strokeLinecap="round" />
          </g>

          {/* Warm Ambient Sunlight */}
          <rect width="200" height="200" fill="url(#cup-glow)" pointerEvents="none" />
        </svg>
      );

    case 'late-night-drive':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="lnd-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B101D" />
              <stop offset="60%" stopColor="#151A28" />
              <stop offset="100%" stopColor="#1E2330" />
            </linearGradient>
            <radialGradient id="lnd-tail" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF2A2A" />
              <stop offset="35%" stopColor="#DD1111" />
              <stop offset="70%" stopColor="#880000" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Night Highway Background */}
          <rect width="200" height="200" fill="url(#lnd-sky)" />

          {/* Distant streetlights bokeh */}
          <circle cx="45" cy="80" r="14" fill="#F59E0B" opacity="0.3" filter="blur(4px)" />
          <circle cx="155" cy="80" r="14" fill="#F59E0B" opacity="0.3" filter="blur(4px)" />
          <circle cx="60" cy="95" r="8" fill="#FBBF24" opacity="0.4" />
          <circle cx="140" cy="95" r="8" fill="#FBBF24" opacity="0.4" />

          {/* Wet asphalt road with perspective lines */}
          <polygon points="20,200 180,200 115,110 85,110" fill="#0D111A" />
          <line x1="100" y1="110" x2="100" y2="200" stroke="#EF4444" strokeWidth="1.5" opacity="0.3" strokeDasharray="8 6" />

          {/* Sleek sports car rear silhouette */}
          {/* Car cabin / roof */}
          <path d="M78,135 Q100,118 122,135 L132,152 Q100,154 68,152 Z" fill="#181D26" />
          {/* Rear glass window */}
          <path d="M82,137 Q100,123 118,137 L126,148 Q100,150 74,148 Z" fill="#0A0E17" />
          {/* Car body wide rear bumper */}
          <path d="M60,150 Q100,148 140,150 L145,170 Q100,174 55,170 Z" fill="#202633" />
          <rect x="70" y="152" width="60" height="12" rx="3" fill="#141822" />

          {/* Glowing Red Taillights Strip */}
          <circle cx="70" cy="155" r="16" fill="url(#lnd-tail)" />
          <circle cx="130" cy="155" r="16" fill="url(#lnd-tail)" />
          <path d="M62,154 Q100,152 138,154" stroke="#FF3333" strokeWidth="3" strokeLinecap="round" />
          <path d="M64,154 L76,154" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <path d="M124,154 L136,154" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />

          {/* Wet Road Red Reflections */}
          <ellipse cx="100" cy="182" rx="42" ry="5" fill="#EF4444" opacity="0.35" filter="blur(2px)" />
        </svg>
      );

    case 'somewhere-somehow':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="sh-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#43658B" />
              <stop offset="40%" stopColor="#C87D55" />
              <stop offset="70%" stopColor="#ECA366" />
              <stop offset="100%" stopColor="#FED7AA" />
            </linearGradient>
          </defs>
          <rect width="200" height="135" fill="url(#sh-sky)" />
          <circle cx="135" cy="85" r="26" fill="#FFFBEB" opacity="0.9" />
          {/* Deep Wooden Sill & Mug */}
          <rect x="0" y="130" width="200" height="70" fill="#2B1F17" />
          <rect x="0" y="130" width="200" height="6" fill="#453123" />
          {/* Ceramic Cup */}
          <ellipse cx="105" cy="148" rx="28" ry="9" fill="#FAF6EE" />
          <path d="M88,145 L92,175 Q105,180 118,175 L122,145 Z" fill="#FAF6EE" />
          <ellipse cx="105" cy="146" rx="17" ry="5" fill="#4B2A15" />
        </svg>
      );

    case 'little-more-time':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="lmt-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4E3D31" />
              <stop offset="100%" stopColor="#2A1D15" />
            </linearGradient>
          </defs>
          {/* Warm Wall */}
          <rect width="200" height="200" fill="url(#lmt-bg)" />
          {/* Diagonal Blind Slat Shadows */}
          <polygon points="0,20 180,0 200,15 0,38" fill="#F8E5BA" opacity="0.25" />
          <polygon points="0,60 180,40 200,55 0,78" fill="#F8E5BA" opacity="0.25" />
          <polygon points="0,100 180,80 200,95 0,118" fill="#F8E5BA" opacity="0.25" />
          <polygon points="0,140 180,120 200,135 0,158" fill="#F8E5BA" opacity="0.25" />
          {/* Potted Foliage Shadow & Mug */}
          <ellipse cx="60" cy="90" rx="35" ry="50" fill="#1C140F" opacity="0.45" />
          {/* Ceramic Coffee Mug */}
          <ellipse cx="120" cy="155" rx="32" ry="11" fill="#FAF6EE" filter="drop-shadow(2px 6px 8px rgba(0,0,0,0.5))" />
          <path d="M100,150 L104,180 Q120,185 136,180 L140,150 Z" fill="#FAF6EE" />
          <ellipse cx="120" cy="150" rx="20" ry="6" fill="#3D1E0C" />
        </svg>
      );

    case 'blue-hour':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="bh-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B132B" />
              <stop offset="50%" stopColor="#1C2541" />
              <stop offset="100%" stopColor="#253556" />
            </linearGradient>
            <radialGradient id="bh-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.95" />
              <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Twilight Window Sky */}
          <rect width="200" height="200" fill="url(#bh-sky)" />
          {/* Distant city dots */}
          <circle cx="35" cy="140" r="1.5" fill="#FEF08A" opacity="0.8" />
          <circle cx="55" cy="145" r="1.2" fill="#FEF08A" opacity="0.7" />
          <circle cx="95" cy="150" r="1.8" fill="#FEF08A" opacity="0.9" />
          <circle cx="150" cy="142" r="1.4" fill="#FEF08A" opacity="0.7" />
          <circle cx="175" cy="148" r="1.5" fill="#FEF08A" opacity="0.8" />
          {/* Hanging Cord & Pendant Light */}
          <line x1="100" y1="0" x2="100" y2="65" stroke="#0F172A" strokeWidth="2.5" />
          <path d="M78,85 Q100,65 122,85 Z" fill="#1E293B" />
          {/* Glowing amber bulb */}
          <circle cx="100" cy="90" r="38" fill="url(#bh-glow)" pointerEvents="none" />
          <circle cx="100" cy="88" r="9" fill="#FFFBEB" />
          <circle cx="100" cy="88" r="6" fill="#FBBF24" />
        </svg>
      );


    case 'coffee-break':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="cb-wall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4D3B31" />
              <stop offset="60%" stopColor="#2E211A" />
              <stop offset="100%" stopColor="#1E140F" />
            </linearGradient>
            <linearGradient id="cb-sun" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.6" />
              <stop offset="45%" stopColor="#F59E0B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
            </linearGradient>
            <linearGradient id="cb-book1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2C485A" />
              <stop offset="100%" stopColor="#192F3E" />
            </linearGradient>
            <linearGradient id="cb-book2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8A482A" />
              <stop offset="100%" stopColor="#5D2D16" />
            </linearGradient>
            <linearGradient id="cb-book3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#C4A47C" />
              <stop offset="100%" stopColor="#8F6D45" />
            </linearGradient>
          </defs>

          {/* Background room/window corner */}
          <rect width="200" height="200" fill="url(#cb-wall)" />

          {/* Window pane light on left */}
          <path d="M0,10 L70,25 L65,120 L0,135 Z" fill="#F8E5BA" opacity="0.3" />
          <line x1="35" y1="18" x2="32" y2="128" stroke="#3D291D" strokeWidth="2" opacity="0.6" />

          {/* Wooden table surface */}
          <path d="M0,120 L200,105 L200,200 L0,200 Z" fill="#2A1B14" />
          <line x1="0" y1="120" x2="200" y2="105" stroke="#52392A" strokeWidth="1.5" />

          {/* Potted plant top right */}
          <ellipse cx="170" cy="80" rx="14" ry="7" fill="#5A3A28" />
          <path d="M156,80 L160,110 L180,110 L184,80 Z" fill="#442818" />
          {/* Leaves */}
          <path d="M170,80 Q195,45 185,25 Q165,40 170,80 Z" fill="#3D5A34" />
          <path d="M165,80 Q140,55 135,35 Q155,50 165,80 Z" fill="#4B6E40" />
          <path d="M172,80 Q185,60 198,62 Q185,75 172,80 Z" fill="#2E4527" />

          {/* Stack of books on left side */}
          {/* Bottom thick book */}
          <rect x="25" y="145" width="85" height="18" rx="2" fill="url(#cb-book1)" />
          <rect x="35" y="147" width="73" height="14" fill="#F2ECE1" />
          <rect x="24" y="145" width="11" height="18" rx="1" fill="#1F3644" />
          {/* Middle book */}
          <rect x="30" y="130" width="75" height="16" rx="2" fill="url(#cb-book2)" />
          <rect x="38" y="132" width="65" height="12" fill="#E8DEC9" />
          <rect x="29" y="130" width="9" height="16" rx="1" fill="#6E341B" />
          {/* Top book */}
          <rect x="28" y="117" width="72" height="14" rx="2" fill="url(#cb-book3)" />
          <rect x="36" y="119" width="62" height="10" fill="#FFFDF8" />
          <rect x="27" y="117" width="9" height="14" rx="1" fill="#7A5A34" />

          {/* Saucer and Steaming Ceramic Cup on right */}
          <ellipse cx="145" cy="168" rx="30" ry="10" fill="#FAF6F0" filter="drop-shadow(2px 5px 6px rgba(0,0,0,0.6))" />
          <ellipse cx="145" cy="167" rx="26" ry="8" fill="#E6DCCE" />

          {/* Cup */}
          <path d="M125,135 L129,162 Q145,168 161,162 L165,135 Z" fill="#FAF6F0" />
          <path d="M162,140 C173,140 173,155 160,157" fill="none" stroke="#FAF6F0" strokeWidth="4" strokeLinecap="round" />
          <ellipse cx="145" cy="135" rx="20" ry="6" fill="#3D1E0C" />
          <ellipse cx="145" cy="135" rx="17" ry="4.5" fill="#5F3418" />

          {/* Steam wisps */}
          <path d="M140,126 Q137,115 143,105 Q149,95 144,85" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
          <path d="M149,124 Q154,114 150,103 Q146,92 152,82" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.3" />

          {/* Sunlight beam */}
          <rect width="200" height="200" fill="url(#cb-sun)" pointerEvents="none" />
        </svg>
      );

    case 'morning-brew':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="mb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4A7599" />
              <stop offset="35%" stopColor="#C98B68" />
              <stop offset="65%" stopColor="#F5B278" />
              <stop offset="100%" stopColor="#FDE68A" />
            </linearGradient>
            <linearGradient id="mb-window" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1E1916" />
              <stop offset="100%" stopColor="#120E0C" />
            </linearGradient>
            <linearGradient id="mb-cup" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FAF7F2" />
              <stop offset="100%" stopColor="#DDD2C1" />
            </linearGradient>
          </defs>

          {/* Sunrise Sky */}
          <rect width="200" height="135" fill="url(#mb-sky)" />

          {/* Glowing morning sun on horizon */}
          <circle cx="135" cy="85" r="28" fill="#FFFBEB" opacity="0.85" filter="drop-shadow(0 0 15px #FDE68A)" />

          {/* Distant City Skyline Silhouettes */}
          <rect x="15" y="80" width="18" height="55" fill="#3A2E2C" opacity="0.8" />
          <rect x="36" y="65" width="22" height="70" fill="#2D2322" opacity="0.9" />
          <rect x="62" y="75" width="16" height="60" fill="#3D302E" opacity="0.85" />
          <rect x="82" y="85" width="20" height="50" fill="#4B3934" opacity="0.8" />
          <rect x="105" y="70" width="25" height="65" fill="#332724" opacity="0.9" />
          <rect x="155" y="78" width="20" height="57" fill="#44342E" opacity="0.8" />
          <rect x="178" y="62" width="22" height="73" fill="#2E231F" opacity="0.9" />

          {/* Window Frame Architectural Lines */}
          <rect x="0" y="0" width="14" height="200" fill="url(#mb-window)" />
          <rect x="186" y="0" width="14" height="200" fill="url(#mb-window)" />
          <rect x="0" y="0" width="200" height="12" fill="url(#mb-window)" />
          <line x1="68" y1="12" x2="68" y2="135" stroke="#181310" strokeWidth="4" />

          {/* Deep Wooden Window Sill */}
          <path d="M0,132 L200,132 L200,200 L0,200 Z" fill="#2B1F17" />
          <rect x="0" y="132" width="200" height="6" fill="#4A372A" />

          {/* Folded Morning Newspaper on Sill */}
          <path d="M40,158 L125,145 L155,188 L65,198 Z" fill="#F0ECE1" filter="drop-shadow(2px 5px 6px rgba(0,0,0,0.5))" />
          <path d="M48,160 L120,150 L122,154 L50,164 Z" fill="#1C1815" opacity="0.8" />
          {/* Newspaper columns text mimic */}
          <line x1="55" y1="168" x2="88" y2="163" stroke="#9A9084" strokeWidth="1.5" />
          <line x1="56" y1="172" x2="89" y2="167" stroke="#9A9084" strokeWidth="1.5" />
          <line x1="57" y1="176" x2="90" y2="171" stroke="#9A9084" strokeWidth="1.5" />
          <line x1="96" y1="162" x2="130" y2="157" stroke="#9A9084" strokeWidth="1.5" />
          <line x1="97" y1="166" x2="131" y2="161" stroke="#9A9084" strokeWidth="1.5" />

          {/* Ceramic Coffee Mug on newspaper */}
          <g filter="drop-shadow(3px 6px 8px rgba(0,0,0,0.6))">
            <path d="M128,148 C140,148 140,165 127,167" fill="none" stroke="#FAF7F2" strokeWidth="4.5" strokeLinecap="round" />
            <path d="M96,140 L100,172 Q115,176 128,172 L132,140 Z" fill="url(#mb-cup)" />
            <ellipse cx="114" cy="140" rx="18" ry="6" fill="#FAF7F2" />
            <ellipse cx="114" cy="140" rx="15" ry="4.5" fill="#422513" />
          </g>

          {/* Sunrise Glint highlight */}
          <ellipse cx="106" cy="144" rx="2" ry="6" fill="#FFFDF5" opacity="0.6" transform="rotate(-15 106 144)" />
        </svg>
      );

    case 'slow-sundays':
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="ss-room" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3A2D23" />
              <stop offset="50%" stopColor="#241B14" />
              <stop offset="100%" stopColor="#18110C" />
            </linearGradient>
            <radialGradient id="ss-candle" cx="30%" cy="30%" r="40%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#F59E0B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#18110C" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="ss-duvet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5EFE6" />
              <stop offset="50%" stopColor="#DFD4C5" />
              <stop offset="100%" stopColor="#B3A28F" />
            </linearGradient>
          </defs>

          {/* Cozy bedroom background */}
          <rect width="200" height="200" fill="url(#ss-room)" />

          {/* Nightstand top left with candle */}
          <rect x="0" y="45" width="60" height="70" fill="#2E2017" />
          {/* Small potted succulent */}
          <ellipse cx="18" cy="62" rx="7" ry="3" fill="#4B3322" />
          <path d="M13,62 L15,75 L21,75 L23,62 Z" fill="#3D2517" />
          <path d="M18,62 Q24,50 20,44 Q14,52 18,62 Z" fill="#476943" />

          {/* Candle glass & flame */}
          <rect x="36" y="52" width="14" height="20" rx="2" fill="#EADBC8" opacity="0.8" />
          <ellipse cx="43" cy="52" rx="7" ry="2.5" fill="#D3BEA2" />
          {/* Flame */}
          <path d="M43,48 Q46,42 43,37 Q40,42 43,48 Z" fill="#FBBF24" />
          <circle cx="43" cy="45" r="1.5" fill="#EF4444" />
          {/* Candle ambient halo */}
          <circle cx="43" cy="45" r="45" fill="url(#ss-candle)" pointerEvents="none" />

          {/* Luxurious draped linen bed duvet */}
          <path d="M0,105 Q60,90 120,100 Q170,110 200,98 L200,200 L0,200 Z" fill="url(#ss-duvet)" />
          {/* Duvet folds and wrinkles */}
          <path d="M20,135 Q70,120 130,130 Q170,140 200,132" fill="none" stroke="#9A8774" strokeWidth="2.5" opacity="0.6" />
          <path d="M40,165 Q95,150 160,162" fill="none" stroke="#9A8774" strokeWidth="2.5" opacity="0.5" />
          <path d="M0,175 Q60,170 110,185" fill="none" stroke="#9A8774" strokeWidth="2" opacity="0.5" />

          {/* Sleeping curled cat */}
          <g filter="drop-shadow(2px 5px 6px rgba(0,0,0,0.35))">
            {/* Curled cat body */}
            <ellipse cx="128" cy="148" rx="36" ry="24" fill="#6A5343" transform="rotate(-10 128 148)" />
            {/* Fur highlights / stripes */}
            <path d="M110,140 Q122,130 138,136" fill="none" stroke="#48362A" strokeWidth="3" strokeLinecap="round" />
            <path d="M116,147 Q128,138 145,144" fill="none" stroke="#48362A" strokeWidth="3" strokeLinecap="round" />
            <path d="M124,155 Q134,146 150,152" fill="none" stroke="#48362A" strokeWidth="3" strokeLinecap="round" />
            {/* Cat tucked head */}
            <circle cx="98" cy="148" r="16" fill="#785E4D" />
            {/* Ears */}
            <polygon points="90,137 84,124 96,131" fill="#5C4537" />
            <polygon points="102,135 106,123 112,133" fill="#5C4537" />
            {/* Sleeping eyes */}
            <path d="M91,148 Q94,151 97,148" fill="none" stroke="#3D2B20" strokeWidth="1.5" strokeLinecap="round" />
            {/* Curled paws */}
            <ellipse cx="106" cy="158" rx="6" ry="4" fill="#8C705D" />
            {/* Curled tail hugging body */}
            <path d="M158,150 Q168,162 152,168 Q135,172 120,166" fill="none" stroke="#6A5343" strokeWidth="8" strokeLinecap="round" />
          </g>
        </svg>
      );

    case 'spanish':
    case 'daily-notes':
    default:
      return (
        <svg
          viewBox="0 0 200 200"
          className={svgClass}
          role="img"
          aria-label={alt}
        >
          <defs>
            <linearGradient id="def-bg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4A3425" />
              <stop offset="100%" stopColor="#251810" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill="url(#def-bg)" />
          <circle cx="100" cy="95" r="45" fill="#C25425" opacity="0.85" />
          <path d="M85,115 L100,75 L115,115 Z" fill="#FAF6EE" />
          <circle cx="100" cy="102" r="6" fill="#C25425" />
        </svg>
      );
  }
};
