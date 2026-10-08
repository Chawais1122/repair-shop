'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Point {
  date: string;
  value: number;
}

interface Props {
  data: Point[];
  /** Names the single series (no legend needed for one series). */
  valueLabel: string;
}

const HEIGHT = 240;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 56 };
const RADIUS = 4;

/** Rounds the axis max up to 1/2/5 × 10^n so gridlines land on readable values. */
function niceMax(value: number): number {
  if (value <= 0) return 100;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const step = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return step * exp;
}

function shortDate(key: string): string {
  return new Date(`${key}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function compactCurrency(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `$${Math.round(n)}`;
}

/** Bar with only the top (data-end) corners rounded, anchored to the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

export function DailySalesChart({ data, valueLabel }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = plotW / Math.max(1, data.length);
  // Thin bars with a visible gap between neighbours
  const barW = Math.max(2, Math.min(28, band - 2, band * 0.7));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.floor(plotW / 64)));
  const empty = data.every((d) => d.value === 0);
  const hovered = hover !== null ? data[hover] : null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Show chart' : 'Show table'}
        </Button>
      </div>

      {showTable ? (
        <div className="max-h-72 overflow-y-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-4">Date</TableHead>
                <TableHead className="px-4 text-right">{valueLabel}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="px-4">{shortDate(d.date)}</TableCell>
                  <TableCell className="px-4 text-right tabular-nums">
                    {formatCurrency(d.value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full">
          {empty && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No sales in this period
            </p>
          )}
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={`${valueLabel} per day`}
            className="block overflow-visible"
            onMouseLeave={() => setHover(null)}
          >
            <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
              {/* Recessive grid and y axis */}
              {ticks.map((t) => {
                const y = plotH - (t / max) * plotH;
                return (
                  <g key={t}>
                    <line
                      x1={0}
                      x2={plotW}
                      y1={y}
                      y2={y}
                      className="stroke-border"
                      strokeDasharray={t === 0 ? undefined : '2 4'}
                    />
                    <text
                      x={-8}
                      y={y}
                      dy="0.32em"
                      textAnchor="end"
                      className="fill-muted-foreground text-[11px] tabular-nums"
                    >
                      {compactCurrency(t)}
                    </text>
                  </g>
                );
              })}

              {data.map((d, i) => {
                const h = (d.value / max) * plotH;
                const x = i * band + (band - barW) / 2;
                return (
                  <g key={d.date}>
                    {d.value > 0 && (
                      <path
                        d={barPath(x, plotH - h, barW, h)}
                        fill="var(--chart-1)"
                        opacity={hover === null || hover === i ? 1 : 0.45}
                      />
                    )}
                    {i % labelEvery === 0 && (
                      <text
                        x={i * band + band / 2}
                        y={plotH + 18}
                        textAnchor="middle"
                        className="fill-muted-foreground text-[11px]"
                      >
                        {shortDate(d.date)}
                      </text>
                    )}
                    {/* Hit target spans the whole band, larger than the bar */}
                    <rect
                      x={i * band}
                      y={0}
                      width={band}
                      height={plotH}
                      fill="transparent"
                      onMouseEnter={() => setHover(i)}
                    />
                  </g>
                );
              })}
            </g>
          </svg>

          {hovered && hover !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border bg-popover px-3 py-2 text-xs shadow-md"
              style={{
                left: Math.min(
                  Math.max(MARGIN.left + hover * band + band / 2, 70),
                  width - 70,
                ),
                top: 0,
              }}
            >
              <p className="font-medium">{shortDate(hovered.date)}</p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-sm bg-chart-1" aria-hidden="true" />
                {valueLabel}
                <span className="font-medium tabular-nums text-foreground">
                  {formatCurrency(hovered.value)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
