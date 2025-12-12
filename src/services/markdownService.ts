import * as vscode from 'vscode';
import { BaseService } from '../core/service';
import { generateContentHash } from '../shared/utils/fileType';
import { DIContainer } from '../core/container';

/**
 * Mermaid block information found by ID
 */
interface MermaidBlockInfo {
    content: string;
    line: number;
    id: string;
}

/**
 * Cached document structure
 */
interface CachedDocument {
    mermaidBlocks: MermaidBlockInfo[];
    availableIds: string[];
    lastModified: number;
    fileHash: string;
}

/**
 * Service for parsing and extracting Mermaid content from Markdown files using ID-based comments
 */
export class MarkdownService extends BaseService {
    // Document cache for ID-based lookups
    private documentCache = new Map<string, CachedDocument>();

    // Cache configuration
    private readonly CACHE_TTL = 30000; // 30 seconds
    private readonly MAX_CACHE_SIZE = 100;

    constructor(container: DIContainer) {
        super(container);
    }

    /**
     * Find mermaid block by ID in markdown document
     */
    public async findMermaidById(document: vscode.TextDocument, id: string): Promise<string | null> {
        const mermaidBlocks = await this.parseDocumentForIds(document);
        const block = mermaidBlocks.find(block => block.id === id);

        return block ? block.content : null;
    }

    /**
     * Get all available IDs in a markdown document
     */
    public async getAvailableIds(document: vscode.TextDocument): Promise<string[]> {
        const mermaidBlocks = await this.parseDocumentForIds(document);
        return mermaidBlocks.map(block => block.id);
    }

    /**
     * Find mermaid block by ID and return both content and line number
     */
    public async findMermaidByIdWithLine(document: vscode.TextDocument, id: string): Promise<{ content: string; line: number } | null> {
        const mermaidBlocks = await this.parseDocumentForIds(document);
        const block = mermaidBlocks.find(block => block.id === id);

        return block ? { content: block.content, line: block.line } : null;
    }

    /**
     * Get line number for a specific mermaid ID
     */
    public async getLineForId(document: vscode.TextDocument, id: string): Promise<number | null> {
        const mermaidBlocks = await this.parseDocumentForIds(document);
        const block = mermaidBlocks.find(block => block.id === id);

        return block ? block.line : null;
    }

    /**
     * Parse document to find all mermaid blocks with IDs
     */
    private async parseDocumentForIds(document: vscode.TextDocument): Promise<MermaidBlockInfo[]> {
        const cacheKey = document.uri.toString();
        const now = Date.now();
        const fileHash = generateContentHash(document.getText());

        // Check cache first
        const cached = this.documentCache.get(cacheKey);
        if (cached &&
            (now - cached.lastModified) < this.CACHE_TTL &&
            cached.fileHash === fileHash) {
            return cached.mermaidBlocks;
        }

        // Parse document
        const mermaidBlocks = this.parseMermaidBlocks(document.getText());

        // Update cache
        this.updateDocumentCache(cacheKey, {
            mermaidBlocks,
            availableIds: mermaidBlocks.map(block => block.id),
            lastModified: now,
            fileHash
        });

        return mermaidBlocks;
    }

    /**
     * Parse markdown text to find mermaid blocks with ID comments
     */
    private parseMermaidBlocks(text: string): MermaidBlockInfo[] {
        const lines = text.split('\n');
        const mermaidBlocks: MermaidBlockInfo[] = [];

        // Pattern to match <!-- merfolk@id --> comments
        const idPattern = /<!--\s*merfolk@([^@\s>]+)\s*-->/gi;

        let currentId: string | null = null;
        let pendingIds: { line: number; id: string }[] = [];

        // First pass: collect all ID comments and their line numbers
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let match;

            // Reset regex before each line to avoid issues with lastIndex
            idPattern.lastIndex = 0;
            while ((match = idPattern.exec(line)) !== null) {
                pendingIds.push({ line: i, id: match[1] });
            }
        }

        // Sort pending IDs by line number
        pendingIds.sort((a, b) => a.line - b.line);

        // Second pass: find mermaid blocks and associate with IDs
        let pendingIdIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            // Check if we have an ID comment before this mermaid block
            while (pendingIdIndex < pendingIds.length && pendingIds[pendingIdIndex].line < i) {
                pendingIdIndex++;
            }

            if (pendingIdIndex < pendingIds.length && pendingIds[pendingIdIndex].line <= i) {
                currentId = pendingIds[pendingIdIndex].id;
                pendingIdIndex++;
            }

            // Detect mermaid code block start
            if (line === '```mermaid') {
                if (!currentId) {
                    // Skip mermaid blocks without ID
                    continue;
                }

                const startIndex = i + 1;
                let endIndex = startIndex;

                // Find code block end
                while (endIndex < lines.length && lines[endIndex].trim() !== '```') {
                    endIndex++;
                }

                if (endIndex < lines.length) {
                    // Extract mermaid content
                    const content = lines.slice(startIndex, endIndex).join('\n');

                    mermaidBlocks.push({
                        content,
                        line: i,
                        id: currentId
                    });
                }

                // Reset current ID after using it
                currentId = null;
                i = endIndex; // Skip to end of code block
            }
        }

        return mermaidBlocks;
    }

    /**
     * Update document cache with LRU eviction
     */
    private updateDocumentCache(key: string, data: CachedDocument): void {
        // Evict oldest if cache is full
        if (this.documentCache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.documentCache.keys().next().value;
            if (firstKey) {
                this.documentCache.delete(firstKey);
            }
        }
        this.documentCache.set(key, data);
    }

    /**
     * Clear all caches
     */
    public clearCaches(): void {
        this.documentCache.clear();
    }

    /**
     * Clear cache for specific document
     */
    public clearDocumentCache(uri: vscode.Uri): void {
        this.documentCache.delete(uri.toString());
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { documentCache: number } {
        return {
            documentCache: this.documentCache.size
        };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.clearCaches();
        super.dispose();
    }
}