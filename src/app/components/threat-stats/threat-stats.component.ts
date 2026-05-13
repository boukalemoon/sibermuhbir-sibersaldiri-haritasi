import { Component, inject, computed } from '@angular/core';
import { ThreatService } from '../../services/threat.service';

@Component({
  selector: 'app-threat-stats',
  standalone: true,
  template: `
    <div class="h-full flex flex-col gap-2.5">

      <!-- Aktif Tehditler + Hız -->
      <div class="shrink-0 rounded-xl p-3.5 flex items-center justify-between"
           style="background:rgba(15,23,42,0.92);border:1px solid rgba(51,65,85,0.5);box-shadow:0 4px 24px rgba(0,0,0,0.5);">
        <div>
          <div class="flex items-center gap-2 mb-0.5">
            <div class="relative flex h-2.5 w-2.5">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" style="box-shadow:0 0 8px #ef4444;"></span>
            </div>
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Threats</span>
          </div>
          <div class="text-3xl font-mono font-black text-white tracking-widest" style="text-shadow:0 0 20px rgba(239,68,68,0.4);">
            {{ activeAttacksCount() }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Hız</div>
          <div class="text-lg font-mono font-bold" [style.color]="threatLevelColor()">
            {{ attackRate() }}<span class="text-xs text-slate-500 font-normal ml-0.5">/dakika</span>
          </div>
          <div class="text-[10px] font-bold tracking-wider mt-0.5" [style.color]="threatLevelColor()">
            {{ threatLevel() }}
          </div>
        </div>
      </div>

      <!-- Top Attackers -->
      <div class="flex-1 rounded-xl overflow-hidden flex flex-col"
           style="background:rgba(15,23,42,0.92);border:1px solid rgba(51,65,85,0.5);box-shadow:0 4px 24px rgba(0,0,0,0.4);">
        <div class="px-3.5 pt-3 pb-2 flex items-center gap-2 shrink-0"
             style="border-bottom:1px solid rgba(51,65,85,0.35);">
          <svg class="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Çok Saldıran Kaynaklar</span>
        </div>
        <div class="flex-1 px-3.5 py-2.5 space-y-2.5 overflow-hidden">
          @for (item of topAttackers(); track item.name; let i = $index) {
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-slate-200 font-medium truncate pr-2">{{ item.name }}</span>
                <span class="text-slate-400 font-mono shrink-0">{{ item.count }}</span>
              </div>
              <div class="h-1 w-full rounded-full overflow-hidden" style="background:rgba(30,41,59,0.8);">
                <div class="h-full rounded-full transition-all duration-700 ease-out"
                     [style.width]="(item.count / topAttackers()[0].count * 100) + '%'"
                     [style.background]="'linear-gradient(90deg, ' + redGradient(i) + ')'">
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Top Targets -->
      <div class="flex-1 rounded-xl overflow-hidden flex flex-col"
           style="background:rgba(15,23,42,0.92);border:1px solid rgba(51,65,85,0.5);box-shadow:0 4px 24px rgba(0,0,0,0.4);">
        <div class="px-3.5 pt-3 pb-2 flex items-center gap-2 shrink-0"
             style="border-bottom:1px solid rgba(51,65,85,0.35);">
          <svg class="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">En Çok Hedeflenen</span>
        </div>
        <div class="flex-1 px-3.5 py-2.5 space-y-2.5 overflow-hidden">
          @for (item of topTargets(); track item.name; let i = $index) {
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <span class="text-slate-200 font-medium truncate pr-2">{{ item.name }}</span>
                <span class="text-slate-400 font-mono shrink-0">{{ item.count }}</span>
              </div>
              <div class="h-1 w-full rounded-full overflow-hidden" style="background:rgba(30,41,59,0.8);">
                <div class="h-full rounded-full transition-all duration-700 ease-out"
                     [style.width]="(item.count / topTargets()[0].count * 100) + '%'"
                     [style.background]="'linear-gradient(90deg, ' + blueGradient(i) + ')'">
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Attack Vectors -->
      <div class="flex-1 rounded-xl overflow-hidden flex flex-col"
           style="background:rgba(15,23,42,0.92);border:1px solid rgba(51,65,85,0.5);box-shadow:0 4px 24px rgba(0,0,0,0.4);">
        <div class="px-3.5 pt-3 pb-2 flex items-center gap-2 shrink-0"
             style="border-bottom:1px solid rgba(51,65,85,0.35);">
          <svg class="w-3.5 h-3.5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldırı Yöntemleri</span>
        </div>
        <div class="flex-1 px-3.5 py-2.5 space-y-2.5 overflow-hidden">
          @for (item of topTypes(); track item.name) {
            <div>
              <div class="flex justify-between text-[11px] mb-1">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" [style.background]="item.color" [style.box-shadow]="'0 0 5px ' + item.color"></span>
                  <span class="text-slate-200 font-medium truncate">{{ item.name }}</span>
                </div>
                <span class="text-slate-400 font-mono shrink-0 pl-2">{{ item.count }}</span>
              </div>
              <div class="h-1 w-full rounded-full overflow-hidden" style="background:rgba(30,41,59,0.8);">
                <div class="h-full rounded-full transition-all duration-700 ease-out"
                     [style.width]="(item.count / topTypes()[0].count * 100) + '%'"
                     [style.background]="item.color"
                     [style.box-shadow]="'0 0 6px ' + item.color">
                </div>
              </div>
            </div>
          }
        </div>
      </div>

    </div>
  `,
  styles: [`:host { display: block; height: 100%; }`]
})
export class ThreatStatsComponent {
  private threatService = inject(ThreatService);
  activeAttacksCount = this.threatService.activeAttacksCount;
  topAttackers = this.threatService.topAttackers;
  topTargets = this.threatService.topTargets;
  topTypes = this.threatService.topTypes;
  attackRate = this.threatService.attackRate;
  threatLevel = this.threatService.threatLevel;

  threatLevelColor = computed(() => {
    const map: Record<string, string> = {
      CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#eab308', LOW: '#22c55e'
    };
    return map[this.threatLevel()] ?? '#94a3b8';
  });

  redGradient(i: number): string {
    const opacity = 1 - i * 0.15;
    return `rgba(239,68,68,${opacity}), rgba(185,28,28,${opacity * 0.6})`;
  }

  blueGradient(i: number): string {
    const opacity = 1 - i * 0.15;
    return `rgba(59,130,246,${opacity}), rgba(29,78,216,${opacity * 0.6})`;
  }
}
