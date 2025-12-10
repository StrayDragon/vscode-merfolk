import * as vscode from 'vscode';

/**
 * File type utility functions
 */

/**
 * Check if a document is a Mermaid file
 */
export function isMermaidFile(document: vscode.TextDocument): boolean {
    const fileName = document.fileName.toLowerCase();
    return fileName.endsWith('.mmd') || fileName.endsWith('.mermaid');
}

/**
 * Check if a document is a Markdown file
 */
export function isMarkdownFile(document: vscode.TextDocument): boolean {
    const fileName = document.fileName.toLowerCase();
    return fileName.endsWith('.md');
}

/**
 * Get file type from document
 */
export function getFileType(document: vscode.TextDocument): 'mermaid' | 'markdown' | 'unknown' {
    if (isMermaidFile(document)) {
        return 'mermaid';
    }
    if (isMarkdownFile(document)) {
        return 'markdown';
    }
    return 'unknown';
}

/**
 * Generate content hash for cache validation
 */
export function generateContentHash(content: string): string {
    // Simple rolling hash algorithm
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
        hash = ((hash << 5) + hash) + content.charCodeAt(i);
    }
    return hash.toString(36);
}

/**
 * Extract file extension from path
 */
export function getFileExtension(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath;
    const parts = fileName.split('.');
    return parts.length > 1 ? '.' + parts.pop()?.toLowerCase() : '';
}