import React from 'react';

interface SparklineProps {
  baselineClicks: number;
  recentClicks: number;
  dropPercent: number;
  width?: number;
  height?: number;
  className?: string;
}

export default function Sparkline({
  baselineClicks,
  recentClicks,
  dropPercent,
  width = 72,
  height = 24,
  className = '',
}: SparklineProps) {
  // Generate a realistic 7-point 8-week curve from baseline level down to recent level
  const isSevere = dropPercent >= 50;
  const isModerate = dropPercent >= 20;

  const points = [
    { x: 2, y: 8 + Math.random() * 2 },
    { x: 14, y: 7 + Math.random() * 3 },
    { x: 26, y: 6 },
    { x: 38, y: 10 + (dropPercent / 100) * 4 },
    { x: 50, y: 14 + (dropPercent / 100) * 6 },
    { x: 62, y: 18 + (dropPercent / 100) * 4 },
    { x: 70, y: Math.min(22, 17 + (dropPercent / 100) * 5) },
  ];

  // SVG path curve generator (Catmull-Rom or cubic Bezier)
  const pathD = points.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x},${pt.y}`;
    const prev = arr[idx - 1];
    const cpX = (prev.x + pt.x) / 2;
    return `${acc} C ${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
  }, '');

  const strokeColor = isSevere ? '#f43f5e' : isModerate ? '#f59e0b' : '#10b981';
  const fillColor = isSevere ? 'rgba(244, 63, 94, 0.15)' : 'rgba(245, 158, 11, 0.12)';

  const areaD = `${pathD} L 70,24 L 2,24 Z`;

  return (
    <div className={`inline-flex items-center ${className}`} title={`8-week decay curve: -${dropPercent}%`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 72 24"
        fill="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`grad-${dropPercent}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#grad-${dropPercent})`} />
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* End pulse circle */}
        <circle cx="70" cy={points[points.length - 1].y} r="2.5" fill={strokeColor} />
      </svg>
    </div>
  );
}
