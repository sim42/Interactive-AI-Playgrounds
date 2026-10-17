/* Original local explanations; reading links open only by user action. */
window.PlaygroundKnowledge = {
  "title": "模拟的时间怎样前进？",
  "question": "碰撞发生在两次检查之间，会有什么后果？",
  "concepts": [
    {
      "title": "三种时间不要混淆",
      "text": "物理时间描述模拟世界；固定时间步决定何时检查；播放帧只决定画面何时显示。改变播放速度不改变物理结果。"
    },
    {
      "title": "事件驱动提前预报",
      "text": "硬球碰撞之间匀速，因此能解出接触时刻，直接推进到事件，再改变速度。连续受力时不能直接套用这种匀速预报。"
    },
    {
      "title": "预报也有失效日期",
      "text": "一个球先与别人相撞，原来的速度不再有效。事件保存粒子版本，取出时核对；失效事件必须跳过。",
      "try": "选择三球接力，查看旧预报的保存版本与当前版本。"
    },
    {
      "title": "固定步基线的边界",
      "text": "本页只在每步末检查重叠，用来展示延迟或漏碰撞；加入连续碰撞检测的固定步方法也可避免穿越。"
    },
    {
      "title": "守恒不是唯一验收",
      "text": "漏掉碰撞时速度可能完全不变，动能仍可守恒。因此还要检查碰撞次数、时刻和轨迹。共享粒子的同时接触会明确停止。"
    }
  ],
  "math": [
    {
      "title": "接触时刻",
      "tex": "\\|\\Delta r+\\Delta v\\tau\\|^2=(r_a+r_b)^2",
      "text": "展开为二次方程，选择相互靠近且最早的非负根；无合法根就没有未来碰撞事件。"
    },
    {
      "title": "弹性碰撞冲量",
      "tex": "J=-\\frac{2(v_b-v_a)\\cdot n}{1/m_a+1/m_b}",
      "text": "n从a指向b，只有相互靠近时施加冲量。a速度减J n/m_a，b速度加J n/m_b。"
    },
    {
      "title": "无外力的守恒量",
      "tex": "P=\\sum_i m_i v_i,\\qquad K=\\frac12\\sum_i m_i\\|v_i\\|^2",
      "text": "本页开放空间没有墙与外力，弹性碰撞应保持总动量与动能。"
    }
  ],
  "sources": [
    {
      "title": "Event-Driven Simulation",
      "url": "https://algs4.cs.princeton.edu/61event/index.php",
      "note": "硬球碰撞、事件队列和失效预报的教学参考。",
      "type": "Princeton 教材 · 英文"
    },
    {
      "title": "分子动力学模拟",
      "url": "https://github.com/sim42/SCML/blob/f07e5016bd2dc55c6c5a6842c46a39b027e50f1e/Chapter09/4.%20%E5%88%86%E5%AD%90%E5%8A%A8%E5%8A%9B%E5%AD%A6%E6%A8%A1%E6%8B%9F.ipynb",
      "note": "本课件作为原分子动力学主题前的数值模拟桥梁，事件队列是新增内容。",
      "type": "原始课件 · 中文"
    }
  ],
  "id": "event-driven-simulation"
};
