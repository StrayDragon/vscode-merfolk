# Justfile for vscode-merfolk

# Package the extension as a VSIX file
package-vsix:
    #!/usr/bin/env bash
    set -e

    echo "📦 Packaging vscode-merfolk extension as VSIX..."

    # Install dependencies
    echo "📥 Installing dependencies..."
    pnpm install

    # Compile TypeScript
    echo "🔨 Compiling TypeScript..."
    pnpm run compile

    # Check if vsce is installed, if not install it
    if ! command -v vsce &> /dev/null; then
        echo "📥 Installing vsce (Visual Studio Code Extension Manager)..."
        pnpm add -g vsce
    fi

    # Package the extension
    echo "📦 Creating VSIX package..."
    vsce package

    echo "✅ VSIX package created successfully!"

    # List the created VSIX file
    ls -la *.vsix 2>/dev/null || echo "No VSIX file found in current directory"