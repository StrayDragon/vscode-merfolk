//! 用户管理模块
//! [MermaidChart:class-diagram.mmd]
//!
//! 提供用户注册、登录和管理功能

use std::collections::HashMap;

// [MermaidChart:../architecture/system-design.mmd] 系统架构设计
pub struct UserManager {
    // [MermaidChart:../architecture/database-schema.mmd] 数据库结构
    users: HashMap<String, String>,
    // [MermaidChart:../workflow/code-review.mmd] 代码审查流程
}

impl UserManager {
    /// 创建新的用户管理器
    /// [MermaidChart:flowchart.mmd]
    pub fn new() -> Self {
        UserManager {
            users: HashMap::new(),
        }
    }

    /// 密码加密函数
    /// [MermaidChart:../advanced/state-machine.mmd]
    ///
    /// # Arguments
    /// * `password` - 明文密码
    ///
    /// # Returns
    /// * `String` - 加密后的密码
    fn hash_password(&self, password: &str) -> String {
        // 简单的加密演示
        format!("{}{}", password, "_hashed")
    }

    /// 用户注册方法
    /// [MermaidChart:sequence.mmd]
    ///
    /// # Arguments
    /// * `username` - 用户名
    /// * `password` - 密码
    ///
    /// # Returns
    /// * `Result<bool, String>` - 注册结果
    pub fn register_user(&mut self, username: &str, password: &str) -> Result<bool, String> {
        // [MermaidChart:../workflow/ci-cd-pipeline.mmd] 注册流程
        if self.users.contains_key(username) {
            return Err("User already exists".to_string());
        }

        let hashed_password = self.hash_password(password);
        self.users.insert(username.to_string(), hashed_password);
        Ok(true)
    }

    /// 用户认证
    /// [MermaidChart:../advanced/microservices.mmd]
    pub fn authenticate(&self, username: &str, password: &str) -> bool {
        match self.users.get(username) {
            Some(stored_hash) => stored_hash == &self.hash_password(password),
            None => false,
        }
    }
}

/// 主函数示例
/// [MermaidChart:../workflow/index.mmd]
fn main() {
    // [MermaidChart:../basic/flowchart.mmd] 执行流程
    let mut manager = UserManager::new();

    // 注册新用户
    match manager.register_user("alice", "password123") {
        Ok(success) => println!("Registration successful: {}", success),
        Err(e) => println!("Registration failed: {}", e),
    }

    // 用户认证
    let auth_result = manager.authenticate("alice", "password123");
    println!("Authentication successful: {}", auth_result);
}

// [MermaidChart:../architecture/database-schema.mmd] 模块导出
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_registration() {
        // [MermaidChart:../workflow/code-review.mmd] 测试流程
        let mut manager = UserManager::new();
        assert!(manager.register_user("testuser", "testpass").unwrap());
    }
}