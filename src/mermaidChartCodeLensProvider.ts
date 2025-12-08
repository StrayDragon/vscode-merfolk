import * as vscode from 'vscode';
import * as path from 'path';

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

            // Add CodeLens for preview action (without emoji)
            codeLenses.push(new vscode.CodeLens(range, {
                title: "Preview Mermaid",
                command: "mermaidChart.preview",
                arguments: [document.uri, filePath]
            }));

            // Add CodeLens for open file action (without emoji)
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