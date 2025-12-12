import * as vscode from 'vscode';
import { BaseService, ISyntaxHighlightService, IConfigService } from '../core/service';
import { DIContainer } from '../core/container';

interface CachedGrammar {
    uri: string;
    timestamp: number;
    content?: string;
}

interface PerformanceMetrics {
    cacheHits: number;
    cacheMisses: number;
    loadTimes: number[];
    averageLoadTime: number;
}

/**
 * Service for managing syntax highlighting with performance optimizations
 */
export class SyntaxHighlightService extends BaseService implements ISyntaxHighlightService {
    // Grammar cache with LRU eviction
    private grammarCache = new Map<string, CachedGrammar>();
    private readonly maxCacheSize: number;
    private readonly debounceDelay: number;

    // Performance tracking
    private metrics: PerformanceMetrics = {
        cacheHits: 0,
        cacheMisses: 0,
        loadTimes: [],
        averageLoadTime: 0
    };

    // Debounced refresh function
    private debouncedRefresh: Map<string, NodeJS.Timeout> = new Map();

    // Configuration service
    private configService: IConfigService;

    // Event listeners
    private documentChangeDisposable?: vscode.Disposable;

    constructor(container: DIContainer) {
        super(container);
        this.configService = container.resolve<IConfigService>('IConfigService');

        // Load configuration
        this.maxCacheSize = this.configService.get('merfolk.syntaxHighlight.cacheSize', 50);
        this.debounceDelay = this.configService.get('merfolk.syntaxHighlight.debounceDelay', 300);

        // Register event listeners
        this.registerEventListeners();
    }

    /**
     * Check if syntax highlighting is enabled
     */
    public isEnabled(): boolean {
        return this.configService.get('merfolk.syntaxHighlight.enabled', true);
    }

    /**
     * Register event listeners for document changes
     */
    private registerEventListeners(): void {
        // Listen for text document changes with debouncing
        this.documentChangeDisposable = vscode.workspace.onDidChangeTextDocument(
            this.handleDocumentChange.bind(this)
        );

        this.addDisposable(this.documentChangeDisposable!);

        // Listen for configuration changes
        this.registerEvent(
            vscode.workspace.onDidChangeConfiguration,
            this.handleConfigurationChange.bind(this)
        );
    }

    /**
     * Handle document changes with debouncing
     */
    private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
        // Skip if syntax highlighting is disabled
        if (!this.isEnabled()) {
            return;
        }

        // Only process Markdown files with Mermaid content
        if (!this.isRelevantDocument(event.document)) {
            return;
        }

        // Quick check: skip if document is too large
        if (event.document.getText().length > 1000000) { // 1MB limit
            return;
        }

        const uri = event.document.uri.toString();

        // Clear existing debounced call
        const existingTimeout = this.debouncedRefresh.get(uri);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Schedule debounced refresh
        const timeout = setTimeout(() => {
            this.refreshHighlighting(event.document);
            this.debouncedRefresh.delete(uri);
        }, this.debounceDelay);

        this.debouncedRefresh.set(uri, timeout);
    }

    /**
     * Check if document is relevant for syntax highlighting
     */
    private isRelevantDocument(document: vscode.TextDocument): boolean {
        // Check if it's a Markdown file
        if (document.languageId !== 'markdown') {
            return false;
        }

        // Quick check for mermaid content
        const text = document.getText();
        return text.includes('```mermaid') || text.includes('```mermaid') || text.includes('```mmd');
    }

    /**
     * Refresh syntax highlighting for a document
     */
    public async refreshHighlighting(document: vscode.TextDocument): Promise<void> {
        const startTime = Date.now();

        try {
            // Check if document is relevant
            if (!this.isRelevantDocument(document)) {
                return;
            }

            const uri = document.uri.toString();
            const cached = this.getCachedGrammar(uri);

            if (cached) {
                this.metrics.cacheHits++;
                return;
            }

            this.metrics.cacheMisses++;

            // Simulate grammar loading (in real implementation, this would interact with VS Code's grammar system)
            await this.loadGrammar(document);

            // Update cache
            this.updateCache(uri);

            // Track performance
            const loadTime = Date.now() - startTime;
            this.metrics.loadTimes.push(loadTime);

            // Keep only last 100 measurements
            if (this.metrics.loadTimes.length > 100) {
                this.metrics.loadTimes.shift();
            }

            // Update average
            this.metrics.averageLoadTime =
                this.metrics.loadTimes.reduce((sum, time) => sum + time, 0) / this.metrics.loadTimes.length;

        } catch (error) {
            console.error('Error refreshing syntax highlighting:', error);
        }
    }

    /**
     * Get cached grammar if available and not expired
     */
    private getCachedGrammar(uri: string): CachedGrammar | undefined {
        const cached = this.grammarCache.get(uri);

        if (!cached) {
            return undefined;
        }

        // Check if cache is expired (5 minutes TTL)
        const now = Date.now();
        if (now - cached.timestamp > 300000) {
            this.grammarCache.delete(uri);
            return undefined;
        }

        // Move to end (LRU)
        this.grammarCache.delete(uri);
        this.grammarCache.set(uri, cached);

        return cached;
    }

    /**
     * Update cache with new entry
     */
    private updateCache(uri: string): void {
        // Evict oldest entry if cache is full
        if (this.grammarCache.size >= this.maxCacheSize) {
            const firstKey = this.grammarCache.keys().next().value;
            if (firstKey) {
                this.grammarCache.delete(firstKey);
            }
        }

        this.grammarCache.set(uri, {
            uri,
            timestamp: Date.now()
        });
    }

    /**
     * Load grammar for document (placeholder implementation)
     */
    private async loadGrammar(document: vscode.TextDocument): Promise<void> {
        // In a real implementation, this would interact with VS Code's grammar API
        // For now, we'll simulate the loading process
        await new Promise(resolve => setTimeout(resolve, 10));

        // Trigger VS Code to re-apply syntax highlighting
        // This is a workaround since VS Code doesn't expose a direct API for this
        const visibleEditors = vscode.window.visibleTextEditors;
        for (const editor of visibleEditors) {
            if (editor.document === document) {
                // Force editor to refresh syntax highlighting
                const visibleRanges = editor.visibleRanges;
                if (visibleRanges.length > 0) {
                    // Scroll to current position to trigger re-highlighting
                    const pos = editor.selection.active;
                    editor.revealRange(new vscode.Range(pos, pos));
                }
                break;
            }
        }
    }

    /**
     * Handle configuration changes
     */
    private handleConfigurationChange(event: vscode.ConfigurationChangeEvent): void {
        if (event.affectsConfiguration('merfolk.syntaxHighlight')) {
            // Clear cache when configuration changes
            this.clearCache();

            // Update settings
            const newSize = this.configService.get('merfolk.syntaxHighlight.cacheSize', 50);
            const newDelay = this.configService.get('merfolk.syntaxHighlight.debounceDelay', 300);

            // Note: We don't update the private fields as they're set in constructor
            // In a real implementation, you might want to make these reactive
        }
    }

    /**
     * Clear all caches
     */
    public clearCache(): void {
        this.grammarCache.clear();

        // Clear all pending debounced refreshes
        for (const timeout of this.debouncedRefresh.values()) {
            clearTimeout(timeout);
        }
        this.debouncedRefresh.clear();

        // Reset metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            loadTimes: [],
            averageLoadTime: 0
        };
    }

    /**
     * Get cache statistics
     */
    public getCacheStats(): { cacheSize: number; cacheHits: number; cacheMisses: number } {
        return {
            cacheSize: this.grammarCache.size,
            cacheHits: this.metrics.cacheHits,
            cacheMisses: this.metrics.cacheMisses
        };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.clearCache();
        super.dispose();
    }
}