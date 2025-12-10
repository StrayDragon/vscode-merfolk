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

        
        // Register MermaidChart commands for CodeLens actions
        this.registerCommand('mermaidChart.preview', (documentUri: vscode.Uri, filePath: string) => {
            this.fileService.openFile(filePath, documentUri).then(document => {
                this.previewService.createOrShow(document);
            }, error => {
                vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
            });
        });

        this.registerCommand('mermaidChart.openFile', async (documentUri: vscode.Uri, filePath: string) => {
            try {
                const document = await this.fileService.openFile(filePath, documentUri);
                await vscode.window.showTextDocument(document);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
            }
        });

        // Register new commands for markdown section support
        this.registerCommand('mermaidChart.previewMarkdown', async (documentUri: vscode.Uri, linkInfo: { filePath: string; section?: string; index?: number }) => {
            try {
                await this.previewService.previewMarkdownSection(
                    documentUri,
                    linkInfo.filePath,
                    linkInfo.section,
                    linkInfo.index
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to preview markdown section: ${errorMessage}`);
            }
        });

        this.registerCommand('mermaidChart.openFileAtSection', async (documentUri: vscode.Uri, linkInfo: { filePath: string; section?: string; index?: number }) => {
            try {
                const document = await this.fileService.openMarkdownFile(
                    linkInfo.filePath,
                    documentUri,
                    linkInfo.section
                );
                await vscode.window.showTextDocument(document);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to open file at section: ${errorMessage}`);
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
