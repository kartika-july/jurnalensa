export type Category = {
    name: string;
    quartile: string;
};
export type Metric = {
    year?: number;
    value?: number;
    bestQuartile?: string;
    categories: Category[];
    rank?: number;
    url: string;
    checkedAt: string;
    context?: "profile" | "decree";
    note?: string;
    validity?: string;
};
export type IdentitySource = {
    name: "Crossref";
    url: string;
    checkedAt: string;
};
export type Journal = {
    id: string;
    title: string;
    publisher: string;
    country?: string;
    issns: string[];
    aliases?: string[];
    identitySource?: IdentitySource;
    sjr?: Metric;
    sinta?: Metric;
    notes: string[];
};
export type Article = {
    doi: string;
    title: string;
    journal: string;
    year?: number;
    issns: string[];
    publisher: string;
    volume?: string;
    issue?: string;
    type?: string;
};
export type JournalScope = "all" | "indonesia" | "international";
export type SearchResult = {
    query: string;
    year: number;
    scope: JournalScope;
    article?: Article;
    journals: Journal[];
    totalMatches: number;
    offset: number;
    hasMore: boolean;
    warnings: string[];
    checkedAt: string;
};
export type JournalExample = {
    title: string;
    publisher: string;
    country?: string;
    issn: string;
    quartile?: string;
    rank?: number;
    context?: "profile" | "decree";
};
export type Coverage = {
    sjrCount: number;
    countryCount: number;
    sjrIndonesiaCount: number;
    sintaCount: number;
    nationalPublisherCount: number;
    checkedAt: string;
    sjrYear: number;
    examples: JournalExample[];
};
export type BatchRow = {
    input: string;
    article?: Article;
    journal?: Journal;
    error?: string;
};
