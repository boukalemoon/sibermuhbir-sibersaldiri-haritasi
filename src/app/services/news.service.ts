import { Inject, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Injectable, signal } from '@angular/core';

export interface NewsItem {
    title: string;
    link: string;
    pubDate: string;
    contentSnippet: string;
}

@Injectable({ providedIn: 'root' })
export class NewsService {
    news = signal<NewsItem[]>([]);
    private platformId = inject(PLATFORM_ID);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.fetchNews();
            setInterval(() => this.fetchNews(), 5 * 60 * 1000);
        }
    }

    private async fetchNews() {
        if (!isPlatformBrowser(this.platformId)) return;
        try {
            // Server-side (SSR) ise absolute URL kullan
            let apiUrl = '/api/news';
            if (typeof window === 'undefined') {
                apiUrl = 'http://localhost:4200/api/news';  // local test için
            }
            const res = await fetch(apiUrl);
            const data = await res.json();
            this.news.set(data.slice(0, 10));
        } catch (err) {
            console.error('Haber alınamadı', err);
        }
    }
}