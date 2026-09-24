import { useEffect, useRef } from 'react';

interface Props {
  firstImage: string;
  secondImage: string;
  gridSize?: number;
  pixelColor?: string;
  animationStepDuration?: number;
  className?: string;
}

export default function PixelTransition({
  firstImage,
  secondImage,
  gridSize = 9,
  pixelColor = '#1c1917',
  animationStepDuration = 1200,
  className = '',
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const firstRef = useRef<HTMLImageElement>(null);
  const secondRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    const canvas = canvasRef.current;
    const imgFirst = firstRef.current;
    const imgSecond = secondRef.current;
    if (!wrapper || !inner || !canvas || !imgFirst || !imgSecond) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function syncCanvasSize() {
      canvas!.width = inner!.offsetWidth;
      canvas!.height = inner!.offsetHeight;
    }
    syncCanvasSize();
    window.addEventListener('resize', syncCanvasSize);

    const total = gridSize * gridSize;
    const cellState = new Uint8Array(total); // 0 = hidden, 1 = visible

    function drawPixels() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      const cw = canvas!.width / gridSize;
      const ch = canvas!.height / gridSize;
      ctx!.fillStyle = pixelColor;
      for (let i = 0; i < total; i++) {
        if (cellState[i] === 1) {
          const col = i % gridSize;
          const row = Math.floor(i / gridSize);
          ctx!.fillRect(col * cw, row * ch, cw, ch);
        }
      }
    }

    const shuffle = () => [...Array(total).keys()].sort(() => Math.random() - 0.5);

    let timeouts: ReturnType<typeof setTimeout>[] = [];
    let isActive = false;

    function clearAll() {
      timeouts.forEach(clearTimeout);
      timeouts = [];
      cellState.fill(0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
    }

    function animate(goingIn: boolean) {
      clearAll();
      const STEPS = 12;
      const half = animationStepDuration / 2;
      const stepDelay = half / STEPS;
      const batchSize = Math.ceil(total / STEPS);
      const order1 = shuffle();
      const order2 = shuffle();

      for (let s = 0; s < STEPS; s++) {
        const batch = order1.slice(s * batchSize, (s + 1) * batchSize);
        timeouts.push(setTimeout(() => {
          batch.forEach((i) => { cellState[i] = 1; });
          drawPixels();
        }, s * stepDelay));
      }

      timeouts.push(setTimeout(() => {
        if (goingIn) {
          imgFirst!.style.opacity = '0';
          imgSecond!.style.opacity = '1';
        } else {
          imgSecond!.style.opacity = '0';
          imgFirst!.style.opacity = '1';
        }
      }, half));

      for (let s = 0; s < STEPS; s++) {
        const batch = order2.slice(s * batchSize, (s + 1) * batchSize);
        timeouts.push(setTimeout(() => {
          batch.forEach((i) => { cellState[i] = 0; });
          drawPixels();
        }, half + s * stepDelay));
      }
    }

    function handleEnter() {
      if (!isActive) { isActive = true; animate(true); }
    }
    function handleLeave() {
      if (isActive) { isActive = false; animate(false); }
    }
    function handleClick() {
      if (isActive) { handleLeave(); } else { handleEnter(); }
    }

    const isTouch =
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;

    if (!isTouch) {
      wrapper.addEventListener('mouseenter', handleEnter);
      wrapper.addEventListener('mouseleave', handleLeave);
    } else {
      wrapper.addEventListener('click', handleClick);
    }

    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', syncCanvasSize);
      wrapper.removeEventListener('mouseenter', handleEnter);
      wrapper.removeEventListener('mouseleave', handleLeave);
      wrapper.removeEventListener('click', handleClick);
    };
  }, [gridSize, pixelColor, animationStepDuration]);

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  return (
    <div ref={wrapperRef} className={`w-full cursor-pointer rounded-2xl ${className}`}>
      <div
        ref={innerRef}
        className="relative w-full overflow-hidden rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800"
        style={{ aspectRatio: '3 / 4' }}
      >
        <img ref={firstRef} src={firstImage} alt="Profile" draggable={false} style={imgStyle} />
        <img ref={secondRef} src={secondImage} alt="Profile alternate" draggable={false} style={{ ...imgStyle, opacity: 0 }} />
        <canvas
          ref={canvasRef}
          className="pointer-events-none"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 10 }}
        />
      </div>
    </div>
  );
}
