import * as vscode from 'vscode';
import * as path from 'path';
import { BaseService, IFileService } from '../core/service';
import { DIContainer } from '../core/container';
import { isMermaidFile, isMarkdownFile, generateContentHash } from '../shared/utils/fileType';

/**
 * Service for handling file operations
 */
export class FileService extends BaseService implements IFileService {
    constructor(container: DIContainer) {
        super(container);
    }

    /**
     * Resolve a relative path to an absolute URI based on a base URI
     * Priority: absolute path > relative to current file's directory > relative to workspace root
     */
    public resolvePath(relativePath: string, baseUri: vscode.Uri): vscode.Uri {
        const normalizedPath = typeof relativePath === 'string' ? relativePath.trim() : '';
        if (!normalizedPath) {
            throw new Error('MermaidChart 链接缺少路径');
        }

        // If it's already an absolute path, return it directly
        if (path.isAbsolute(normalizedPath)) {
            return vscode.Uri.file(normalizedPath);
        }

        // Get the directory of the current file
        const currentFileDir = path.dirname(baseUri.fsPath);

        // First, try to resolve relative to the current file's directory
        const relativeToFile = path.resolve(currentFileDir, normalizedPath);

        // Check if the file exists relative to the current file
        try {
            vscode.workspace.fs.stat(vscode.Uri.file(relativeToFile));
            return vscode.Uri.file(relativeToFile);
        } catch (e) {
            // File not found, try workspace root
        }

        // If not found, try to resolve relative to workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const relativeToWorkspace = path.resolve(workspaceRoot, normalizedPath);

            // Check if the file exists relative to workspace root
            try {
                vscode.workspace.fs.stat(vscode.Uri.file(relativeToWorkspace));
                return vscode.Uri.file(relativeToWorkspace);
            } catch (e) {
                // File not found, return relative path
            }
        }

        // Return the path relative to current file (may not exist)
        return vscode.Uri.file(relativeToFile);
    }

    /**
     * Open a file given a relative path and base URI
     */
    public async openFile(relativePath: string, baseUri: vscode.Uri): Promise<vscode.TextDocument> {
        const targetUri = this.resolvePath(relativePath, baseUri);

        // Check if the file exists
        try {
            await vscode.workspace.fs.stat(targetUri);
        } catch (error) {
            throw new Error(`File not found: ${relativePath}`);
        }

        // Open the file
        const document = await vscode.workspace.openTextDocument(targetUri);
        return document;
    }

    /**
     * Check if a document is a Mermaid file
     */
    public isMermaidFile(document: vscode.TextDocument): boolean {
        return isMermaidFile(document);
    }

    /**
     * Check if a document is a Markdown file
     */
    public isMarkdownFile(document: vscode.TextDocument): boolean {
        return isMarkdownFile(document);
    }

    /**
     * Generate content hash for cache validation
     */
    public getDocumentHash(document: vscode.TextDocument): string {
        return generateContentHash(document.getText());
    }
}
