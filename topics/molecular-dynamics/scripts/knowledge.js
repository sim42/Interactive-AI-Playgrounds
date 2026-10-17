/* Original local explanations; reading links open only by user action. */
window.PlaygroundKnowledge = {
  "title": "从粒子受力到分子运动",
  "question": "局部相互作用如何形成可观测的集体运动？",
  "concepts": [
    {
      "title": "势能坡度决定力",
      "text": "势能下降最快的方向就是力的方向。距离很小时强排斥，稍远时可吸引。标准LJ势的σ是势能零点，不是最低点。"
    },
    {
      "title": "位置更新后，力也要重新计算",
      "text": "Velocity Verlet先用旧速度和旧力求新位置，再用全部新位置重算力，最后用新旧力平均更新速度。每个阶段对应实际模型状态。"
    },
    {
      "title": "周期边界表示重复的盒子",
      "text": "粒子穿出一侧会从另一侧出现；相互作用取最近镜像，角落也须处理。每对粒子的势能只计一次。"
    },
    {
      "title": "截断势与力必须一致",
      "text": "本页盒内用移力截断：势与力在截断处都连续到零。曲线、力和能量计算都使用同一修改后的函数。"
    },
    {
      "title": "冷却是外界干预",
      "text": "速度缩放会取走动能，所以总能量可变；界面将这笔外界功扣除后再检查数值误差。一次缩放不能称为正确的NVT采样。",
      "try": "先预测0.7倍速度对应多少动能，再点击冷却核对。"
    },
    {
      "title": "模型的边界",
      "text": "二维经典约化模型不包含电子或量子效应。温度自由度、速度分布与三维不同；不能由小系统聚集现象推出真实材料相变温度。"
    }
  ],
  "math": [
    {
      "title": "标准 LJ 势",
      "tex": "U(r)=4\\epsilon[(\\sigma/r)^{12}-(\\sigma/r)^6],\\quad F=-U\\prime(r)",
      "text": "最小值位于r=2^(1/6)σ；本页截断模型修改了函数，其零点与最低点也随之变化。"
    },
    {
      "title": "移力截断",
      "tex": "U_s=U(r)-U(r_c)-(r-r_c)U\\prime(r_c),\\quad F_s=F(r)-F(r_c)",
      "text": "仅r<rc使用；超过截断两者为0。势与力必须同时修改，不能只平移能量却随意修改力。"
    },
    {
      "title": "Velocity Verlet",
      "tex": "r_{t+h}=r_t+v_th+\\frac{F_t}{2m}h^2,\\quad v_{t+h}=v_t+\\frac{F_t+F_{t+h}}{2m}h",
      "text": "更新在同一份粒子状态上进行；普通教学电脑中以小粒子数分批计算。"
    },
    {
      "title": "二维温度",
      "tex": "T^*=\\frac{2K}{2N-2}",
      "text": "m=kB=1的约化单位，盒内去掉整体平动。两个粒子的演示只读间距，不把该小系统温度当作热平衡结论。"
    }
  ],
  "sources": [
    {
      "title": "分子动力学模拟",
      "url": "https://github.com/sim42/SCML/blob/f07e5016bd2dc55c6c5a6842c46a39b027e50f1e/Chapter09/4.%20%E5%88%86%E5%AD%90%E5%8A%A8%E5%8A%9B%E5%AD%A6%E6%A8%A1%E6%8B%9F.ipynb",
      "note": "LJ势、Verlet、周期边界与能量交换的原始教学案例；本页重新实现一致的截断力与势。",
      "type": "原始课件 · 中文"
    },
    {
      "title": "LAMMPS: Lennard-Jones",
      "url": "https://docs.lammps.org/pair_lj.html",
      "note": "核对标准LJ定义及σ与势阱最低点的区别。",
      "type": "官方文档 · 英文"
    },
    {
      "title": "LAMMPS: Temperature",
      "url": "https://docs.lammps.org/compute_temp.html",
      "note": "核对动能、维数和扣除的自由度。",
      "type": "官方文档 · 英文"
    }
  ],
  "id": "molecular-dynamics"
};
