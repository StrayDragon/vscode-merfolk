import * as vscode from 'vscode';
import { DIContainer } from './core/container';
import { CommandProvider } from './providers/commandProvider';
import { ActivationProvider } from './providers/activationProvider';
import { PreviewService } from './services/previewService';
import { CodeLensService } from './services/codeLensService';
import { FileService } from './services/fileService';
import { ConfigService } from './services/configService';

/**
 * Refactored extension entry point using IoC container
 * This demonstrates the modular architecture with dependency injection
 */

// Global container instance
let container: DIContainer;

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Initializing Merfolk extension with IoC container...');

    // Create and configure the IoC container
    container = new DIContainer(context);

    // Register all services
    registerServices(container);

    // Register all providers
    registerProviders(container);

    // Activate the extension
    const activationProvider = container.resolve<ActivationProvider>('ActivationProvider');
    activationProvider.onActivate(context);

    console.log('Merfolk extension initialized successfully!');
}

/**
 * Register all services with the IoC container
 */
function registerServices(container: DIContainer): void {
    // Core services
    container.registerSingleton('FileService', (c) => new FileService(c));
    container.registerSingleton('ConfigService', (c) => new ConfigService(c));

    // Feature services
    container.registerSingleton('PreviewService', (c) => new PreviewService(c));
    container.registerSingleton('CodeLensService', (c) => new CodeLensService(c));
}

/**
 * Register all providers with the IoC container
 */
function registerProviders(container: DIContainer): void {
    container.registerSingleton('CommandProvider', (c) => new CommandProvider(c));
    container.registerSingleton('ActivationProvider', (c) => new ActivationProvider(c));

    // Register commands after providers are set up
    const commandProvider = container.resolve<CommandProvider>('CommandProvider');
    commandProvider.registerCommands(container.getContext()!);
}

/**
 * Deactivate the extension
 */
export function deactivate() {
    console.log('Deactivating Merfolk extension...');

    if (container) {
        // Dispose of all services
        const tokens = container.getTokens();
        tokens.forEach(token => {
            try {
                const service = container.resolve<any>(token);
                if (service && typeof service.dispose === 'function') {
                    service.dispose();
                }
            } catch (error) {
                console.error(`Error disposing service ${token}:`, error);
            }
        });

        // Clear the container
        container.clear();
    }

    console.log('Merfolk extension deactivated.');
}
