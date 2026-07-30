# 庭园声场粒子

调用名：`庭园声场粒子` / `Penderecki Garden 粒子`

本目录是对 [Penderecki's Garden — The Studio](https://pendereckisgarden.pl/en/the-studio) 粒子表现技术的本地学习与改编，只保留 Three.js / GLSL 粒子内核，不包含官网的文章、音乐、图片或品牌素材。

## 预览

```bash
python3 -m http.server 4173
```

打开 <http://localhost:4173/>。

## 特征

- 立体粒子体积与紫蓝灰色调
- Simplex noise 驱动的粒子位移
- 指针和触摸视差
- 可接入低、中、高频音频 uniform
- 手机端自动降低粒子数量
- `prefers-reduced-motion` 下只渲染静态帧

它与“星核粒子”是两套不同内核：星核粒子是六带星河；庭园声场粒子是可音频驱动的三维粒子体积。
