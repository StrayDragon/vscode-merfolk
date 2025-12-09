import * as vscode from 'vscode';
import { BaseService, IInlinePreviewService } from '../core/service';
import { DIContainer } from '../core/container';
import { InlinePreviewManager } from '../ui/inline/inlinePreviewManager';

/**
 * Service for managing inline preview
 * Wraps the existing InlinePreviewManager class with dependency injection
 */
export class InlinePreviewService extends BaseService implements IInlinePreviewService {
    private inlineManager: InlinePreviewManager;

    constructor(container: DIContainer) {
        super(container);
        this.inlineManager = InlinePreviewManager.getInstance();
    }

    /**
     * Activate the inline preview service
     */
    public async activate(context: vscode.ExtensionContext): Promise<void> {
        this.inlineManager.activate(context);
    }

    /**
     * Deactivate the inline preview service
     */
    public async deactivate(): Promise<void> {
        this.inlineManager.deactivate();
        super.deactivate();
    }

    /**
     * Toggle inline preview for a document
     */
    public toggleInlinePreview(document: vscode.TextDocument): void {
        this.inlineManager.toggleInlinePreview(document);
    }
}
