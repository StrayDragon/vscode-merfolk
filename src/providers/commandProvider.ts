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

        // Debug command to refresh CodeLens
        this.registerCommand('mermaidChart.refreshCodeLens', () => {
            console.log('[MermaidChart] Manual CodeLens refresh triggered');
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                const text = activeEditor.document.getText();
                console.log(`[MermaidChart] Checking active document: ${activeEditor.document.fileName}`);
                console.log(`[MermaidChart] Document contains MermaidChart: ${/\[MermaidChart:/i.test(text)}`);

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
