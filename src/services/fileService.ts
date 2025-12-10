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
        // If it's already an absolute path, return it directly
        if (path.isAbsolute(relativePath)) {
            return vscode.Uri.file(relativePath);
        }

        // Get the directory of the current file
        const currentFileDir = path.dirname(baseUri.fsPath);

        // First, try to resolve relative to the current file's directory
        const relativeToFile = path.resolve(currentFileDir, relativePath);

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
            const relativeToWorkspace = path.resolve(workspaceRoot, relativePath);

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

    /**
     * Open a markdown file and navigate to specific section
     */
    public async openMarkdownFile(
        relativePath: string,
        baseUri: vscode.Uri,
        section?: string
    ): Promise<vscode.TextDocument> {
        const targetUri = this.resolvePath(relativePath, baseUri);

        // Check if the file exists
        try {
            await vscode.workspace.fs.stat(targetUri);
        } catch (error) {
            throw new Error(`File not found: ${relativePath}`);
        }

        // Open the file
        const document = await vscode.workspace.openTextDocument(targetUri);

        // If section is specified, navigate to it
        if (section) {
            await this.navigateToSection(document, section);
        }

        return document;
    }

    /**
     * Navigate to a specific section in a markdown document
     */
    private async navigateToSection(document: vscode.TextDocument, sectionTitle: string): Promise<void> {
        const lines = document.getText().split('\n');
        const targetPattern = new RegExp(`^#{1,6}\\s+${this.escapeRegExp(sectionTitle)}\\s*$`, 'i');

        for (let i = 0; i < lines.length; i++) {
            if (targetPattern.test(lines[i])) {
                const position = new vscode.Position(i, 0);
                const range = new vscode.Range(position, position);

                // Show the document and reveal the line
                const editor = await vscode.window.showTextDocument(document);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

                return;
            }
        }

        // Section not found - show error with available sections
        const availableSections = this.extractSectionTitles(lines);
        const sectionList = availableSections.map(s => `"${s}"`).join(', ');
        throw new Error(
            `Section "${sectionTitle}" not found in document. Available sections: ${sectionList}`
        );
    }

    /**
     * Extract section titles from markdown lines
     */
    private extractSectionTitles(lines: string[]): string[] {
        const sections: string[] = [];
        const headingPattern = /^#{1,6}\s+(.+)$/;

        for (const line of lines) {
            const match = line.match(headingPattern);
            if (match) {
                sections.push(match[1].trim());
            }
        }

        return sections;
    }

    /**
     * Escape special characters for regex
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
