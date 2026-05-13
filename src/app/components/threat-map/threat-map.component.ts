import { Component, ElementRef, ViewChild, effect, inject, OnInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ThreatService, Attack } from '../../services/threat.service';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { NewsPanelComponent } from '../news-panel/news-panel.component';

@Component({
  selector: 'app-threat-map',
  standalone: true,
  imports: [DatePipe, MatIconModule, NewsPanelComponent],
  template: `
    <div class="w-full h-full relative overflow-hidden" style="background:#060b14;">
      <!-- Grid overlay -->
      <div class="absolute inset-0 z-0 pointer-events-none"
           style="background-image: linear-gradient(rgba(30,41,59,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.25) 1px, transparent 1px); background-size: 50px 50px; opacity: 0.6;">
      </div>
      <!-- Radial glow at center -->
      <div class="absolute inset-0 z-0 pointer-events-none"
           style="background: radial-gradient(ellipse at 50% 60%, rgba(37,99,235,0.04) 0%, transparent 70%);">
      </div>
      <div #mapContainer class="w-full h-full relative z-10"></div>

      <!-- Canvas for optimized attack rendering -->
      <canvas #canvasContainer class="absolute inset-0 z-20 pointer-events-none w-full h-full"></canvas>

      <!-- Attack Type Legend (bottom center) -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div class="flex items-center gap-3 px-4 py-2 rounded-full font-mono text-[9px]"
             style="background:rgba(6,11,20,0.85);border:1px solid rgba(51,65,85,0.4);backdrop-filter:blur(8px);">
          @for (type of attackTypes; track type.name) {
            <div class="flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full shrink-0"
                    [style.background]="type.color"
                    [style.box-shadow]="'0 0 4px ' + type.color"></span>
              <span class="text-slate-400 uppercase tracking-wider">{{ type.name }}</span>
            </div>
          }
        </div>
      </div>

      <!-- Loading Overlay -->
      @if (isLoading()) {
        <div class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0f18]/80 backdrop-blur-sm">
          <div class="relative flex h-12 w-12 mb-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20"></span>
            <span class="relative inline-flex rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent animate-spin"></span>
          </div>
          <div class="text-blue-400 font-mono text-sm tracking-widest uppercase animate-pulse">Initializing Global Grid...</div>
        </div>
      }

      <!-- Tooltip -->
      @if (hoveredCountry()) {
        <div class="fixed z-30 pointer-events-none"
             style="transform: translate(-50%, calc(-100% - 12px));"
             [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
          <div class="px-3 py-2 rounded-lg font-mono text-xs"
               style="background:rgba(6,11,20,0.95);border:1px solid rgba(59,130,246,0.35);box-shadow:0 8px 24px rgba(0,0,0,0.6),0 0 12px rgba(59,130,246,0.1);backdrop-filter:blur(8px);">
            <div class="font-bold text-slate-100 text-[11px] mb-1.5">{{ hoveredCountry() }}</div>
            <div class="flex gap-3 text-[10px]">
              <div class="flex items-center gap-1">
                <span class="text-red-400 font-bold">↑</span>
                <span class="text-slate-400">Out:</span>
                <span class="text-red-400 font-bold">{{ countryStats().source }}</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-blue-400 font-bold">↓</span>
                <span class="text-slate-400">In:</span>
                <span class="text-blue-400 font-bold">{{ countryStats().target }}</span>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Modal -->
      @if (selectedCountry()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center p-4"
             style="background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);">
          <div class="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
               style="background:rgba(6,11,20,0.98);border:1px solid rgba(51,65,85,0.6);box-shadow:0 24px 60px rgba(0,0,0,0.8),0 0 40px rgba(59,130,246,0.06);">
            <!-- Modal Header -->
            <div class="px-5 py-3.5 flex justify-between items-center shrink-0"
                 style="border-bottom:1px solid rgba(51,65,85,0.5);background:rgba(10,15,30,0.8);">
              <div class="flex items-center gap-2.5">
                <div class="w-2 h-2 rounded-full bg-blue-400" style="box-shadow:0 0 8px #60a5fa;"></div>
                <h2 class="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Threat Intelligence — {{ selectedCountry() }}
                </h2>
              </div>
              <button (click)="selectedCountry.set(null)"
                      class="modal-close-btn w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 transition-all text-sm"
                      style="border:1px solid rgba(51,65,85,0.4);">
                ✕
              </button>
            </div>
            <!-- Stats Row -->
            <div class="grid grid-cols-2 gap-3 p-4 shrink-0"
                 style="border-bottom:1px solid rgba(51,65,85,0.35);">
              <div class="p-3 rounded-lg" style="background:rgba(127,29,29,0.2);border:1px solid rgba(185,28,28,0.3);">
                <div class="text-[10px] text-red-400/70 uppercase tracking-widest mb-1 font-bold">Outbound Attacks</div>
                <div class="text-2xl font-mono font-black text-red-400" style="text-shadow:0 0 16px rgba(239,68,68,0.4);">
                  {{ selectedCountryStats().source }}
                </div>
              </div>
              <div class="p-3 rounded-lg" style="background:rgba(29,78,216,0.15);border:1px solid rgba(37,99,235,0.3);">
                <div class="text-[10px] text-blue-400/70 uppercase tracking-widest mb-1 font-bold">Inbound Attacks</div>
                <div class="text-2xl font-mono font-black text-blue-400" style="text-shadow:0 0 16px rgba(59,130,246,0.4);">
                  {{ selectedCountryStats().target }}
                </div>
              </div>
            </div>
            <!-- Activity List -->
            <div class="flex-1 overflow-y-auto p-4 modal-scroll">
              <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Activity</h3>
              <div class="space-y-1.5">
                @for (attack of selectedCountryAttacks(); track attack.id) {
                  <div class="modal-row p-2.5 rounded-lg text-[11px] font-mono flex justify-between items-center"
                       style="border:1px solid rgba(30,41,59,0.5);">
                    <div class="flex items-center gap-2">
                      <span class="w-1.5 h-1.5 rounded-full shrink-0"
                            [style.background]="attack.color"
                            [style.box-shadow]="'0 0 6px ' + attack.color"></span>
                      <span class="text-slate-200 font-bold" style="width:6rem;">{{ attack.type }}</span>
                    </div>
                    <div class="text-slate-400 flex-1 text-center text-[10px]">
                      @if (attack.sourceCountry === selectedCountry()) {
                        <span class="text-red-400 font-bold">OUT</span>
                        <span class="text-slate-600 mx-1">→</span>{{ attack.targetCountry }}
                      } @else {
                        <span class="text-blue-400 font-bold">IN</span>
                        <span class="text-slate-600 mx-1">←</span>{{ attack.sourceCountry }}
                      }
                    </div>
                    <div class="text-slate-600 text-[10px] w-16 text-right">{{ attack.timestamp | date:'HH:mm:ss' }}</div>
                  </div>
                }
                @if (selectedCountryAttacks().length === 0) {
                  <div class="text-slate-600 text-xs italic text-center py-6">No recent activity recorded.</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
        <app-news-panel />
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .modal-scroll::-webkit-scrollbar { width: 4px; }
    .modal-scroll::-webkit-scrollbar-track { background: transparent; }
    .modal-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .modal-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
    .modal-row { background: rgba(15,23,42,0.5); transition: background 0.15s; }
    .modal-row:hover { background: rgba(30,41,59,0.7) !important; }
    .modal-close-btn:hover { background: rgba(51,65,85,0.5); color: #e2e8f0; }
  `]
})
export class ThreatMapComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('canvasContainer', { static: true }) canvasContainer!: ElementRef<HTMLCanvasElement>;

  private threatService = inject(ThreatService);
  private platformId = inject(PLATFORM_ID);

  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | undefined;
  private projection: d3.GeoProjection | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private path: d3.GeoPath<any, d3.GeoPermissibleObjects> | undefined;
  private g: d3.Selection<SVGGElement, unknown, null, undefined> | undefined;
  private width = 0;
  private height = 0;
  private resizeObserver: ResizeObserver | undefined;

  // Canvas properties
  private ctx: CanvasRenderingContext2D | null = null;
  private currentTransform: d3.ZoomTransform = d3.zoomIdentity;
  private animationFrameId: number | null = null;
  private activeAttacks: {
    attack: Attack;
    startTime: number;
    duration: number;
    sourcePos: [number, number];
    targetPos: [number, number];
    controlPos: [number, number];
  }[] = [];

  attackTypes = this.threatService.allAttackTypes;

  // UI State
  isLoading = signal(true);
  hoveredCountry = signal<string | null>(null);
  tooltipX = signal(0);
  tooltipY = signal(0);
  countryStats = signal({ source: 0, target: 0 });

  selectedCountry = signal<string | null>(null);
  selectedCountryStats = signal({ source: 0, target: 0 });
  selectedCountryAttacks = signal<Attack[]>([]);

  private lastQueuedId: string | null = null;
  private mapReady = false;

  // Natural Earth (TopoJSON) names → our service names
  private readonly geoToService: Record<string, string[]> = {
    'United States of America': ['United States'],
    'Russian Federation': ['Russia'],
    'Republic of Korea': ['South Korea'],
    "Dem. Rep. Korea": ['North Korea'],
    "Democratic People's Republic of Korea": ['North Korea'],
    'Iran (Islamic Republic of)': ['Iran'],
    'Viet Nam': ['Vietnam'],
    'Taiwan, Province of China': ['Taiwan'],
    'Venezuela (Bolivarian Republic of)': ['Venezuela'],
    'Syrian Arab Republic': ['Syria'],
    'Bolivia (Plurinational State of)': ['Bolivia'],
  };

  private resolveNames(geoName: string): string[] {
    return [geoName, ...(this.geoToService[geoName] ?? [])];
  }

  constructor() {
    effect(() => {
      const attacks = this.threatService.attacks();
      if (!attacks.length || !this.projection || !isPlatformBrowser(this.platformId) || !this.mapReady) return;

      // Find all new attacks since last render
      const newAttacks: Attack[] = [];
      for (const attack of attacks) {
        if (attack.id === this.lastQueuedId) break;
        newAttacks.push(attack);
      }

      // Queue all new attacks for simultaneous rain effect
      for (const attack of newAttacks) {
        this.queueAttackAnimation(attack);
      }

      if (attacks[0]) this.lastQueuedId = attacks[0].id;
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
      this.loadWorldData();
      this.startCanvasLoop();

      this.resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      this.resizeObserver.observe(this.mapContainer.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.animationFrameId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private buildProjection() {
    const pad = 20;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (d3.geoNaturalEarth1() as d3.GeoProjection).fitExtent(
      [[pad, pad], [this.width - pad, this.height - pad]],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { type: 'Sphere' } as any
    );
  }

  private initMap() {
    const container = this.mapContainer.nativeElement;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.svg = d3.select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0') as d3.Selection<SVGSVGElement, unknown, null, undefined>;

    this.g = this.svg.append('g');

    this.projection = this.buildProjection();
    this.path = d3.geoPath().projection(this.projection);

    // Store initial scale/translate for zoom reset bounds
    const initScale = this.projection.scale() as number;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 20])
      .wheelDelta((event: WheelEvent) =>
        -event.deltaY * (event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002) * 0.35
      )
      .on('zoom', (event) => {
        if (this.g) this.g.attr('transform', event.transform);
        this.currentTransform = event.transform;
        // Scale stroke width inversely to keep borders crisp when zoomed
        const k = event.transform.k;
        this.g?.selectAll('path.country')
          .attr('stroke-width', Math.max(0.3, 0.6 / k));
      });

    this.svg.call(zoom);
    void initScale; // used only to anchor initial zoom scale reference
  }

  private resize() {
    const container = this.mapContainer.nativeElement;
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    const canvas = this.canvasContainer.nativeElement;
    canvas.width = this.width;
    canvas.height = this.height;

    if (this.projection && this.g && this.path) {
      this.projection = this.buildProjection();
      this.path = d3.geoPath().projection(this.projection);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.g.selectAll('path.country').attr('d', this.path as any);
    }
  }

  private async loadWorldData() {
    try {
      this.isLoading.set(true);
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const world = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const countries = topojson.feature(world as any, world.objects['countries'] as any) as unknown as GeoJSON.FeatureCollection;

      if (this.g && this.path) {
        this.g.selectAll('path.country')
          .data(countries.features)
          .enter()
          .append('path')
          .attr('class', 'country')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .attr('d', this.path as any)
          .attr('fill', '#050b14')                     // daha koyu, gece modu
          .attr('stroke', '#2dd4bf')                   // neon turkuaz
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .style('transition', 'fill 0.2s, stroke 0.2s')
          .on('mouseenter', (event: MouseEvent, d: any) => {
            d3.select(event.currentTarget as any)
              .attr('fill', '#1e3a5f')
              .attr('stroke', '#38bdf8')
              .attr('stroke-width', 1.2);
            // ... tooltip kısmı aynı kalır
          })
          .on('mouseleave', (event: MouseEvent, d: any) => {
            d3.select(event.currentTarget as any)
              .attr('fill', '#050b14')
              .attr('stroke', '#2dd4bf')
              .attr('stroke-width', 0.5);
            this.hoveredCountry.set(null);
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .on('click', (_event: MouseEvent, d: any) => {
            const countryName = d.properties?.['name'];
            if (countryName) {
              this.selectedCountry.set(countryName);

              const names = this.resolveNames(countryName);
              const attacks = this.threatService.attacks();
              const source = attacks.filter(a => names.includes(a.sourceCountry)).length;
              const target = attacks.filter(a => names.includes(a.targetCountry)).length;
              this.selectedCountryStats.set({ source, target });

              this.selectedCountryAttacks.set(
                attacks.filter(a => names.includes(a.sourceCountry) || names.includes(a.targetCountry)).slice(0, 50)
              );
            }
          });
      }

      // Mark map as ready and seed initial rain of attacks
      this.mapReady = true;
      const initial = this.threatService.attacks();
      // Stagger initial 30 attacks for immediate visual density
      initial.slice(0, 30).forEach((attack, i) => {
        setTimeout(() => this.queueAttackAnimation(attack), i * 80);
      });
      if (initial[0]) this.lastQueuedId = initial[0].id;

    } catch (error) {
      console.error('Error loading world data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  private queueAttackAnimation(attack: Attack) {
    if (!this.projection) return;

    const sourcePos = this.projection([attack.sourceLng, attack.sourceLat]);
    const targetPos = this.projection([attack.targetLng, attack.targetLat]);

    if (!sourcePos || !targetPos) return;

    const dx = targetPos[0] - sourcePos[0];
    const dy = targetPos[1] - sourcePos[1];
    const dr = Math.sqrt(dx * dx + dy * dy);

    const midX = (sourcePos[0] + targetPos[0]) / 2;
    const midY = (sourcePos[1] + targetPos[1]) / 2;

    // Normal vector
    const nx = -dy / dr;
    const ny = dx / dr;

    // Control point offset (curve height)
    const offset = dr * 0.3;
    const controlPos: [number, number] = [midX + nx * offset, midY + ny * offset];

    this.activeAttacks.push({
      attack,
      startTime: Date.now(),
      duration: 1500, // 1.5s animation
      sourcePos: [sourcePos[0], sourcePos[1]],
      targetPos: [targetPos[0], targetPos[1]],
      controlPos
    });

    // Keep array size manageable
    if (this.activeAttacks.length > 300) {
      this.activeAttacks.shift();
    }
  }

  private startCanvasLoop() {
    const canvas = this.canvasContainer.nativeElement;
    canvas.width = this.width;
    canvas.height = this.height;
    this.ctx = canvas.getContext('2d');

    const render = () => {
      if (!this.ctx) return;

      this.ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();

      this.ctx.save();
      this.ctx.translate(this.currentTransform.x, this.currentTransform.y);
      this.ctx.scale(this.currentTransform.k, this.currentTransform.k);

      // Use global composite operation for better glow effect
      this.ctx.globalCompositeOperation = 'lighter';

      for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
        const anim = this.activeAttacks[i];
        const elapsed = now - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);

        if (progress >= 1) {
          // Draw target blip fading out
          const blipProgress = (elapsed - anim.duration) / 1000; // 1s fade
          if (blipProgress <= 1) {
            this.drawBlip(anim.targetPos, anim.attack.color, blipProgress);
          } else {
            this.activeAttacks.splice(i, 1);
          }
          continue;
        }

        this.drawArc(anim, progress);
      }

      this.ctx.restore();

      this.animationFrameId = requestAnimationFrame(render);
    };

    render();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private drawArc(anim: any, progress: number) {
    if (!this.ctx) return;

    const { sourcePos, targetPos, controlPos, attack } = anim;

    // Current position along quadratic bezier
    const t = progress;
    const x = Math.pow(1 - t, 2) * sourcePos[0] + 2 * (1 - t) * t * controlPos[0] + Math.pow(t, 2) * targetPos[0];
    const y = Math.pow(1 - t, 2) * sourcePos[1] + 2 * (1 - t) * t * controlPos[1] + Math.pow(t, 2) * targetPos[1];

    // Draw full path faint
    this.ctx.beginPath();
    this.ctx.moveTo(sourcePos[0], sourcePos[1]);
    this.ctx.quadraticCurveTo(controlPos[0], controlPos[1], targetPos[0], targetPos[1]);
    this.ctx.strokeStyle = attack.color;
    this.ctx.globalAlpha = 0.15;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Draw active segment (approximate by drawing from source to current point)
    const partialControlX = sourcePos[0] + t * (controlPos[0] - sourcePos[0]);
    const partialControlY = sourcePos[1] + t * (controlPos[1] - sourcePos[1]);

    this.ctx.beginPath();
    this.ctx.moveTo(sourcePos[0], sourcePos[1]);
    this.ctx.quadraticCurveTo(partialControlX, partialControlY, x, y);
    this.ctx.globalAlpha = 0.8;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = attack.color;
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();

    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;

    // Draw head particle
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();

    // Draw source blip
    this.ctx.beginPath();
    this.ctx.arc(sourcePos[0], sourcePos[1], 2, 0, Math.PI * 2);
    this.ctx.fillStyle = attack.color;
    this.ctx.fill();
  }

  private drawBlip(pos: [number, number], color: string, progress: number) {
    if (!this.ctx || progress >= 1) return;

    const radius = 2 + progress * 20;
    const opacity = 1 - progress;

    this.ctx.beginPath();
    this.ctx.arc(pos[0], pos[1], radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.3})`;
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = opacity;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }
}
