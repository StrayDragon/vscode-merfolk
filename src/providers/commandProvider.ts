import * as vscode from 'vscode';
import * as path from 'path';
import { BaseService, ICommandProvider, IPreviewService, IFileService, ICodeLensService, IMarkdownService } from '../core/service';
import { DIContainer } from '../core/container';

/**
 * Provider for registering all extension commands
 */
export class CommandProvider extends BaseService implements ICommandProvider {
    private previewService: IPreviewService;
    private fileService: IFileService;
    private markdownService: IMarkdownService;

    constructor(container: DIContainer) {
        super(container);
        this.previewService = container.resolve<IPreviewService>('PreviewService');
        this.fileService = container.resolve<IFileService>('FileService');
        this.markdownService = container.resolve<IMarkdownService>('MarkdownService');
    }

    /**
     * Register all commands with VS Code
     */
    public registerCommands(context: vscode.ExtensionContext): void {
        // Register the main preview command for .mmd/.mermaid files
        this.registerCommand('mermaid.preview', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && (editor.document.languageId === 'mermaid' || this.isMermaidFile(editor.document))) {
                this.previewService.createOrShow(editor.document);
            } else {
                vscode.window.showErrorMessage('No active Mermaid file found');
            }
        });

        
        // Register unified MermaidChart commands for CodeLens actions
        this.registerCommand('mermaidChart.preview', async (documentUri: vscode.Uri, linkInfo: { filePath: string; id?: string }) => {
            try {
                await this.previewService.previewMermaidById(
                    documentUri,
                    linkInfo.filePath,
                    linkInfo.id
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to preview MermaidChart: ${errorMessage}`);
            }
        });

        this.registerCommand('mermaidChart.openFile', async (documentUri: vscode.Uri, linkInfo: { filePath: string; id?: string }) => {
            try {
                const document = await this.fileService.openFile(linkInfo.filePath, documentUri);

                // For markdown files with ID, navigate to the specific line
                if (linkInfo.id && this.fileService.isMarkdownFile(document)) {
                    const line = await this.markdownService.getLineForId(document, linkInfo.id);

                    if (line !== null && line >= 0) {
                        // Show the document and navigate to the line
                        const editor = await vscode.window.showTextDocument(document);

                        // Convert line number to 0-based range
                        const lineZeroBased = Math.max(0, line);
                        const targetLine = document.lineAt(lineZeroBased);
                        const range = new vscode.Range(lineZeroBased, 0, lineZeroBased, targetLine.text.length);

                        // Reveal the line with some padding
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);

                        // Select the line to highlight it
                        editor.selection = new vscode.Selection(range.start, range.end);

                        vscode.window.showInformationMessage(
                            `Opened ${linkInfo.filePath} and navigated to ID "${linkInfo.id}"`
                        );
                    } else {
                        // ID not found, just open the file
                        await vscode.window.showTextDocument(document);
                        vscode.window.showWarningMessage(
                            `Opened ${linkInfo.filePath}, but ID "${linkInfo.id}" was not found`
                        );
                    }
                } else {
                    // Regular file or no ID, just open
                    await vscode.window.showTextDocument(document);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to open file: ${errorMessage}`);
            }
        });

              // Debug command to refresh CodeLens
        this.registerCommand('mermaidChart.refreshCodeLens', () => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                // Get the CodeLens service and refresh
                const codeLensService = this.container.resolve<ICodeLensService>('CodeLensService');
                if (codeLensService) {
                    codeLensService.refresh();
                    vscode.window.showInformationMessage('MermaidChart CodeLens refreshed');
                } else {
                    vscode.window.showErrorMessage('CodeLens service not available');
                }
            } else {
                vscode.window.showWarningMessage('No active editor found');
            }
        });
    }

    /**
     * Check if a document is a Mermaid file
     */
    private isMermaidFile(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.mmd') || fileName.endsWith('.mermaid');
    }
}
