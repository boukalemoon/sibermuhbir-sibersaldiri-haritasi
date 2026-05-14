import { PLATFORM_ID, Injectable, signal, computed, OnDestroy, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';


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
  // Yüksek aktivite — ağırlık 60-100
  { code: 'US', name: 'Amerika Birleşik Devletleri', lat: 38,   lng: -97,   weight: 100 },
  { code: 'CN', name: 'Çin',                         lat: 35,   lng: 105,   weight: 90  },
  { code: 'RU', name: 'Rusya',                        lat: 60,   lng: 100,   weight: 80  },
  { code: 'DE', name: 'Almanya',                      lat: 51,   lng: 9,     weight: 65  },
  { code: 'GB', name: 'Birleşik Krallık',             lat: 55,   lng: -3,    weight: 65  },
  { code: 'IN', name: 'Hindistan',                    lat: 20,   lng: 77,    weight: 60  },
  { code: 'FR', name: 'Fransa',                       lat: 46,   lng: 2,     weight: 55  },
  { code: 'BR', name: 'Brezilya',                     lat: -10,  lng: -55,   weight: 50  },
  { code: 'KP', name: 'Kuzey Kore',                   lat: 40,   lng: 127,   weight: 50  },
  { code: 'IR', name: 'İran',                         lat: 32,   lng: 53,    weight: 50  },
  { code: 'UA', name: 'Ukrayna',                      lat: 48,   lng: 31,    weight: 45  },
  { code: 'CA', name: 'Kanada',                       lat: 60,   lng: -95,   weight: 45  },
  { code: 'NL', name: 'Hollanda',                     lat: 52,   lng: 5,     weight: 45  },
  { code: 'JP', name: 'Japonya',                      lat: 36,   lng: 138,   weight: 40  },
  { code: 'KR', name: 'Güney Kore',                   lat: 36,   lng: 128,   weight: 40  },
  { code: 'SG', name: 'Singapur',                     lat: 1.3,  lng: 103.8, weight: 40  },
  { code: 'AU', name: 'Avustralya',                   lat: -25,  lng: 133,   weight: 35  },
  { code: 'TW', name: 'Tayvan',                       lat: 23.5, lng: 121,   weight: 35  },
  { code: 'TR', name: 'Türkiye',                      lat: 39,   lng: 35,    weight: 35  },
  { code: 'IL', name: 'İsrail',                       lat: 31,   lng: 34,    weight: 35  },
  // Orta aktivite — ağırlık 20-35
  { code: 'PL', name: 'Polonya',                      lat: 52,   lng: 20,    weight: 30  },
  { code: 'IT', name: 'İtalya',                       lat: 42,   lng: 12,    weight: 30  },
  { code: 'ES', name: 'İspanya',                      lat: 40,   lng: -4,    weight: 30  },
  { code: 'MX', name: 'Meksika',                      lat: 23,   lng: -102,  weight: 30  },
  { code: 'ID', name: 'Endonezya',                    lat: -5,   lng: 120,   weight: 28  },
  { code: 'PK', name: 'Pakistan',                     lat: 30,   lng: 70,    weight: 28  },
  { code: 'VN', name: 'Vietnam',                      lat: 14,   lng: 108,   weight: 25  },
  { code: 'SA', name: 'Suudi Arabistan',              lat: 25,   lng: 45,    weight: 25  },
  { code: 'AE', name: 'Birleşik Arap Emirlikleri',    lat: 24,   lng: 54,    weight: 25  },
  { code: 'ZA', name: 'Güney Afrika',                 lat: -30,  lng: 25,    weight: 22  },
  { code: 'AR', name: 'Arjantin',                     lat: -34,  lng: -64,   weight: 22  },
  { code: 'EG', name: 'Mısır',                        lat: 26,   lng: 30,    weight: 20  },
  { code: 'MY', name: 'Malezya',                      lat: 4,    lng: 109,   weight: 20  },
  { code: 'TH', name: 'Tayland',                      lat: 15,   lng: 100,   weight: 20  },
  { code: 'CH', name: 'İsviçre',                      lat: 47,   lng: 8,     weight: 20  },
  { code: 'SE', name: 'İsveç',                        lat: 60,   lng: 15,    weight: 20  },
  { code: 'BE', name: 'Belçika',                      lat: 50,   lng: 4,     weight: 18  },
  { code: 'CZ', name: 'Çekya',                        lat: 50,   lng: 15,    weight: 18  },
  { code: 'RO', name: 'Romanya',                      lat: 46,   lng: 25,    weight: 18  },
  { code: 'PH', name: 'Filipinler',                   lat: 13,   lng: 122,   weight: 18  },
  { code: 'NG', name: 'Nijerya',                      lat: 10,   lng: 8,     weight: 15  },
  { code: 'HU', name: 'Macaristan',                   lat: 47,   lng: 20,    weight: 15  },
  { code: 'AT', name: 'Avusturya',                    lat: 47,   lng: 13,    weight: 15  },
  { code: 'DK', name: 'Danimarka',                    lat: 56,   lng: 10,    weight: 15  },
  { code: 'FI', name: 'Finlandiya',                   lat: 64,   lng: 26,    weight: 15  },
  { code: 'NO', name: 'Norveç',                       lat: 62,   lng: 10,    weight: 15  },
  { code: 'GR', name: 'Yunanistan',                   lat: 39,   lng: 22,    weight: 15  },
  { code: 'PT', name: 'Portekiz',                     lat: 39,   lng: -8,    weight: 15  },
  { code: 'IE', name: 'İrlanda',                      lat: 53,   lng: -8,    weight: 15  },
  { code: 'CO', name: 'Kolombiya',                    lat: 4,    lng: -72,   weight: 14  },
  { code: 'CL', name: 'Şili',                         lat: -35,  lng: -71,   weight: 12  },
  { code: 'BD', name: 'Bangladeş',                    lat: 24,   lng: 90,    weight: 12  },
  { code: 'NZ', name: 'Yeni Zelanda',                 lat: -40,  lng: 174,   weight: 12  },
  { code: 'PE', name: 'Peru',                         lat: -10,  lng: -76,   weight: 12  },
  { code: 'VE', name: 'Venezuela',                    lat: 8,    lng: -66,   weight: 10  },
  // Yeni eklenenler
  { code: 'BY', name: 'Belarus',                      lat: 53,   lng: 28,    weight: 30  },
  { code: 'KZ', name: 'Kazakistan',                   lat: 48,   lng: 68,    weight: 18  },
  { code: 'AZ', name: 'Azerbaycan',                   lat: 40,   lng: 47,    weight: 15  },
  { code: 'GE', name: 'Gürcistan',                    lat: 42,   lng: 43,    weight: 10  },
  { code: 'RS', name: 'Sırbistan',                    lat: 44,   lng: 21,    weight: 12  },
  { code: 'BG', name: 'Bulgaristan',                  lat: 43,   lng: 25,    weight: 12  },
  { code: 'SK', name: 'Slovakya',                     lat: 48,   lng: 19,    weight: 10  },
  { code: 'HR', name: 'Hırvatistan',                  lat: 45,   lng: 15,    weight: 10  },
  { code: 'LT', name: 'Litvanya',                     lat: 56,   lng: 24,    weight: 10  },
  { code: 'LV', name: 'Letonya',                      lat: 57,   lng: 25,    weight: 10  },
  { code: 'EE', name: 'Estonya',                      lat: 59,   lng: 25,    weight: 10  },
  { code: 'MD', name: 'Moldova',                      lat: 47,   lng: 29,    weight: 10  },
  { code: 'IQ', name: 'Irak',                         lat: 33,   lng: 44,    weight: 20  },
  { code: 'SY', name: 'Suriye',                       lat: 35,   lng: 38,    weight: 15  },
  { code: 'LB', name: 'Lübnan',                       lat: 34,   lng: 36,    weight: 10  },
  { code: 'JO', name: 'Ürdün',                        lat: 31,   lng: 36,    weight: 10  },
  { code: 'QA', name: 'Katar',                        lat: 25,   lng: 51,    weight: 12  },
  { code: 'KW', name: 'Kuveyt',                       lat: 29,   lng: 48,    weight: 10  },
  { code: 'MA', name: 'Fas',                          lat: 32,   lng: -5,    weight: 12  },
  { code: 'DZ', name: 'Cezayir',                      lat: 28,   lng: 2,     weight: 10  },
  { code: 'TN', name: 'Tunus',                        lat: 34,   lng: 9,     weight: 8   },
  { code: 'ET', name: 'Etiyopya',                     lat: 9,    lng: 40,    weight: 8   },
  { code: 'KE', name: 'Kenya',                        lat: -1,   lng: 37,    weight: 8   },
  { code: 'GH', name: 'Gana',                         lat: 8,    lng: -1,    weight: 8   },
  { code: 'TZ', name: 'Tanzanya',                     lat: -6,   lng: 35,    weight: 6   },
  { code: 'UZ', name: 'Özbekistan',                   lat: 41,   lng: 64,    weight: 12  },
  { code: 'MM', name: 'Myanmar',                      lat: 17,   lng: 96,    weight: 10  },
  { code: 'KH', name: 'Kamboçya',                     lat: 12,   lng: 105,   weight: 8   },
  { code: 'LK', name: 'Sri Lanka',                    lat: 7,    lng: 81,    weight: 8   },
  { code: 'NP', name: 'Nepal',                        lat: 28,   lng: 84,    weight: 6   },
  { code: 'MN', name: 'Moğolistan',                   lat: 46,   lng: 105,   weight: 6   },
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

  // Haftalık Supabase istatistikleri (heatmap + panel için)
  weeklyStats = signal<{ country: string; as_source: number; as_target: number; total: number }[]>([]);
  weeklyTopTypes = signal<{ attack_type: string; count: number }[]>([]);
  weeklyTotal = signal(0);

  private platformId = inject(PLATFORM_ID);
  private totalWeight = COUNTRIES.reduce((sum, c) => sum + c.weight, 0);
  private pollingInterval: any;
  private simulationTimeout: any;
  private logInterval: any;
  private weeklyInterval: any;
  private logBuffer: Attack[] = [];
  private logCounter = 0;

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchRealData();
      this.startPolling();
      this.startLogInterval();
      this.loadPublicStats();
      this.weeklyInterval = setInterval(() => this.loadPublicStats(), 300_000); // 5 dk
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
          if (updated.length > 500) updated.length = 500;
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
            if (updated.length > 500) updated.length = 500;
            return updated;
          });
          // 10'da 1 örnekleme ile log buffer'a ekle
          this.logCounter++;
          if (this.logCounter % 10 === 0) {
            this.logBuffer.push(newAttack);
          }
          this.simulationTimeout = setTimeout(loop, 50 + Math.random() * 750);
        };
        loop();
      }
    };
    addInitial();
  }

  private async loadPublicStats() {
    try {
      const resp = await fetch('/api/public-stats');
      if (!resp.ok) return;
      const data = await resp.json();
      if (Array.isArray(data.countries)) this.weeklyStats.set(data.countries);
      if (Array.isArray(data.top_types)) this.weeklyTopTypes.set(data.top_types);
      if (typeof data.total === 'number') this.weeklyTotal.set(data.total);
    } catch { /* sunucu yoksa sessiz hata */ }
  }

  private startLogInterval() {
    // Her 60 saniyede bir birikmiş saldırıları Supabase'e gönder
    this.logInterval = setInterval(() => this.flushLogBuffer(), 60_000);
  }

  private flushLogBuffer() {
    if (this.logBuffer.length === 0) return;
    const batch = [...this.logBuffer];
    this.logBuffer = [];
    fetch('/api/log-attack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(() => { /* sessizce hata yut */ });
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (this.simulationTimeout) clearTimeout(this.simulationTimeout);
    if (this.logInterval) clearInterval(this.logInterval);
    if (this.weeklyInterval) clearInterval(this.weeklyInterval);
    this.flushLogBuffer();
  }
}