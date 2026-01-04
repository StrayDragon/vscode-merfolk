import * as vscode from 'vscode';
import { BaseService, IPreviewService, IFileService, IConfigService, IMarkdownService } from '../core/service';
import { DIContainer } from '../core/container';
import { PreviewPanel } from '../ui/preview/previewPanel';
import { isMermaidFile, isMarkdownFile } from '../shared/utils/fileType';

/**
 * Service for managing preview panels
 * Handles both traditional .mmd files and ID-based markdown references
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
     * Preview mermaid content by file path and optional ID
     * Unified method that handles both .mmd files and .md@id references
     */
    public async previewMermaidById(
        documentUri: vscode.Uri,
        filePath: string,
        id?: string
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
                // Markdown file - extract content by ID
                if (!id) {
                    const availableIds = await this.markdownService.getAvailableIds(targetDocument);
                    throw new Error(
                        `ID is required for markdown files.\n\n` +
                        `Available IDs: ${availableIds.join(', ') || 'None'}\n\n` +
                        `Usage: [MermaidChart: ${filePath}@<id>]`
                    );
                }

                const mermaidContentResult = await this.markdownService.findMermaidById(targetDocument, id);

                if (!mermaidContentResult) {
                    const availableIds = await this.markdownService.getAvailableIds(targetDocument);
                    throw new Error(
                        `ID "${id}" not found in ${filePath}.\n\n` +
                        `Available IDs: ${availableIds.join(', ') || 'None'}`
                    );
                }

                mermaidContent = mermaidContentResult;
            } else {
                throw new Error(`Unsupported file type: ${filePath}. Only .mmd, .mermaid, and .md files are supported.`);
            }

            if (!mermaidContent.trim()) {
                const identifier = id ? `ID "${id}" in ${filePath}` : filePath;
                throw new Error(`No Mermaid content found for ${identifier}`);
            }

            // Show preview panel directly with content
            PreviewPanel.createOrShowWithContent(
                mermaidContent,
                { filePath, id },
                this.context.extensionUri
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to preview Mermaid content: ${errorMessage}`);
            console.error('[PreviewService] Error previewing mermaid by ID:', error);
        }
    }

    /**
     * Preview Mermaid content directly (e.g. markdown code blocks)
     */
    public previewMermaidContent(content: string, sourceInfo: { filePath: string; id?: string }): void {
        if (!content.trim()) {
            vscode.window.showErrorMessage('No Mermaid content to preview');
            return;
        }

        PreviewPanel.createOrShowWithContent(
            content,
            sourceInfo,
            this.context.extensionUri
        );
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // PreviewPanel manages its own disposal
        super.dispose();
    }
}
