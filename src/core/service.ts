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
     * Initialize the service (called after construction)
     */
    public async initialize(): Promise<void> {
        // Override in subclasses if needed
    }

    /**
     * Activate the service (called when extension is activated)
     */
    public async activate(context: vscode.ExtensionContext): Promise<void> {
        // Override in subclasses if needed
    }

    /**
     * Deactivate the service (called when extension is deactivated)
     */
    public async deactivate(): Promise<void> {
        this.dispose();
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
    dispose(): void;
}

/**
 * Service interface for Inline Preview functionality
 */
export interface IInlinePreviewService {
    activate(context: vscode.ExtensionContext): void;
    deactivate(): void;
    toggleInlinePreview(document: vscode.TextDocument): void;
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
}

/**
 * Service interface for Configuration management
 */
export interface IConfigService {
    getPreviewColumn(): vscode.ViewColumn;
    getInlinePreviewColumn(): vscode.ViewColumn;
    get<T>(key: string, defaultValue: T): T;
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

    // Regex to find [MermaidChart: path] patterns - optimized for performance
    private readonly mermaidChartRegex = /\[MermaidChart:\s*([^\]]+\.(mmd|mermaid|md))\s*\]/gi;

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

        // Quick check: if no MermaidChart pattern, return empty immediately
        if (!text.includes('[MermaidChart:')) {
            return [];
        }

        const codeLenses: vscode.CodeLens[] = [];
        let match;
        let matchCount = 0;

        // Reset regex lastIndex
        this.mermaidChartRegex.lastIndex = 0;

        // Limit matches for performance (max 20 CodeLens per file)
        while ((match = this.mermaidChartRegex.exec(text)) !== null && matchCount < 20) {
            matchCount++;
            const startIndex = match.index;
            const endIndex = startIndex + match[0].length;
            const filePath = match[1].trim();

            const startPos = document.positionAt(startIndex);
            const endPos = document.positionAt(endIndex);
            const range = new vscode.Range(startPos, endPos);

            // Add CodeLens for preview action
            codeLenses.push(new vscode.CodeLens(range, {
                title: "Preview Mermaid",
                command: "mermaidChart.preview",
                arguments: [document.uri, filePath]
            }));

            // Add CodeLens for open file action
            codeLenses.push(new vscode.CodeLens(range, {
                title: "Open File",
                command: "mermaidChart.openFile",
                arguments: [document.uri, filePath]
            }));
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
}
