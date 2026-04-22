// ============================================================
// Forge Blaze Ignite — 声明式 Jenkins Pipeline
//
// 流水线阶段：
//   1. Checkout   — 拉取代码
//   2. Install    — 安装依赖（带缓存）
//   3. Lint       — ESLint 静态检查
//   4. Typecheck  — TypeScript 类型检查
//   5. Test       — Jest 单元测试
//   6. Coverage   — 覆盖率报告归档（仅 main 分支）
//
// 触发条件：
//   - Git push / PR（由 Multibranch Pipeline 或 Webhook 触发）
//   - 每日定时构建（凌晨 2 点）
// ============================================================

pipeline {
    // ── agent：在哪台机器/容器上运行 ──────────────────────────
    // any：Jenkins 从可用节点中自动选一台
    // 生产推荐：换成 docker { image 'node:20-alpine' } 保证环境隔离
    agent any

    // ── 环境变量 ──────────────────────────────────────────────
    environment {
        // NODE_ENV 影响部分工具的默认行为
        NODE_ENV = 'ci'
        // npm 缓存目录，配合 cache 步骤使用
        NPM_CACHE_DIR = "${WORKSPACE}/.npm-cache"
    }

    // ── 触发器 ────────────────────────────────────────────────
    triggers {
        // 每天凌晨 2 点定时构建（cron 格式：分 时 日 月 周）
        cron('0 2 * * *')
    }

    // ── 构建选项 ──────────────────────────────────────────────
    options {
        // 超时：整条流水线不超过 20 分钟，防止僵死
        timeout(time: 20, unit: 'MINUTES')
        // 保留最近 10 次构建记录
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // 同一分支的构建不并发（避免缓存竞争）
        disableConcurrentBuilds()
        // 控制台输出加时间戳
        timestamps()
    }

    // ── 流水线阶段 ────────────────────────────────────────────
    stages {

        // ── Stage 1：拉取代码 ──────────────────────────────────
        // Jenkins 默认已执行 checkout，此处显式写出便于在多仓库场景中控制
        stage('Checkout') {
            steps {
                checkout scm
                // 打印当前 commit 信息，方便追溯
                sh 'git log --oneline -1'
            }
        }

        // ── Stage 2：安装依赖 ──────────────────────────────────
        // 关键优化：用 --prefer-offline + cache 目录减少网络请求
        stage('Install') {
            steps {
                // 将 npm cache 指向 workspace 内，方便 Jenkins 管理清理
                sh 'npm ci --cache "${NPM_CACHE_DIR}" --prefer-offline'
                // npm ci：比 npm install 更严格——严格按照 package-lock.json，
                // 安装前先删 node_modules，保证 CI 环境干净可复现
            }
        }

        // ── Stage 3：代码规范检查 ──────────────────────────────
        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
            // post：不管成功失败都执行的后处理
            post {
                failure {
                    // lint 失败时给出明确提示，方便开发者定位
                    echo '❌ Lint 检查失败，请运行 npm run lint:fix 修复后重新提交'
                }
            }
        }

        // ── Stage 4：TypeScript 类型检查 ───────────────────────
        // tsc --noEmit：只做类型检查，不输出 JS 文件
        stage('Typecheck') {
            steps {
                sh 'npx tsc --noEmit'
            }
        }

        // ── Stage 5：单元测试 ──────────────────────────────────
        stage('Test') {
            steps {
                // --ci：Jest 的 CI 模式——禁用交互式 watch，测试失败立即退出
                // --runInBand：串行跑，避免 Jenkins agent 资源争用
                // --reporters：同时输出默认报告和 JUnit XML（供 Jenkins 解析）
                sh 'npm test -- --ci --runInBand --reporters=default --reporters=jest-junit'
            }
            post {
                always {
                    // 解析 JUnit XML，Jenkins 展示测试趋势图
                    // jest-junit 会输出到 junit.xml（需安装：npm i -D jest-junit）
                    junit(
                        testResults: 'junit.xml',
                        allowEmptyResults: true
                    )
                }
                failure {
                    echo '❌ 单元测试失败，请检查测试报告'
                }
            }
        }

        // ── Stage 6：覆盖率报告（仅 main 分支运行）────────────
        // when：条件执行，避免 PR 分支也跑一遍耗时的 coverage
        stage('Coverage') {
            when {
                branch 'main'
            }
            steps {
                sh 'npm run test:coverage'
            }
            post {
                always {
                    // 归档 coverage 目录，可在 Jenkins 构建详情页下载
                    archiveArtifacts(
                        artifacts: 'coverage/**',
                        allowEmptyArchive: true
                    )
                    // 如果安装了 HTML Publisher 插件，可展示覆盖率页面
                    publishHTML(target: [
                        allowMissing         : true,
                        alwaysLinkToLastBuild: true,
                        keepAll              : true,
                        reportDir            : 'coverage/lcov-report',
                        reportFiles          : 'index.html',
                        reportName           : 'Coverage Report'
                    ])
                }
            }
        }
    }

    // ── 全局后处理 ────────────────────────────────────────────
    post {
        success {
            echo "✅ Pipeline 通过！Branch: ${env.BRANCH_NAME}  Commit: ${env.GIT_COMMIT?.take(7)}"
        }
        failure {
            echo "❌ Pipeline 失败！请检查上方日志"
            // 生产环境：在此发送钉钉/企微/邮件通知
            // emailext(...)
            // dingtalk(...)
        }
        always {
            // 清理：删除 node_modules 释放磁盘（可选，取决于 agent 磁盘策略）
            // cleanWs()
            echo "构建结束，用时：${currentBuild.durationString}"
        }
    }
}
