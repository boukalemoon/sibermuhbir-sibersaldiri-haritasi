import Parser from 'rss-parser';
let parser = new Parser();

export default async function handler(req, res) {
    const feeds = [
        'https://feeds.feedburner.com/TheHackersNews',
        'https://www.securityweek.com/feed',
        // İsterseniz kendi sitenizin RSS'ini de ekleyin (sibermuhbir.com)
    ];
    let allItems = [];
    for (let feedUrl of feeds) {
        try {
            let feed = await parser.parseURL(feedUrl);
            allItems.push(...feed.items.slice(0, 5));
        } catch (e) {
            console.error(`${feedUrl} okunamadı`, e);
        }
    }
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.status(200).json(allItems.slice(0, 10));
}