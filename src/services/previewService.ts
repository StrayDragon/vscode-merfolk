import * as vscode from 'vscode';
import { BaseService, IPreviewService, IFileService, IConfigService, IMarkdownService, PreviewWebviewState } from '../core/service';
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
        const viewColumn = this.configService.getPreviewColumn(vscode.window.activeTextEditor);
        PreviewPanel.createOrShow(document, this.context.extensionUri, viewColumn);
    }

    /**
     * Revive a panel after extension restart
     */
    public async revive(panel: vscode.WebviewPanel, state?: PreviewWebviewState): Promise<void> {
        if (state?.mode === 'content' && state.sourceInfo?.filePath) {
            try {
                const { content, sourceInfo } = await this.loadMermaidContent(
                    vscode.Uri.file(state.sourceInfo.filePath),
                    state.sourceInfo.filePath,
                    state.sourceInfo.id
                );
                PreviewPanel.revive(panel, this.context.extensionUri, undefined, content, sourceInfo);
                return;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to restore Mermaid preview: ${errorMessage}`);
            }
        }

        if (state?.mode === 'document' && state.documentUri) {
            try {
                const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.documentUri));
                PreviewPanel.revive(panel, this.context.extensionUri, document);
                return;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to restore Mermaid preview: ${errorMessage}`);
            }
        }

        const fallbackDocument = vscode.window.activeTextEditor?.document;
        PreviewPanel.revive(panel, this.context.extensionUri, fallbackDocument);
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
            const { content, sourceInfo } = await this.loadMermaidContent(documentUri, filePath, id);
            const viewColumn = this.configService.getPreviewColumn(vscode.window.activeTextEditor);

            // Show preview panel directly with content
            PreviewPanel.createOrShowWithContent(
                content,
                sourceInfo,
                this.context.extensionUri,
                viewColumn
            );

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`Failed to preview Mermaid content: ${errorMessage}`);
            console.error('[PreviewService] Error previewing mermaid by ID:', error);
        }
    }

    private async loadMermaidContent(
        documentUri: vscode.Uri,
        filePath: string,
        id?: string
    ): Promise<{ content: string; sourceInfo: { filePath: string; id?: string } }> {
        // Resolve the target file path
        const targetUri = await this.fileService.resolvePath(filePath, documentUri);

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

        return {
            content: mermaidContent,
            sourceInfo: { filePath: targetUri.fsPath, id }
        };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // PreviewPanel manages its own disposal
        super.dispose();
    }
}
