declare module "google-trends-api" {
  interface TrendOptions {
    keyword: string | string[];
    startTime?: Date;
    endTime?: Date;
    geo?: string;
    resolution?: "COUNTRY" | "REGION" | "CITY" | "DMA";
  }
  const api: {
    interestOverTime(opts: TrendOptions): Promise<string>;
    interestByRegion(opts: TrendOptions): Promise<string>;
    relatedQueries(opts: TrendOptions): Promise<string>;
    relatedTopics(opts: TrendOptions): Promise<string>;
  };
  export default api;
}
