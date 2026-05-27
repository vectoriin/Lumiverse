/**
 * Applies Chinese translations to registry-generated en locale files.
 * Run after generate-registry-locales.ts
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const root = join(import.meta.dir, '..')

const drawerZh: Record<string, Partial<Record<string, string>>> = {
  profile: { shortName: '档案', tabName: '角色档案', tabDescription: '查看并编辑当前角色' },
  presets: { shortName: '推理', tabName: '推理', tabDescription: '配置推理、思维链与提示词行为', tabHeaderTitle: '推理' },
  loom: { shortName: '织机', tabName: '织机', tabDescription: '配置叙事结构与故事节拍' },
  'dream-weaver': { shortName: '梦境', tabName: '梦境编织', tabDescription: '从想象中创建角色' },
  connections: { shortName: '连接', tabName: '连接', tabDescription: '管理 API 连接与提供商', tabHeaderTitle: '连接' },
  browser: { shortName: '浏览', tabName: '内容包浏览器', tabDescription: '浏览并管理内容包', tabHeaderTitle: '浏览器' },
  characters: { shortName: '角色', tabName: '角色', tabDescription: '浏览并管理角色卡', tabHeaderTitle: '角色' },
  personas: { shortName: '人设', tabName: '人设', tabDescription: '管理用户人设' },
  lorebook: { shortName: '世界书', tabName: '世界书', tabDescription: '编辑世界书条目', tabHeaderTitle: '世界书' },
  cortex: { shortName: '记忆', tabName: '记忆皮层', tabDescription: '查看并管理记忆皮层条目', tabHeaderTitle: '记忆' },
  databank: { shortName: '数据', tabName: '资料库', tabDescription: '上传并管理 AI 上下文参考文档', tabHeaderTitle: '资料库' },
  create: { shortName: '创作', tabName: '创作者工坊', tabDescription: '创建并编辑 Lumia 与 Loom 预设', tabHeaderTitle: '创作' },
  ooc: { shortName: 'OOC', tabName: 'OOC', tabDescription: '角色外评论显示设置' },
  prompt: { shortName: '编排', tabName: '编排', tabDescription: '选择 Lumia、Loom、主权之手与上下文过滤', tabHeaderTitle: '编排' },
  council: { shortName: '议会', tabName: '议会', tabDescription: '配置 Lumia 议会与工具函数' },
  summary: { shortName: '摘要', tabName: '摘要', tabDescription: '配置上下文摘要与截断' },
  feedback: { shortName: '反馈', tabName: '议会反馈', tabDescription: '查看最新议会执行结果', tabHeaderTitle: '反馈' },
  worldinfo: { shortName: 'WI', tabName: '世界信息', tabDescription: '查看当前激活的世界信息条目', tabHeaderTitle: '世界信息' },
  imagegen: { shortName: '生图', tabName: '图像生成', tabDescription: '配置并控制 AI 场景生成', tabHeaderTitle: '图像生成' },
  wallpaper: { shortName: '壁纸', tabName: '壁纸', tabDescription: '设置全局或单聊背景壁纸' },
  regex: { shortName: '正则', tabName: '正则脚本', tabDescription: '创建并管理正则查找替换脚本', tabHeaderTitle: '正则' },
  branches: { shortName: '分支', tabName: '分支树', tabDescription: '查看并导航聊天分支历史', tabHeaderTitle: '分支' },
  theme: { shortName: '主题', tabName: '主题', tabDescription: '自定义颜色、强调色与视觉风格' },
  spindle: { shortName: '扩展', tabName: '扩展', tabDescription: '管理 Spindle 扩展', tabHeaderTitle: '扩展' },
}

const settingsZh: Record<string, Partial<Record<string, string>>> = {
  account: { shortName: '账户', tabName: '账户设置', tabDescription: '管理账户详情与密码' },
  display: { shortName: '显示', tabName: '显示与布局', tabDescription: '面板宽度、侧栏位置与布局选项' },
  chat: { shortName: '聊天', tabName: '聊天行为', tabDescription: '消息显示模式、发送键与聊天选项' },
  extensions: { shortName: '扩展', tabName: '扩展设置', tabDescription: '管理 Spindle 扩展配置' },
  guided: { shortName: '引导生成', tabName: '引导生成', tabDescription: '配置引导生成序列与提示词偏置' },
  quickReplies: { shortName: '快捷回复', tabName: '快捷回复', tabDescription: '管理快捷回复集与消息快捷键' },
  extensionPools: { shortName: '扩展池', tabName: '扩展池', tabDescription: '配置扩展资源池限制' },
  webSearch: { shortName: '网页搜索', tabName: '网页搜索', tabDescription: '配置议会工具使用的 SearXNG 网页搜索' },
  embeddings: { shortName: '嵌入', tabName: '嵌入', tabDescription: '配置嵌入模型与向量存储' },
  memoryCortex: { shortName: '记忆皮层', tabName: '记忆皮层设置', tabDescription: '配置记忆皮层提取与显著性' },
  notifications: { shortName: '通知', tabName: '通知', tabDescription: '配置通知偏好与提醒' },
  voice: { shortName: '语音', tabName: '语音与朗读', tabDescription: '文字转语音、语音转文字与语音设置' },
  mcpServers: { shortName: 'MCP', tabName: 'MCP 服务器', tabDescription: '连接外部 MCP 工具服务器以进行函数调用' },
  advanced: { shortName: '高级', tabName: '高级设置', tabDescription: '高级配置与调试选项' },
  lumihub: { shortName: 'LumiHub', tabName: 'LumiHub', tabDescription: 'LumiHub 云同步与分享设置' },
  dataPortability: { shortName: '数据', tabName: '数据可移植性', tabDescription: '导出数据或导入先前导出的归档' },
  diagnostics: { shortName: '诊断', tabName: '诊断', tabDescription: '系统健康、性能指标与调试信息' },
  operator: { shortName: '运维', tabName: '运维面板', tabDescription: '服务器管理、更新与重启控制' },
  tokenizers: { shortName: '分词器', tabName: '分词器管理', tabDescription: '管理并测试分词器配置' },
  users: { shortName: '用户', tabName: '用户管理', tabDescription: '管理用户账户、角色与权限' },
  migration: { shortName: '迁移', tabName: '迁移', tabDescription: '从 SillyTavern 等来源导入数据' },
}

function mergeDrawer(en: any) {
  const zh = structuredClone(en)
  for (const [id, fields] of Object.entries(drawerZh)) {
    if (zh.drawer[id]) Object.assign(zh.drawer[id], fields)
  }
  zh.connections = {
    imageGeneration: '图像生成',
    speechToText: '语音转文字',
    textToSpeech: '文字转语音',
  }
  zh.group = '群组'
  return zh
}

function mergeSettings(en: any) {
  const zh = structuredClone(en)
  zh.selectCategory = '请选择设置类别'
  for (const [id, fields] of Object.entries(settingsZh)) {
    if (zh.tabs[id]) Object.assign(zh.tabs[id], fields)
  }
  zh.display = {
    modalWidth: {
      title: '弹窗宽度',
      helper: '限制所有弹窗的最大宽度，影响设置、编辑器及其他浮层面板。',
      full: '全宽',
      comfortable: '舒适',
      compact: '紧凑',
      custom: '自定义',
      maxWidth: '最大宽度 (px)',
    },
    drawer: {
      title: '抽屉',
      side: '抽屉位置',
      left: '左侧',
      right: '右侧',
      tabPosition: '标签位置',
    },
  }
  return zh
}

function mergeCommands(en: any) {
  const zh = structuredClone(en)
  zh.groups = { actions: '操作', panels: '面板', settings: '设置', extensions: '扩展' }
  zh.palette = {
    search: '搜索命令…',
    clear: '清除搜索',
    aria: '命令面板',
    noResults: '没有与「{{query}}」匹配的结果',
    listAria: '命令',
  }
  zh.confirm = {
    forkChat: { title: '分叉聊天', message: '从最新消息创建新分支？', confirm: '分叉' },
    deleteChat: { title: '删除聊天', message: '永久删除此对话？', confirm: '删除' },
  }
  zh.toast = {
    failedRegenerate: '重新生成失败',
    failedContinue: '继续生成失败',
    importedCharacter: '已导入 {{name}}',
    failedImportCharacter: '导入角色失败',
    failedForkChat: '分叉聊天失败',
    copiedToClipboard: '已复制到剪贴板',
    failedCopy: '复制失败',
    messageDeleted: '消息已删除',
    failedDeleteMessage: '删除消息失败',
    messageHidden: '消息已从 AI 上下文中隐藏',
    messageVisible: '消息已对 AI 上下文可见',
    failedUpdateMessage: '更新消息失败',
    dryRunFailed: '试运行失败',
    duplicatedCharacter: '已复制 {{name}}',
    failedDuplicateCharacter: '复制角色失败',
    chatDeleted: '聊天已删除',
    failedDeleteChat: '删除聊天失败',
  }
  zh.misc = { groupChat: '群聊', character: '角色' }

  const actionZh: Record<string, { label: string; description: string }> = {
    'action-regenerate': { label: '重新生成回复', description: '删除上一条 AI 回复并生成新的' },
    'action-continue': { label: '继续生成', description: '让 AI 继续上一条回复' },
    'action-new-chat': { label: '新聊天', description: '前往主页开始新对话' },
    'action-character-browser': { label: '浏览角色', description: '打开完整角色库' },
    'action-import-character': { label: '导入角色', description: '上传角色卡 (.png, .charx, .jpg, .json)' },
    'action-new-chat-same-character': { label: '新聊天（同角色）', description: '与当前角色开始全新对话' },
    'action-fork-chat': { label: '分叉聊天', description: '在最新消息处分支当前聊天' },
    'action-manage-chats': { label: '管理聊天', description: '打开当前角色的聊天管理器' },
    'action-copy-last-message': { label: '复制上一条消息', description: '将最近一条消息复制到剪贴板' },
    'action-delete-last-message': { label: '删除上一条消息', description: '从此聊天中移除最近一条消息' },
    'action-toggle-hidden-last': { label: '切换隐藏上一条消息', description: '在 AI 上下文中显示或隐藏最近一条消息' },
    'action-dry-run': { label: '预览提示词', description: '试运行以查看组装的提示词与 token 数' },
    'action-edit-character': { label: '编辑角色', description: '打开当前角色的编辑器' },
    'action-duplicate-character': { label: '复制角色', description: '创建当前角色的副本' },
    'action-toggle-portrait': { label: '切换立绘面板', description: '显示或隐藏角色立绘侧栏' },
    'action-delete-chat': { label: '删除聊天', description: '永久删除此对话' },
  }

  for (const [id, fields] of Object.entries(actionZh)) {
    if (zh.items[id]) zh.items[id] = fields
  }

  for (const [id, fields] of Object.entries(drawerZh)) {
    const key = `panel-${id}`
    if (zh.items[key] && fields.tabName) {
      zh.items[key] = {
        label: fields.tabName,
        description: fields.tabDescription || zh.items[key].description,
      }
    }
  }
  for (const [id, fields] of Object.entries(settingsZh)) {
    const key = `settings-${id}`
    if (zh.items[key] && fields.tabName) {
      zh.items[key] = {
        label: fields.tabName,
        description: fields.tabDescription || zh.items[key].description,
      }
    }
  }

  return zh
}

const enPanels = JSON.parse(readFileSync(join(root, 'src/locales/en/panels.json'), 'utf8'))
const enSettings = JSON.parse(readFileSync(join(root, 'src/locales/en/settings.json'), 'utf8'))
const enCommands = JSON.parse(readFileSync(join(root, 'src/locales/en/commands.json'), 'utf8'))

writeFileSync(join(root, 'src/locales/zh/panels.json'), JSON.stringify(mergeDrawer(enPanels), null, 2))
writeFileSync(join(root, 'src/locales/zh/settings.json'), JSON.stringify(mergeSettings(enSettings), null, 2))
writeFileSync(join(root, 'src/locales/zh/commands.json'), JSON.stringify(mergeCommands(enCommands), null, 2))

console.log('zh registry locales written')
