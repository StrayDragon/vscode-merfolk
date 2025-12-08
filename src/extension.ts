import * as vscode from 'vscode';
import * as path from 'path';
import { PreviewPanel } from './previewPanel';
import { InlinePreviewManager } from './inlinePreviewManager';
import { MermaidChartCodeLensProvider } from './mermaidChartCodeLensProvider';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "vscode-merfolk" is now active!');

    // Register the main preview command for .mmd/.mermaid files
    const previewCommand = vscode.commands.registerCommand('mermaid.preview', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && (editor.document.languageId === 'mermaid' || isMermaidFile(editor.document))) {
            PreviewPanel.createOrShow(editor.document, context.extensionUri);
        } else {
            vscode.window.showErrorMessage('No active Mermaid file found');
        }
    });

    // Register the inline preview command for markdown files
    const inlinePreviewCommand = vscode.commands.registerCommand('mermaid.previewInline', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'markdown') {
            InlinePreviewManager.getInstance().toggleInlinePreview(editor.document);
        } else {
            vscode.window.showErrorMessage('No active Markdown file found');
        }
    });

    // Register MermaidChart commands for CodeLens actions
    const mermaidChartPreviewCommand = vscode.commands.registerCommand('mermaidChart.preview', (documentUri: vscode.Uri, filePath: string) => {
        const currentDir = path.dirname(documentUri.fsPath);
        const targetPath = path.resolve(currentDir, filePath);
        const targetUri = vscode.Uri.file(targetPath);

        vscode.workspace.openTextDocument(targetUri).then(document => {
            PreviewPanel.createOrShow(document, context.extensionUri);
        }, error => {
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        });
    });

    const mermaidChartOpenFileCommand = vscode.commands.registerCommand('mermaidChart.openFile', (documentUri: vscode.Uri, filePath: string) => {
        const currentDir = path.dirname(documentUri.fsPath);
        const targetPath = path.resolve(currentDir, filePath);
        const targetUri = vscode.Uri.file(targetPath);

        vscode.workspace.openTextDocument(targetUri).then(document => {
            vscode.window.showTextDocument(document);
        }, error => {
            vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
        });
    });

    // Register CodeLens provider with better error handling
    let codeLensRegistration: vscode.Disposable | undefined;
    let codeLensProvider: MermaidChartCodeLensProvider | undefined;

    try {
        codeLensProvider = new MermaidChartCodeLensProvider();
        console.log('[MermaidChart] Initializing CodeLens provider...');

        // Register for all file patterns - more comprehensive
        codeLensRegistration = vscode.languages.registerCodeLensProvider(
            [
                { scheme: 'file' },
                { scheme: 'untitled' }
            ],
            codeLensProvider
        );

        console.log('[MermaidChart] CodeLens provider registered successfully');
        context.subscriptions.push(codeLensRegistration);

        // Debounced CodeLens refresh to improve performance
        let refreshTimeout: NodeJS.Timeout | undefined;

        const debouncedRefresh = (delay: number = 300) => {
            if (refreshTimeout) {
                clearTimeout(refreshTimeout);
            }
            refreshTimeout = setTimeout(() => {
                codeLensProvider?.refresh();
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

        context.subscriptions.push(onDidChangeTextDocument);

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

        context.subscriptions.push(onDidChangeActiveTextEditor);

        // Initial refresh after extension is fully loaded
        setTimeout(() => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document.getText().includes('[MermaidChart:')) {
                codeLensProvider?.refresh();
            }
        }, 1000);

    } catch (error) {
        console.error('[MermaidChart] Failed to register CodeLens provider:', error);
    }

    // Debug command to refresh CodeLens (must be after codeLensProvider is initialized)
    const mermaidChartRefreshCodeLensCommand = vscode.commands.registerCommand('mermaidChart.refreshCodeLens', () => {
        console.log('[MermaidChart] Manual CodeLens refresh triggered');
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) {
            const text = activeEditor.document.getText();
            console.log(`[MermaidChart] Checking active document: ${activeEditor.document.fileName}`);
            console.log(`[MermaidChart] Document contains MermaidChart: ${/\[MermaidChart:/i.test(text)}`);

            // Force refresh the CodeLens
            if (codeLensProvider) {
                codeLensProvider.refresh();
                vscode.window.showInformationMessage('MermaidChart CodeLens refreshed');
            } else {
                vscode.window.showErrorMessage('CodeLens provider not available');
            }
        } else {
            vscode.window.showWarningMessage('No active editor found');
        }
    });

    context.subscriptions.push(previewCommand, inlinePreviewCommand, mermaidChartPreviewCommand, mermaidChartOpenFileCommand, mermaidChartRefreshCodeLensCommand);

    // Initialize inline preview manager
    const inlineManager = InlinePreviewManager.getInstance();
    inlineManager.activate(context);

    // Handle webview panel restoration
    if (vscode.window.registerWebviewPanelSerializer) {
        vscode.window.registerWebviewPanelSerializer(PreviewPanel.viewType, {
            async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                PreviewPanel.revive(webviewPanel, context.extensionUri);
            }
        });
    }
}

function isMermaidFile(document: vscode.TextDocument): boolean {
    const fileName = document.fileName.toLowerCase();
    return fileName.endsWith('.mmd') || fileName.endsWith('.mermaid');
}

export function deactivate() {
    // Cleanup inline preview manager
    InlinePreviewManager.getInstance().deactivate();

    // Cleanup CodeLens provider cache
    // The actual cleanup will happen when the provider is disposed
}
