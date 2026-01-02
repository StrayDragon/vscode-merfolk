#!/usr/bin/env node
/**
 * 确保 merfolk-editor 的 standalone 产物就绪，并复制到 assets/merfolk-editor
 * 使用场景：pnpm run package / compile / vscode:prepublish
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function log(msg) {
    console.log(`[prepare-merfolk-editor] ${msg}`);
}

function resolveMerfolkEditor() {
    try {
        const pkg = require.resolve('merfolk-editor/package.json', { paths: [process.cwd()] });
        return path.dirname(pkg);
    } catch {
        return null;
    }
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyDir(src, dest) {
    ensureDir(dest);
    fs.rmSync(dest, { recursive: true, force: true });
    fs.mkdirSync(dest, { recursive: true });
    // Node.js 16+ 提供 fs.cp
    if (fs.cp) {
        fs.cpSync(src, dest, { recursive: true });
    } else {
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
            const from = path.join(src, entry.name);
            const to = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                copyDir(from, to);
            } else {
                fs.copyFileSync(from, to);
            }
        }
    }
}

function main() {
    const pkgRoot = resolveMerfolkEditor();
    if (!pkgRoot) {
        log('未安装 merfolk-editor（devDependency），跳过生成 standalone 资源');
        return;
    }

    const standaloneDir = path.join(pkgRoot, 'dist', 'standalone');
    if (!fs.existsSync(standaloneDir)) {
        log('未找到 dist/standalone，尝试执行 build:standalone...');
        const result = spawnSync('pnpm', ['run', 'build:standalone', '--dir', pkgRoot], {
            stdio: 'inherit',
            env: process.env
        });
        if (result.status !== 0) {
            throw new Error('构建 merfolk-editor standalone 失败');
        }
    } else {
        log('检测到现有 dist/standalone，跳过构建');
    }

    const target = path.join(process.cwd(), 'assets', 'merfolk-editor');
    copyDir(standaloneDir, target);
    log(`已复制 standalone 资源到 ${target}`);
}

main();
