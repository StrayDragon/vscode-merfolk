import * as vscode from 'vscode';
import * as path from 'path';
import { getViewColumn } from '../../shared/utils/viewColumn';

export class PreviewPanel {
    public static currentPanel: PreviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private readonly _extensionUri: vscode.Uri;
    private _document?: vscode.TextDocument;
    private _content?: string;
    private _sourceInfo?: { filePath: string; id?: string };
    private _isContentMode: boolean;
    private _updateTimeout: NodeJS.Timeout | undefined;

    public static createOrShow(document: vscode.TextDocument, extensionUri: vscode.Uri) {
        // Get user configuration for preview column
        const config = vscode.workspace.getConfiguration('merfolk.preview');
        const defaultColumnConfig = config.get<string>('defaultColumn', 'beside');
        const targetColumn = getViewColumn(defaultColumnConfig);

        // If we already have a panel, show it
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel._panel.reveal(targetColumn);
            PreviewPanel.currentPanel._document = document;
            PreviewPanel.currentPanel._content = undefined;
            PreviewPanel.currentPanel._sourceInfo = undefined;
            PreviewPanel.currentPanel._isContentMode = false;
            PreviewPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            PreviewPanel.viewType,
            'Mermaid Preview',
            targetColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'assets')
                ]
            }
        );

        PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, document);
    }

    public static createOrShowWithContent(
        content: string,
        sourceInfo: { filePath: string; id?: string },
        extensionUri: vscode.Uri
    ) {
        // Get user configuration for preview column
        const config = vscode.workspace.getConfiguration('merfolk.preview');
        const defaultColumnConfig = config.get<string>('defaultColumn', 'beside');
        const targetColumn = getViewColumn(defaultColumnConfig);

        // If we already have a panel, show it
        if (PreviewPanel.currentPanel) {
            PreviewPanel.currentPanel._panel.reveal(targetColumn);
            PreviewPanel.currentPanel._content = content;
            PreviewPanel.currentPanel._sourceInfo = sourceInfo;
            PreviewPanel.currentPanel._document = undefined;
            PreviewPanel.currentPanel._isContentMode = true;
            PreviewPanel.currentPanel._update();
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            PreviewPanel.viewType,
            'Mermaid Preview',
            targetColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'assets')
                ]
            }
        );

        PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, undefined, content, sourceInfo);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        // When a panel is restored, we need a document - for now create empty one
        const editor = vscode.window.activeTextEditor;
        const document = editor ? editor.document : undefined;
        if (document) {
            PreviewPanel.currentPanel = new PreviewPanel(panel, extensionUri, document);
        }
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        document?: vscode.TextDocument,
        content?: string,
        sourceInfo?: { filePath: string; id?: string }
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._document = document;
        this._content = content;
        this._sourceInfo = sourceInfo;
        this._isContentMode = !!content;

        // Set the webview's initial html content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Listen for when the active editor changes (only in document mode)
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (this._isContentMode) {
                return; // Don't update in content mode
            }
            if (editor && (editor.document.languageId === 'mermaid' || this.isMermaidFile(editor.document))) {
                this._document = editor.document;
                this._update();
            }
        }, null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'openMermaidChart':
                        await this._openMermaidChartFile(message.path);
                        return;
                                        case 'exportSvg':
                        await this._exportSvg();
                        return;
                    case 'saveContent':
                        await this._saveFile(message.content, message.fileName);
                        return;
                    case 'showError':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            this._disposables
        );

        // Update on document changes with debouncing (only in document mode)
        vscode.workspace.onDidChangeTextDocument(event => {
            if (this._isContentMode) {
                return; // Don't update in content mode
            }
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document && event.document === this._document) {
                // Debounce updates to avoid excessive rendering
                if (this._updateTimeout) {
                    clearTimeout(this._updateTimeout);
                }
                this._updateTimeout = setTimeout(() => {
                    this._update();
                }, 300);
            }
        }, null, this._disposables);
    }

    private isMermaidFile(document: vscode.TextDocument): boolean {
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.mmd') || fileName.endsWith('.mermaid');
    }

    public dispose() {
        PreviewPanel.currentPanel = undefined;

        // Clear the update timeout
        if (this._updateTimeout) {
            clearTimeout(this._updateTimeout);
            this._updateTimeout = undefined;
        }

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;

        // Set title based on mode
        if (this._isContentMode && this._sourceInfo) {
            this._panel.title = 'Mermaid Preview';
        } else if (this._document) {
            this._panel.title = `Mermaid Preview: ${path.basename(this._document.fileName)}`;
        } else {
            this._panel.title = 'Mermaid Preview';
        }

        this._panel.webview.html = this._getHtmlForWebview(webview);

        // Send the current content to the webview
        let content: string;
        let fileName: string;

        if (this._isContentMode && this._content) {
            content = this._content;
            fileName = this._sourceInfo?.filePath || 'mermaid-chart';
        } else if (this._document) {
            content = this._document.getText();
            fileName = this._document.fileName;
        } else {
            content = '';
            fileName = 'unknown';
        }

        this._panel.webview.postMessage({
            command: 'updateContent',
            content: content,
            fileName: fileName
        });
    }

    private async _openMermaidChartFile(relativePath: string): Promise<void> {
        try {
            // Get the current file's directory
            let currentFile: vscode.Uri;

            if (this._isContentMode && this._sourceInfo) {
                // In content mode, use the source file path
                currentFile = vscode.Uri.file(this._sourceInfo.filePath);
            } else if (this._document) {
                currentFile = this._document.uri;
            } else {
                vscode.window.showErrorMessage('No source file available for resolving relative paths');
                return;
            }

            const currentDir = path.dirname(currentFile.fsPath);

            // Resolve the relative path (similar to markdown link resolution)
            const targetPath = path.resolve(currentDir, relativePath);

            // Check if the file exists
            const targetUri = vscode.Uri.file(targetPath);
            try {
                await vscode.workspace.fs.stat(targetUri);
            } catch (error) {
                vscode.window.showErrorMessage(`File not found: ${relativePath}`);
                return;
            }

            // Open the file
            const document = await vscode.workspace.openTextDocument(targetUri);

            // Open the file in editor
            await vscode.window.showTextDocument(document);

            // If preview is not active, create/show it for the new document
            if (!PreviewPanel.currentPanel) {
                PreviewPanel.createOrShow(document, this._extensionUri);
            } else {
                PreviewPanel.currentPanel._document = document;
                PreviewPanel.currentPanel._update();
            }

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Use local Mermaid.js file
        const mermaidPathOnDisk = vscode.Uri.joinPath(this._extensionUri, 'assets', 'mermaid.min.js');
        const mermaidUri = webview.asWebviewUri(mermaidPathOnDisk);

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource}; img-src blob: data:; connect-src blob:;">
    <title>Mermaid Preview</title>
    <style>
        * {
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        #container {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        #mermaid-diagram {
            width: 100%;
            height: 100%;
            overflow: hidden;
            cursor: grab;
            position: relative;
        }
        #mermaid-diagram.grabbing {
            cursor: grabbing;
        }
        #mermaid-diagram svg {
            position: absolute;
            top: 0;
            left: 0;
            transform-origin: 0 0;
        }
        .empty {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            text-align: center;
            margin-top: 50px;
        }
        #error {
            color: var(--vscode-errorForeground);
            background-color: var(--vscode-inputValidation-errorBackground);
            border: 1px solid var(--vscode-inputValidation-errorBorder);
            padding: 10px;
            border-radius: 3px;
            margin: 10px;
            white-space: pre-wrap;
            font-family: var(--vscode-font-family);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            z-index: 10;
        }
        .mermaid-link {
            color: var(--vscode-textLink-foreground);
            text-decoration: underline;
            cursor: pointer;
        }
        .mermaid-link:hover {
            text-decoration: none;
        }
        /* Context Menu Styles */
        #context-menu {
            position: fixed;
            background-color: var(--vscode-menu-background);
            border: 1px solid var(--vscode-menu-border);
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            padding: 4px 0;
            min-width: 120px;
            z-index: 1000;
            display: none;
        }
        #context-menu.visible {
            display: block;
        }
        .context-menu-item {
            padding: 6px 16px;
            cursor: pointer;
            color: var(--vscode-menu-foreground);
            font-size: 13px;
            white-space: nowrap;
        }
        .context-menu-item:hover {
            background-color: var(--vscode-menu-selectionBackground);
            color: var(--vscode-menu-selectionForeground);
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="mermaid-diagram"></div>
        <div id="error" style="display: none;"></div>
    </div>

    <!-- Context Menu -->
    <div id="context-menu">
        <div class="context-menu-item" id="context-export-svg">Export SVG</div>
    </div>

    <!-- Using local Mermaid.js -->
    <script src="${mermaidUri}"></script>
    <script>
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

        const vscode = acquireVsCodeApi();
        let currentContent = '';
        let currentZoom = 1;
        let currentPanX = 0;
        let currentPanY = 0;
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;

        async function renderMermaid(content) {
            const element = document.getElementById('mermaid-diagram');
            const errorDiv = document.getElementById('error');

            // Clear previous content and errors
            if (element) element.innerHTML = '';
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.style.display = 'none';
            }

            if (!content.trim()) {
                if (element) {
                    element.innerHTML = '<div class="empty">No Mermaid content to display.</div>';
                }
                return;
            }

            if (!element) {
                console.error('Mermaid container element not found');
                return;
            }

            try {
                // Parse the diagram first to catch syntax errors early
                await mermaid.parse(content);

                // Render the diagram
                const { svg } = await mermaid.render('mermaid-svg', content);
                element.innerHTML = svg;

                // Apply current zoom and pan
                applyTransform();

                // Setup drag handlers
                setupDragHandlers(element);

                // Process MermaidChart links after rendering
                processMermaidChartLinks();

            } catch (error) {
                const errorMessage = 'Syntax error: ' + (error.message || error);
                if (errorDiv) {
                    errorDiv.textContent = errorMessage;
                    errorDiv.style.display = 'block';
                }
                element.innerHTML = '';
                console.error('Mermaid rendering error:', error);
            }
        }

        function setupDragHandlers(element) {
            // Remove existing event listeners
            const newElement = element.cloneNode(true);
            element.parentNode.replaceChild(newElement, element);

            // Mouse events
            newElement.addEventListener('mousedown', handleMouseDown);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            // Wheel events for zoom with mouse position (direct zoom, no Ctrl needed)
            newElement.addEventListener('wheel', handleWheel, { passive: false });

            // Context menu (right-click) for export
            newElement.addEventListener('contextmenu', handleContextMenu);
        }

        function handleContextMenu(e) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY);
        }

        function handleMouseDown(e) {
            if (e.button !== 0) return; // Only left click
            isDragging = true;
            dragStartX = e.clientX - currentPanX;
            dragStartY = e.clientY - currentPanY;
            document.getElementById('mermaid-diagram').classList.add('grabbing');
            e.preventDefault();
        }

        function handleMouseMove(e) {
            if (!isDragging) return;
            currentPanX = e.clientX - dragStartX;
            currentPanY = e.clientY - dragStartY;
            applyTransform();
        }

        function handleMouseUp() {
            isDragging = false;
            document.getElementById('mermaid-diagram')?.classList.remove('grabbing');
        }

        function handleWheel(e) {
            // Direct zoom with mouse wheel (no Ctrl key required)
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newZoom = Math.max(0.3, Math.min(3, currentZoom * delta));

            // Zoom towards mouse position
            const scaleChange = newZoom - currentZoom;
            currentPanX -= (x - currentPanX) * (scaleChange / currentZoom);
            currentPanY -= (y - currentPanY) * (scaleChange / currentZoom);
            currentZoom = newZoom;

            applyTransform();
        }

        function processMermaidChartLinks() {
            // Find all elements with MermaidChart links (look for href attributes starting with MermaidChart:)
            const links = document.querySelectorAll('[href*="MermaidChart:"]');

            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href && href.startsWith('MermaidChart:')) {
                    // Extract the path after "MermaidChart:"
                    const path = href.substring('MermaidChart:'.length);

                    // Make it look clickable and styled
                    link.style.cursor = 'pointer';
                    link.className += ' mermaid-link';

                    // Remove the original href to prevent default navigation
                    link.removeAttribute('href');

                    // Add click handler
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        // Send message to extension to open the file
                        vscode.postMessage({
                            command: 'openMermaidChart',
                            path: path
                        });
                    });
                }
            });
        }

        function applyTransform() {
            const svg = document.querySelector('#mermaid-diagram svg');
            if (svg) {
                svg.style.transform = 'translate(' + currentPanX + 'px, ' + currentPanY + 'px) scale(' + currentZoom + ')';
                svg.style.width = 'auto';
                svg.style.height = 'auto';
            }
        }

        function exportSvg() {
            const svg = document.querySelector('#mermaid-diagram svg');
            if (!svg) {
                vscode.postMessage({ command: 'showError', text: 'No diagram to export' });
                return;
            }

            // Clone SVG to avoid modifying the original
            const svgClone = svg.cloneNode(true);

            // Get the SVG content with proper XML header
            const svgData = new XMLSerializer().serializeToString(svgClone);
            const svgContent = '<?xml version="1.0" encoding="UTF-8"?>\\n' +
                '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\\n' +
                svgData;

            vscode.postMessage({
                command: 'saveContent',
                content: svgContent,
                fileName: getFileName('svg')
            });
        }

        
        function getFileName(extension) {
            const fileName = currentContent.match(/title:\\s*([^\\n]+)/i) ||
                            currentContent.match(/graph\\s+(\\w+)/i) ||
                            currentContent.match(/(\\w+)Diagram/i) ||
                            ['diagram'];
            const baseName = fileName[1] || 'diagram';
            return baseName + '.' + extension;
        }

        // Context Menu functionality
        let contextMenu = null;

        function initContextMenu() {
            contextMenu = document.getElementById('context-menu');
            const exportItem = document.getElementById('context-export-svg');

            if (exportItem) {
                exportItem.addEventListener('click', () => {
                    exportSvg();
                    hideContextMenu();
                });
            }

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (contextMenu && !contextMenu.contains(e.target)) {
                    hideContextMenu();
                }
            });
        }

        function showContextMenu(x, y) {
            if (!contextMenu) return;

            // Check if menu would go off screen
            const menuWidth = 120;
            const menuHeight = 40;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            let adjustedX = x;
            let adjustedY = y;

            if (x + menuWidth > windowWidth) {
                adjustedX = windowWidth - menuWidth - 10;
            }
            if (y + menuHeight > windowHeight) {
                adjustedY = windowHeight - menuHeight - 10;
            }

            contextMenu.style.left = adjustedX + 'px';
            contextMenu.style.top = adjustedY + 'px';
            contextMenu.classList.add('visible');
        }

        function hideContextMenu() {
            if (contextMenu) {
                contextMenu.classList.remove('visible');
            }
        }

        // Listen for messages from the extension
        window.addEventListener('message', async event => {
            const message = event.data;
            switch (message.command) {
                case 'updateContent':
                    currentContent = message.content;
                    await renderMermaid(currentContent);
                    break;
                case 'requestExport':
                    if (message.format === 'svg') {
                        exportSvg();
                    }
                    break;
            }
        });

        // Initialize context menu
        initContextMenu();

        // Initial render
        renderMermaid('').catch(console.error);
    </script>
</body>
</html>`;
    }

    private async _exportSvg(): Promise<void> {
        try {
            // Ask webview for the SVG content
            const result = await this._panel.webview.postMessage({
                command: 'requestExport',
                format: 'svg'
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to export: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async _saveFile(content: string, fileName: string): Promise<void> {
        try {
            // Show save dialog
            const saveUri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(fileName),
                filters: {
                    'SVG Files': ['svg'],
                    'All Files': ['*']
                }
            });

            if (saveUri) {
                // Write the file
                const encodedContent = Buffer.from(content, 'utf8');
                await vscode.workspace.fs.writeFile(saveUri, encodedContent);

                // Show success message
                vscode.window.showInformationMessage(`Diagram exported to ${saveUri.fsPath}`);

                // Optionally open the exported file
                const openAction = 'Open File';
                const action = await vscode.window.showInformationMessage(
                    `Diagram exported successfully!`,
                    openAction
                );

                if (action === openAction) {
                    // Try to open with default app
                    vscode.env.openExternal(saveUri);
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public static readonly viewType = 'mermaid.preview';
}