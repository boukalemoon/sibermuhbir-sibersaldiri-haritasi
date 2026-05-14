import {ChangeDetectionStrategy, Component, OnInit, OnDestroy, PLATFORM_ID, inject, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {ThreatMapComponent} from './components/threat-map/threat-map.component';
import {ThreatLogComponent} from './components/threat-log/threat-log.component';
import {ThreatStatsComponent} from './components/threat-stats/threat-stats.component';
import {ThreatService} from './services/threat.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [ThreatMapComponent, ThreatLogComponent, ThreatStatsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private threatService = inject(ThreatService);
  private clockInterval: ReturnType<typeof setInterval> | null = null;

  currentTime = signal('--:--:-- UTC');
  mapVisible = signal(true);

  toggleMap() {
    this.mapVisible.update(v => !v);
  }

  attackRate = this.threatService.attackRate;
  threatLevel = this.threatService.threatLevel;
  totalCount = this.threatService.totalCount;

  threatLevelConfig = {
    CRITICAL: { color: '#ef4444', bg: 'rgba(127,29,29,0.4)', border: 'rgba(185,28,28,0.6)' },
    HIGH:     { color: '#f97316', bg: 'rgba(120,53,15,0.4)', border: 'rgba(180,80,15,0.6)' },
    MEDIUM:   { color: '#eab308', bg: 'rgba(113,63,18,0.4)', border: 'rgba(161,98,7,0.6)' },
    LOW:      { color: '#22c55e', bg: 'rgba(20,83,45,0.4)',  border: 'rgba(21,128,61,0.6)' },
  };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.startClock();
    }
  }

  ngOnDestroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
  }

  private startClock() {
    const update = () => {
      const now = new Date();
      const h = now.getUTCHours().toString().padStart(2, '0');
      const m = now.getUTCMinutes().toString().padStart(2, '0');
      const s = now.getUTCSeconds().toString().padStart(2, '0');
      this.currentTime.set(`${h}:${m}:${s} UTC`);
    };
    update();
    this.clockInterval = setInterval(update, 1000);
  }
}
