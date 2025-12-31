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
    public async resolvePath(relativePath: string, baseUri: vscode.Uri): Promise<vscode.Uri> {
        // If it's already an absolute path, return it directly
        if (path.isAbsolute(relativePath)) {
            return vscode.Uri.file(relativePath);
        }

        const candidates: vscode.Uri[] = [];

        // Get the directory of the current file
        const currentFileDir = path.dirname(baseUri.fsPath);

        // First, try to resolve relative to the current file's directory
        const relativeToFile = path.resolve(currentFileDir, relativePath);
        candidates.push(vscode.Uri.file(relativeToFile));

        // If not found, try to resolve relative to workspace root
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(baseUri);
        if (workspaceFolder) {
            const relativeToWorkspace = path.resolve(workspaceFolder.uri.fsPath, relativePath);
            const workspaceUri = vscode.Uri.file(relativeToWorkspace);
            if (!candidates.some(candidate => candidate.fsPath === workspaceUri.fsPath)) {
                candidates.push(workspaceUri);
            }
        } else {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                for (const folder of workspaceFolders) {
                    const relativeToWorkspace = path.resolve(folder.uri.fsPath, relativePath);
                    const workspaceUri = vscode.Uri.file(relativeToWorkspace);
                    if (!candidates.some(candidate => candidate.fsPath === workspaceUri.fsPath)) {
                        candidates.push(workspaceUri);
                    }
                }
            }
        }

        for (const candidate of candidates) {
            if (await this.pathExists(candidate)) {
                return candidate;
            }
        }

        // Return the path relative to current file (may not exist)
        return candidates[0];
    }

    /**
     * Open a file given a relative path and base URI
     */
    public async openFile(relativePath: string, baseUri: vscode.Uri): Promise<vscode.TextDocument> {
        const targetUri = await this.resolvePath(relativePath, baseUri);

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

    private async pathExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch {
            return false;
        }
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
