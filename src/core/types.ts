import * as vscode from 'vscode';

/**
 * Common type definitions for the extension
 */

// Mermaid block information for inline preview
export interface MermaidBlock {
    range: vscode.Range;
    content: string;
    id: string;
    type: 'code' | 'link';
}

// WebView message types
export interface WebViewMessage {
    command: string;
    [key: string]: any;
}

// Preview panel state
export interface PreviewPanelState {
    fileName: string;
    content: string;
    uri: vscode.Uri;
}

// Configuration keys
export interface MerfolkConfig {
    preview: {
        defaultColumn: string;
    };
    inlinePreview: {
        defaultColumn: string;
    };
}

// Extension commands
export enum Commands {
    PREVIEW = 'mermaid.preview',
    PREVIEW_INLINE = 'mermaid.previewInline',
    CHART_PREVIEW = 'mermaidChart.preview',
    CHART_OPEN_FILE = 'mermaidChart.openFile',
    CHART_REFRESH_CODELENS = 'mermaidChart.refreshCodeLens'
}

// WebView panel types
export enum PanelTypes {
    PREVIEW = 'mermaid.preview',
    INLINE_PREVIEW = 'mermaidInlinePreview'
}

// View column configurations
export enum ViewColumnConfig {
    BESIDE = 'beside',
    RIGHT = 'right',
    LEFT = 'left',
    ACTIVE = 'active',
    ONE = 'one',
    TWO = 'two',
    THREE = 'three'
}

// Event types
export enum EventTypes {
    DOC_CHANGED = 'workspace/onDidChangeTextDocument',
    EDITOR_CHANGED = 'window/onDidChangeActiveTextEditor',
    CONFIG_CHANGED = 'workspace/onDidChangeConfiguration'
}

// Cache configuration
export interface CacheConfig {
    ttl: number;
    maxSize: number;
    enabled: boolean;
}

// Performance thresholds
export interface PerformanceThresholds {
    maxFileSize: number; // in bytes
    maxCodeLenses: number;
    debounceDelay: number;
}

// Mermaid configuration
export interface MermaidConfig {
    startOnLoad: boolean;
    theme: string;
    themeVariables: {
        primaryColor: string;
        primaryTextColor: string;
        primaryBorderColor: string;
        lineColor: string;
        secondaryColor: string;
        tertiaryColor: string;
    };
    fontFamily: string;
    fontSize: number;
    securityLevel: string;
}

// Export formats
export enum ExportFormat {
    SVG = 'svg',
    PNG = 'png'
}

// Error types
export enum ErrorType {
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    SYNTAX_ERROR = 'SYNTAX_ERROR',
    RENDER_ERROR = 'RENDER_ERROR',
    CONFIG_ERROR = 'CONFIG_ERROR'
}

// Service lifecycle states
export enum ServiceState {
    UNINITIALIZED = 'UNINITIALIZED',
    INITIALIZING = 'INITIALIZING',
    ACTIVE = 'ACTIVE',
    DEACTIVATING = 'DEACTIVATING',
    DISPOSED = 'DISPOSED'
}
