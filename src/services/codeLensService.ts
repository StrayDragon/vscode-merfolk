import * as vscode from 'vscode';
import { BaseService, ICodeLensService } from '../core/service';
import { DIContainer } from '../core/container';
import { MermaidChartCodeLensProvider } from '../core/service';

/**
 * Service for managing CodeLens provider
 */
export class CodeLensService extends BaseService implements ICodeLensService {
    private provider: MermaidChartCodeLensProvider;
    private registration: vscode.Disposable | undefined;

    constructor(container: DIContainer) {
        super(container);
        this.provider = new MermaidChartCodeLensProvider();
    }

    /**
     * Get the CodeLens provider
     */
    public getProvider(): MermaidChartCodeLensProvider {
        return this.provider;
    }

    /**
     * Register the CodeLens provider
     */
    public registerProvider(context: vscode.ExtensionContext): void {
        try {
            console.log('[MermaidChart] Initializing CodeLens provider...');

            // Register for all file patterns - more comprehensive
            this.registration = vscode.languages.registerCodeLensProvider(
                [
                    { scheme: 'file' },
                    { scheme: 'untitled' }
                ],
                this.provider
            );

            console.log('[MermaidChart] CodeLens provider registered successfully');
            this.addDisposable(this.registration);

            // Debounced CodeLens refresh to improve performance
            let refreshTimeout: NodeJS.Timeout | undefined;

            const debouncedRefresh = (delay: number = 300) => {
                if (refreshTimeout) {
                    clearTimeout(refreshTimeout);
                }
                refreshTimeout = setTimeout(() => {
                    this.provider.refresh();
                }, delay);
            };

            const hasMermaidSignals = (value: string): boolean => {
                if (value.includes('[MermaidChart:')) {
                    return true;
                }

                const lower = value.toLowerCase();
                return lower.includes('```mermaid') || lower.includes('```mmd');
            };

            // Listen for document changes to refresh CodeLens (debounced)
            const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
                // Only refresh if Mermaid markers change in the active editor
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && event.document === activeEditor.document) {
                    // Quick check using content changes to avoid full text scan
                    const hasMermaidChart = event.contentChanges.some(change =>
                        hasMermaidSignals(change.text) ||
                        (change.rangeLength > 0 && hasMermaidSignals(event.document.getText(change.range)))
                    );

                    if (hasMermaidChart) {
                        debouncedRefresh();
                    }
                }
            });

            this.addDisposable(onDidChangeTextDocument);

            // Listen for active editor changes
            const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor((editor) => {
                if (editor) {
                    // Only refresh if the new document contains Mermaid markers
                    const text = editor.document.getText();
                    if (hasMermaidSignals(text)) {
                        debouncedRefresh(500); // Slightly longer delay for editor changes
                    }
                }
            });

            this.addDisposable(onDidChangeActiveTextEditor);

            // Initial refresh after extension is fully loaded
            setTimeout(() => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && hasMermaidSignals(activeEditor.document.getText())) {
                    this.provider.refresh();
                }
            }, 1000);

        } catch (error) {
            console.error('[MermaidChart] Failed to register CodeLens provider:', error);
        }
    }

    /**
     * Refresh the CodeLens provider
     */
    public refresh(): void {
        this.provider.refresh();
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.registration) {
            this.registration.dispose();
        }
        this.provider.dispose();
        super.dispose();
    }
}
