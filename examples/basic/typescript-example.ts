/**
 * 用户管理模块
 * [MermaidChart:class-diagram.mmd]
 *
 * 提供用户注册、登录和管理功能
 */

// [MermaidChart:../architecture/system-design.mmd] 系统架构设计
interface User {
    id: string;
    username: string;
    passwordHash: string;
    createdAt: Date;
}

// [MermaidChart:../architecture/database-schema.mmd] 数据库结构
interface UserDatabase {
    users: Map<string, User>;
}

/**
 * 用户管理类
 * [MermaidChart:sequence.mmd]
 */
class UserManager {
    private database: UserDatabase;
    // [MermaidChart:../workflow/code-review.mmd] 代码审查流程

    /**
     * 构造函数
     * [MermaidChart:flowchart.mmd]
     */
    constructor() {
        this.database = {
            users: new Map(),
        };
    }

    /**
     * 密码加密函数
     * [MermaidChart:../advanced/state-machine.mmd]
     *
     * @param password 明文密码
     * @returns 加密后的密码
     */
    private hashPassword(password: string): string {
        // 简单的加密演示
        return btoa(password + 'salt');
    }

    /**
     * 生成唯一ID
     * [MermaidChart:../workflow/ci-cd-pipeline.mmd]
     *
     * @returns 唯一标识符
     */
    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 用户注册方法
     * [MermaidChart:../basic/flowchart.mmd]
     *
     * @param username 用户名
     * @param password 密码
     * @returns Promise<User> 用户信息
     */
    public async registerUser(username: string, password: string): Promise<User> {
        if (this.database.users.has(username)) {
            throw new Error('User already exists');
        }

        const user: User = {
            id: this.generateId(),
            username,
            passwordHash: this.hashPassword(password),
            createdAt: new Date(),
        };

        this.database.users.set(username, user);
        return user;
    }

    /**
     * 用户认证
     * [MermaidChart:../advanced/microservices.mmd]
     *
     * @param username 用户名
     * @param password 密码
     * @returns Promise<boolean> 认证结果
     */
    public async authenticate(username: string, password: string): Promise<boolean> {
        const user = this.database.users.get(username);
        if (!user) {
            return false;
        }

        return user.passwordHash === this.hashPassword(password);
    }

    /**
     * 获取用户信息
     * [MermaidChart:../workflow/index.mmd]
     *
     * @param username 用户名
     * @returns User | null 用户信息
     */
    public getUser(username: string): User | null {
        return this.database.users.get(username) || null;
    }

    /**
     * 获取所有用户
     * [MermaidChart:../architecture/database-schema.mmd]
     *
     * @returns User[] 用户列表
     */
    public getAllUsers(): User[] {
        return Array.from(this.database.users.values());
    }
}

// [MermaidChart:../workflow/ci-cd-pipeline.mmd] 示例执行
async function main(): Promise<void> {
    const manager = new UserManager();

    try {
        // 注册新用户
        const user = await manager.registerUser('alice', 'password123');
        console.log('Registration successful:', user);

        // 用户认证
        const authResult = await manager.authenticate('alice', 'password123');
        console.log('Authentication successful:', authResult);

        // 获取所有用户
        // [MermaidChart:../basic/flowchart.mmd] 查看流程
        const allUsers = manager.getAllUsers();
        console.log('Current users:', allUsers);
    } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : String(error));
    }
}

// [MermaidChart:../workflow/index.mmd] 示例导航
export { UserManager, User, main };

// [MermaidChart:../architecture/system-design.mmd] 模块导出
if (require.main === module) {
    main();
}