import { Injectable, PLATFORM_ID, inject, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { track } from '@vercel/analytics';

@Injectable({ providedIn: 'root' })
export class AnalyticsService implements OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private sessionId = '';
  private startTime = 0;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.sessionId = sessionStorage.getItem('sm_sid') || this.generateId();
    sessionStorage.setItem('sm_sid', this.sessionId);
    this.startTime = Date.now();
    this.sendSessionStart();
    window.addEventListener('beforeunload', this.onUnload);
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private getDeviceType(): string {
    const w = window.innerWidth;
    if (w < 768) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  }

  private send(type: string, payload?: Record<string, unknown>) {
    if (!isPlatformBrowser(this.platformId)) return;
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, sessionId: this.sessionId, payload }),
    }).catch(() => {});
  }

  private sendSessionStart() {
    this.send('session_start', {
      deviceType: this.getDeviceType(),
      referrer: document.referrer || null,
    });
    // Vercel Analytics'e de bildir
    track('page_view', { device: this.getDeviceType() });
  }

  trackCountryClick(country: string) {
    this.send('country_click', { country });
    track('country_click', { country });
  }

  trackNewsOpen() {
    this.send('news_open', {});
    track('news_open');
  }

  trackMapToggle(visible: boolean) {
    this.send('map_toggle', { visible });
  }

  private onUnload = () => {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    // sendBeacon: sayfa kapanırken bile iletilir
    const body = JSON.stringify({
      type: 'session_end',
      sessionId: this.sessionId,
      payload: { duration },
    });
    navigator.sendBeacon('/api/analytics', new Blob([body], { type: 'application/json' }));
  };

  ngOnDestroy() {
    window.removeEventListener('beforeunload', this.onUnload);
  }
}
