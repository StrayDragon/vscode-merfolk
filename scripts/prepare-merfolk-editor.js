#!/usr/bin/env node
/**
 * 确保 merfolk-editor 的 standalone 产物就绪，并复制到 assets/merfolk-editor
 * 优先级：
 * 1) 已存在 assets/merfolk-editor → 直接跳过
 * 2) node_modules/merfolk-editor/dist/standalone → 复制
 * 3) 下载 GitHub Release 资产（可通过 MERFOLK_EDITOR_ASSET_URL 覆盖）
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');
const os = require('os');

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

function downloadRelease(url, destZip) {
    return new Promise((resolve, reject) => {
        log(`尝试从 ${url} 下载 merfolk-editor standalone...`);
        const file = fs.createWriteStream(destZip);
        https.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`下载失败，HTTP ${res.statusCode}`));
                return;
            }
            res.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

function unzip(zipPath, targetDir) {
    // 依赖系统 unzip/tar，避免引入额外包
    const isZip = zipPath.endsWith('.zip');
    const args = isZip ? ['-qo', zipPath, '-d', targetDir] : ['-xzf', zipPath, '-C', targetDir];
    const bin = isZip ? 'unzip' : 'tar';
    const result = spawnSync(bin, args, { stdio: 'inherit' });
    if (result.status !== 0) {
        throw new Error(`${bin} 解压失败`);
    }
}

async function prepareFromRelease(targetDir) {
    const assetUrl = process.env.MERFOLK_EDITOR_ASSET_URL
        || 'https://github.com/StrayDragon/merfolk-editor/releases/latest/download/merfolk-editor-standalone.zip';

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'merfolk-editor-'));
    const zipPath = path.join(tmp, path.basename(assetUrl));
    try {
        await downloadRelease(assetUrl, zipPath);
        ensureDir(targetDir);
        fs.rmSync(targetDir, { recursive: true, force: true });
        fs.mkdirSync(targetDir, { recursive: true });
        unzip(zipPath, targetDir);
        log(`已从 Release 资产解压到 ${targetDir}`);
        return true;
    } catch (err) {
        log(`从 Release 下载失败：${err.message}`);
        return false;
    } finally {
        fs.rmSync(path.dirname(zipPath), { recursive: true, force: true });
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
    }

    // 3) 下载 Release 资产
    const ok = await prepareFromRelease(target);
    if (ok) return;

    throw new Error('未找到 merfolk-editor standalone。请安装 devDependency 并构建，或设置 MERFOLK_EDITOR_ASSET_URL/merfolk.editor.standalonePath。');
}

main().catch(err => {
    console.error(`[prepare-merfolk-editor] 错误: ${err.message}`);
    process.exit(1);
});
