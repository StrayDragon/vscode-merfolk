import * as vscode from 'vscode';
import { BaseService, IPreviewService, IFileService, IConfigService, IMarkdownService } from '../core/service';
import { DIContainer } from '../core/container';
import { PreviewPanel } from '../ui/preview/previewPanel';
import { isMermaidFile, isMarkdownFile } from '../shared/utils/fileType';

/**
 * Service for managing preview panels
 * Wraps the existing PreviewPanel class with dependency injection
 */
export class PreviewService extends BaseService implements IPreviewService {
    private fileService: IFileService;
    private configService: IConfigService;
    private markdownService: IMarkdownService;

    constructor(container: DIContainer) {
        super(container);
        this.fileService = container.resolve<IFileService>('FileService');
        this.configService = container.resolve<IConfigService>('ConfigService');
        this.markdownService = container.resolve<IMarkdownService>('MarkdownService');
    }

    /**
     * Create or show the preview panel
     */
    public createOrShow(document: vscode.TextDocument): void {
        PreviewPanel.createOrShow(document, this.context.extensionUri);
    }

    /**
     * Revive a panel after extension restart
     */
    public revive(panel: vscode.WebviewPanel): void {
        PreviewPanel.revive(panel, this.context.extensionUri);
    }

    /**
     * Preview markdown section with mermaid content
     */
    public async previewMarkdownSection(
        documentUri: vscode.Uri,
        filePath: string,
        section?: string,
        index?: number
    ): Promise<void> {
        try {
            // Resolve the target file path
            const targetUri = this.fileService.resolvePath(filePath, documentUri);

            // Open the target document
            const targetDocument = await vscode.workspace.openTextDocument(targetUri);

            let mermaidContent: string;

            if (isMermaidFile(targetDocument)) {
                // Traditional mermaid file - use entire content
                mermaidContent = targetDocument.getText();
            } else if (isMarkdownFile(targetDocument)) {
                // Markdown file - extract specific mermaid block
                mermaidContent = await this.markdownService.findMermaidBlock(
                    targetDocument,
                    section,
                    index
                ) || '';
            } else {
                throw new Error(`Unsupported file type: ${targetUri.fsPath}`);
            }

            if (!mermaidContent.trim()) {
                throw new Error(`No Mermaid content found in ${filePath}${section ? ` (section: ${section})` : ''}${index ? ` (index: ${index})` : ''}`);
            }

            // Create a temporary document with the extracted content
            const tempUri = vscode.Uri.parse(
                `mermaid-preview:${encodeURIComponent(filePath)}${section ? `#${section}` : ''}${index ? `:${index}` : ''}.mmd`
            );

            // Create a temporary document in memory
            const tempDocument = await vscode.workspace.openTextDocument({
                content: mermaidContent,
                language: 'mermaid'
            });

            // Show preview panel
            this.createOrShow(tempDocument);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to preview Mermaid content: ${errorMessage}`);
            console.error('[PreviewService] Error previewing markdown section:', error);
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // PreviewPanel manages its own disposal
        super.dispose();
    }
}
