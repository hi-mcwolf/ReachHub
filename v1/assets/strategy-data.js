/* 共享数据：触达策略分类与 DEMO 策略（strategy.html / reach.js / marketing.js 共用） */

const STRATEGY_CATEGORIES = [
  {
    id: 'audience', name: '人群策略', icon: 'users',
    desc: '定义哪些人可以收到消息、哪些人优先触达',
    badge: { text: '3条生效中', type: 'info' },
  },
  {
    id: 'send', name: '发送策略', icon: 'clock',
    desc: '定义什么时候发、按什么节奏发',
    badge: { text: '2条生效中', type: 'info' },
  },
  {
    id: 'template', name: '模板策略', icon: 'file-text',
    desc: '不同场景、不同渠道下用什么模板',
  },
  {
    id: 'frequency', name: '频控策略', icon: 'gauge',
    desc: '控制单用户在一定时间内可接收的消息次数，避免过度打扰',
    badge: { text: '3条生效中', type: 'info' },
  },
  {
    id: 'dnd', name: '免打扰策略', icon: 'moon',
    desc: '避免在不合适时间触达用户',
  },
  {
    id: 'dedup', name: '去重策略', icon: 'copy-x',
    desc: '避免重复发送同类内容',
  },
  {
    id: 'retry', name: '重试策略', icon: 'refresh-ccw',
    desc: '发送失败后的补救机制',
  },
  {
    id: 'channel-route', name: '渠道路由', icon: 'route',
    desc: '决定消息走哪个渠道，主备通道与回退逻辑',
  },
  {
    id: 'vendor-route', name: '供应商路由', icon: 'git-branch',
    desc: '多供应商时决定走哪家，按成本与成功率择优',
  },
  {
    id: 'abtest', name: 'A/B实验', icon: 'flask-conical',
    desc: '测试不同内容、渠道、时机的效果',
    badge: { text: '1个进行中', type: 'info' },
  },
  {
    id: 'ai', name: 'AI智能策略', icon: 'sparkles',
    desc: '给运营提供推荐，自动优化发送决策',
  },
  {
    id: 'compliance', name: '合规策略', icon: 'shield-check',
    desc: '保证发送行为符合平台或地区要求',
    badge: { text: '1个预警', type: 'warning' },
  },
];

/* 每条策略：rules 为详情抽屉「规则配置」区按分类的重点字段 */
const REACH_STRATEGIES = [
  /* ---- 人群策略 ---- */
  {
    id: 'aud-001', category: 'audience', name: 'VIP 用户优先触达',
    summary: 'VIP 标签用户优先进入发送队列，排除黑名单',
    scope: '全局', priority: '高', status: 'active', hits: 128600,
    creator: 'marvin@', createdAt: '2026-06-12 10:20', updatedAt: '2026-07-10 15:42', updatedBy: 'marvin@',
    tags: ['全局', '高优先级', '生效中'],
    rules: [
      { label: '适用人群标签', value: 'VIP用户、高充值用户' },
      { label: '用户状态条件', value: '账号正常、未注销' },
      { label: '活跃度条件', value: '近 30 天有登录' },
      { label: '黑白名单', value: '排除投诉黑名单（1,238 人）' },
      { label: '生效范围', value: '全部通道' },
    ],
  },
  {
    id: 'aud-002', category: 'audience', name: '流失预警人群圈选',
    summary: '连续 14 天未登录用户进入召回触达人群',
    scope: '召回类任务', priority: '中', status: 'active', hits: 45200,
    creator: 'lily@', createdAt: '2026-06-20 14:05', updatedAt: '2026-07-08 11:30', updatedBy: 'lily@',
    tags: ['渠道限定', '生效中'],
    rules: [
      { label: '适用人群标签', value: '流失预警用户、沉默用户' },
      { label: '用户状态条件', value: '未退订营销消息' },
      { label: '活跃度条件', value: '连续 14 天未登录' },
      { label: '黑白名单', value: '白名单优先（测试账号）' },
      { label: '生效范围', value: 'SMS、邮件、电销' },
    ],
  },
  {
    id: 'aud-003', category: 'audience', name: '新注册用户 7 日孵化',
    summary: '注册 7 日内用户按注册天数分层触达',
    scope: '生命周期任务', priority: '中', status: 'active', hits: 30400,
    creator: 'ken@', createdAt: '2026-07-01 09:00', updatedAt: '2026-07-09 18:12', updatedBy: 'ken@',
    tags: ['生效中'],
    rules: [
      { label: '适用人群标签', value: '新注册用户' },
      { label: '用户状态条件', value: '完成手机号验证' },
      { label: '活跃度条件', value: '注册 ≤ 7 天' },
      { label: '黑白名单', value: '无' },
      { label: '生效范围', value: 'Push、邮件' },
    ],
  },

  /* ---- 发送策略 ---- */
  {
    id: 'snd-001', category: 'send', name: '活动前 2 小时提醒',
    summary: '绑定活动开始时间，提前 2 小时触发发送',
    scope: '营销活动', priority: '高', status: 'active', hits: 86200,
    creator: 'marvin@', createdAt: '2026-06-15 16:40', updatedAt: '2026-07-10 09:25', updatedBy: 'marvin@',
    tags: ['高优先级', '生效中'],
    rules: [
      { label: '触发条件', value: '活动开始前 2 小时' },
      { label: '发送时机', value: '一次性定时发送' },
      { label: '发送周期', value: '单次' },
      { label: '是否支持补发', value: '支持（失败后 30 分钟内补发一次）' },
      { label: '时区设置', value: 'GMT+8（用户本地时区优先）' },
    ],
  },
  {
    id: 'snd-002', category: 'send', name: '每日黄金时段推送',
    summary: '每天 19:00-21:00 分批发送，避开整点高峰',
    scope: '促活任务', priority: '中', status: 'active', hits: 152300,
    creator: 'lily@', createdAt: '2026-06-25 10:10', updatedAt: '2026-07-07 14:50', updatedBy: 'ken@',
    tags: ['生效中'],
    rules: [
      { label: '触发条件', value: '每日定时' },
      { label: '发送时机', value: '19:00-21:00 分批' },
      { label: '发送周期', value: '每天' },
      { label: '是否支持补发', value: '不支持' },
      { label: '时区设置', value: '用户本地时区' },
    ],
  },
  {
    id: 'snd-003', category: 'send', name: '周末循环发送（草稿）',
    summary: '每周六、周日 10:00 循环发送，未启用',
    scope: '促活任务', priority: '低', status: 'draft', hits: 0,
    creator: 'ken@', createdAt: '2026-07-09 15:00', updatedAt: '2026-07-09 15:00', updatedBy: 'ken@',
    tags: [],
    rules: [
      { label: '触发条件', value: '每周六、周日' },
      { label: '发送时机', value: '10:00' },
      { label: '发送周期', value: '每周' },
      { label: '是否支持补发', value: '不支持' },
      { label: '时区设置', value: 'GMT+8' },
    ],
  },

  /* ---- 渠道路由 ---- */
  {
    id: 'rte-001', category: 'channel-route', name: '营销消息渠道优先级',
    summary: 'Push 优先，未装 App 用户回退 SMS',
    scope: '营销活动', priority: '高', status: 'active', hits: 96800,
    creator: 'marvin@', createdAt: '2026-06-10 11:30', updatedAt: '2026-07-06 17:05', updatedBy: 'marvin@',
    tags: ['全局', '高优先级', '生效中'],
    rules: [
      { label: '业务场景', value: '营销活动通知' },
      { label: '渠道优先级', value: 'Push > Inbox > SMS' },
      { label: '主通道/备通道', value: '主：Push；备：SMS' },
      { label: '条件路由规则', value: '未安装 App → 直接走 SMS' },
      { label: '回退逻辑', value: 'Push 30 分钟未送达则回退 SMS' },
    ],
  },
  {
    id: 'rte-002', category: 'channel-route', name: '验证码通道直达',
    summary: '验证码类消息固定走 SMS 主通道，不参与回退',
    scope: '通知类任务', priority: '高', status: 'active', hits: 210500,
    creator: 'lily@', createdAt: '2026-05-28 09:45', updatedAt: '2026-06-30 10:20', updatedBy: 'lily@',
    tags: ['渠道限定', '高优先级', '生效中'],
    rules: [
      { label: '业务场景', value: '验证码 / 安全通知' },
      { label: '渠道优先级', value: '仅 SMS' },
      { label: '主通道/备通道', value: '主：SMS 供应商 A；备：SMS 供应商 B' },
      { label: '条件路由规则', value: '无' },
      { label: '回退逻辑', value: '主供应商失败即切备用供应商' },
    ],
  },

  /* ---- 模板策略 ---- */
  {
    id: 'tpl-001', category: 'template', name: '多语言模板适配',
    summary: '按用户语言偏好选择 EN/中文/TL 模板版本',
    scope: '全局', priority: '中', status: 'active', hits: 78400,
    creator: 'ken@', createdAt: '2026-06-18 13:20', updatedAt: '2026-07-05 16:40', updatedBy: 'ken@',
    tags: ['全局', '生效中'],
    rules: [
      { label: '模板类型', value: '营销 / 通知通用' },
      { label: '渠道适配', value: 'SMS、邮件、Push' },
      { label: '语言版本', value: 'EN、简体中文、Tagalog' },
      { label: '模板变量', value: '{userName}、{activityName}、{deadline}' },
      { label: '默认模板/兜底模板', value: '默认 EN，缺失语言回退 EN' },
    ],
  },
  {
    id: 'tpl-002', category: 'template', name: '召回场景兜底模板',
    summary: '召回任务未配置内容时使用兜底话术',
    scope: '召回类任务', priority: '低', status: 'disabled', hits: 5600,
    creator: 'lily@', createdAt: '2026-06-02 10:00', updatedAt: '2026-06-28 09:15', updatedBy: 'marvin@',
    tags: [],
    rules: [
      { label: '模板类型', value: '召回话术' },
      { label: '渠道适配', value: 'SMS、电销' },
      { label: '语言版本', value: '简体中文' },
      { label: '模板变量', value: '{userName}、{giftName}' },
      { label: '默认模板/兜底模板', value: '兜底模板「流失召回话术」' },
    ],
  },

  /* ---- 频控策略 ---- */
  {
    id: 'frq-001', category: 'frequency', name: '单用户每日频控',
    summary: '单用户每天最多接收 3 条营销消息',
    scope: '全局', priority: '高', status: 'active', hits: 320800,
    creator: 'marvin@', createdAt: '2026-05-20 09:30', updatedAt: '2026-07-10 11:08', updatedBy: 'marvin@',
    tags: ['全局', '高优先级', '生效中'],
    rules: [
      { label: '控制维度', value: '用户' },
      { label: '时间窗口', value: '自然日（24 小时）' },
      { label: '最大次数', value: '3 次 / 天' },
      { label: '超限处理方式', value: '丢弃并记录，次日不补发' },
    ],
  },
  {
    id: 'frq-002', category: 'frequency', name: 'SMS 通道周频控',
    summary: 'SMS 通道单用户每周最多 5 条',
    scope: 'SMS 通道', priority: '中', status: 'active', hits: 88900,
    creator: 'lily@', createdAt: '2026-06-08 15:50', updatedAt: '2026-07-03 10:35', updatedBy: 'lily@',
    tags: ['渠道限定', '生效中'],
    rules: [
      { label: '控制维度', value: '用户 + 渠道（SMS）' },
      { label: '时间窗口', value: '自然周' },
      { label: '最大次数', value: '5 次 / 周' },
      { label: '超限处理方式', value: '延迟至下周队首发送' },
    ],
  },
  {
    id: 'frq-003', category: 'frequency', name: '单活动触达频控',
    summary: '同一活动对同一用户最多触达 2 次',
    scope: '营销活动', priority: '中', status: 'active', hits: 64100,
    creator: 'ken@', createdAt: '2026-06-22 11:15', updatedAt: '2026-07-01 14:22', updatedBy: 'ken@',
    tags: ['生效中'],
    rules: [
      { label: '控制维度', value: '用户 + 活动' },
      { label: '时间窗口', value: '活动周期内' },
      { label: '最大次数', value: '2 次' },
      { label: '超限处理方式', value: '直接丢弃' },
    ],
  },

  /* ---- 免打扰策略 ---- */
  {
    id: 'dnd-001', category: 'dnd', name: '夜间免打扰',
    summary: '22:00-08:00 暂停所有营销类消息发送',
    scope: '全局', priority: '高', status: 'active', hits: 41200,
    creator: 'marvin@', createdAt: '2026-05-15 10:00', updatedAt: '2026-06-20 09:40', updatedBy: 'lily@',
    tags: ['全局', '高优先级', '生效中'],
    rules: [
      { label: '免打扰时段', value: '22:00 - 次日 08:00' },
      { label: '特殊日期限制', value: '法定节假日全天免打扰（营销类）' },
      { label: '用户退订/关闭状态', value: '已退订用户不发送' },
      { label: '渠道限制', value: 'SMS、Push、电销' },
    ],
  },
  {
    id: 'dnd-002', category: 'dnd', name: '电销工作时段限制',
    summary: '电销外呼仅限工作日 10:00-19:00',
    scope: '电销通道', priority: '中', status: 'active', hits: 8600,
    creator: 'ken@', createdAt: '2026-06-05 13:30', updatedAt: '2026-06-25 17:10', updatedBy: 'ken@',
    tags: ['渠道限定', '生效中'],
    rules: [
      { label: '免打扰时段', value: '工作日 19:00 后、周末全天' },
      { label: '特殊日期限制', value: '节假日不外呼' },
      { label: '用户退订/关闭状态', value: '标记「拒绝来电」用户不外呼' },
      { label: '渠道限制', value: '仅电销' },
    ],
  },

  /* ---- 去重策略 ---- */
  {
    id: 'ddp-001', category: 'dedup', name: '相同内容 24 小时去重',
    summary: '24 小时内相同内容对同一用户只发一次',
    scope: '全局', priority: '中', status: 'active', hits: 27400,
    creator: 'lily@', createdAt: '2026-06-11 09:20', updatedAt: '2026-07-02 15:55', updatedBy: 'lily@',
    tags: ['全局', '生效中'],
    rules: [
      { label: '去重维度', value: '用户 + 内容指纹' },
      { label: '去重时间窗', value: '24 小时' },
      { label: '相同内容判定规则', value: '正文 MD5 一致即判定相同' },
      { label: '跨渠道是否去重', value: '是（SMS/Push/邮件互斥）' },
    ],
  },
  {
    id: 'ddp-002', category: 'dedup', name: '召回消息 7 天去重',
    summary: '召回类消息 7 天内同一用户不重复触达',
    scope: '召回类任务', priority: '低', status: 'disabled', hits: 3100,
    creator: 'ken@', createdAt: '2026-06-14 16:45', updatedAt: '2026-06-29 10:05', updatedBy: 'marvin@',
    tags: [],
    rules: [
      { label: '去重维度', value: '用户 + 任务类型（召回）' },
      { label: '去重时间窗', value: '7 天' },
      { label: '相同内容判定规则', value: '同任务类型即判定重复' },
      { label: '跨渠道是否去重', value: '否' },
    ],
  },

  /* ---- 重试策略 ---- */
  {
    id: 'rty-001', category: 'retry', name: 'SMS 失败自动重试',
    summary: '发送失败后间隔 5 分钟重试，最多 3 次',
    scope: 'SMS 通道', priority: '高', status: 'active', hits: 15800,
    creator: 'marvin@', createdAt: '2026-05-30 14:20', updatedAt: '2026-07-04 09:50', updatedBy: 'marvin@',
    tags: ['渠道限定', '高优先级', '生效中'],
    rules: [
      { label: '重试条件', value: '供应商返回超时 / 网关错误' },
      { label: '最大重试次数', value: '3 次' },
      { label: '重试间隔', value: '5 分钟（指数退避）' },
      { label: '是否换通道重试', value: '第 3 次失败后切换备用供应商' },
    ],
  },
  {
    id: 'rty-002', category: 'retry', name: 'Push 失败转 SMS',
    summary: 'Push 送达失败后自动换 SMS 通道补发',
    scope: 'Push 通道', priority: '中', status: 'active', hits: 9300,
    creator: 'lily@', createdAt: '2026-06-16 10:35', updatedAt: '2026-07-06 13:15', updatedBy: 'lily@',
    tags: ['渠道限定', '生效中'],
    rules: [
      { label: '重试条件', value: 'Push 未送达（设备离线 > 1 小时）' },
      { label: '最大重试次数', value: '1 次' },
      { label: '重试间隔', value: '60 分钟' },
      { label: '是否换通道重试', value: '是（Push → SMS）' },
    ],
  },

  /* ---- 限流策略 ---- */
  {
    id: 'lmt-001', category: 'ratelimit', name: 'SMS 供应商 A 限流',
    summary: '供应商 A 每分钟最多 2,000 条，超出排队',
    scope: 'SMS 通道', priority: '高', status: 'active', hits: 186000,
    creator: 'marvin@', createdAt: '2026-05-25 11:00', updatedAt: '2026-07-09 16:30', updatedBy: 'ken@',
    tags: ['渠道限定', '高优先级', '生效中'],
    rules: [
      { label: '限流对象', value: '供应商 A（SMS）' },
      { label: '每分钟/每小时上限', value: '2,000 条/分钟；100,000 条/小时' },
      { label: '超限处理方式', value: '排队' },
      { label: '排队/丢弃/延迟发送', value: '排队等待，超过 30 分钟转延迟发送' },
    ],
  },
  {
    id: 'lmt-002', category: 'ratelimit', name: '邮件全局限流',
    summary: '邮件通道每小时上限 50,000 封，超出延迟发送',
    scope: '邮件通道', priority: '中', status: 'active', hits: 42600,
    creator: 'lily@', createdAt: '2026-06-07 09:10', updatedAt: '2026-07-08 10:45', updatedBy: 'lily@',
    tags: ['渠道限定', '生效中'],
    rules: [
      { label: '限流对象', value: '邮件通道（全部账号）' },
      { label: '每分钟/每小时上限', value: '1,000 封/分钟；50,000 封/小时' },
      { label: '超限处理方式', value: '延迟发送' },
      { label: '排队/丢弃/延迟发送', value: '延迟至下一时间窗口' },
    ],
  },

  /* ---- 供应商路由 ---- */
  {
    id: 'vdr-001', category: 'vendor-route', name: '菲律宾 SMS 供应商择优',
    summary: '按成功率 70% + 成本 30% 加权选择供应商',
    scope: 'SMS 通道 · PH', priority: '高', status: 'active', hits: 132400,
    creator: 'marvin@', createdAt: '2026-06-01 15:25', updatedAt: '2026-07-07 11:20', updatedBy: 'marvin@',
    tags: ['渠道限定', '高优先级', '生效中'],
    rules: [
      { label: '供应商优先级', value: '供应商 A > 供应商 B > 供应商 C' },
      { label: '成本/成功率权重', value: '成功率 70% + 成本 30%' },
      { label: '国家/地区匹配', value: '菲律宾（+63）' },
      { label: '失败切换逻辑', value: '连续失败 50 条自动降级切换' },
    ],
  },
  {
    id: 'vdr-002', category: 'vendor-route', name: '邮件供应商主备切换',
    summary: '主供应商配额耗尽时自动切换备用',
    scope: '邮件通道', priority: '中', status: 'active', hits: 38800,
    creator: 'ken@', createdAt: '2026-06-13 10:50', updatedAt: '2026-07-05 09:35', updatedBy: 'ken@',
    tags: ['渠道限定', '生效中'],
    rules: [
      { label: '供应商优先级', value: 'SendCloud > Mailgun' },
      { label: '成本/成功率权重', value: '仅按优先级' },
      { label: '国家/地区匹配', value: '不限' },
      { label: '失败切换逻辑', value: '配额使用 ≥ 95% 或失败率 ≥ 10% 切换' },
    ],
  },

  /* ---- A/B实验 ---- */
  {
    id: 'ab-001', category: 'abtest', name: '世界杯文案 A/B 实验',
    summary: '两版竞猜文案 50/50 分流，观察点击率',
    scope: '营销活动「世界杯竞猜预热」', priority: '中', status: 'active', hits: 25600,
    creator: 'lily@', createdAt: '2026-07-05 14:00', updatedAt: '2026-07-10 10:12', updatedBy: 'lily@',
    tags: ['A/B中', '生效中'],
    rules: [
      { label: '实验名称', value: '世界杯竞猜文案实验 #12' },
      { label: '实验对象', value: '活跃用户（12,800 人）' },
      { label: '实验分流比例', value: 'A 组 50% / B 组 50%' },
      { label: '对照组/实验组策略', value: 'A：利益点文案；B：悬念型文案' },
      { label: '观察指标', value: '点击率、竞猜参与率' },
      { label: '实验状态', value: '进行中（第 5 天 / 共 7 天）' },
    ],
  },
  {
    id: 'ab-002', category: 'abtest', name: '发送时机实验（已结束）',
    summary: '10:00 vs 20:00 发送效果对比，20:00 胜出',
    scope: '促活任务', priority: '低', status: 'disabled', hits: 18200,
    creator: 'ken@', createdAt: '2026-06-10 09:00', updatedAt: '2026-06-24 18:00', updatedBy: 'ken@',
    tags: [],
    rules: [
      { label: '实验名称', value: '发送时机实验 #08' },
      { label: '实验对象', value: '沉默用户（8,400 人）' },
      { label: '实验分流比例', value: 'A 组 50% / B 组 50%' },
      { label: '对照组/实验组策略', value: 'A：10:00 发送；B：20:00 发送' },
      { label: '观察指标', value: '打开率、次日留存' },
      { label: '实验状态', value: '已结束（B 组打开率 +34%）' },
    ],
  },

  /* ---- AI智能策略 ---- */
  {
    id: 'ai-001', category: 'ai', name: 'AI 最佳发送时间推荐',
    summary: '基于用户历史活跃时段推荐个性化发送时间',
    scope: '全局', priority: '中', status: 'active', hits: 58900,
    creator: 'marvin@', createdAt: '2026-06-28 10:30', updatedAt: '2026-07-09 15:20', updatedBy: 'marvin@',
    tags: ['全局', '生效中'],
    rules: [
      { label: '推荐类型', value: '发送时间' },
      { label: '推荐依据', value: '用户近 30 天活跃时段分布' },
      { label: '是否自动执行', value: '是（置信度 ≥ 80% 时）' },
      { label: '人工确认方式', value: '置信度不足时任务创建者确认' },
      { label: '最近命中效果', value: '打开率提升 +18.6%' },
    ],
  },
  {
    id: 'ai-002', category: 'ai', name: 'AI 渠道推荐（灰度）',
    summary: '按用户渠道偏好推荐触达渠道，灰度 10%',
    scope: '营销活动', priority: '低', status: 'draft', hits: 4200,
    creator: 'lily@', createdAt: '2026-07-08 11:40', updatedAt: '2026-07-08 11:40', updatedBy: 'lily@',
    tags: [],
    rules: [
      { label: '推荐类型', value: '触达渠道' },
      { label: '推荐依据', value: '历史各渠道打开/点击率' },
      { label: '是否自动执行', value: '否' },
      { label: '人工确认方式', value: '运营在任务配置时逐条确认' },
      { label: '最近命中效果', value: '灰度中，暂无结论' },
    ],
  },

  /* ---- 合规策略 ---- */
  {
    id: 'cmp-001', category: 'compliance', name: '菲律宾 SIM 注册法合规',
    summary: '营销短信需带退订指令，发送时段 08:00-21:00',
    scope: 'SMS 通道 · PH', priority: '高', status: 'active', hits: 152800,
    creator: 'marvin@', createdAt: '2026-05-10 09:00', updatedAt: '2026-07-06 14:30', updatedBy: 'marvin@',
    tags: ['渠道限定', '高优先级', '生效中'],
    rules: [
      { label: '国家/地区规则', value: '菲律宾 SIM Registration Act' },
      { label: '发送时间限制', value: '08:00 - 21:00（当地时间）' },
      { label: '文案敏感词检查', value: '启用（赌博类敏感词库 v3）' },
      { label: '用户授权状态', value: '需 Opt-in 记录' },
      { label: '合规校验结果', value: '最近 7 天拦截 216 条' },
    ],
  },
  {
    id: 'cmp-002', category: 'compliance', name: '邮件 CAN-SPAM 合规',
    summary: '营销邮件必须包含退订链接与实体地址',
    scope: '邮件通道', priority: '高', status: 'active', hits: 66300,
    creator: 'ken@', createdAt: '2026-05-18 10:15', updatedAt: '2026-06-30 16:45', updatedBy: 'lily@',
    tags: ['渠道限定', '高优先级', '生效中'],
    rules: [
      { label: '国家/地区规则', value: 'CAN-SPAM Act' },
      { label: '发送时间限制', value: '不限' },
      { label: '文案敏感词检查', value: '启用（垃圾邮件特征检测）' },
      { label: '用户授权状态', value: '已退订用户 10 日内移出列表' },
      { label: '合规校验结果', value: '存在 1 个预警：3 个模板缺少退订链接' },
    ],
  },
];

const VISIBLE_STRATEGY_CATEGORY_IDS = [
  'frequency', 'dnd', 'dedup', 'retry',
  'channel-route', 'vendor-route', 'ai',
];

function visibleStrategyCategories() {
  return STRATEGY_CATEGORIES.filter(c => VISIBLE_STRATEGY_CATEGORY_IDS.includes(c.id));
}

function visibleReachStrategies() {
  return REACH_STRATEGIES.filter(s => VISIBLE_STRATEGY_CATEGORY_IDS.includes(s.category));
}

const STRATEGY_STATUS = {
  active: { label: '生效中', cls: 'tag-success' },
  disabled: { label: '已停用', cls: 'tag-gray-outline' },
  draft: { label: '草稿', cls: 'tag-gray' },
};

function strategyCategoryById(id) {
  return STRATEGY_CATEGORIES.find(c => c.id === id);
}

function strategiesByCategory(id) {
  return REACH_STRATEGIES.filter(s => s.category === id);
}

function strategyById(id) {
  return REACH_STRATEGIES.find(s => s.id === id);
}
