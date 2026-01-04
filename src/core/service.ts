import * as vscode from 'vscode';
import { DIContainer } from './container';

/**
 * Base class for all services
 * Provides common functionality and lifecycle management
 */
export abstract class BaseService {
    protected disposables: vscode.Disposable[] = [];
    protected readonly context: vscode.ExtensionContext;
    protected readonly container: DIContainer;

    constructor(container: DIContainer) {
        this.container = container;
        this.context = container.getContext() || {} as vscode.ExtensionContext;
    }

    
    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
        this.disposables = [];
    }

    /**
     * Add a disposable to the service lifecycle
     */
    protected addDisposable(disposable: vscode.Disposable): void {
        this.disposables.push(disposable);
    }

    /**
     * Register a VS Code command
     */
    protected registerCommand(
        command: string,
        callback: (...args: any[]) => any,
        thisArg?: any
    ): void {
        const registeredCommand = vscode.commands.registerCommand(command, callback, thisArg);
        this.addDisposable(registeredCommand);
    }

    /**
     * Register a VS Code event listener
     */
    protected registerEvent<T>(
        event: vscode.Event<T>,
        listener: (e: T) => any,
        thisArg?: any
    ): void {
        const disposable = event(listener, thisArg);
        this.addDisposable(disposable);
    }
}

/**
 * Service interface for Preview functionality
 */
export interface IPreviewService {
    createOrShow(document: vscode.TextDocument): void;
    revive(panel: vscode.WebviewPanel): void;
    previewMermaidById(documentUri: vscode.Uri, filePath: string, id?: string): Promise<void>;
    previewMermaidContent(content: string, sourceInfo: { filePath: string; id?: string }): void;
    dispose(): void;
}


/**
 * Service interface for CodeLens functionality
 */
export interface ICodeLensService {
    getProvider(): MermaidChartCodeLensProvider;
    registerProvider(context: vscode.ExtensionContext): void;
    refresh(): void;
    dispose(): void;
}

/**
 * Service interface for File operations
 */
export interface IFileService {
    openFile(relativePath: string, baseUri: vscode.Uri): Promise<vscode.TextDocument>;
    resolvePath(relativePath: string, baseUri: vscode.Uri): vscode.Uri;
    isMermaidFile(document: vscode.TextDocument): boolean;
    isMarkdownFile(document: vscode.TextDocument): boolean;
    getDocumentHash(document: vscode.TextDocument): string;
}

/**
 * Service interface for Configuration management
 */
export interface IConfigService {
    getPreviewColumn(): vscode.ViewColumn;
    get<T>(key: string, defaultValue: T): T;
}

/**
 * Service interface for Markdown operations
 */
export interface IMarkdownService {
    findMermaidById(document: vscode.TextDocument, id: string): Promise<string | null>;
    getAvailableIds(document: vscode.TextDocument): Promise<string[]>;
    findMermaidByIdWithLine(document: vscode.TextDocument, id: string): Promise<{ content: string; line: number } | null>;
    getLineForId(document: vscode.TextDocument, id: string): Promise<number | null>;
    clearCaches(): void;
    clearDocumentCache(uri: vscode.Uri): void;
    getCacheStats(): { documentCache: number };
}

/**
 * Service interface for Syntax Highlighting operations
 */
export interface ISyntaxHighlightService {
    refreshHighlighting(document: vscode.TextDocument): Promise<void>;
    clearCache(): void;
    getCacheStats(): { cacheSize: number; cacheHits: number; cacheMisses: number };
    isEnabled(): boolean;
    dispose(): void;
}

/**
 * Service interface for Merfolk Editor webview
 */
export interface IMerfolkEditorService {
    openDocument(document: vscode.TextDocument): Promise<void>;
    openLink(documentUri: vscode.Uri, linkInfo: { filePath: string; id?: string }): Promise<void>;
    createAndOpen(): Promise<void>;
    dispose(): void;
}

/**
 * Parsed MermaidChart link information
 */
export interface MermaidChartLink {
    filePath: string;
    id?: string;
    lineNumber: number;
    column: number;
}

/**
 * Provider interface for Command registration
 */
export interface ICommandProvider {
    registerCommands(context: vscode.ExtensionContext): void;
}

/**
 * Provider interface for Extension activation
 */
export interface IActivationProvider {
    onActivate(context: vscode.ExtensionContext): void;
}

/**
 * Provider interface for Configuration management
 */
export interface IConfigProvider {
    initialize(context: vscode.ExtensionContext): void;
    getConfig(): vscode.WorkspaceConfiguration;
}

/**
 * Enhanced MermaidChartCodeLensProvider that works with DI
 */
export class MermaidChartCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

    // Performance optimization: Cache for document content to avoid re-parsing
    private static documentCache = new Map<string, { text: string; lastModified: number }>();
    private static readonly CACHE_TTL = 5000; // 5 seconds cache TTL
    private static readonly CACHE_MAX_SIZE = 50; // Max 50 documents in cache

    // Simplified regex to match [MermaidChart: path.mmd] or [MermaidChart: path.md@id]
    // Pattern: [MermaidChart: filepath][@id]
    // Groups: 1=file path (up to extension), 2=optional id
    private readonly mermaidChartRegex = /\[MermaidChart:\s*([^\]]+\.(?:md|mmd|mermaid))(?:@([^@\]\s]+))?\s*\]/gi;
    private readonly mermaidFencePrefix = '```';

    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
        // Quick check: if file is too large, skip processing for performance
        if (document.getText().length > 500000) { // 500KB limit
            return [];
        }

        // Performance optimization: Check cache first
        const cacheKey = document.uri.toString();
        const now = Date.now();
        const cached = MermaidChartCodeLensProvider.documentCache.get(cacheKey);

        let text: string;

        if (cached && (now - cached.lastModified) < MermaidChartCodeLensProvider.CACHE_TTL) {
            text = cached.text;
        } else {
            text = document.getText();

            // Update cache (with size limit)
            if (MermaidChartCodeLensProvider.documentCache.size >= MermaidChartCodeLensProvider.CACHE_MAX_SIZE) {
                const firstKey = MermaidChartCodeLensProvider.documentCache.keys().next().value;
                if (firstKey) {
                    MermaidChartCodeLensProvider.documentCache.delete(firstKey);
                }
            }

            MermaidChartCodeLensProvider.documentCache.set(cacheKey, {
                text,
                lastModified: now
            });
        }

        const isMarkdown = document.languageId === 'markdown' || document.fileName.toLowerCase().endsWith('.md');
        const hasMermaidChart = text.includes('[MermaidChart:');
        const lowerText = isMarkdown ? text.toLowerCase() : '';
        const hasMermaidBlocks = isMarkdown && (lowerText.includes('```mermaid') || lowerText.includes('```mmd'));

        // Quick check: if no MermaidChart pattern or Mermaid blocks, return empty immediately
        if (!hasMermaidChart && !hasMermaidBlocks) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        let match;
        let matchCount = 0;

        if (hasMermaidChart) {
            // Reset regex lastIndex
            this.mermaidChartRegex.lastIndex = 0;

            // Limit matches for performance (max 20 CodeLens per file)
            while ((match = this.mermaidChartRegex.exec(text)) !== null && matchCount < 20) {
                matchCount++;
                const startIndex = match.index;
                const endIndex = startIndex + match[0].length;
                const filePath = match[1].trim();
                const id = match[2]?.trim(); // Optional ID

                const startPos = document.positionAt(startIndex);
                const endPos = document.positionAt(endIndex);
                const range = new vscode.Range(startPos, endPos);

                // Build display title
                let displayTitle = filePath;
                if (id) {
                    displayTitle += `@${id}`;
                }

                // Use unified commands for both file types
                codeLenses.push(new vscode.CodeLens(range, {
                    title: "Preview",
                    command: "mermaidChart.preview",
                    arguments: [document.uri, { filePath, id }]
                }));

                codeLenses.push(new vscode.CodeLens(range, {
                    title: "Open",
                    command: "mermaidChart.openFile",
                    arguments: [document.uri, { filePath, id }]
                }));

                codeLenses.push(new vscode.CodeLens(range, {
                    title: "Edit",
                    command: "merfolkEditor.open",
                    arguments: [document.uri, { filePath, id }]
                }));
            }
        }

        if (hasMermaidBlocks) {
            const lines = text.split('\n');
            let blockCount = 0;

            for (let i = 0; i < lines.length && blockCount < 20; i++) {
                const line = lines[i].trim();
                if (!this.isMermaidFenceStart(line)) {
                    continue;
                }

                const lineText = lines[i];
                const range = new vscode.Range(
                    new vscode.Position(i, 0),
                    new vscode.Position(i, lineText.length)
                );

                codeLenses.push(new vscode.CodeLens(range, {
                    title: "Preview",
                    command: "mermaid.previewMarkdownBlock",
                    arguments: [document.uri, { startLine: i }]
                }));

                blockCount++;

                let endLine = i + 1;
                while (endLine < lines.length) {
                    if (lines[endLine].trim() === this.mermaidFencePrefix) {
                        break;
                    }
                    endLine++;
                }

                if (endLine >= lines.length) {
                    break;
                }

                i = endLine;
            }
        }

        return codeLenses;
    }

    resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.CodeLens | Thenable<vscode.CodeLens> {
        // Check for cancellation
        if (token.isCancellationRequested) {
            return Promise.reject(new vscode.CancellationError());
        }

        return codeLens;
    }

    // Method to trigger CodeLens refresh
    public refresh(): void {
        // Clear cache on refresh to force re-parsing
        MermaidChartCodeLensProvider.documentCache.clear();
        this._onDidChangeCodeLenses.fire();
    }

    // Cleanup method to clear cache when extension deactivates
    public dispose(): void {
        MermaidChartCodeLensProvider.documentCache.clear();
    }

    private isMermaidFenceStart(line: string): boolean {
        if (!line.startsWith(this.mermaidFencePrefix)) {
            return false;
        }
        const lower = line.toLowerCase();
        return lower.startsWith('```mermaid') || lower.startsWith('```mmd');
    }
}
