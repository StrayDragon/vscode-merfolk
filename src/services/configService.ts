import * as vscode from 'vscode';
import { BaseService, IConfigService } from '../core/service';
import { DIContainer } from '../core/container';
import { getViewColumn } from '../shared/utils/viewColumn';

/**
 * Service for managing configuration
 */
export class ConfigService extends BaseService implements IConfigService {
    constructor(container: DIContainer) {
        super(container);
    }

    /**
     * Get preview column configuration
     */
    public getPreviewColumn(): vscode.ViewColumn {
        const config = vscode.workspace.getConfiguration('merfolk.preview');
        const defaultColumnConfig = config.get<string>('defaultColumn', 'beside');
        return getViewColumn(defaultColumnConfig);
    }

    /**
     * Get inline preview column configuration
     */
    public getInlinePreviewColumn(): vscode.ViewColumn {
        const config = vscode.workspace.getConfiguration('merfolk.inlinePreview');
        const defaultColumnConfig = config.get<string>('defaultColumn', 'right');
        return getViewColumn(defaultColumnConfig, undefined);
    }

    /**
     * Get a configuration value
     */
    public get<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration('merfolk');
        return config.get<T>(key, defaultValue);
    }
}
