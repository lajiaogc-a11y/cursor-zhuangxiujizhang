import { TourStep } from './OnboardingTour';

export const DASHBOARD_TOUR_KEY = 'onboarding_dashboard_v1';

export function getDashboardTourSteps(language: 'zh' | 'en'): TourStep[] {
  if (language === 'zh') {
    return [
      {
        target: '[data-tour="search"]',
        title: '🔍 快速搜索',
        description: '使用 ⌘K 快捷键可以快速搜索和跳转到任意页面，大幅提升操作效率。',
        placement: 'right',
      },
      {
        target: '[data-tour="stat-cards"]',
        title: '📊 核心指标',
        description: '一目了然查看进行中项目、待审批、未付款等关键业务数据。点击卡片可快速跳转到对应页面。',
        placement: 'bottom',
      },
      {
        target: '[data-tour="chart"]',
        title: '📈 收支趋势',
        description: '月度收支趋势图表帮助您直观了解公司财务状况和变化趋势。',
        placement: 'bottom',
      },
      {
        target: '[data-tour="notifications"]',
        title: '🔔 通知中心',
        description: '点击铃铛图标查看系统预警和备忘提醒，不遗漏任何重要事项。',
        placement: 'top',
      },
      {
        target: '[data-tour="theme"]',
        title: '🎨 个性化设置',
        description: '切换深色/浅色主题，以及中英文语言。系统会记住您的偏好。',
        placement: 'top',
      },
    ];
  }

  return [
    {
      target: '[data-tour="search"]',
      title: '🔍 Quick Search',
      description: 'Press ⌘K to instantly search and navigate to any page in the system.',
      placement: 'right',
    },
    {
      target: '[data-tour="stat-cards"]',
      title: '📊 Key Metrics',
      description: 'Overview of active projects, pending approvals, unpaid amounts, and more. Click any card to navigate.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="chart"]',
      title: '📈 Trends',
      description: 'Monthly income and expense trends to help you understand financial health at a glance.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="notifications"]',
      title: '🔔 Notifications',
      description: 'Click the bell icon to view system alerts and memo reminders in one place.',
      placement: 'top',
    },
    {
      target: '[data-tour="theme"]',
      title: '🎨 Personalize',
      description: 'Switch between dark/light theme and Chinese/English language. Preferences are saved automatically.',
      placement: 'top',
    },
  ];
}
