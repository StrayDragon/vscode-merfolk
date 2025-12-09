import * as vscode from 'vscode';
import { BaseService, IPreviewService, IFileService, IConfigService } from '../core/service';
import { DIContainer } from '../core/container';
import { PreviewPanel } from '../ui/preview/previewPanel';

/**
 * Service for managing preview panels
 * Wraps the existing PreviewPanel class with dependency injection
 */
export class PreviewService extends BaseService implements IPreviewService {
    private fileService: IFileService;
    private configService: IConfigService;

    constructor(container: DIContainer) {
        super(container);
        this.fileService = container.resolve<IFileService>('FileService');
        this.configService = container.resolve<IConfigService>('ConfigService');
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
     * Dispose of resources
     */
    public dispose(): void {
        // PreviewPanel manages its own disposal
        super.dispose();
    }
}
