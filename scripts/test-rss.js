/* eslint-disable */
const Parser = require('rss-parser');

const xml = `<?xml version="1.0" encoding="UTF-8" ?><rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" >
	<channel>
		<title> | FreshRSS</title>
		<link>https://news.roten.vip</link>
		<description>RSS feed of  | FreshRSS</description>
		<item>
			<title>Misstänkt mordförsök i Stockholm</title>
			<link>https://www.aftonbladet.se/nyheter/a/aJ2Pdd/misstankt-mordforsok-i-stockholm?utm_medium=rss</link>
						<media:content url="https://images.aftonbladet-cdn.se/v2/images/b597423d-8420-4c71-939b-4444f81e353c?fit=crop&amp;format=auto&amp;h=1425&amp;q=50&amp;tight=true&amp;w=1900&amp;s=3bd132c772bd7ef096dabc490f3a6f3de9306a4b" type="image/jpeg" length="65535"></media:content>
			<description><![CDATA[Polisen utreder ett misstänkt mordförsök mot en ung man som hittats skadad i södra Stockholm.]]></description>
			<pubDate>Thu, 04 Dec 2025 19:48:54 +0100</pubDate>
			<guid isPermaLink="false">1764874802249150</guid>
		</item>
	</channel>
</rss>`;

// MATCHING THE NEW CODE CONFIGURATION
const parser = new Parser({
    customFields: {
        item: [
          'source', 
          'dc:source',
          ['media:content', 'media:content', {keepArray: true}],
          ['media:thumbnail', 'media:thumbnail', {keepArray: true}],
          'itunes:image', 
          'image'
        ],
      },
});

(async () => {
  try {
    const feed = await parser.parseString(xml);
    console.log('Parsed Item Keys:', Object.keys(feed.items[0]));
    
    const item = feed.items[0];
    
    // NEW LOGIC
    let thumbnail = item.enclosure?.url;

    // 1. Check media:content
    if (!thumbnail && item['media:content']) {
    const mediaContent = item['media:content'];
    if (Array.isArray(mediaContent)) {
        // Find the first image
        const image = mediaContent.find((m) => m.$?.type?.startsWith('image') || m.$?.medium === 'image');
        thumbnail = image?.$?.url;
    } else {
        thumbnail = mediaContent.$?.url;
    }
    }

    // 2. Check media:thumbnail
    if (!thumbnail && item['media:thumbnail']) {
    const mediaThumbnail = item['media:thumbnail'];
    if (Array.isArray(mediaThumbnail)) {
        thumbnail = mediaThumbnail[0]?.$?.url;
    } else {
        thumbnail = mediaThumbnail.$?.url;
    }
    }

    // 3. Check itunes:image
    if (!thumbnail && item['itunes:image']) {
        thumbnail = item['itunes:image'].$?.href;
    }

    // 4. Check image tag
    if (!thumbnail && item.image) {
    thumbnail = item.image.url || item.image; 
    }

    if (!thumbnail) {
    const content = item.content || item.contentSnippet || '';
    const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
    if (imgMatch) {
        thumbnail = imgMatch[1];
    }
    }

    console.log('Extracted Thumbnail (New Logic):', thumbnail);

  } catch (err) {
    console.error(err);
  }
})();
