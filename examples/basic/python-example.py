"""
用户管理模块
[MermaidChart:class-diagram.mmd]

这个模块提供了用户管理的核心功能，包括用户注册、登录和信息更新。
"""

import hashlib
from typing import Optional

class UserManager:
    """用户管理类 [MermaidChart:sequence.mmd]"""

    def __init__(self):
        # [MermaidChart:../workflow/code-review.mmd] 代码审查流程
        self.users = {}

    def hash_password(self, password: str) -> str:
        """密码加密函数 [MermaidChart:../advanced/state-machine.mmd]"""
        return hashlib.sha256(password.encode()).hexdigest()

    def register_user(self, username: str, password: str) -> bool:
        """
        用户注册方法
        [MermaidChart:flowchart.mmd]

        Args:
            username: 用户名
            password: 密码

        Returns:
            bool: 注册是否成功
        """
        # [MermaidChart:../architecture/database-schema.mmd] 数据库设计
        if username in self.users:
            return False

        self.users[username] = self.hash_password(password)
        return True

    def authenticate(self, username: str, password: str) -> bool:
        # [MermaidChart:../workflow/ci-cd-pipeline.mmd] 认证流程
        if username not in self.users:
            return False
        return self.users[username] == self.hash_password(password)


# [MermaidChart:../architecture/system-design.mmd] 系统架构
def main():
    """主函数 [MermaidChart:../advanced/microservices.mmd]"""
    manager = UserManager()

    # 注册新用户
    # [MermaidChart:../workflow/index.mmd] 示例导航
    success = manager.register_user("alice", "password123")
    print(f"Registration successful: {success}")

    # 用户认证
    auth_result = manager.authenticate("alice", "password123")
    print(f"Authentication successful: {auth_result}")


if __name__ == "__main__":
    # [MermaidChart:../basic/flowchart.mmd] 执行流程
    main()