import { Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, signal, computed, OnDestroy } from '@angular/core';


export interface Attack {
  id: string;
  timestamp: number;
  sourceCountry: string;
  sourceCode: string;
  sourceLat: number;
  sourceLng: number;
  targetCountry: string;
  targetCode: string;
  targetLat: number;
  targetLng: number;
  type: string;
  color: string;
  port: number;
  ip: string;
}

const COUNTRIES = [
  { code: 'US', name: 'Amerika Birleşik Devletleri', lat: 38, lng: -97, weight: 100 },
  { code: 'CN', name: 'Çin', lat: 35, lng: 105, weight: 80 },
  { code: 'RU', name: 'Rusya', lat: 60, lng: 100, weight: 70 },
  { code: 'BR', name: 'Brezilya', lat: -10, lng: -55, weight: 40 },
  { code: 'IN', name: 'Hindistan', lat: 20, lng: 77, weight: 50 },
  { code: 'DE', name: 'Almanya', lat: 51, lng: 9, weight: 60 },
  { code: 'GB', name: 'Birleşik Krallık', lat: 55, lng: -3, weight: 60 },
  { code: 'FR', name: 'Fransa', lat: 46, lng: 2, weight: 50 },
  { code: 'JP', name: 'Japonya', lat: 36, lng: 138, weight: 40 },
  { code: 'KR', name: 'Güney Kore', lat: 36, lng: 128, weight: 30 },
  { code: 'IR', name: 'İran', lat: 32, lng: 53, weight: 40 },
  { code: 'KP', name: 'Kuzey Kore', lat: 40, lng: 127, weight: 30 },
  { code: 'UA', name: 'Ukrayna', lat: 48, lng: 31, weight: 40 },
  { code: 'IL', name: 'İsrail', lat: 31, lng: 34, weight: 30 },
  { code: 'ZA', name: 'Güney Afrika', lat: -30, lng: 25, weight: 20 },
  { code: 'AU', name: 'Avustralya', lat: -25, lng: 133, weight: 30 },
  { code: 'CA', name: 'Kanada', lat: 60, lng: -95, weight: 40 },
  { code: 'MX', name: 'Meksika', lat: 23, lng: -102, weight: 30 },
  { code: 'IT', name: 'İtalya', lat: 42, lng: 12, weight: 30 },
  { code: 'ES', name: 'İspanya', lat: 40, lng: -4, weight: 30 },
  { code: 'NL', name: 'Hollanda', lat: 52, lng: 5, weight: 40 },
  { code: 'SE', name: 'İsveç', lat: 60, lng: 15, weight: 20 },
  { code: 'CH', name: 'İsviçre', lat: 47, lng: 8, weight: 20 },
  { code: 'SG', name: 'Singapur', lat: 1.3, lng: 103.8, weight: 30 },
  { code: 'TW', name: 'Tayvan', lat: 23.5, lng: 121, weight: 30 },
  { code: 'VN', name: 'Vietnam', lat: 14, lng: 108, weight: 20 },
  { code: 'TR', name: 'Türkiye', lat: 39, lng: 35, weight: 30 },
  { code: 'SA', name: 'Suudi Arabistan', lat: 25, lng: 45, weight: 20 },
  { code: 'AE', name: 'Birleşik Arap Emirlikleri', lat: 24, lng: 54, weight: 20 },
  { code: 'NG', name: 'Nijerya', lat: 10, lng: 8, weight: 10 },
  { code: 'EG', name: 'Mısır', lat: 26, lng: 30, weight: 10 },
  { code: 'AR', name: 'Arjantin', lat: -34, lng: -64, weight: 20 },
  { code: 'CO', name: 'Kolombiya', lat: 4, lng: -72, weight: 10 },
  { code: 'CL', name: 'Şili', lat: -35, lng: -71, weight: 10 },
  { code: 'PE', name: 'Peru', lat: -10, lng: -76, weight: 10 },
  { code: 'VE', name: 'Venezuela', lat: 8, lng: -66, weight: 10 },
  { code: 'PK', name: 'Pakistan', lat: 30, lng: 70, weight: 20 },
  { code: 'BD', name: 'Bangladeş', lat: 24, lng: 90, weight: 10 },
  { code: 'ID', name: 'Endonezya', lat: -5, lng: 120, weight: 20 },
  { code: 'PH', name: 'Filipinler', lat: 13, lng: 122, weight: 10 },
  { code: 'TH', name: 'Tayland', lat: 15, lng: 100, weight: 10 },
  { code: 'MY', name: 'Malezya', lat: 4, lng: 109, weight: 10 },
  { code: 'NZ', name: 'Yeni Zelanda', lat: -40, lng: 174, weight: 10 },
  { code: 'PL', name: 'Polonya', lat: 52, lng: 20, weight: 20 },
  { code: 'RO', name: 'Romanya', lat: 46, lng: 25, weight: 10 },
  { code: 'GR', name: 'Yunanistan', lat: 39, lng: 22, weight: 10 },
  { code: 'PT', name: 'Portekiz', lat: 39, lng: -8, weight: 10 },
  { code: 'CZ', name: 'Çekya', lat: 50, lng: 15, weight: 10 },
  { code: 'HU', name: 'Macaristan', lat: 47, lng: 20, weight: 10 },
  { code: 'AT', name: 'Avusturya', lat: 47, lng: 13, weight: 10 },
  { code: 'BE', name: 'Belçika', lat: 50, lng: 4, weight: 10 },
  { code: 'DK', name: 'Danimarka', lat: 56, lng: 10, weight: 10 },
  { code: 'FI', name: 'Finlandiya', lat: 64, lng: 26, weight: 10 },
  { code: 'NO', name: 'Norveç', lat: 62, lng: 10, weight: 10 },
  { code: 'IE', name: 'İrlanda', lat: 53, lng: -8, weight: 10 },
];

const ATTACK_TYPES = [
  { name: 'DDoS', color: '#ff3333', port: 80 },
  { name: 'SQL Injection', color: '#33ff33', port: 3306 },
  { name: 'SSH Brute Force', color: '#3333ff', port: 22 },
  { name: 'Malware', color: '#ff33ff', port: 443 },
  { name: 'Phishing', color: '#ffff33', port: 25 },
  { name: 'Ransomware', color: '#ff9933', port: 445 },
  { name: 'Botnet', color: '#33ffff', port: 8080 },
  { name: 'Exploit', color: '#ff3399', port: 80 },
  { name: 'Scan', color: '#99ff33', port: 0 },
];

@Injectable({
  providedIn: 'root'
})
export class ThreatService implements OnDestroy {
  attacks = signal<Attack[]>([]);

  activeAttacksCount = computed(() => {
    const now = Date.now();
    return this.attacks().filter(a => now - a.timestamp <= 1500).length;
  });

  topAttackers = computed(() => {
    const counts = new Map<string, number>();
    for (const attack of this.attacks()) {
      counts.set(attack.sourceCountry, (counts.get(attack.sourceCountry) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  topTargets = computed(() => {
    const counts = new Map<string, number>();
    for (const attack of this.attacks()) {
      counts.set(attack.targetCountry, (counts.get(attack.targetCountry) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  topTypes = computed(() => {
    const counts = new Map<string, { count: number, color: string }>();
    for (const attack of this.attacks()) {
      const current = counts.get(attack.type) || { count: 0, color: attack.color };
      counts.set(attack.type, { count: current.count + 1, color: attack.color });
    }
    return Array.from(counts.entries())
      .map(([name, data]) => ({ name, count: data.count, color: data.color }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  });

  attackRate = computed(() => {
    const now = Date.now();
    return this.attacks().filter(a => now - a.timestamp <= 60000).length;
  });

  threatLevel = computed((): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
    const rate = this.attackRate();
    if (rate > 100) return 'CRITICAL';
    if (rate > 60) return 'HIGH';
    if (rate > 30) return 'MEDIUM';
    return 'LOW';
  });

  totalCount = computed(() => this.attacks().length);
  allAttackTypes = ATTACK_TYPES;

  private totalWeight = COUNTRIES.reduce((sum, c) => sum + c.weight, 0);
  private pollingInterval: any;     // setInterval için
  private simulationTimeout: any;   // setTimeout için

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchRealData();
      this.startPolling();
    }
  }

  private getRandomCountry() {
    let r = Math.random() * this.totalWeight;
    for (const c of COUNTRIES) {
      if (r < c.weight) return c;
      r -= c.weight;
    }
    return COUNTRIES[0];
  }

  private generateAttack(): Attack {
    const source = this.getRandomCountry();
    let target = this.getRandomCountry();
    while (source.code === target.code) {
      target = this.getRandomCountry();
    }

    const type = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
    const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

    const sourceLat = source.lat + (Math.random() * 4 - 2);
    const sourceLng = source.lng + (Math.random() * 4 - 2);
    const targetLat = target.lat + (Math.random() * 4 - 2);
    const targetLng = target.lng + (Math.random() * 4 - 2);

    return {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      sourceCountry: source.name,
      sourceCode: source.code,
      sourceLat,
      sourceLng,
      targetCountry: target.name,
      targetCode: target.code,
      targetLat,
      targetLng,
      type: type.name,
      color: type.color,
      port: type.port,
      ip
    };
  }


  private async fetchRealData() {
    try {
      // Server-side (SSR) ise absolute URL kullan
      let apiUrl = '/api/threats';
      if (typeof window === 'undefined') {
        // Node.js ortamı (SSR) - kendi domainini yaz (localhost veya canlı URL)
        apiUrl = 'http://localhost:4200/api/threats';  // local test için
        // Canlıda ise: apiUrl = 'https://sibermuhbir-sibersaldiri-haritasi.vercel.app/api/threats';
      }
      const response = await fetch(apiUrl);
      const realAttacks: Attack[] = await response.json();
      if (realAttacks && realAttacks.length > 0) {
        this.attacks.set(realAttacks);
      } else {
        this.startSimulation();
      }
    } catch (error) {
      console.error('API hatası, simülasyon başlatılıyor:', error);
      this.startSimulation();
    }
  }

  private startPolling() {
    this.pollingInterval = setInterval(() => {
      this.fetchRealData();
    }, 30000);
  }

  private startSimulation() {
    // Başlangıçta boş dizi (hiç saldırı yok)
    this.attacks.set([]);

    // İlk birkaç saldırıyı hızlıca ekleyelim (ani patlama olmasın)
    let count = 0;
    const addInitial = () => {
      if (count < 10) {  // Sadece 10 saldırı ile başla (50 yerine)
        const newAttack = this.generateAttack();
        this.attacks.update(attacks => {
          const updated = [newAttack, ...attacks];
          if (updated.length > 200) updated.length = 200;
          return updated;
        });
        count++;
        setTimeout(addInitial, 100); // 100 ms aralıklarla ekle
      } else {
        // Normal döngüyü başlat
        const loop = () => {
          const newAttack = this.generateAttack();
          this.attacks.update(attacks => {
            const updated = [newAttack, ...attacks];
            if (updated.length > 200) updated.length = 200;
            return updated;
          });
          this.simulationTimeout = setTimeout(loop, 50 + Math.random() * 750);
        };
        loop();
      }
    };
    addInitial();
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.simulationTimeout) clearTimeout(this.simulationTimeout);
  }
}