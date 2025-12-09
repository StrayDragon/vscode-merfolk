import * as vscode from 'vscode';
import * as path from 'path';
import { BaseService, IFileService } from '../core/service';
import { DIContainer } from '../core/container';

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
        console.log(`[FileService] Resolving path: ${relativePath} from base: ${baseUri.fsPath}`);

        // If it's already an absolute path, return it directly
        if (path.isAbsolute(relativePath)) {
            console.log(`[FileService] Absolute path detected: ${relativePath}`);
            return vscode.Uri.file(relativePath);
        }

        // Get the directory of the current file
        const currentFileDir = path.dirname(baseUri.fsPath);
        console.log(`[FileService] Current file directory: ${currentFileDir}`);

        // First, try to resolve relative to the current file's directory
        const relativeToFile = path.resolve(currentFileDir, relativePath);
        console.log(`[FileService] Resolved relative to file: ${relativeToFile}`);

        // Check if the file exists relative to the current file
        try {
            vscode.workspace.fs.stat(vscode.Uri.file(relativeToFile));
            console.log(`[FileService] Found file relative to current file: ${relativeToFile}`);
            return vscode.Uri.file(relativeToFile);
        } catch (e) {
            console.log(`[FileService] File not found relative to current file, trying workspace root`);
        }

        // If not found, try to resolve relative to workspace root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri.fsPath;
            const relativeToWorkspace = path.resolve(workspaceRoot, relativePath);
            console.log(`[FileService] Resolved relative to workspace: ${relativeToWorkspace}`);

            // Check if the file exists relative to workspace root
            try {
                vscode.workspace.fs.stat(vscode.Uri.file(relativeToWorkspace));
                console.log(`[FileService] Found file relative to workspace: ${relativeToWorkspace}`);
                return vscode.Uri.file(relativeToWorkspace);
            } catch (e) {
                console.log(`[FileService] File not found in workspace either`);
            }
        }

        // Return the path relative to current file (even if it might not exist)
        console.log(`[FileService] Returning path relative to current file (may not exist): ${relativeToFile}`);
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
        const fileName = document.fileName.toLowerCase();
        return fileName.endsWith('.mmd') || fileName.endsWith('.mermaid');
    }
}
