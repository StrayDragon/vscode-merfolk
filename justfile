# Justfile for vscode-merfolk

# Install dependencies
install:
    #!/usr/bin/env bash
    set -e
    echo "📥 Installing dependencies..."
    pnpm install

# Lint and check types
lint:
    #!/usr/bin/env bash
    set -e
    echo "🔍 Running linting and type checking..."
    pnpm run lint
    pnpm run check-types

# Build the extension
build:
    #!/usr/bin/env bash
    set -e
    echo "🔨 Building extension..."
    pnpm run package

# Package the extension as a VSIX file
package-vsix:
    #!/usr/bin/env bash
    set -e
    echo "📦 Packaging vscode-merfolk extension as VSIX..."

    # Package the extension with a consistent name (no version in filename)
    echo "📦 Creating VSIX package..."
    npx vsce package --out vscode-merfolk.vsix

    echo "✅ VSIX package created successfully!"

    # List the created VSIX file
    ls -la vscode-merfolk.vsix 2>/dev/null || echo "No VSIX file found in current directory"

# Run tests (placeholder for future test implementation)
test:
    #!/usr/bin/env bash
    set -e
    echo "🧪 Running tests..."
    echo "Tests not implemented yet"
    # pnpm run test
