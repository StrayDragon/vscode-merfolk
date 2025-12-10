import * as vscode from 'vscode';
import { BaseService } from '../core/service';
import { generateContentHash } from '../shared/utils/fileType';
import { DIContainer } from '../core/container';

/**
 * Markdown section information
 */
export interface MarkdownSection {
    title: string;
    level: number;
    startIndex: number;
    endIndex: number;
    mermaidBlocks: MermaidBlock[];
}

/**
 * Mermaid block information within a section
 */
export interface MermaidBlock {
    content: string;
    startIndex: number;
    endIndex: number;
    indexInSection: number;
    indexInDocument: number;
}

/**
 * Cached document structure
 */
interface CachedDocument {
    sections: MarkdownSection[];
    lastModified: number;
    fileHash: string;
    mermaidCount: number;
}

/**
 * Cached section content
 */
interface CachedSection {
    content: string;
    lastModified: number;
    sectionHash: string;
}

/**
 * Service for parsing and extracting Mermaid content from Markdown files
 */
export class MarkdownService extends BaseService {
    // L1: Document structure cache
    private documentCache = new Map<string, CachedDocument>();

    // L2: Section content cache
    private sectionCache = new Map<string, CachedSection>();

    // Cache configuration
    private readonly CACHE_TTL = 30000; // 30 seconds
    private readonly MAX_CACHE_SIZE = 100;
    private readonly MAX_SECTION_CACHE_SIZE = 500;

    constructor(container: DIContainer) {
        super(container);
    }

    /**
     * Parse markdown document into sections
     */
    public async parseMarkdownSections(document: vscode.TextDocument): Promise<MarkdownSection[]> {
        const cacheKey = document.uri.toString();
        const now = Date.now();
        const fileHash = generateContentHash(document.getText());

        // Check cache first
        const cached = this.documentCache.get(cacheKey);
        if (cached &&
            (now - cached.lastModified) < this.CACHE_TTL &&
            cached.fileHash === fileHash) {
            return cached.sections;
        }

        // Parse document
        const sections = this.parseMarkdownDocument(document.getText());

        // Update cache
        this.updateDocumentCache(cacheKey, {
            sections,
            lastModified: now,
            fileHash,
            mermaidCount: sections.reduce((sum, s) => sum + s.mermaidBlocks.length, 0)
        });

        return sections;
    }

    /**
     * Find a specific mermaid block in a document
     */
    public async findMermaidBlock(
        document: vscode.TextDocument,
        section?: string,
        index?: number
    ): Promise<string | null> {
        const cacheKey = this.getSectionCacheKey(document.uri, section, index);
        const now = Date.now();
        const fileHash = generateContentHash(document.getText());

        // Check section cache
        const cachedSection = this.sectionCache.get(cacheKey);
        if (cachedSection &&
            (now - cachedSection.lastModified) < this.CACHE_TTL &&
            cachedSection.sectionHash === fileHash) {
            return cachedSection.content;
        }

        // Parse document to find the block
        const sections = await this.parseMarkdownSections(document);
        let targetSection: MarkdownSection | undefined;
        let targetBlock: MermaidBlock | undefined;

        if (section) {
            // Find specific section
            targetSection = sections.find(s => s.title === section);
            if (!targetSection) {
                const availableSections = sections.map(s => `"${s.title}"`).join(', ');
                throw new Error(`Section "${section}" not found in document. Available sections: ${availableSections}`);
            }
        } else {
            // Use first section with mermaid blocks or create a virtual section
            const allMermaidBlocks: MermaidBlock[] = [];
            sections.forEach(s => allMermaidBlocks.push(...s.mermaidBlocks));

            targetSection = sections.find(s => s.mermaidBlocks.length > 0) || {
                title: 'Document',
                level: 0,
                startIndex: 0,
                endIndex: document.lineCount - 1,
                mermaidBlocks: allMermaidBlocks
            };
        }

        if (!targetSection || targetSection.mermaidBlocks.length === 0) {
            throw new Error(`No Mermaid blocks found${section ? ` in section "${section}"` : ' in document'}`);
        }

        // Find specific block by index
        const blockIndex = (index || 1) - 1; // Convert to 0-based
        if (blockIndex < 0 || blockIndex >= targetSection.mermaidBlocks.length) {
            throw new Error(
                section
                    ? `Section "${section}" only contains ${targetSection.mermaidBlocks.length} mermaid block(s). Requested index: ${index || 1}`
                    : `Document only contains ${targetSection.mermaidBlocks.length} mermaid block(s). Requested index: ${index || 1}`
            );
        }

        targetBlock = targetSection.mermaidBlocks[blockIndex];

        // Update section cache
        this.updateSectionCache(cacheKey, {
            content: targetBlock.content,
            lastModified: now,
            sectionHash: fileHash
        });

        return targetBlock.content;
    }

    /**
     * Parse markdown text into sections
     */
    private parseMarkdownDocument(text: string): MarkdownSection[] {
        const lines = text.split('\n');
        const sections: MarkdownSection[] = [];
        let currentSection: MarkdownSection | null = null;
        let mermaidCounter = 0;
        let documentStartIndex = 0;

        // Find first section or create default
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

            if (headingMatch) {
                // If we haven't created any section yet and this is not the first line,
                // create a default section for content before first heading
                if (!currentSection && i > documentStartIndex) {
                    currentSection = {
                        title: 'Document Start',
                        level: 0,
                        startIndex: documentStartIndex,
                        endIndex: i - 1,
                        mermaidBlocks: []
                    };
                    sections.push(currentSection);
                }

                // Save previous section
                if (currentSection) {
                    currentSection.endIndex = i - 1;
                    sections.push(currentSection);
                }

                // Create new section
                currentSection = {
                    title: headingMatch[2].trim(),
                    level: headingMatch[1].length,
                    startIndex: i,
                    endIndex: -1,
                    mermaidBlocks: []
                };
            }

            // Detect mermaid code blocks
            if (line.trim() === '```mermaid') {
                mermaidCounter++;
                const startIndex = i;

                // Find code block end
                let endIndex = i + 1;
                while (endIndex < lines.length && lines[endIndex].trim() !== '```') {
                    endIndex++;
                }

                if (endIndex < lines.length) {
                    const blockContent = lines.slice(i + 1, endIndex).join('\n');

                    // If no current section, create a default one
                    if (!currentSection) {
                        currentSection = {
                            title: 'Document Start',
                            level: 0,
                            startIndex: documentStartIndex,
                            endIndex: -1,
                            mermaidBlocks: []
                        };
                        sections.push(currentSection);
                    }

                    currentSection.mermaidBlocks.push({
                        content: blockContent,
                        startIndex: i,
                        endIndex: endIndex,
                        indexInSection: currentSection.mermaidBlocks.length + 1,
                        indexInDocument: mermaidCounter
                    });
                }

                i = endIndex; // Skip entire code block
            }
        }

        // Handle last section
        if (currentSection) {
            currentSection.endIndex = lines.length - 1;
            sections.push(currentSection);
        } else if (sections.length === 0) {
            // Create default section if no headings found
            sections.push({
                title: 'Document',
                level: 0,
                startIndex: 0,
                endIndex: lines.length - 1,
                mermaidBlocks: []
            });
        }

        return sections;
    }

    
    /**
     * Get cache key for document structure
     */
    private getDocumentCacheKey(uri: vscode.Uri): string {
        return `doc:${uri.toString()}`;
    }

    /**
     * Get cache key for section content
     */
    private getSectionCacheKey(uri: vscode.Uri, section?: string, index?: number): string {
        const baseKey = uri.toString();
        if (section) {
            return `section:${baseKey}#${section}:${index || 1}`;
        }
        return `section:${baseKey}:${index || 1}`;
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
     * Update section cache with LRU eviction
     */
    private updateSectionCache(key: string, data: CachedSection): void {
        // Evict oldest if cache is full
        if (this.sectionCache.size >= this.MAX_SECTION_CACHE_SIZE) {
            const firstKey = this.sectionCache.keys().next().value;
            if (firstKey) {
                this.sectionCache.delete(firstKey);
            }
        }
        this.sectionCache.set(key, data);
    }

    /**
     * Clear all caches
     */
    public clearCaches(): void {
        this.documentCache.clear();
        this.sectionCache.clear();
    }

    /**
     * Clear caches for specific document
     */
    public clearDocumentCache(uri: vscode.Uri): void {
        const docKey = this.getDocumentCacheKey(uri);
        this.documentCache.delete(docKey);

        // Clear related section caches
        const uriStr = uri.toString();
        const keysToDelete: string[] = [];
        for (const entry of this.sectionCache.entries()) {
            const key = entry[0];
            if (key.includes(uriStr)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.sectionCache.delete(key));
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { documentCache: number; sectionCache: number } {
        return {
            documentCache: this.documentCache.size,
            sectionCache: this.sectionCache.size
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