/**
 * News & Research Service using Tavily API
 * Provides market intelligence for trading decisions
 */
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);
export class NewsResearchService {
    apiKey;
    scriptPath;
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.TAVILY_API_KEY || '';
        this.scriptPath = `${process.env.HOME}/clawd/skills/tavily/scripts/tavily_search.py`;
    }
    /**
     * Search for Bitcoin-related news
     */
    async searchBitcoinNews(customQuery) {
        const query = customQuery || 'Bitcoin BTC price movement today news';
        try {
            const cmd = `PYTHONIOENCODING=utf-8 python3 ${this.scriptPath} "${query}" --topic news --max-results 5 --json --api-key "${this.apiKey}"`;
            const { stdout } = await execAsync(cmd, { timeout: 30000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
            const data = JSON.parse(stdout);
            // Analyze sentiment from the AI answer
            const sentiment = this.analyzeSentiment(data.answer || '');
            return {
                query,
                answer: data.answer || 'No summary available',
                sources: (data.results || []).map((r) => ({
                    title: r.title,
                    url: r.url,
                    content: r.content,
                    score: r.score
                })),
                sentiment: sentiment.direction,
                confidence: sentiment.confidence,
                timestamp: new Date()
            };
        }
        catch (error) {
            console.error('News research error:', error.message);
            return {
                query,
                answer: 'Unable to fetch news',
                sources: [],
                sentiment: 'NEUTRAL',
                confidence: 0,
                timestamp: new Date()
            };
        }
    }
    /**
     * Get market sentiment research
     */
    async getMarketSentiment() {
        return this.searchBitcoinNews('Bitcoin market sentiment analysis today bullish bearish');
    }
    /**
     * Check for breaking news that might affect BTC
     */
    async checkBreakingNews() {
        return this.searchBitcoinNews('Bitcoin breaking news urgent crypto market');
    }
    /**
     * Research specific event impact
     */
    async researchEvent(event) {
        return this.searchBitcoinNews(`Bitcoin ${event} impact price`);
    }
    /**
     * Analyze sentiment from text
     */
    analyzeSentiment(text) {
        const lowerText = text.toLowerCase();
        const bullishWords = ['surge', 'rally', 'gain', 'rise', 'bullish', 'up', 'high', 'record', 'soar', 'jump', 'positive', 'growth'];
        const bearishWords = ['drop', 'fall', 'crash', 'decline', 'bearish', 'down', 'low', 'plunge', 'tumble', 'negative', 'loss', 'sell-off'];
        let bullishScore = 0;
        let bearishScore = 0;
        for (const word of bullishWords) {
            if (lowerText.includes(word))
                bullishScore++;
        }
        for (const word of bearishWords) {
            if (lowerText.includes(word))
                bearishScore++;
        }
        const total = bullishScore + bearishScore;
        if (total === 0) {
            return { direction: 'NEUTRAL', confidence: 0.5 };
        }
        const bullishRatio = bullishScore / total;
        if (bullishRatio > 0.6) {
            return { direction: 'BULLISH', confidence: Math.min(0.9, 0.5 + bullishRatio * 0.4) };
        }
        else if (bullishRatio < 0.4) {
            return { direction: 'BEARISH', confidence: Math.min(0.9, 0.5 + (1 - bullishRatio) * 0.4) };
        }
        return { direction: 'NEUTRAL', confidence: 0.5 };
    }
    /**
     * Format research for display
     */
    formatReport(report) {
        const sentimentEmoji = {
            'BULLISH': '🟢',
            'BEARISH': '🔴',
            'NEUTRAL': '⚪'
        };
        const lines = [
            `📰 NEWS RESEARCH`,
            `Query: ${report.query}`,
            ``,
            `📝 Summary:`,
            report.answer,
            ``,
            `${sentimentEmoji[report.sentiment]} Sentiment: ${report.sentiment} (${(report.confidence * 100).toFixed(0)}% confidence)`,
            ``,
            `📚 Sources (${report.sources.length}):`,
            ...report.sources.slice(0, 3).map((s, i) => `  ${i + 1}. ${s.title}`),
            ``,
            `🕐 Updated: ${report.timestamp.toLocaleTimeString()}`
        ];
        return lines.join('\n');
    }
}
// Singleton instance
let newsService = null;
export function getNewsService(apiKey) {
    if (!newsService) {
        newsService = new NewsResearchService(apiKey);
    }
    return newsService;
}
//# sourceMappingURL=news-research.js.map