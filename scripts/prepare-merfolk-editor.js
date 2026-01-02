#!/usr/bin/env node
/**
 * 确保 merfolk-editor 的 standalone 产物就绪，并复制到 assets/merfolk-editor
 * 优先级：
 * 1) 已存在 assets/merfolk-editor → 直接跳过
 * 2) node_modules/merfolk-editor/dist/standalone → 复制（必要时尝试 build:standalone）
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

async function main() {
    const target = path.join(process.cwd(), 'assets', 'merfolk-editor');
    if (fs.existsSync(path.join(target, 'merfolk-editor.iife.js'))) {
        log('assets/merfolk-editor 已存在，跳过');
        return;
    }

    // 2) node_modules 复制
    const pkgRoot = resolveMerfolkEditor();
    if (pkgRoot) {
        const standaloneDir = path.join(pkgRoot, 'dist', 'standalone');
        if (fs.existsSync(standaloneDir)) {
            log('检测到 node_modules/merfolk-editor/dist/standalone，开始复制...');
            copyDir(standaloneDir, target);
            log(`已复制到 ${target}`);
            return;
        }
        log('未找到 dist/standalone，请使用内置产物的 merfolk-editor 版本（发布时应自带 dist/standalone）。');
    }

    throw new Error('未找到 merfolk-editor standalone。请安装包含 dist/standalone 的 merfolk-editor 版本，或手动提供 assets/merfolk-editor。');
}

main().catch(err => {
    console.error(`[prepare-merfolk-editor] 错误: ${err.message}`);
    process.exit(1);
});
