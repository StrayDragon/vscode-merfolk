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

            // Listen for document changes to refresh CodeLens (debounced)
            const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
                // Only refresh if the document contains MermaidChart patterns and is the active editor
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && event.document === activeEditor.document) {
                    // Quick check using content changes to avoid full text scan
                    const hasMermaidChart = event.contentChanges.some(change =>
                        change.text.includes('[MermaidChart:') ||
                        (change.rangeLength > 0 && event.document.getText(change.range).includes('[MermaidChart:'))
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
                    // Only refresh if the new document contains MermaidChart
                    const text = editor.document.getText();
                    if (text.includes('[MermaidChart:')) {
                        debouncedRefresh(500); // Slightly longer delay for editor changes
                    }
                }
            });

            this.addDisposable(onDidChangeActiveTextEditor);

            // Initial refresh after extension is fully loaded
            setTimeout(() => {
                const activeEditor = vscode.window.activeTextEditor;
                if (activeEditor && activeEditor.document.getText().includes('[MermaidChart:')) {
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
