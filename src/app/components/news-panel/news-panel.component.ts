import { Component, inject } from '@angular/core';
import { NewsService } from '../../services/news.service';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-news-panel',
    standalone: true,
    imports: [DatePipe],
    template: `
    <div class="fixed bottom-4 right-4 w-80 rounded-xl overflow-hidden z-30 pointer-events-auto"
         style="background:rgba(6,11,20,0.92);border:1px solid rgba(51,65,85,0.5);backdrop-filter:blur(8px);">
      <div class="px-3 py-2 bg-[#0a0f18]/80 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          <span class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Cyber News Feed</span>
        </div>
      </div>
      <div class="max-h-96 overflow-y-auto text-xs">
        @for (item of newsService.news(); track item.link) {
          <a [href]="item.link" target="_blank" class="block px-3 py-2 border-b border-slate-800/50 hover:bg-slate-800/30 transition">
            <div class="font-mono text-slate-200 line-clamp-2">{{ item.title }}</div>
            <div class="text-slate-500 text-[9px] mt-1">{{ item.pubDate | date:'short' }}</div>
          </a>
        }
      </div>
    </div>
  `
})
export class NewsPanelComponent {
    newsService = inject(NewsService);
}