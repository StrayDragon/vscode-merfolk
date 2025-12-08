import * as vscode from 'vscode';
import * as path from 'path';

function getViewColumn(configValue: string): vscode.ViewColumn {
    const activeEditor = vscode.window.activeTextEditor;
    const activeColumn = activeEditor ? activeEditor.viewColumn : vscode.ViewColumn.One;

    switch (configValue) {
        case 'beside':
            return activeColumn ? activeColumn + 1 : vscode.ViewColumn.Beside;
        case 'right':
            return vscode.ViewColumn.Three;
        case 'left':
            return vscode.ViewColumn.One;
        case 'active':
            return activeColumn || vscode.ViewColumn.One;
        case 'one':
            return vscode.ViewColumn.One;
        case 'two':
            return vscode.ViewColumn.Two;
        case 'three':
            return vscode.ViewColumn.Three;
        default:
            return vscode.ViewColumn.Two; // Default for inline preview is column two
    }
}

export interface MermaidBlock {
    range: vscode.Range;
    content: string;
    id: string;
}

export class InlinePreviewManager {
    private static instance: InlinePreviewManager;
    private _disposables: vscode.Disposable[] = [];
    private _decorations: string[] = [];
    private _webviewPanel: vscode.WebviewPanel | undefined;
    private _currentDocument: vscode.TextDocument | undefined;
    private _updateTimeout: NodeJS.Timeout | undefined;
    private _extensionUri: vscode.Uri | undefined;

    private constructor() {}

    public static getInstance(): InlinePreviewManager {
        if (!InlinePreviewManager.instance) {
            InlinePreviewManager.instance = new InlinePreviewManager();
        }
        return InlinePreviewManager.instance;
    }

    public activate(context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;

        // Register document change listeners
        const onDidChangeActiveTextEditor = vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.languageId === 'markdown') {
                this._updateDecorations(editor.document);
            }
        });

        const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && event.document.languageId === 'markdown') {
                // Debounce updates
                if (this._updateTimeout) {
                    clearTimeout(this._updateTimeout);
                }
                this._updateTimeout = setTimeout(() => {
                    this._updateDecorations(event.document);
                    if (this._webviewPanel && this._currentDocument === event.document) {
                        this._updateWebviewContent();
                    }
                }, 300);
            }
        });

        this._disposables.push(onDidChangeActiveTextEditor, onDidChangeTextDocument);

        // Initial decoration update
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId === 'markdown') {
            this._updateDecorations(editor.document);
        }
    }

    public deactivate() {
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];

        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
            this._updateTimeout = undefined;
        }

        if (this._webviewPanel) {
            this._webviewPanel.dispose();
            this._webviewPanel = undefined;
        }
    }

    public toggleInlinePreview(document: vscode.TextDocument) {
        if (this._webviewPanel && this._currentDocument === document) {
            this._webviewPanel.dispose();
            this._webviewPanel = undefined;
            this._currentDocument = undefined;
        } else {
            this._showInlinePreview(document);
        }
    }

    private _updateDecorations(document: vscode.TextDocument) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            return;
        }

        const mermaidBlocks = this._findMermaidBlocks(document);
        const decorations = mermaidBlocks.map(block => ({
            range: block.range,
            hoverMessage: new vscode.MarkdownString(`\`\`\`mermaid\n${block.content}\n\`\`\``)
        }));

        // Clear previous decorations
        editor.setDecorations(InlinePreviewManager.mermaidDecorationType, decorations);
    }

    private _findMermaidBlocks(document: vscode.TextDocument): MermaidBlock[] {
        const text = document.getText();
        const blocks: MermaidBlock[] = [];

        // Match both ```mermaid blocks and [MermaidChart: path] links
        const mermaidCodeBlockRegex = /```mermaid\s*\n([\s\S]*?)\n```/g;
        const mermaidChartLinkRegex = /\[MermaidChart:\s*(.+?\.(mmd|mermaid|md))\s*\]/g;

        // Find mermaid code blocks
        let match;
        while ((match = mermaidCodeBlockRegex.exec(text)) !== null) {
            const startIndex = match.index;
            const content = match[1];
            const endIndex = startIndex + match[0].length;

            const startPos = document.positionAt(startIndex);
            const endPos = document.positionAt(endIndex);

            blocks.push({
                range: new vscode.Range(startPos, endPos),
                content: content.trim(),
                id: `block-${blocks.length}`
            });
        }

        // Find MermaidChart links
        mermaidChartLinkRegex.lastIndex = 0;
        while ((match = mermaidChartLinkRegex.exec(text)) !== null) {
            const startIndex = match.index;
            const filePath = match[1];
            const endIndex = startIndex + match[0].length;

            const startPos = document.positionAt(startIndex);
            const endPos = document.positionAt(endIndex);

            blocks.push({
                range: new vscode.Range(startPos, endPos),
                content: `[Link to: ${filePath}]`,
                id: `link-${blocks.length}`
            });
        }

        return blocks;
    }

    private _showInlinePreview(document: vscode.TextDocument) {
        this._currentDocument = document;

        // Get user configuration for inline preview column
        const config = vscode.workspace.getConfiguration('merfolk.inlinePreview');
        const defaultColumnConfig = config.get<string>('defaultColumn', 'right');
        const targetColumn = getViewColumn(defaultColumnConfig);

        const panel = vscode.window.createWebviewPanel(
            'mermaidInlinePreview',
            `Mermaid Inline Preview: ${path.basename(document.fileName)}`,
            targetColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(this._extensionUri!, 'media')
                ]
            }
        );

        this._webviewPanel = panel;

        // Handle panel disposal
        panel.onDidDispose(() => {
            this._webviewPanel = undefined;
            this._currentDocument = undefined;
        });

        // Handle messages from webview
        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openFile':
                        await this._openFile(message.path);
                        break;
                    case 'updateBlock':
                        await this._updateMermaidBlock(message.id, message.content);
                        break;
                }
            }
        );

        // Update webview content
        this._updateWebviewContent();
    }

    private _updateWebviewContent() {
        if (!this._webviewPanel || !this._currentDocument) {
            return;
        }

        const mermaidBlocks = this._findMermaidBlocks(this._currentDocument);
        const html = this._getWebviewContent(mermaidBlocks);

        this._webviewPanel.webview.html = html;
    }

    private _getWebviewContent(blocks: MermaidBlock[]): string {
        const mermaidPathOnDisk = vscode.Uri.joinPath(this._extensionUri!, 'media', 'mermaid.min.js');
        const mermaidUri = this._webviewPanel!.webview.asWebviewUri(mermaidPathOnDisk);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${this._webviewPanel!.webview.cspSource}; style-src 'unsafe-inline' ${this._webviewPanel!.webview.cspSource};">
    <title>Mermaid Inline Preview</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            margin: 0;
        }
        .diagram-container {
            border: 1px solid var(--vscode-panel-border);
            border-radius: 5px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .diagram-header {
            background-color: var(--vscode-editor-background);
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .diagram-title {
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        .diagram-actions {
            display: flex;
            gap: 5px;
        }
        .diagram-actions button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .diagram-actions button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .diagram-content {
            padding: 15px;
            min-height: 100px;
            background-color: var(--vscode-editor-background);
        }
        .diagram-link {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textLink-foreground);
            padding: 15px;
            margin: 0;
            color: var(--vscode-textLink-foreground);
            cursor: pointer;
            font-style: italic;
        }
        .diagram-link:hover {
            background-color: var(--vscode-textBlockQuote-background);
            opacity: 0.8;
        }
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            margin-top: 50px;
        }
        .error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 3px;
            margin: 10px 0;
            font-family: var(--vscode-font-family);
        }
    </style>
</head>
<body>
    <h2>Mermaid Inline Preview</h2>

    ${blocks.length === 0 ?
        '<div class="empty-state">No Mermaid diagrams found in this markdown file.</div>' :
        blocks.map(block => this._renderBlock(block)).join('')
    }

    <script src="${mermaidUri}"></script>
    <script>
        const vscode = acquireVsCodeApi();

        // Initialize Mermaid
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            themeVariables: {
                primaryColor: '#bbdefb',
                primaryTextColor: '#000',
                primaryBorderColor: '#007bff',
                lineColor: '#666',
                secondaryColor: '#f8f9fa',
                tertiaryColor: '#e9ecef'
            },
            fontFamily: 'var(--vscode-font-family)',
            fontSize: 16,
            securityLevel: 'loose'
        });

        async function renderDiagram(containerId, content) {
            const element = document.getElementById(containerId);
            if (!element) {
                return;
            }

            try {
                await mermaid.parse(content);
                const { svg } = await mermaid.render(containerId + '-svg', content);
                element.innerHTML = svg;
            } catch (error) {
                element.innerHTML = '<div class="error">Syntax error: ' + (error.message || error) + '</div>';
            }
        }

        function openLink(path) {
            vscode.postMessage({
                command: 'openFile',
                path: path
            });
        }

        function openInEditor(blockId) {
            // Find the corresponding block in the markdown and focus it
            vscode.postMessage({
                command: 'focusBlock',
                blockId: blockId
            });
        }

        // Auto-render all diagrams
        document.addEventListener('DOMContentLoaded', () => {
            ${blocks.map(block => {
                if (block.id.startsWith('block-')) {
                    return `renderDiagram('diagram-${block.id}', \`${block.content.replace(/`/g, '\\`')}\`);`;
                }
                return '';
            }).join('\n            ')}
        });
    </script>
</body>
</html>`;
    }

    private _renderBlock(block: MermaidBlock): string {
        if (block.id.startsWith('link-')) {
            // This is a MermaidChart link
            const linkMatch = block.content.match(/\[Link to: (.+)\]/);
            const filePath = linkMatch ? linkMatch[1] : 'unknown';

            return `
            <div class="diagram-container">
                <div class="diagram-header">
                    <div class="diagram-title">📄 External Link</div>
                    <div class="diagram-actions">
                        <button onclick="openLink('${filePath}')">Open File</button>
                    </div>
                </div>
                <div class="diagram-content">
                    <div class="diagram-link" onclick="openLink('${filePath}')">
                        📎 Link to: ${filePath}
                    </div>
                </div>
            </div>`;
        } else {
            // This is a mermaid code block
            return `
            <div class="diagram-container">
                <div class="diagram-header">
                    <div class="diagram-title">📊 Diagram ${block.id.split('-')[1]}</div>
                    <div class="diagram-actions">
                        <button onclick="openInEditor('${block.id}')">Edit in Markdown</button>
                    </div>
                </div>
                <div class="diagram-content">
                    <div id="diagram-${block.id}"></div>
                </div>
            </div>`;
        }
    }

    private async _openFile(relativePath: string) {
        if (!this._currentDocument) {
            return;
        }

        try {
            const currentDir = path.dirname(this._currentDocument.uri.fsPath);
            const targetPath = path.resolve(currentDir, relativePath);
            const targetUri = vscode.Uri.file(targetPath);

            await vscode.workspace.fs.stat(targetUri);
            const document = await vscode.workspace.openTextDocument(targetUri);
            await vscode.window.showTextDocument(document);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async _updateMermaidBlock(blockId: string, content: string) {
        // This would allow editing mermaid content from the inline preview
        // Implementation could be added later
        vscode.window.showInformationMessage('Inline editing coming soon!');
    }

    private static readonly mermaidDecorationType = vscode.window.createTextEditorDecorationType({
        border: '1px solid rgba(0, 122, 204, 0.3)',
        backgroundColor: 'rgba(0, 122, 204, 0.05)',
        borderRadius: '3px',
        isWholeLine: false
    });
}