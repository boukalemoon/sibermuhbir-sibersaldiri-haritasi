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

    constructor() {
        this.fetchNews();
        setInterval(() => this.fetchNews(), 5 * 60 * 1000); // 5 dakikada bir yenile
    }

    async fetchNews() {
        try {
            const res = await fetch('/api/news');
            const data = await res.json();
            this.news.set(data.slice(0, 10));
        } catch (err) {
            console.error('Haber alınamadı', err);
        }
    }
}