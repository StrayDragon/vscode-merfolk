import * as vscode from 'vscode';

/**
 * IoC (Inversion of Control) Container for dependency injection
 * Manages service registration and resolution
 */
export class DIContainer {
    private services = new Map<string, ServiceRegistration>();
    private singletons = new Map<string, any>();
    private context: vscode.ExtensionContext | undefined;

    constructor(context?: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Register a service implementation
     */
    public register<T>(token: string, implementation: ServiceImplementation<T>): DIContainer {
        this.services.set(token, {
            implementation,
            singleton: false,
            instance: undefined
        });
        return this;
    }

    /**
     * Register a singleton service
     */
    public registerSingleton<T>(token: string, implementation: ServiceImplementation<T>): DIContainer {
        this.services.set(token, {
            implementation,
            singleton: true,
            instance: undefined
        });
        return this;
    }

    /**
     * Resolve a service by token
     */
    public resolve<T>(token: string): T {
        const registration = this.services.get(token);

        if (!registration) {
            throw new Error(`Service not registered: ${token}`);
        }

        // Return cached singleton if available
        if (registration.singleton && registration.instance) {
            return registration.instance;
        }

        // Create new instance
        const instance = registration.implementation(this);

        // Cache singleton if needed
        if (registration.singleton) {
            registration.instance = instance;
            this.singletons.set(token, instance);
        }

        return instance;
    }

    /**
     * Check if a service is registered
     */
    public has(token: string): boolean {
        return this.services.has(token);
    }

    /**
     * Get all registered service tokens
     */
    public getTokens(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Clear all registrations and instances
     */
    public clear(): void {
        this.services.clear();
        this.singletons.clear();
    }

    /**
     * Get the extension context
     */
    public getContext(): vscode.ExtensionContext | undefined {
        return this.context;
    }
}

/**
 * Service registration configuration
 */
interface ServiceRegistration {
    implementation: ServiceImplementation<any>;
    singleton: boolean;
    instance?: any;
}

/**
 * Service implementation function
 */
export type ServiceImplementation<T> = (container: DIContainer) => T;

/**
 * Service token for typing
 */
export abstract class ServiceToken<T = any> {
    constructor(public readonly name: string) {}

    toString(): string {
        return `ServiceToken(${this.name})`;
    }
}

/**
 * Common service tokens
 */
export class PreviewServiceToken extends ServiceToken {}
export class InlinePreviewServiceToken extends ServiceToken {}
export class CodeLensServiceToken extends ServiceToken {}
export class FileServiceToken extends ServiceToken {}
export class CommandProviderToken extends ServiceToken {}
export class ActivationProviderToken extends ServiceToken {}
export class ConfigProviderToken extends ServiceToken {}
