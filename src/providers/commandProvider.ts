import * as vscode from 'vscode';
import * as path from 'path';
import { BaseService, ICommandProvider, IPreviewService, IFileService, ICodeLensService } from '../core/service';
import { DIContainer } from '../core/container';

/**
 * Provider for registering all extension commands
 */
export class CommandProvider extends BaseService implements ICommandProvider {
    private previewService: IPreviewService;
    private fileService: IFileService;

    constructor(container: DIContainer) {
        super(container);
        this.previewService = container.resolve<IPreviewService>('PreviewService');
        this.fileService = container.resolve<IFileService>('FileService');
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
                await vscode.window.showTextDocument(document);

                // If it's a markdown file with an ID, we could potentially navigate to the line
                // but for now, just open the file
                if (linkInfo.id && this.fileService.isMarkdownFile(document)) {
                    vscode.window.showInformationMessage(`Opened ${linkInfo.filePath}. ID "${linkInfo.id}" reference found.`);
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
