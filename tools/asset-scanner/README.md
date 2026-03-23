# asset-scanner

跨模块游戏美术资源重复检测工具。

详细文档请参阅 [docs/asset-scanner.md](../../docs/asset-scanner.md)。

## 快速使用

```bash
# 全量扫描
npx ts-node src/index.ts scan <美术资源根目录>

# 对比新模块
npx ts-node src/index.ts diff <美术资源根目录> <新模块目录>

# JSON 输出（适合 CI 集成）
npx ts-node src/index.ts scan <美术资源根目录> --json
```
