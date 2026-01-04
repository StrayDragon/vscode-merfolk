import * as vscode from 'vscode';
import { BaseService, ICommandProvider, IPreviewService, IFileService, ICodeLensService, IMarkdownService, IMerfolkEditorService } from '../core/service';
import { DIContainer } from '../core/container';

/**
 * Provider for registering all extension commands
 */
export class CommandProvider extends BaseService implements ICommandProvider {
    private previewService: IPreviewService;
    private fileService: IFileService;
    private markdownService: IMarkdownService;
    private merfolkEditorService: IMerfolkEditorService;

    constructor(container: DIContainer) {
        super(container);
        this.previewService = container.resolve<IPreviewService>('PreviewService');
        this.fileService = container.resolve<IFileService>('FileService');
        this.markdownService = container.resolve<IMarkdownService>('MarkdownService');
        this.merfolkEditorService = container.resolve<IMerfolkEditorService>('MerfolkEditorService');
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
        this.registerCommand('mermaidChart.preview', async (documentUri?: vscode.Uri, linkInfo?: unknown) => {
            try {
                const normalizedLink = this.normalizeLinkInfo(linkInfo);
                const baseUri = this.normalizeUri(documentUri) ?? vscode.window.activeTextEditor?.document.uri;
                if (!normalizedLink) {
                    vscode.window.showErrorMessage('MermaidChart 链接缺少路径');
                    return;
                }
                if (!baseUri) {
                    vscode.window.showErrorMessage('未找到用于解析路径的基准文件');
                    return;
                }
                await this.previewService.previewMermaidById(
                    baseUri,
                    normalizedLink.filePath,
                    normalizedLink.id
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to preview MermaidChart: ${errorMessage}`);
            }
        });

        this.registerCommand('mermaidChart.openFile', async (documentUri?: vscode.Uri, linkInfo?: unknown) => {
            try {
                const normalizedLink = this.normalizeLinkInfo(linkInfo);
                const baseUri = this.normalizeUri(documentUri) ?? vscode.window.activeTextEditor?.document.uri;
                if (!normalizedLink) {
                    vscode.window.showErrorMessage('MermaidChart 链接缺少路径');
                    return;
                }
                if (!baseUri) {
                    vscode.window.showErrorMessage('未找到用于解析路径的基准文件');
                    return;
                }

                const document = await this.fileService.openFile(normalizedLink.filePath, baseUri);

                // For markdown files with ID, navigate to the specific line
                if (normalizedLink.id && this.fileService.isMarkdownFile(document)) {
                    const line = await this.markdownService.getLineForId(document, normalizedLink.id);

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
                            `Opened ${normalizedLink.filePath} and navigated to ID "${normalizedLink.id}"`
                        );
                    } else {
                        // ID not found, just open the file
                        await vscode.window.showTextDocument(document);
                        vscode.window.showWarningMessage(
                            `Opened ${normalizedLink.filePath}, but ID "${normalizedLink.id}" was not found`
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

        this.registerCommand('mermaid.previewMarkdownBlock', async (documentUri?: vscode.Uri, blockInfo?: unknown) => {
            try {
                const baseUri = this.normalizeUri(documentUri) ?? vscode.window.activeTextEditor?.document.uri;
                if (!baseUri) {
                    vscode.window.showErrorMessage('未找到用于解析 Mermaid 代码块的文档');
                    return;
                }

                const normalizedBlock = this.normalizeBlockInfo(blockInfo);
                if (!normalizedBlock) {
                    vscode.window.showErrorMessage('Mermaid 代码块位置无效');
                    return;
                }

                const document = await vscode.workspace.openTextDocument(baseUri);
                const content = this.extractMermaidBlockContent(document, normalizedBlock.startLine);

                this.previewService.previewMermaidContent(content, { filePath: document.fileName });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`Failed to preview Mermaid block: ${errorMessage}`);
            }
        });

        // 使用 Merfolk Editor 打开当前文件或 MermaidChart 链接
        this.registerCommand('merfolkEditor.open', async (documentUri?: vscode.Uri, linkInfo?: unknown) => {
            try {
                const normalizedLink = this.normalizeLinkInfo(linkInfo);
                if (normalizedLink) {
                    const baseUri = this.normalizeUri(documentUri) ?? vscode.window.activeTextEditor?.document.uri;
                    if (!baseUri) {
                        vscode.window.showErrorMessage('未找到用于解析路径的基准文件');
                        return;
                    }
                    await this.merfolkEditorService.openLink(baseUri, normalizedLink);
                    return;
                }

                const editor = vscode.window.activeTextEditor;
                if (editor && this.isMermaidFile(editor.document)) {
                    await this.merfolkEditorService.openDocument(editor.document);
                    return;
                }

                const normalizedUri = this.normalizeUri(documentUri);
                if (normalizedUri) {
                    const doc = await vscode.workspace.openTextDocument(normalizedUri);
                    if (this.isMermaidFile(doc)) {
                        await this.merfolkEditorService.openDocument(doc);
                        return;
                    }
                }

                vscode.window.showErrorMessage('请先打开一个 Mermaid 文件 (.mmd / .mermaid) 再执行该命令');
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`无法打开 Merfolk Editor: ${message}`);
            }
        });

        // 创建新文件并直接在 Merfolk Editor 中编辑
        this.registerCommand('merfolkEditor.create', async () => {
            try {
                await this.merfolkEditorService.createAndOpen();
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                vscode.window.showErrorMessage(`创建文件失败: ${message}`);
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

    private normalizeUri(input?: unknown): vscode.Uri | undefined {
        if (input instanceof vscode.Uri) {
            return input;
        }

        const candidate = input as { uri?: unknown; document?: { uri?: unknown } } | undefined;
        if (candidate?.uri instanceof vscode.Uri) {
            return candidate.uri;
        }
        if (candidate?.document?.uri instanceof vscode.Uri) {
            return candidate.document.uri;
        }

        return undefined;
    }

    private normalizeLinkInfo(input?: unknown): { filePath: string; id?: string } | undefined {
        if (!input) {
            return undefined;
        }

        if (typeof input === 'string') {
            const trimmed = input.trim();
            return trimmed ? { filePath: trimmed } : undefined;
        }

        if (typeof input !== 'object') {
            return undefined;
        }

        const candidate = input as { filePath?: unknown; path?: unknown; id?: unknown };
        const rawPath = typeof candidate.filePath === 'string'
            ? candidate.filePath
            : typeof candidate.path === 'string'
                ? candidate.path
                : '';
        const filePath = rawPath.trim();
        if (!filePath) {
            return undefined;
        }

        const id = typeof candidate.id === 'string' && candidate.id.trim()
            ? candidate.id.trim()
            : undefined;

        return { filePath, id };
    }

    private normalizeBlockInfo(input?: unknown): { startLine: number } | undefined {
        if (typeof input === 'number' && Number.isFinite(input)) {
            return { startLine: Math.trunc(input) };
        }

        if (typeof input === 'string') {
            const parsed = Number.parseInt(input, 10);
            if (Number.isFinite(parsed)) {
                return { startLine: parsed };
            }
            return undefined;
        }

        if (!input || typeof input !== 'object') {
            return undefined;
        }

        const candidate = input as { startLine?: unknown; line?: unknown };
        const raw = typeof candidate.startLine === 'number'
            ? candidate.startLine
            : typeof candidate.startLine === 'string'
                ? Number.parseInt(candidate.startLine, 10)
                : typeof candidate.line === 'number'
                    ? candidate.line
                    : typeof candidate.line === 'string'
                        ? Number.parseInt(candidate.line, 10)
                        : Number.NaN;

        if (!Number.isFinite(raw)) {
            return undefined;
        }

        return { startLine: Math.trunc(raw) };
    }

    private extractMermaidBlockContent(document: vscode.TextDocument, startLine: number): string {
        const total = document.lineCount;
        if (startLine < 0 || startLine >= total) {
            throw new Error('Mermaid 代码块起始行无效');
        }

        const startText = document.lineAt(startLine).text;
        if (!this.isMermaidFenceStart(startText)) {
            throw new Error('指定行不是 Mermaid 代码块起始行');
        }

        let endLine = startLine + 1;
        while (endLine < total) {
            const text = document.lineAt(endLine).text.trim();
            if (text === '```') {
                break;
            }
            endLine++;
        }

        if (endLine >= total) {
            throw new Error('未找到对应的 ``` 结束符');
        }

        return document.getText(
            new vscode.Range(
                new vscode.Position(startLine + 1, 0),
                document.lineAt(endLine).range.start
            )
        );
    }

    private isMermaidFenceStart(line: string): boolean {
        const trimmed = line.trim().toLowerCase();
        return trimmed.startsWith('```mermaid') || trimmed.startsWith('```mmd');
    }
}
