import { Component, ElementRef, ViewChild, effect, inject, OnInit, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ThreatService, Attack } from '../../services/threat.service';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
@Component({
  selector: 'app-threat-map',
  standalone: true,
  imports: [DatePipe, MatIconModule],
  template: `
    <div class="w-full h-full relative overflow-hidden" style="background:#060b14;">
      <div class="absolute inset-0 z-0 pointer-events-none"
           style="background-image: linear-gradient(rgba(30,41,59,0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(30,41,59,0.25) 1px, transparent 1px); background-size: 50px 50px; opacity: 0.6;">
      </div>
      <div class="absolute inset-0 z-0 pointer-events-none"
           style="background: radial-gradient(ellipse at 50% 60%, rgba(37,99,235,0.04) 0%, transparent 70%);">
      </div>
      <div #mapContainer class="w-full h-full relative z-10"></div>
      <canvas #canvasContainer class="absolute inset-0 z-20 pointer-events-none w-full h-full"></canvas>

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

      @if (isLoading()) {
        <div class="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#0a0f18]/80 backdrop-blur-sm">
          <div class="relative flex h-12 w-12 mb-4">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20"></span>
            <span class="relative inline-flex rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent animate-spin"></span>
          </div>
          <div class="text-blue-400 font-mono text-sm uppercase animate-pulse">Yükleniyor...</div>
        </div>
      }

      @if (hoveredCountry()) {
        <div class="fixed z-30 pointer-events-none"
             style="transform: translate(-50%, calc(-100% - 12px));"
             [style.left.px]="tooltipX()" [style.top.px]="tooltipY()">
          <div class="px-3 py-2 rounded-lg font-mono text-xs"
               style="background:rgba(6,11,20,0.95);border:1px solid rgba(59,130,246,0.35);box-shadow:0 8px 24px rgba(0,0,0,0.6);backdrop-filter:blur(8px);">
            <div class="font-bold text-slate-100 text-[11px] mb-1.5">{{ hoveredCountry() }}</div>
            <div class="flex gap-3 text-[10px]">
              <div class="flex items-center gap-1"><span class="text-red-400 font-bold">↑</span><span class="text-slate-400">Çıkış:</span><span class="text-red-400 font-bold">{{ countryStats().source }}</span></div>
              <div class="flex items-center gap-1"><span class="text-blue-400 font-bold">↓</span><span class="text-slate-400">Giriş:</span><span class="text-blue-400 font-bold">{{ countryStats().target }}</span></div>
            </div>
          </div>
        </div>
      }

      @if (selectedCountry()) {
        <div class="absolute inset-0 z-50 flex items-center justify-center p-4"
             style="background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);">
          <div class="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl overflow-hidden"
               style="background:rgba(6,11,20,0.98);border:1px solid rgba(51,65,85,0.6);box-shadow:0 24px 60px rgba(0,0,0,0.8);">
            <div class="px-5 py-3.5 flex justify-between items-center shrink-0"
                 style="border-bottom:1px solid rgba(51,65,85,0.5);background:rgba(10,15,30,0.8);">
              <div class="flex items-center gap-2.5"><div class="w-2 h-2 rounded-full bg-blue-400"></div><h2 class="text-sm font-bold text-slate-100 uppercase tracking-wider">Tehdit İstihbaratı — {{ selectedCountry() }}</h2></div>
              <button (click)="selectedCountry.set(null)" class="modal-close-btn w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 transition-all">✕</button>
            </div>
            <div class="grid grid-cols-2 gap-3 p-4 shrink-0" style="border-bottom:1px solid rgba(51,65,85,0.35);">
              <div class="p-3 rounded-lg" style="background:rgba(127,29,29,0.2);border:1px solid rgba(185,28,28,0.3);">
                <div class="text-[10px] text-red-400/70 uppercase tracking-widest mb-1 font-bold">Giden Saldırılar</div>
                <div class="text-2xl font-mono font-black text-red-400">{{ selectedCountryStats().source }}</div>
              </div>
              <div class="p-3 rounded-lg" style="background:rgba(29,78,216,0.15);border:1px solid rgba(37,99,235,0.3);">
                <div class="text-[10px] text-blue-400/70 uppercase tracking-widest mb-1 font-bold">Gelen Saldırılar</div>
                <div class="text-2xl font-mono font-black text-blue-400">{{ selectedCountryStats().target }}</div>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4 modal-scroll">
              <h3 class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Son Aktiviteler</h3>
              <div class="space-y-1.5">
                @for (attack of selectedCountryAttacks(); track attack.id) {
                  <div class="modal-row p-2.5 rounded-lg text-[11px] font-mono flex justify-between items-center"
                       style="border:1px solid rgba(30,41,59,0.5);">
                    <div class="flex items-center gap-2"><span class="w-1.5 h-1.5 rounded-full shrink-0" [style.background]="attack.color"></span><span class="text-slate-200 font-bold" style="width:6rem;">{{ attack.type }}</span></div>
                    <div class="text-slate-400 flex-1 text-center text-[10px]">
                      @if (attack.sourceCountry === selectedCountry()) {
                        <span class="text-red-400 font-bold">ÇIKIŞ</span><span class="text-slate-600 mx-1">→</span>{{ attack.targetCountry }}
                      } @else {
                        <span class="text-blue-400 font-bold">GİRİŞ</span><span class="text-slate-600 mx-1">←</span>{{ attack.sourceCountry }}
                      }
                    </div>
                    <div class="text-slate-600 text-[10px] w-16 text-right">{{ attack.timestamp | date:'HH:mm:ss' }}</div>
                  </div>
                }
                @if (selectedCountryAttacks().length === 0) {
                  <div class="text-slate-600 text-xs italic text-center py-6">Son aktivite yok.</div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .modal-scroll::-webkit-scrollbar { width: 4px; }
    .modal-scroll::-webkit-scrollbar-track { background: transparent; }
    .modal-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
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

  private svg: any;
  private projection: any;
  private path: any;
  private g: any;
  private width = 0;
  private height = 0;
  private resizeObserver: any;
  private ctx: CanvasRenderingContext2D | null = null;
  private currentTransform: any = d3.zoomIdentity;
  private animationFrameId: number | null = null;
  private activeAttacks: any[] = [];
  private lastQueuedId: string | null = null;
  private mapReady = false;

  attackTypes = this.threatService.allAttackTypes;
  isLoading = signal(true);
  hoveredCountry = signal<string | null>(null);
  tooltipX = signal(0);
  tooltipY = signal(0);
  countryStats = signal({ source: 0, target: 0 });
  selectedCountry = signal<string | null>(null);
  selectedCountryStats = signal({ source: 0, target: 0 });
  selectedCountryAttacks = signal<Attack[]>([]);

  private turkishCountryNames: Record<string, string> = {
    'Afghanistan': 'Afganistan', 'Albania': 'Arnavutluk', 'Algeria': 'Cezayir',
    'Angola': 'Angola', 'Argentina': 'Arjantin', 'Armenia': 'Ermenistan',
    'Australia': 'Avustralya', 'Austria': 'Avusturya', 'Azerbaijan': 'Azerbaycan',
    'Bangladesh': 'Bangladeş', 'Belarus': 'Belarus', 'Belgium': 'Belçika',
    'Benin': 'Benin', 'Bolivia': 'Bolivya', 'Bosnia and Herz.': 'Bosna Hersek',
    'Bosnia and Herzegovina': 'Bosna Hersek', 'Botswana': 'Botsvana',
    'Brazil': 'Brezilya', 'Bulgaria': 'Bulgaristan', 'Burkina Faso': 'Burkina Faso',
    'Cambodia': 'Kamboçya', 'Cameroon': 'Kamerun', 'Canada': 'Kanada',
    'Central African Rep.': 'Orta Afrika Cum.', 'Chad': 'Çad', 'Chile': 'Şili',
    'China': 'Çin', 'Colombia': 'Kolombiya', 'Congo': 'Kongo',
    'Croatia': 'Hırvatistan', 'Cuba': 'Küba', 'Cyprus': 'Kıbrıs',
    'Czech Rep.': 'Çekya', 'Czechia': 'Çekya', 'Denmark': 'Danimarka',
    'Dem. Rep. Congo': 'Kongo DRC', 'Djibouti': 'Cibuti', 'Ecuador': 'Ekvador',
    'Egypt': 'Mısır', 'Eritrea': 'Eritre', 'Estonia': 'Estonya',
    'Ethiopia': 'Etiyopya', 'Finland': 'Finlandiya', 'France': 'Fransa',
    'Georgia': 'Gürcistan', 'Germany': 'Almanya', 'Ghana': 'Gana',
    'Greece': 'Yunanistan', 'Guatemala': 'Guatemala', 'Guinea': 'Gine',
    'Honduras': 'Honduras', 'Hungary': 'Macaristan', 'India': 'Hindistan',
    'Indonesia': 'Endonezya', 'Iran': 'İran', 'Iraq': 'Irak',
    'Ireland': 'İrlanda', 'Israel': 'İsrail', 'Italy': 'İtalya',
    'Japan': 'Japonya', 'Jordan': 'Ürdün', 'Kazakhstan': 'Kazakistan',
    'Kenya': 'Kenya', 'Kosovo': 'Kosova', 'Kuwait': 'Kuveyt',
    'Kyrgyzstan': 'Kırgızistan', 'Laos': 'Laos', 'Latvia': 'Letonya',
    'Lebanon': 'Lübnan', 'Liberia': 'Liberya', 'Libya': 'Libya',
    'Lithuania': 'Litvanya', 'Madagascar': 'Madagaskar', 'Malaysia': 'Malezya',
    'Mali': 'Mali', 'Mauritania': 'Moritanya', 'Mexico': 'Meksika',
    'Moldova': 'Moldova', 'Mongolia': 'Moğolistan', 'Montenegro': 'Karadağ',
    'Morocco': 'Fas', 'Mozambique': 'Mozambik', 'Myanmar': 'Myanmar',
    'Namibia': 'Namibya', 'Nepal': 'Nepal', 'Netherlands': 'Hollanda',
    'New Caledonia': 'Yeni Kaledonya', 'New Zealand': 'Yeni Zelanda',
    'Niger': 'Nijer', 'Nigeria': 'Nijerya', 'North Korea': 'Kuzey Kore',
    'North Macedonia': 'Kuzey Makedonya', 'Norway': 'Norveç', 'Oman': 'Umman',
    'Pakistan': 'Pakistan', 'Palestine': 'Filistin', 'Papua New Guinea': 'Papua Yeni Gine',
    'Peru': 'Peru', 'Philippines': 'Filipinler', 'Poland': 'Polonya',
    'Portugal': 'Portekiz', 'Qatar': 'Katar', 'Romania': 'Romanya',
    'Russia': 'Rusya', 'Bahrain': 'Bahreyn', 'Saudi Arabia': 'Suudi Arabistan',
    'Senegal': 'Senegal', 'Serbia': 'Sırbistan', 'Sierra Leone': 'Sierra Leone',
    'Singapore': 'Singapur', 'Slovakia': 'Slovakya', 'Slovenia': 'Slovenya',
    'Somalia': 'Somali', 'South Africa': 'Güney Afrika', 'South Korea': 'Güney Kore',
    'South Sudan': 'Güney Sudan', 'Spain': 'İspanya', 'Sri Lanka': 'Sri Lanka',
    'Sudan': 'Sudan', 'Sweden': 'İsveç', 'Switzerland': 'İsviçre',
    'Syria': 'Suriye', 'Taiwan': 'Tayvan', 'Tajikistan': 'Tacikistan',
    'Tanzania': 'Tanzanya', 'Thailand': 'Tayland', 'Togo': 'Togo',
    'Tunisia': 'Tunus', 'Turkey': 'Türkiye', 'Turkmenistan': 'Türkmenistan',
    'Uganda': 'Uganda', 'Ukraine': 'Ukrayna', 'United Arab Emirates': 'BAE',
    'United Kingdom': 'Birleşik Krallık', 'United States': 'ABD',
    'United States of America': 'ABD', 'Uruguay': 'Uruguay',
    'Uzbekistan': 'Özbekistan', 'Venezuela': 'Venezuela', 'Vietnam': 'Vietnam',
    'W. Sahara': 'Batı Sahra', 'Yemen': 'Yemen', 'Zambia': 'Zambiya',
    'Zimbabwe': 'Zimbabve', "Côte d'Ivoire": 'Fildişi Sahili',
  };
  private getTurkishName(eng: string): string {
    return this.turkishCountryNames[eng] || eng;
  }

  constructor() {
    effect(() => {
      const attacks = this.threatService.attacks();
      if (!attacks.length || !this.projection || !isPlatformBrowser(this.platformId) || !this.mapReady) return;
      const newAttacks: Attack[] = [];
      for (const attack of attacks) {
        if (attack.id === this.lastQueuedId) break;
        newAttacks.push(attack);
      }
      for (const attack of newAttacks) this.queueAttackAnimation(attack);
      if (attacks[0]) this.lastQueuedId = attacks[0].id;
    });
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initMap();
      this.loadWorldData();
      this.startCanvasLoop();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.mapContainer.nativeElement);
    }
  }

  ngOnDestroy() {
    this.resizeObserver?.disconnect();
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
  }

  private buildProjection() {
    const pad = 20;
    return (d3.geoNaturalEarth1() as any).fitExtent([[pad, pad], [this.width - pad, this.height - pad]], { type: 'Sphere' });
  }

  private initMap() {
    const container = this.mapContainer.nativeElement;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.svg = d3.select(container).append('svg').attr('width', '100%').attr('height', '100%').style('position', 'absolute').style('top', '0').style('left', '0');
    this.g = this.svg.append('g');
    this.projection = this.buildProjection();
    this.path = d3.geoPath().projection(this.projection);
    const zoom = d3.zoom().scaleExtent([1, 20]).on('zoom', (event) => {
      if (this.g) this.g.attr('transform', event.transform);
      this.currentTransform = event.transform;
      const k = event.transform.k;
      this.g?.selectAll('path.country').attr('stroke-width', Math.max(0.3, 0.6 / k));
    });
    this.svg.call(zoom);
  }

  private resize() {
    this.width = this.mapContainer.nativeElement.clientWidth;
    this.height = this.mapContainer.nativeElement.clientHeight;
    const canvas = this.canvasContainer.nativeElement;
    canvas.width = this.width;
    canvas.height = this.height;
    if (this.projection && this.g && this.path) {
      this.projection = this.buildProjection();
      this.path = d3.geoPath().projection(this.projection);
      this.g.selectAll('path.country').attr('d', this.path);
    }
  }

  private async loadWorldData() {
    try {
      this.isLoading.set(true);
      const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
      const world = await response.json();
      const countries = topojson.feature(world, world.objects.countries) as any;
      if (this.g && this.path) {
        this.g.selectAll('path.country').data(countries.features).enter().append('path').attr('class', 'country').attr('d', this.path).attr('fill', '#050b14').attr('stroke', '#2dd4bf').attr('stroke-width', 0.5).style('cursor', 'pointer').on('mouseenter', (event: any, d: any) => {
          d3.select(event.currentTarget).attr('fill', '#1e3a5f').attr('stroke', '#38bdf8').attr('stroke-width', 1.2);
          const name = d.properties.name;
          if (name) {
            this.hoveredCountry.set(this.getTurkishName(name));
            this.tooltipX.set(event.clientX);
            this.tooltipY.set(event.clientY);
            const attacks = this.threatService.attacks();
            const source = attacks.filter(a => a.sourceCountry === name).length;
            const target = attacks.filter(a => a.targetCountry === name).length;
            this.countryStats.set({ source, target });
          }
        }).on('mousemove', (event: any) => {
          this.tooltipX.set(event.clientX);
          this.tooltipY.set(event.clientY);
        }).on('mouseleave', (event: any) => {
          d3.select(event.currentTarget).attr('fill', '#050b14').attr('stroke', '#2dd4bf').attr('stroke-width', 0.5);
          this.hoveredCountry.set(null);
        }).on('click', (event: any, d: any) => {
          const name = d.properties.name;
          if (name) {
            this.selectedCountry.set(this.getTurkishName(name));
            const attacks = this.threatService.attacks();
            const source = attacks.filter(a => a.sourceCountry === name).length;
            const target = attacks.filter(a => a.targetCountry === name).length;
            this.selectedCountryStats.set({ source, target });
            this.selectedCountryAttacks.set(attacks.filter(a => a.sourceCountry === name || a.targetCountry === name).slice(0, 50));
          }
        });
      }
      this.mapReady = true;
      const initial = this.threatService.attacks();
      initial.slice(0, 30).forEach((attack, i) => setTimeout(() => this.queueAttackAnimation(attack), i * 80));
      if (initial[0]) this.lastQueuedId = initial[0].id;
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private queueAttackAnimation(attack: Attack) {
    if (!this.projection) return;
    const src = this.projection([attack.sourceLng, attack.sourceLat]);
    const tgt = this.projection([attack.targetLng, attack.targetLat]);
    if (!src || !tgt) return;
    const dx = tgt[0] - src[0], dy = tgt[1] - src[1];
    const dr = Math.hypot(dx, dy);
    const mid = [(src[0] + tgt[0]) / 2, (src[1] + tgt[1]) / 2];
    const nx = -dy / dr, ny = dx / dr;
    const ctrl = [mid[0] + nx * dr * 0.3, mid[1] + ny * dr * 0.3];
    this.activeAttacks.push({ attack, startTime: Date.now(), duration: 1500, sourcePos: src, targetPos: tgt, controlPos: ctrl });
    if (this.activeAttacks.length > 300) this.activeAttacks.shift();
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
      this.ctx.globalCompositeOperation = 'lighter';
      for (let i = this.activeAttacks.length - 1; i >= 0; i--) {
        const a = this.activeAttacks[i];
        const elapsed = now - a.startTime;
        const prog = Math.min(elapsed / a.duration, 1);
        if (prog >= 1) {
          const bp = (elapsed - a.duration) / 1000;
          if (bp <= 1) this.drawBlip(a.targetPos, a.attack.color, bp);
          else this.activeAttacks.splice(i, 1);
          continue;
        }
        this.drawArc(a, prog);
      }
      this.ctx.restore();
      this.animationFrameId = requestAnimationFrame(render);
    };
    render();
  }

  private drawArc(anim: any, t: number) {
    if (!this.ctx) return;
    const { sourcePos, targetPos, controlPos, attack } = anim;
    const x = (1 - t) * (1 - t) * sourcePos[0] + 2 * (1 - t) * t * controlPos[0] + t * t * targetPos[0];
    const y = (1 - t) * (1 - t) * sourcePos[1] + 2 * (1 - t) * t * controlPos[1] + t * t * targetPos[1];
    this.ctx.beginPath();
    this.ctx.moveTo(sourcePos[0], sourcePos[1]);
    this.ctx.quadraticCurveTo(controlPos[0], controlPos[1], targetPos[0], targetPos[1]);
    this.ctx.strokeStyle = attack.color;
    this.ctx.globalAlpha = 0.15;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    const cx = sourcePos[0] + t * (controlPos[0] - sourcePos[0]);
    const cy = sourcePos[1] + t * (controlPos[1] - sourcePos[1]);
    this.ctx.beginPath();
    this.ctx.moveTo(sourcePos[0], sourcePos[1]);
    this.ctx.quadraticCurveTo(cx, cy, x, y);
    this.ctx.globalAlpha = 0.8;
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = attack.color;
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
    this.ctx.globalAlpha = 1;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 2.5, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#fff';
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(sourcePos[0], sourcePos[1], 2, 0, 2 * Math.PI);
    this.ctx.fillStyle = attack.color;
    this.ctx.fill();
  }

  private drawBlip(pos: [number, number], color: string, prog: number) {
    if (!this.ctx || prog >= 1) return;
    const r = 2 + prog * 20;
    this.ctx.beginPath();
    this.ctx.arc(pos[0], pos[1], r, 0, 2 * Math.PI);
    this.ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - prog)})`;
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = 1 - prog;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }
}