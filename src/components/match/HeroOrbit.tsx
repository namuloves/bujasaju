'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Animated elliptical orbit showing 4 billionaires at a time.
 * After a full rotation (4 steps), shifts the window by 1 person
 * through a pool of 7, so each rotation reveals a new face.
 */

const POOL = [
  {
    name: '일론 머스크',
    ilju: '갑신',
    netWorth: '1,198조',
    photo: 'https://assets.weforum.org/sf_account/image/SU7jY2MYK0Qaj6IgY6e0hXgO4LBYNB6qKxy9f-cr8KU.jpg',
    source: 'Tesla',
  },
  {
    name: '이재용',
    ilju: '갑자',
    netWorth: '33조',
    photo: 'https://specials-images.forbesimg.com/imageserve/661d531ae908e033f6c8e551/416x416.jpg?background=000000&cropX1=1080&cropX2=2007&cropY1=93&cropY2=1020',
    source: 'Samsung',
  },
  {
    name: '저커버그',
    ilju: '무신',
    netWorth: '292조',
    photo: 'https://specials-images.forbesimg.com/imageserve/5c76b7d331358e35dd2773a9/416x416.jpg?background=000000&cropX1=0&cropX2=4000&cropY1=0&cropY2=4000',
    source: 'Meta',
  },
  {
    name: '오프라 윈프리',
    ilju: '을유',
    netWorth: '4.7조',
    photo: 'https://specials-images.forbesimg.com/imageserve/676068efbbd9fffe1679c9d6/416x416.jpg?background=000000&cropX1=152&cropX2=881&cropY1=87&cropY2=816',
    source: 'Media',
  },
  {
    name: '김범수',
    ilju: '을유',
    netWorth: '5.2조',
    photo: 'https://specials-images.forbesimg.com/imageserve/60b118d16fe6a0bfa17167c8/416x416.jpg?background=000000&cropX1=384&cropX2=2566&cropY1=172&cropY2=2352',
    source: '카카오',
  },
  {
    name: '빌 게이츠',
    ilju: '임술',
    netWorth: '154조',
    photo: 'https://specials-images.forbesimg.com/imageserve/62d599ede3ff49f348f9b9b4/416x416.jpg?background=000000&cropX1=155&cropX2=976&cropY1=340&cropY2=1161',
    source: 'Microsoft',
  },
  {
    name: '워런 버핏',
    ilju: '임자',
    netWorth: '209조',
    photo: 'https://specials-images.forbesimg.com/imageserve/5babb7f1a7ea4342a948b79a/416x416.jpg?background=000000&cropX1=748&cropX2=3075&cropY1=1753&cropY2=4082',
    source: 'Berkshire',
  },
];

const VISIBLE = 4;
const POOL_SIZE = POOL.length;
const RX = 100;
const RY = 40;
const PAUSE_MS = 2500;
const MOVE_MS = 1800;
const STEP = (Math.PI * 2) / VISIBLE;

interface AvatarPos {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  z: number;
}

function computePositions(baseAngle: number): AvatarPos[] {
  return Array.from({ length: VISIBLE }, (_, i) => {
    const angle = baseAngle + i * STEP;
    const x = Math.cos(angle) * RX;
    const y = Math.sin(angle) * RY;
    const depth = Math.sin(angle);
    const scale = 0.75 + depth * 0.25;
    const opacity = 0.6 + depth * 0.4;
    return { x, y, scale, opacity, z: depth };
  });
}

function easeInOut(t: number): number {
  // Cubic ease-in-out — softer start and end than quadratic
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Pick 4 people from the pool starting at offset, wrapping around. */
function pickPeople(offset: number) {
  return Array.from({ length: VISIBLE }, (_, i) => POOL[(offset + i) % POOL_SIZE]);
}

export default function HeroOrbit() {
  const [positions, setPositions] = useState<AvatarPos[]>(() => computePositions(0));
  const [offset, setOffset] = useState(0);
  const stationRef = useRef(0);
  const stepsInRound = useRef(0);
  const rafRef = useRef(0);
  const timeoutRef = useRef(0);

  const currentPeople = pickPeople(offset);

  useEffect(() => {
    let cancelled = false;

    function animateStep() {
      if (cancelled) return;
      const fromAngle = stationRef.current * STEP;
      const toAngle = fromAngle + STEP;
      const start = performance.now();

      function tick(now: number) {
        if (cancelled) return;
        const elapsed = now - start;
        const progress = Math.min(elapsed / MOVE_MS, 1);
        const eased = easeInOut(progress);
        const angle = fromAngle + (toAngle - fromAngle) * eased;
        setPositions(computePositions(angle));

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          stationRef.current += 1;
          stepsInRound.current += 1;

          if (stepsInRound.current >= VISIBLE) {
            stepsInRound.current = 0;
            setOffset((prev) => (prev + 1) % POOL_SIZE);
          }

          timeoutRef.current = window.setTimeout(animateStep, PAUSE_MS);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    timeoutRef.current = window.setTimeout(animateStep, PAUSE_MS);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  const sorted = positions
    .map((pos, i) => ({ pos, person: currentPeople[i] }))
    .sort((a, b) => a.pos.z - b.pos.z);

  return (
    <div className="relative w-full h-[130px] sm:h-[150px] mb-6">
      {/* Faint ellipse track */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div
          className="border border-gray-200/30 rounded-[50%]"
          style={{ width: RX * 2, height: RY * 2 }}
        />
      </div>

      {sorted.map(({ pos, person }) => (
        <div
          key={person.name}
          className="absolute left-1/2 top-1/2 flex items-center gap-1.5 pointer-events-none will-change-transform"
          style={{
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${pos.scale})`,
            opacity: pos.opacity,
          }}
        >
          <div className="w-10 h-10 rounded-[12px] overflow-hidden shrink-0 bg-gray-200">
            <img
              src={person.photo}
              alt={person.name}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&size=80&background=random&bold=true`;
              }}
            />
          </div>
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 border border-gray-100/60 whitespace-nowrap" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <p className="text-[10px] font-bold text-gray-800 leading-tight">{person.name}</p>
            <p className="text-[8px] text-gray-400 leading-tight">{person.source} · {person.netWorth}</p>
            <p className="text-[8px] font-semibold text-indigo-500 leading-tight">{person.ilju}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
