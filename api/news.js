import Parser from 'rss-parser';
let parser = new Parser({ timeout: 8000 });

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const feeds = [
        'https://feeds.feedburner.com/TheHackersNews',
        'https://www.securityweek.com/feed',
        'https://krebsonsecurity.com/feed/',
        'https://www.bleepingcomputer.com/feed/',
        // sibermuhbir.com RSS eklenecekse: 'https://sibermuhbir.com/feed'
    ];
    let allItems = [];
    for (let feedUrl of feeds) {
        try {
            let feed = await parser.parseURL(feedUrl);
            allItems.push(...feed.items.slice(0, 6).map(item => ({
                title: item.title || '',
                link: item.link || '',
                pubDate: item.pubDate || item.isoDate || '',
                contentSnippet: item.contentSnippet ? item.contentSnippet.slice(0, 200) : '',
                source: feed.title || feedUrl,
            })));
        } catch (e) {
            console.error(`${feedUrl} okunamadı:`, e.message);
        }
    }
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.status(200).json(allItems.slice(0, 20));
}