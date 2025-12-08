/*
用户管理模块
[MermaidChart:class-diagram.mmd]

提供用户注册、登录和管理功能
*/

package main

import (
	"fmt"
	"sync"
)

// [MermaidChart:../architecture/system-design.mmd] 系统架构设计
type UserManager struct {
	// [MermaidChart:../architecture/database-schema.mmd] 数据库结构
	users map[string]string
	mu    sync.RWMutex
	// [MermaidChart:../workflow/code-review.mmd] 代码审查流程
}

// NewUserManager 创建新的用户管理器
// [MermaidChart:flowchart.mmd]
func NewUserManager() *UserManager {
	return &UserManager{
		users: make(map[string]string),
	}
}

// hashPassword 密码加密函数
// [MermaidChart:../advanced/state-machine.mmd]
func (um *UserManager) hashPassword(password string) string {
	// 简单的加密演示
	return password + "_hashed"
}

// RegisterUser 用户注册方法
// [MermaidChart:sequence.mmd]
func (um *UserManager) RegisterUser(username, password string) (bool, error) {
	// [MermaidChart:../workflow/ci-cd-pipeline.mmd] 注册流程
	um.mu.Lock()
	defer um.mu.Unlock()

	if _, exists := um.users[username]; exists {
		return false, fmt.Errorf("user already exists")
	}

	hashedPassword := um.hashPassword(password)
	um.users[username] = hashedPassword
	return true, nil
}

// Authenticate 用户认证
// [MermaidChart:../advanced/microservices.mmd]
func (um *UserManager) Authenticate(username, password string) bool {
	um.mu.RLock()
	defer um.mu.RUnlock()

	storedHash, exists := um.users[username]
	if !exists {
		return false
	}

	return storedHash == um.hashPassword(password)
}

// GetUsers 获取所有用户（用于调试）
// [MermaidChart:../workflow/index.mmd]
func (um *UserManager) GetUsers() map[string]string {
	um.mu.RLock()
	defer um.mu.RUnlock()

	usersCopy := make(map[string]string)
	for k, v := range um.users {
		usersCopy[k] = v
	}
	return usersCopy
}

// main 主函数示例
// [MermaidChart:../basic/flowchart.mmd]
func main() {
	manager := NewUserManager()

	// 注册新用户
	// [MermaidChart:../workflow/ci-cd-pipeline.mmd] 示例执行
	success, err := manager.RegisterUser("alice", "password123")
	if err != nil {
		fmt.Printf("Registration failed: %v\n", err)
	} else {
		fmt.Printf("Registration successful: %v\n", success)
	}

	// 用户认证
	authResult := manager.Authenticate("alice", "password123")
	fmt.Printf("Authentication successful: %v\n", authResult)

	// 打印所有用户
	// [MermaidChart:../architecture/database-schema.mmd] 数据库查看
	users := manager.GetUsers()
	fmt.Printf("Current users: %v\n", users)
}