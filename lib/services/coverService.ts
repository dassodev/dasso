import { generateBookCover } from '../utils/coverGenerator';

interface BookCoverCache {
  [bookId: string]: {
    dataUrl: string;
    timestamp: number;
  }
}

class CoverService {
  private static instance: CoverService;
  private coverCache: BookCoverCache = {};
  private readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

  private constructor() {
    // Initialize cache cleanup interval
    setInterval(() => this.cleanupCache(), 24 * 60 * 60 * 1000); // Run daily
  }

  public static getInstance(): CoverService {
    if (!CoverService.instance) {
      CoverService.instance = new CoverService();
    }
    return CoverService.instance;
  }

  public async getBookCover(bookId: string, title: string, fileType: string): Promise<string> {
    // Check cache first
    if (this.coverCache[bookId] && 
        Date.now() - this.coverCache[bookId].timestamp < this.CACHE_DURATION) {
      return this.coverCache[bookId].dataUrl;
    }

    // Generate new cover
    const dataUrl = generateBookCover({ title, fileType });
    
    // Cache the new cover
    this.coverCache[bookId] = {
      dataUrl,
      timestamp: Date.now()
    };

    return dataUrl;
  }

  public removeCover(bookId: string): void {
    delete this.coverCache[bookId];
  }

  private cleanupCache(): void {
    const now = Date.now();
    Object.entries(this.coverCache).forEach(([bookId, cache]) => {
      if (now - cache.timestamp > this.CACHE_DURATION) {
        this.removeCover(bookId);
      }
    });
  }
}

export const coverService = CoverService.getInstance(); 