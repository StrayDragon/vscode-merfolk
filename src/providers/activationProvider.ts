import * as vscode from 'vscode';
import { BaseService, IActivationProvider, IInlinePreviewService, ICodeLensService, IPreviewService } from '../core/service';
import { DIContainer } from '../core/container';

/**
 * Provider for handling extension activation
 */
export class ActivationProvider extends BaseService implements IActivationProvider {
    private inlinePreviewService: IInlinePreviewService;
    private codeLensService: ICodeLensService;

    constructor(container: DIContainer) {
        super(container);
        this.inlinePreviewService = container.resolve<IInlinePreviewService>('InlinePreviewService');
        this.codeLensService = container.resolve<ICodeLensService>('CodeLensService');
    }

    /**
     * Handle extension activation
     */
    public onActivate(context: vscode.ExtensionContext): void {
        console.log('Extension "vscode-merfolk" is now active!');

        // Initialize inline preview manager
        this.inlinePreviewService.activate(context);

        // Register CodeLens provider
        this.codeLensService.registerProvider(context);

        // Handle webview panel restoration
        if (vscode.window.registerWebviewPanelSerializer) {
            const container = this.container;
            vscode.window.registerWebviewPanelSerializer('mermaid.preview', {
                async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
                    // Get PreviewService and revive the panel
                    const previewService = container.resolve<IPreviewService>('PreviewService');
                    if (previewService) {
                        previewService.revive(webviewPanel);
                    }
                }
            });
        }
    }
}
