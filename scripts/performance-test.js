/**
 * 简单的性能测试脚本
 * 测试 Markdown 解析和缓存性能
 */

const fs = require('fs');
const path = require('path');

// 模拟 VS Code 环境的基本结构
const mockTextDocument = {
    getText: () => content,
    uri: { toString: () => 'test://example.md' },
    fileName: 'test.md',
    lineCount: 100
};

// 生成测试数据
function generateTestMarkdown(numSections = 10, chartsPerSection = 5) {
    let content = '# Performance Test Document\n\n';

    for (let i = 0; i < numSections; i++) {
        content += `## Section ${i + 1}\n\n`;

        for (let j = 0; j < chartsPerSection; j++) {
            content += '```mermaid\n';
            content += `flowchart TD\n`;
            content += `    S${i}${j}[Start${i}-${j}] --> P${i}${j}[Process${i}-${j}]\n`;
            content += `    P${i}${j} --> E${i}${j}[End${i}-${j}]\n`;
            content += '```\n\n';
        }
    }

    return content;
}

// 简单的性能测量函数
function measureTime(fn) {
    const start = Date.now();
    const result = fn();
    const end = Date.now();
    return { result, duration: end - start };
}

// 测试解析性能
function testParsingPerformance() {
    console.log('🚀 Starting Performance Tests...\n');

    // 生成不同大小的测试文档
    const testCases = [
        { sections: 5, chartsPerSection: 2, size: 'Small' },
        { sections: 20, chartsPerSection: 3, size: 'Medium' },
        { sections: 50, chartsPerSection: 5, size: 'Large' }
    ];

    testCases.forEach(({ sections, chartsPerSection, size }) => {
        console.log(`📊 Testing ${size} Document (${sections} sections, ${sections * chartsPerSection} charts):`);

        const content = generateTestMarkdown(sections, chartsPerSection);
        const mockDocument = { ...mockTextDocument, getText: () => content };

        // 测试解析性能
        const { duration: parseDuration } = measureTime(() => {
            // 简单的章节和图表计数
            const lines = content.split('\n');
            let sectionCount = 0;
            let chartCount = 0;
            let inMermaid = false;

            for (const line of lines) {
                if (/^#{1,6}\s+/.test(line)) {
                    sectionCount++;
                } else if (line.trim() === '```mermaid') {
                    inMermaid = true;
                    chartCount++;
                } else if (line.trim() === '```' && inMermaid) {
                    inMermaid = false;
                }
            }

            return { sections: sectionCount, charts: chartCount };
        });

        // 测试章节查找性能
        const { duration: searchDuration } = measureTime(() => {
            const lines = content.split('\n');
            let foundSections = [];

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('Section 3')) {
                    foundSections.push(i);
                    break;
                }
            }

            return foundSections.length > 0;
        });

        // 内存使用估算
        const memoryUsage = Math.round(content.length / 1024); // KB

        console.log(`   - Parse Time: ${parseDuration}ms`);
        console.log(`   - Search Time: ${searchDuration}ms`);
        console.log(`   - Document Size: ${memoryUsage}KB`);
        console.log(`   - Charts per ms: ${Math.round((sections * chartsPerSection) / parseDuration * 100) / 100}`);

        // 性能基准
        const parseOk = parseDuration < 100;
        const searchOk = searchDuration < 10;

        console.log(`   - Status: ${parseOk && searchOk ? '✅ PASS' : '❌ FAIL'}`);

        if (!parseOk) console.log(`     ⚠️  Parse time exceeds 100ms target`);
        if (!searchOk) console.log(`     ⚠️  Search time exceeds 10ms target`);

        console.log('');
    });
}

// 测试缓存性能
function testCachePerformance() {
    console.log('💾 Testing Cache Performance...\n');

    const content = generateTestMarkdown(20, 3);
    const mockDocument = { ...mockTextDocument, getText: () => content };

    // 模拟缓存
    const cache = new Map();

    // 测试缓存命中
    const cacheKey = 'test://example.md';

    console.log('🔍 Cache Test Results:');

    // 第一次访问（缓存未命中）
    const { duration: firstAccess } = measureTime(() => {
        // 模拟解析
        return content.length;
    });

    // 存储到缓存
    cache.set(cacheKey, {
        content: content.length,
        timestamp: Date.now()
    });

    // 第二次访问（缓存命中）
    const { duration: secondAccess } = measureTime(() => {
        // 模拟缓存命中
        return cache.get(cacheKey)?.content;
    });

    const speedup = Math.round((firstAccess / secondAccess) * 100) / 100;

    console.log(`   - First Access (cache miss): ${firstAccess}ms`);
    console.log(`   - Second Access (cache hit): ${secondAccess}ms`);
    console.log(`   - Speedup: ${speedup}x`);
    console.log(`   - Status: speedup > 10 ? ${speedup > 10 ? '✅ PASS' : '❌ FAIL'}`);

    if (speedup <= 10) {
        console.log(`     ⚠️  Cache speedup should be > 10x`);
    }

    console.log('');
}

// 测试正则表达式性能
function testRegexPerformance() {
    console.log('🔍 Testing Regex Performance...\n');

    const testLinks = [
        '[MermaidChart:test.md]',
        '[MermaidChart:test.md#section]',
        '[MermaidChart:test.md#section:2]',
        '[MermaidChart:test.md:3]'
    ];

    const testContent = testLinks.join('\n').repeat(1000); // 4000 links

    const regex = /\[MermaidChart:\s*([^\]]+\.(md|mmd|mermaid))(?:#([^:]+))?(?::(\d+))?\s*\]/gi;

    console.log('📝 Regex Test Results:');

    const { duration: regexDuration, result: matches } = measureTime(() => {
        let match;
        const results = [];

        while ((match = regex.exec(testContent)) !== null) {
            results.push({
                file: match[1],
                section: match[2],
                index: match[3]
            });
        }

        return results;
    });

    const linksPerMs = Math.round((matches.length / regexDuration) * 100) / 100;
    const timePerLink = Math.round((regexDuration / matches.length) * 1000) / 1000;

    console.log(`   - Total Links: ${matches.length}`);
    console.log(`   - Processing Time: ${regexDuration}ms`);
    console.log(`   - Links per ms: ${linksPerMs}`);
    console.log(`   - Time per link: ${timePerLink}ms`);
    console.log(`   - Status: timePerLink < 0.1 ? ${timePerLink < 0.1 ? '✅ PASS' : '❌ FAIL'}`);

    if (timePerLink >= 0.1) {
        console.log(`     ⚠️  Regex processing should be < 0.1ms per link`);
    }

    console.log('');
}

// 运行所有测试
function runAllTests() {
    console.log('🎯 Merfolk Extension Performance Tests\n');
    console.log('=' .repeat(50));
    console.log('');

    testParsingPerformance();
    testCachePerformance();
    testRegexPerformance();

    console.log('📋 Test Summary:');
    console.log('   - Parsing performance: Test different document sizes');
    console.log('   - Cache performance: Verify caching speedup > 10x');
    console.log('   - Regex performance: Ensure < 0.1ms per link');
    console.log('');
    console.log('✨ Performance testing complete!');
}

// 如果直接运行此脚本
if (require.main === module) {
    runAllTests();
}

module.exports = {
    generateTestMarkdown,
    testParsingPerformance,
    testCachePerformance,
    testRegexPerformance
};