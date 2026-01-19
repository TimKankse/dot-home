export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  isoDate?: string;
  thumbnail?: string;
  publisher?: string;
}

export interface RssData {
  title: string;
  description: string;
  items: RssItem[];
}

export async function fetchRssFeed(feedUrls: string[]): Promise<RssData> {
  if (feedUrls.length === 0) {
    throw new Error('No feed URLs provided');
  }

  const params = new URLSearchParams();
  feedUrls.forEach(url => params.append('url', url));
  
  const response = await fetch(`/api/rss?${params.toString()}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch RSS feed');
  }
  
  return response.json();
}

export function formatTimeAgo(dateStr: string, now: Date): string {
  const date = new Date(dateStr);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks === 1) return 'last week';
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
