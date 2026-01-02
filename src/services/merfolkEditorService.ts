import * as vscode from 'vscode';
import * as path from 'path';
import { BaseService, IMerfolkEditorService, IFileService, IMarkdownService, IConfigService } from '../core/service';
import { DIContainer } from '../core/container';
import { isMermaidFile, isMarkdownFile } from '../shared/utils/fileType';

type EditorSource =
    | {
        kind: 'mermaid';
        uri: vscode.Uri;
        content: string;
        fileLabel: string;
    }
    | {
        kind: 'markdown';
        uri: vscode.Uri;
        content: string;
        fileLabel: string;
        id: string;
        startLine: number;
        endLine: number;
    };

interface StandaloneResources {
    jsUri: vscode.Uri;
    cssUri: vscode.Uri;
    root: vscode.Uri;
}

/**
 * Webview service for Merfolk Editor (visual Mermaid editor)
 */
export class MerfolkEditorService extends BaseService implements IMerfolkEditorService {
    private fileService: IFileService;
    private markdownService: IMarkdownService;
    private configService: IConfigService;
    private panel: vscode.WebviewPanel | undefined;
    private currentSource: EditorSource | undefined;
    private resourceRoot: vscode.Uri | undefined;

    constructor(container: DIContainer) {
        super(container);
        this.fileService = container.resolve<IFileService>('FileService');
        this.markdownService = container.resolve<IMarkdownService>('MarkdownService');
        this.configService = container.resolve<IConfigService>('ConfigService');
    }

    /**
     * 打开当前 Mermaid 文档到 Merfolk Editor
     */
    public async openDocument(document: vscode.TextDocument): Promise<void> {
        if (!isMermaidFile(document)) {
            vscode.window.showErrorMessage('当前文件不是 Mermaid 文件 (.mmd / .mermaid)');
            return;
        }

        const source: EditorSource = {
            kind: 'mermaid',
            uri: document.uri,
            content: document.getText(),
            fileLabel: path.basename(document.uri.fsPath)
        };

        await this.showEditor(source);
    }

    /**
     * 通过 MermaidChart 链接打开（支持 .mmd / .md@id）
     */
    public async openLink(documentUri: vscode.Uri, linkInfo: { filePath: string; id?: string }): Promise<void> {
        try {
            const targetUri = this.fileService.resolvePath(linkInfo.filePath, documentUri);
            const targetDoc = await vscode.workspace.openTextDocument(targetUri);

            if (isMermaidFile(targetDoc)) {
                const source: EditorSource = {
                    kind: 'mermaid',
                    uri: targetUri,
                    content: targetDoc.getText(),
                    fileLabel: path.basename(targetUri.fsPath)
                };
                await this.showEditor(source);
                return;
            }

            if (isMarkdownFile(targetDoc)) {
                if (!linkInfo.id) {
                    vscode.window.showErrorMessage('Markdown 链接缺少 ID，无法定位 Mermaid 代码块');
                    return;
                }

                const located = await this.markdownService.findMermaidByIdWithLine(targetDoc, linkInfo.id);
                if (!located) {
                    vscode.window.showErrorMessage(`未找到 ID 为 ${linkInfo.id} 的 Mermaid 代码块`);
                    return;
                }

                const rangeInfo = this.extractMermaidRange(targetDoc, located.line);

                const source: EditorSource = {
                    kind: 'markdown',
                    uri: targetUri,
                    content: rangeInfo.content,
                    fileLabel: `${path.basename(targetUri.fsPath)} @${linkInfo.id}`,
                    id: linkInfo.id,
                    startLine: rangeInfo.startLine,
                    endLine: rangeInfo.endLine
                };
                await this.showEditor(source);
                return;
            }

            vscode.window.showErrorMessage('暂不支持的文件类型，仅支持 .mmd / .mermaid / .md');
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(`无法打开 Mermaid 链接: ${message}`);
        }
    }

    /**
     * 新建 .mmd 文件并在 Merfolk Editor 中打开
     */
    public async createAndOpen(): Promise<void> {
        const uri = await vscode.window.showSaveDialog({
            filters: { Mermaid: ['mmd', 'mermaid'] },
            defaultUri: this.getDefaultNewFileUri()
        });

        if (!uri) {
            return;
        }

        const template = 'flowchart TD\n    A[开始] --> B[处理]\n    B --> C[结束]\n';
        await vscode.workspace.fs.writeFile(uri, Buffer.from(template, 'utf8'));

        const document = await vscode.workspace.openTextDocument(uri);
        await this.openDocument(document);
    }

    /**
     * Dispose resources
     */
    public override dispose(): void {
        this.panel?.dispose();
        super.dispose();
    }

    // -------------------- internal helpers --------------------

    private async showEditor(source: EditorSource): Promise<void> {
        this.currentSource = source;

        const resources = await this.getStandaloneResources();

        const targetColumn = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.Beside;

        // Recreate panel if resource root changed
        if (!this.panel || (this.resourceRoot && this.resourceRoot.fsPath !== resources.root.fsPath)) {
            this.panel = vscode.window.createWebviewPanel(
                'merfolk.editor',
                `Merfolk Editor: ${source.fileLabel}`,
                targetColumn,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [
                        resources.root,
                        vscode.Uri.joinPath(this.context.extensionUri, 'assets')
                    ]
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
                this.currentSource = undefined;
            }, null, this.disposables);

            this.panel.webview.onDidReceiveMessage(async (message) => {
                await this.handleMessage(message);
            }, null, this.disposables);
        } else {
            this.panel.title = `Merfolk Editor: ${source.fileLabel}`;
            this.panel.reveal(targetColumn, true);
        }

        this.resourceRoot = resources.root;
        this.panel.webview.html = this.getHtml(this.panel.webview, resources, source);
    }

    private async handleMessage(message: any): Promise<void> {
        if (!this.currentSource || !this.panel) {
            return;
        }

        switch (message.command) {
            case 'save':
                await this.saveContent(this.currentSource, message.code ?? '');
                this.panel.webview.postMessage({ command: 'saved' });
                return;
            case 'reload':
                await this.reloadContent();
                return;
            default:
                return;
        }
    }

    private async reloadContent(): Promise<void> {
        if (!this.currentSource || !this.panel) {
            return;
        }

        const doc = await vscode.workspace.openTextDocument(this.currentSource.uri);

        if (this.currentSource.kind === 'mermaid') {
            this.currentSource.content = doc.getText();
        } else {
            const rangeInfo = this.extractMermaidRange(doc, this.currentSource.startLine);
            this.currentSource.content = rangeInfo.content;
            this.currentSource.endLine = rangeInfo.endLine;
        }

        this.panel.webview.postMessage({
            command: 'update',
            content: this.currentSource.content,
            fileLabel: this.currentSource.fileLabel
        });
    }

    private extractMermaidRange(document: vscode.TextDocument, startLine: number): { content: string; startLine: number; endLine: number } {
        const total = document.lineCount;
        if (startLine < 0 || startLine >= total) {
            throw new Error('Mermaid 代码块起始行无效');
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

        const content = document.getText(
            new vscode.Range(
                new vscode.Position(startLine + 1, 0),
                document.lineAt(endLine).range.start
            )
        );

        return { content, startLine, endLine };
    }

    private async saveContent(source: EditorSource, code: string): Promise<void> {
        const sanitizedCode = code.endsWith('\n') ? code : `${code}\n`;
        const document = await vscode.workspace.openTextDocument(source.uri);
        const edit = new vscode.WorkspaceEdit();

        if (source.kind === 'mermaid') {
            const fullRange = new vscode.Range(
                new vscode.Position(0, 0),
                document.lineAt(document.lineCount - 1).range.end
            );
            edit.replace(source.uri, fullRange, sanitizedCode);
        } else {
            const start = new vscode.Position(source.startLine + 1, 0);
            const end = document.lineAt(source.endLine).range.start;
            edit.replace(source.uri, new vscode.Range(start, end), sanitizedCode);

            const newLines = sanitizedCode.split('\n').length - 1;
            source.endLine = source.startLine + 1 + newLines;
        }

        await vscode.workspace.applyEdit(edit);
        await document.save();

        source.content = code;
        vscode.window.setStatusBarMessage('Mermaid 已保存到文件', 2000);
    }

    private async getStandaloneResources(): Promise<StandaloneResources> {
        // 1) 尝试扩展内置资源（打包时复制到 assets/merfolk-editor）
        const embedded = await this.tryResolveStandalone(
            vscode.Uri.joinPath(this.context.extensionUri, 'assets', 'merfolk-editor').fsPath
        );
        if (embedded) {
            return embedded;
        }

        // 2) 本地开发环境 node_modules/merfolk-editor/dist/standalone（devDependency，需构建后才有该目录）
        const bundled = await this.tryResolveStandalone(
            path.join(this.context.extensionPath, 'node_modules', 'merfolk-editor', 'dist', 'standalone')
        );
        if (bundled) {
            return bundled;
        }

        throw new Error('未找到 merfolk-editor 资源。请确保打包前执行 pnpm run prepare:merfolk（需要 node_modules/merfolk-editor/dist/standalone），或升级依赖版本以包含 dist/standalone。');
    }

    private getHtml(webview: vscode.Webview, resources: StandaloneResources, source: EditorSource): string {
        const scriptUri = webview.asWebviewUri(resources.jsUri);
        const styleUri = webview.asWebviewUri(resources.cssUri);

        const nonce = Math.random().toString(36).slice(2);
        const initialData = {
            content: source.content,
            fileLabel: source.fileLabel
        };

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}' ${webview.cspSource}; font-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="${styleUri}">
    <style>
        :root {
            --merfolk-panel-bg: var(--vscode-editor-background);
            --merfolk-panel-border: var(--vscode-panel-border);
            --merfolk-text: var(--vscode-foreground);
        }
        body {
            margin: 0;
            padding: 0;
            background: var(--merfolk-panel-bg);
            color: var(--merfolk-text);
            font-family: var(--vscode-font-family);
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        .toolbar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            border-bottom: 1px solid var(--merfolk-panel-border);
            background: var(--merfolk-panel-bg);
        }
        .toolbar button {
            padding: 6px 12px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .toolbar button.secondary {
            background: var(--vscode-input-background);
            color: var(--vscode-foreground);
        }
        .toolbar button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .title {
            font-weight: 600;
            flex: 1;
            opacity: 0.8;
        }
        #editor-container {
            flex: 1;
            min-height: 0;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <div class="title">Merfolk Editor · ${source.fileLabel}</div>
        <button id="save-btn">保存到文件</button>
        <button id="reload-btn" class="secondary">从文件重新加载</button>
    </div>
    <div id="editor-container"></div>

    <script src="${scriptUri}" nonce="${nonce}"></script>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const initialData = ${JSON.stringify(initialData)};
        let editorInstance;

        function ensureEditor(content) {
            const container = document.getElementById('editor-container');
            container.innerHTML = '';
            editorInstance = new window.MerfolkEditor(container, {
                initialCode: content,
                onCodeChange: () => {
                    // just keep live code; actual保存交给按钮
                }
            });
        }

        document.getElementById('save-btn')?.addEventListener('click', () => {
            const code = editorInstance?.getCode() ?? '';
            vscode.postMessage({ command: 'save', code });
        });

        document.getElementById('reload-btn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'reload' });
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            switch (message.command) {
                case 'update':
                    ensureEditor(message.content || '');
                    return;
                case 'saved':
                    vscode.postMessage({ command: 'reload' });
                    return;
                default:
                    return;
            }
        });

        // 初始化
        if (window.MerfolkEditor) {
            ensureEditor(initialData.content || '');
        } else {
            window.addEventListener('load', () => {
                if (window.MerfolkEditor) {
                    ensureEditor(initialData.content || '');
                } else {
                    const container = document.getElementById('editor-container');
                    if (container) {
                        container.innerHTML = '<div style="padding:12px;color:var(--vscode-errorForeground);">未找到 merfolk-editor 库，请检查 merfolk.editor.standalonePath 设置。</div>';
                    }
                }
            });
        }
    </script>
</body>
</html>`;
    }

    private getDefaultNewFileUri(): vscode.Uri | undefined {
        const workspace = vscode.workspace.workspaceFolders?.[0];
        if (workspace) {
            return vscode.Uri.joinPath(workspace.uri, 'diagram.mmd');
        }
        return undefined;
    }

    private async tryResolveStandalone(rootPath: string): Promise<StandaloneResources | null> {
        const jsPath = path.join(rootPath, 'merfolk-editor.iife.js');
        const cssPath = path.join(rootPath, 'merfolk-editor.css');

        const jsUri = vscode.Uri.file(jsPath);
        const cssUri = vscode.Uri.file(cssPath);

        try {
            await vscode.workspace.fs.stat(jsUri);
            await vscode.workspace.fs.stat(cssUri);
            return {
                jsUri,
                cssUri,
                root: vscode.Uri.file(rootPath)
            };
        } catch {
            return null;
        }
    }
}
