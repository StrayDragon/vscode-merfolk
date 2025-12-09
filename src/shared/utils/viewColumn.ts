import * as vscode from 'vscode';

/**
 * Get the appropriate view column based on configuration
 * Extracted to avoid code duplication
 */
export function getViewColumn(configValue: string, activeEditor?: vscode.TextEditor): vscode.ViewColumn {
    const activeColumn = activeEditor?.viewColumn ?? vscode.ViewColumn.One;

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
            return vscode.ViewColumn.Beside;
    }
}

/**
 * Debounce function to limit the rate of execution
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | undefined;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
