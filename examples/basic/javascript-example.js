/**
 * 用户管理模块
 * [MermaidChart:class-diagram.mmd]
 *
 * 提供用户注册、登录和管理功能
 */

// [MermaidChart:../architecture/system-design.mmd] 系统架构设计
class UserManager {
    constructor() {
        // [MermaidChart:../architecture/database-schema.mmd] 数据库结构
        this.users = new Map();
        // [MermaidChart:../workflow/code-review.mmd] 代码审查流程
    }

    /**
     * 密码加密函数
     * [MermaidChart:../advanced/state-machine.mmd]
     *
     * @param {string} password - 明文密码
     * @returns {string} 加密后的密码
     */
    hashPassword(password) {
        // 简单的加密演示，实际应用中应使用更安全的算法
        return btoa(password + 'salt');
    }

    /**
     * 用户注册方法
     * [MermaidChart:flowchart.mmd]
     *
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {boolean} 注册是否成功
     */
    registerUser(username, password) {
        // [MermaidChart:../workflow/ci-cd-pipeline.mmd] 注册流程
        if (this.users.has(username)) {
            return false;
        }

        this.users.set(username, this.hashPassword(password));
        return true;
    }

    /**
     * 用户认证
     * [MermaidChart:sequence.mmd]
     *
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {boolean} 认证是否成功
     */
    authenticate(username, password) {
        // [MermaidChart:../advanced/microservices.mmd] 微服务认证
        if (!this.users.has(username)) {
            return false;
        }

        const storedHash = this.users.get(username);
        return storedHash === this.hashPassword(password);
    }
}

// [MermaidChart:../workflow/index.mmd] 示例导航
function main() {
    const manager = new UserManager();

    // 注册新用户
    // [MermaidChart:../basic/flowchart.mmd] 执行流程
    const success = manager.registerUser('alice', 'password123');
    console.log(`Registration successful: ${success}`);

    // 用户认证
    const authResult = manager.authenticate('alice', 'password123');
    console.log(`Authentication successful: ${authResult}`);
}

// 导出模块
/* [MermaidChart:../architecture/database-schema.mmd] 数据库导出配置 */
module.exports = { UserManager, main };