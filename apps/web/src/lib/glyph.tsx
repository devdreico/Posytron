import type { Archetype } from "./types";

const PALETTES = {
  moss: { accent: "#2F5D50", second: "#F2C14E" },
  signal: { accent: "#E24B26", second: "#2F5D50" },
  tag: { accent: "#C9971F", second: "#2F5D50" },
  blue: { accent: "#2B4C9B", second: "#E24B26" },
} as const;

export type Palette = keyof typeof PALETTES;

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function choosePalette(type: string): Palette {
  const map: Record<string, Palette> = {
    minimarket: "moss",
    kiosk: "tag",
    supermarket: "blue",
    restaurant: "signal",
    cafe: "tag",
    bakery: "tag",
    pharmacy: "moss",
    services: "blue",
    workshop: "signal",
    warehouse: "moss",
  };
  return map[type] ?? "moss";
}

export function archetypeFor(type: string): Archetype {
  const map: Record<string, Archetype> = {
    minimarket: "retail_grid",
    kiosk: "kiosk_single",
    supermarket: "supermarket_aisles",
    restaurant: "restaurant_tables",
    cafe: "cafe_bar_counter",
    bakery: "bakery_racks",
    pharmacy: "pharmacy_shelves",
    services: "services_rooms",
    workshop: "workshop_bays",
    warehouse: "warehouse_bulk",
  };
  return map[type] ?? "retail_grid";
}

export const ARCHETYPE_LABEL: Record<Archetype, string> = {
  kiosk_single: "Puesto único",
  retail_grid: "Cuadrícula de estanterías",
  supermarket_aisles: "Pasillos y cajas",
  restaurant_tables: "Mesas y servicio",
  cafe_bar_counter: "Barra y banquillos",
  bakery_racks: "Racks y horno",
  pharmacy_shelves: "Estanterías y mostrador",
  services_rooms: "Salas y recepción",
  workshop_bays: "Bahías de taller",
  warehouse_bulk: "Racks y muelle",
};

interface Props {
  archetype: Archetype;
  density?: 1 | 2 | 3;
  palette?: Palette;
  seed?: string;
  className?: string;
  animated?: boolean;
}

export function BusinessGlyph({
  archetype,
  density = 2,
  palette = "moss",
  seed = "posytron",
  className,
  animated = true,
}: Props) {
  const { accent, second } = PALETTES[palette];
  const h = hash(seed);
  const jitter = ((h % 17) - 8) * 0.8;
  const d = density;

  const stroke = "#10201C";
  const thin = 1.5;
  const bold = 2.5;

  const Lot = (
    <>
      <rect x={40} y={38} width={720} height={324} rx={8} fill="#FFFFFF" stroke={stroke} strokeWidth={bold} />
      <rect x={40} y={38} width={720} height={324} rx={8} fill="none" stroke={stroke} strokeWidth={thin} strokeDasharray="4 6" opacity={0.25} />
      <line x1={40} y1={362} x2={150} y2={362} stroke="#F1F0EA" strokeWidth={6} />
      <line x1={40} y1={362} x2={150} y2={362} stroke={accent} strokeWidth={2} strokeDasharray="6 4" />
    </>
  );

  const counter = (x: number, y: number, w = 120, h = 34) => (
    <>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={accent} opacity={0.14} stroke={accent} strokeWidth={bold} />
      <circle cx={x + w - 18} cy={y + h / 2} r={5} fill="none" stroke={accent} strokeWidth={thin} />
    </>
  );

  let body: React.ReactNode = null;

  switch (archetype) {
    case "kiosk_single": {
      const cols = 2 + d;
      body = (
        <>
          {Array.from({ length: cols }).map((_, i) => (
            <rect key={i} x={90 + i * (170 / cols) + jitter} y={120} width={120 / cols} height={110} rx={3} fill="none" stroke={stroke} strokeWidth={bold} />
          ))}
          <line x1={80} y1={230} x2={420} y2={230} stroke={stroke} strokeWidth={thin} strokeDasharray="3 5" />
          {counter(470, 150, 190, 60)}
          <rect x={480} y={240} width={160} height={70} rx={3} fill="none" stroke={second} strokeWidth={bold} />
          <path d="M480 240 l40 -26 h80 l40 26" fill="none" stroke={second} strokeWidth={bold} />
        </>
      );
      break;
    }
    case "retail_grid": {
      const rows = d;
      body = (
        <>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: 4 }).map((__, c) => (
              <rect
                key={`${r}-${c}`}
                x={80 + c * 150 + jitter / 2}
                y={80 + r * 92}
                width={118}
                height={64}
                rx={3}
                fill={(r + c) % 3 === 0 ? accent : "none"}
                fillOpacity={0.1}
                stroke={stroke}
                strokeWidth={bold}
              />
            ))
          )}
          <line x1={80} y1={80 + rows * 92 + 8} x2={680} y2={80 + rows * 92 + 8} stroke={stroke} strokeWidth={thin} strokeDasharray="4 6" />
          {counter(80, 300, 200, 40)}
        </>
      );
      break;
    }
    case "supermarket_aisles": {
      const n = 3 + d * 2;
      body = (
        <>
          {Array.from({ length: n }).map((_, i) => (
            <rect
              key={i}
              x={80 + i * (540 / n)}
              y={90}
              width={520 / n - 16}
              height={190}
              rx={3}
              fill="none"
              stroke={stroke}
              strokeWidth={bold}
            />
          ))}
          {Array.from({ length: 3 }).map((_, i) => (
            <g key={i}>
              <rect x={80 + i * 170} y={300} width={130} height={22} rx={2} fill={accent} opacity={0.16} stroke={accent} strokeWidth={thin} />
              <circle cx={95 + i * 170} cy={332} r={4} fill={stroke} />
              <circle cx={195 + i * 170} cy={332} r={4} fill={stroke} />
            </g>
          ))}
        </>
      );
      break;
    }
    case "restaurant_tables": {
      const cols = 3 + d;
      const rows = 2;
      body = (
        <>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const x = 110 + c * (560 / cols) + jitter;
              const y = 110 + r * 110;
              return (
                <g key={`${r}-${c}`}>
                  <circle cx={x} cy={y} r={30} fill={(r + c) % 2 ? accent : "none"} fillOpacity={0.12} stroke={stroke} strokeWidth={bold} />
                  {[0, 90, 180, 270].map((a) => (
                    <circle key={a} cx={x + 42 * Math.cos((a * Math.PI) / 180)} cy={y + 42 * Math.sin((a * Math.PI) / 180)} r={6} fill="none" stroke={stroke} strokeWidth={thin} />
                  ))}
                </g>
              );
            })
          )}
          <rect x={100} y={300} width={110} height={40} rx={3} fill={second} opacity={0.14} stroke={second} strokeWidth={bold} />
          <line x1={240} y1={320} x2={700} y2={320} stroke={stroke} strokeWidth={thin} strokeDasharray="5 6" />
        </>
      );
      break;
    }
    case "cafe_bar_counter": {
      body = (
        <>
          <rect x={80} y={150} width={620} height={46} rx={4} fill={accent} opacity={0.14} stroke={accent} strokeWidth={bold} />
          <rect x={80} y={236} width={620} height={14} rx={2} fill="none" stroke={stroke} strokeWidth={thin} />
          {Array.from({ length: 3 + d }).map((_, i) => (
            <circle key={i} cx={130 + i * (520 / (3 + d))} cy={278} r={13} fill="none" stroke={stroke} strokeWidth={bold} />
          ))}
          <rect x={560} y={80} width={150} height={54} rx={3} fill="none" stroke={stroke} strokeWidth={bold} />
          <rect x={575} y={94} width={30} height={26} rx={2} fill="none" stroke={second} strokeWidth={thin} />
          <rect x={615} y={94} width={30} height={26} rx={2} fill="none" stroke={second} strokeWidth={thin} />
          {Array.from({ length: 3 }).map((_, i) => (
            <line key={i} x1={90 + i * 40} y1={80} x2={90 + i * 40} y2={110} stroke={stroke} strokeWidth={thin} />
          ))}
        </>
      );
      break;
    }
    case "bakery_racks": {
      body = (
        <>
          {Array.from({ length: d + 1 }).map((_, i) => (
            <g key={i}>
              <rect x={90 + i * 150} y={90} width={110} height={200} rx={3} fill="none" stroke={stroke} strokeWidth={bold} />
              {[0, 1, 2].map((k) => (
                <line key={k} x1={96 + i * 150} y1={140 + k * 50} x2={194 + i * 150} y2={140 + k * 50} stroke={stroke} strokeWidth={thin} />
              ))}
              {[0, 1, 2].map((k) => (
                <circle key={`c${k}`} cx={145 + i * 150} cy={128 + k * 50} r={9} fill={second} opacity={0.35} stroke={second} strokeWidth={thin} />
              ))}
            </g>
          ))}
          <rect x={560} y={140} width={170} height={140} rx={4} fill="none" stroke={accent} strokeWidth={bold} />
          <path d="M585 210 h120" stroke={accent} strokeWidth={thin} strokeDasharray="4 4" />
          {counter(560, 300, 170, 34)}
        </>
      );
      break;
    }
    case "pharmacy_shelves": {
      body = (
        <>
          {Array.from({ length: d + 2 }).map((_, i) => (
            <g key={i}>
              <rect x={80 + i * 105} y={90} width={88} height={190} rx={3} fill="none" stroke={stroke} strokeWidth={bold} />
              {[0, 1, 2, 3].map((k) => (
                <line key={k} x1={84 + i * 105} y1={122 + k * 42} x2={164 + i * 105} y2={122 + k * 42} stroke={stroke} strokeWidth={thin} />
              ))}
            </g>
          ))}
          <rect x={560} y={130} width={50} height={140} rx={4} fill={second} opacity={0.18} stroke={second} strokeWidth={bold} />
          <rect x={625} y={130} width={50} height={140} rx={4} fill="none" stroke={second} strokeWidth={bold} />
          <path d="M585 150 h0" stroke={second} />
          {counter(80, 300, 180, 40)}
        </>
      );
      break;
    }
    case "services_rooms": {
      const cols = 2 + d;
      body = (
        <>
          {Array.from({ length: cols }).map((_, i) => (
            <g key={i}>
              <rect x={80 + i * (600 / cols)} y={80} width={600 / cols - 20} height={110} rx={3} fill="none" stroke={stroke} strokeWidth={bold} />
              <rect x={100 + i * (600 / cols)} y={120} width={70} height={40} rx={2} fill={accent} opacity={0.14} stroke={accent} strokeWidth={thin} />
              <circle cx={80 + i * (600 / cols) + 40} cy={210} r={8} fill="none" stroke={stroke} strokeWidth={thin} />
            </g>
          ))}
          <line x1={80} y1={240} x2={680} y2={240} stroke={stroke} strokeWidth={thin} strokeDasharray="6 6" />
          {counter(80, 290, 170, 40)}
          <circle cx={600} cy={310} r={22} fill="none" stroke={second} strokeWidth={bold} />
        </>
      );
      break;
    }
    case "workshop_bays": {
      body = (
        <>
          {Array.from({ length: d + 1 }).map((_, i) => (
            <g key={i}>
              <rect x={80 + i * 200} y={90} width={170} height={200} rx={4} fill="none" stroke={stroke} strokeWidth={bold} />
              <rect x={105 + i * 200} y={150} width={120} height={70} rx={10} fill={accent} opacity={0.12} stroke={accent} strokeWidth={thin} />
              <circle cx={130 + i * 200} cy={235} r={10} fill="none" stroke={stroke} strokeWidth={thin} />
              <circle cx={200 + i * 200} cy={235} r={10} fill="none" stroke={stroke} strokeWidth={thin} />
            </g>
          ))}
          <line x1={80} y1={310} x2={700} y2={310} stroke={stroke} strokeWidth={thin} strokeDasharray="8 6" />
        </>
      );
      break;
    }
    case "warehouse_bulk": {
      body = (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={i}>
              <rect x={80 + i * 95} y={70} width={80} height={220} rx={2} fill="none" stroke={stroke} strokeWidth={bold} />
              {[0, 1, 2, 3, 4].map((k) => (
                <line key={k} x1={80 + i * 95} y1={100 + k * 42} x2={160 + i * 95} y2={100 + k * 42} stroke={stroke} strokeWidth={thin} />
              ))}
            </g>
          ))}
          <rect x={500} y={120} width={220} height={90} rx={3} fill={accent} opacity={0.12} stroke={accent} strokeWidth={bold} />
          <path d="M500 210 l30 40 h160 l30 -40" fill="none" stroke={accent} strokeWidth={thin} strokeDasharray="5 5" />
          <rect x={520} y={260} width={60} height={40} rx={3} fill="none" stroke={second} strokeWidth={bold} />
          <circle cx={535} cy={306} r={7} fill="none" stroke={second} strokeWidth={thin} />
          <circle cx={565} cy={306} r={7} fill="none" stroke={second} strokeWidth={thin} />
        </>
      );
      break;
    }
  }

  return (
    <svg
      viewBox="0 0 800 400"
      className={className}
      role="img"
      aria-label={`Representación del negocio: ${ARCHETYPE_LABEL[archetype]}`}
    >
      <g className={animated ? "glyph-draw" : undefined}>
        {Lot}
        {body}
      </g>
    </svg>
  );
}
