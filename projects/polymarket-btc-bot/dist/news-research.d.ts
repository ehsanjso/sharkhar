/**
 * News & Research Service using Tavily API
 * Provides market intelligence for trading decisions
 */
export interface NewsResult {
    title: string;
    url: string;
    content: string;
    score: number;
}
export interface ResearchReport {
    query: string;
    answer: string;
    sources: NewsResult[];
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    confidence: number;
    timestamp: Date;
}
export declare class NewsResearchService {
    private apiKey;
    private scriptPath;
    constructor(apiKey?: string);
    /**
     * Search for Bitcoin-related news
     */
    searchBitcoinNews(customQuery?: string): Promise<ResearchReport>;
    /**
     * Get market sentiment research
     */
    getMarketSentiment(): Promise<ResearchReport>;
    /**
     * Check for breaking news that might affect BTC
     */
    checkBreakingNews(): Promise<ResearchReport>;
    /**
     * Research specific event impact
     */
    researchEvent(event: string): Promise<ResearchReport>;
    /**
     * Analyze sentiment from text
     */
    private analyzeSentiment;
    /**
     * Format research for display
     */
    formatReport(report: ResearchReport): string;
}
export declare function getNewsService(apiKey?: string): NewsResearchService;
//# sourceMappingURL=news-research.d.ts.map