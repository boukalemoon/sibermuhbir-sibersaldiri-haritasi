import { Component, inject, signal, computed, ElementRef, ViewChild, effect } from '@angular/core';
import { ThreatService } from '../../services/threat.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-threat-log',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="h-full flex flex-col rounded-xl overflow-hidden"
         style="background:rgba(15,23,42,0.92);border:1px solid rgba(51,65,85,0.5);box-shadow:0 4px 24px rgba(0,0,0,0.5);">

      <!-- Header -->
      <div class="px-3.5 py-2.5 flex items-center justify-between shrink-0"
           style="border-bottom:1px solid rgba(51,65,85,0.4);background:rgba(10,15,28,0.6);">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse" style="box-shadow:0 0 6px #ef4444;"></span>
          <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Live Threat Log</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono text-slate-500">{{ filteredAttacks().length }} events</span>
          <!-- Auto-scroll toggle -->
          <button (click)="autoScroll.set(!autoScroll())"
                  class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all duration-200"
                  [style.background]="autoScroll() ? 'rgba(37,99,235,0.3)' : 'rgba(51,65,85,0.3)'"
                  [style.color]="autoScroll() ? '#93c5fd' : '#64748b'"
                  [style.border]="autoScroll() ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(51,65,85,0.4)'">
            AUTO
          </button>
        </div>
      </div>

      <!-- Filter Chips -->
      <div class="px-2.5 py-1.5 flex gap-1 flex-wrap shrink-0"
           style="border-bottom:1px solid rgba(51,65,85,0.25);">
        <button (click)="selectedType.set(null)"
                class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
                [style.background]="selectedType() === null ? 'rgba(99,102,241,0.3)' : 'rgba(30,41,59,0.6)'"
                [style.color]="selectedType() === null ? '#a5b4fc' : '#475569'"
                [style.border]="selectedType() === null ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(51,65,85,0.3)'">
          ALL
        </button>
        @for (type of attackTypes(); track type.name) {
          <button (click)="selectedType.set(selectedType() === type.name ? null : type.name)"
                  class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
                  [style.background]="selectedType() === type.name ? type.color + '30' : 'rgba(30,41,59,0.6)'"
                  [style.color]="selectedType() === type.name ? type.color : '#475569'"
                  [style.border]="selectedType() === type.name ? '1px solid ' + type.color + '60' : '1px solid rgba(51,65,85,0.3)'">
            {{ type.name }}
          </button>
        }
      </div>

      <!-- Log Entries -->
      <div #scrollContainer class="flex-1 overflow-y-auto px-2 py-1.5 space-y-1 log-scroll">
        @for (attack of filteredAttacks(); track attack.id) {
          <div class="log-entry text-[11px] font-mono px-2.5 py-2 rounded-lg cursor-default"
               style="border-left:2px solid"
               [style.border-left-color]="attack.color">
            <!-- Row 1: Time + Type badge -->
            <div class="flex justify-between items-center mb-1">
              <span class="text-slate-500 text-[10px]">{{ attack.timestamp | date:'HH:mm:ss.SSS' }}</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                    [style.color]="attack.color"
                    [style.background]="attack.color + '1a'"
                    [style.border]="'1px solid ' + attack.color + '40'">
                {{ attack.type }}
              </span>
            </div>
            <!-- Row 2: Source → Target with flags -->
            <div class="flex items-center gap-1.5 text-slate-300">
              <span class="text-[13px]">{{ getFlag(attack.sourceCode) }}</span>
              <span class="truncate max-w-[5rem]" [title]="attack.sourceCountry">{{ attack.sourceCountry }}</span>
              <span class="text-slate-600 shrink-0">→</span>
              <span class="text-[13px]">{{ getFlag(attack.targetCode) }}</span>
              <span class="truncate max-w-[5rem]" [title]="attack.targetCountry">{{ attack.targetCountry }}</span>
            </div>
            <!-- Row 3: IP + Port -->
            <div class="mt-1 flex justify-between text-[10px] text-slate-600">
              <span>{{ attack.ip }}</span>
              <span class="text-slate-500">:{{ attack.port }}</span>
            </div>
          </div>
        }
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .log-scroll::-webkit-scrollbar { width: 3px; }
    .log-scroll::-webkit-scrollbar-track { background: transparent; }
    .log-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .log-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
    .log-entry { background: rgba(15,23,42,0.4); transition: background 0.15s; }
    .log-entry:hover { background: rgba(30,41,59,0.65) !important; }
  `]
})
export class ThreatLogComponent {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  private threatService = inject(ThreatService);
  attacks = this.threatService.attacks;
  selectedType = signal<string | null>(null);
  autoScroll = signal(true);

  attackTypes = computed(() =>
    this.threatService.allAttackTypes.map(t => ({ name: t.name, color: t.color }))
  );

  filteredAttacks = computed(() => {
    const type = this.selectedType();
    const all = this.attacks();
    return type ? all.filter(a => a.type === type) : all;
  });

  constructor() {
    effect(() => {
      this.filteredAttacks(); // track
      if (this.autoScroll() && this.scrollContainer?.nativeElement) {
        setTimeout(() => {
          this.scrollContainer.nativeElement.scrollTop = 0;
        }, 0);
      }
    });
  }

  getFlag(code: string): string {
    if (!code || code.length !== 2) return '🌐';
    return Array.from(code.toUpperCase())
      .map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65))
      .join('');
  }
}
