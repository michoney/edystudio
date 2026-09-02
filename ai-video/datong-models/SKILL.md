---
name: datong-models
description: 从「大桶的资料库」(hub.datong-ai.cn/models) 批量下载 ComfyUI 视频/出图模型并部署。19 个模型包含 Wan2.1/2.2 系(bernini/scail/animate/SteadyDancer/infinitetalk/SmoothMix)、LTX2.3、Qwen-Image 编辑、Z-image、flux 全套、controlnet、放大模型等。当用户说「下载大桶模型」「大桶资料库」「模型包全下」「ComfyUI 模型库」时触发。
---

# datong-models · 大桶资料库 19 包模型下载部署

资源站:https://hub.datong-ai.cn/models(「大桶的资料库」AI 创作者资源站,博主个人分享的 ComfyUI 模型网盘包)

**当前状态(2026-09-02):19 包「全都要」——逐包取链接→转存→下载→按包内文件夹路径部署到 228 ComfyUI models/**

## 一、全量包清单(19,站内按入库倒序)

| # | 包名 | 站内详情 | 关键模型/备注 |
|---|------|---------|--------------|
| 01 | scail2模型及工作流 | /models/cms377hw600l41galq2jw9cjb | wan2.1_14B_SCAIL_2_fp8_scaled + relighting/DPO lora + umt5/clip_vision/sam3.1 |
| 02 | bernini视频模型和工作流 | /models/cmrritysv00k71galj4bbygbj | wan2.2_bernini_r high/low_noise fp8 + LightX2V lora,文件夹已按路径放好 |
| 03 | steadydancer和scail动作迁移模型 | /models/cmn1sw00x001tthiov7lbsfyq | Wan21_SteadyDancer_fp8 + SCAIL-preview(KJ 版) |
| 04 | kontext和自制编辑lora | /models/cmn1sqlhz001sthio7k2jabmz | flux1-kontext-dev + 白膜渲染上色/老照片修复/变手办/变像素/图案提取/去线稿重打光 |
| 05 | flux全套模型 | /models/cmn1skkkv001rthio3zk2viwy | dev fp8/gguf Q8/Q4 + ControlNet-Union + fill/redux + clip_l/t5xxl/siglip,文件夹名=放置路径 |
| 06 | 常用放大模型upscale | /models/cmn1s6ihm001qthio83ysr572 | ITF-Skin / NomosUni / FFHQDAT / UltraSharp / NMKD / DAT x2-4 / ESRGAN_4x |
| 07 | 好用生图模型合集2512/z红潮 | /models/cmn008iiw000uthioze6fhghp | qwen_image_2512 fp8 + Z-Image 系(Kook 真实幻想/redcraft/TG300/情绪光影) |
| 08 | animate动作迁移(跳舞)模型 | /models/cmmykcsbz0008thio0mgvlfwi | Wan2.2-Animate gguf Q8/Q4/fp8 + vitpose/yolo onnx + 一堆动作/面部 lora |
| 09 | controlnet模型合集 | /models/cmmyk1qrg0007thioqnkikkdg | flux CN-Union-Pro2 / Qwen InstantX CN / 1.5+XL 常用 CN,放 models/controlnet |
| 10 | qwen2511编辑模型 | /models/cmmyj75bj0005thiobo72evnj | qwen_image_edit_2511 bf16/fp8 + Lightning 4/8step lora |
| 11 | infinitetalk对口型数字人模型 | /models/cmmyj0kcw0004thio3q3igeqi | Wan2.1 I2V 底膜 gguf Q4(8G)/Q8(16G) + InfiniteTalk Single Q8 |
| 12 | LTX2.3无字幕lora | /models/cmmxkc9u20002thio0z2ifjvt | ltx无字幕.safetensors,权重 0.5-0.6(太高伤质量,90% 不出字幕) |
| 13 | wan2.1基础生态包 | /models/cmmx1215400088hrw6jl2kf9e | 底膜 fp8 + VACE/T2V/I2V + lightx2v 蒸馏 lora + vae/clip(infinitetalk/animate 的底座) |
| 14 | SmoothMix图生视频模型 | /models/cmmx0jz8100078hrw5nol347e | 图生视频 |
| 15 | Z-image超写实小体量文生图 | /models/cmmvq82p600031xh9tx7fzent | 小显存可跑 |
| 16 | qwen2511图像编辑模型 | /models/cmmvq171g00021xh99rn8bdxr | (与 #10 同代,看详情页差异再定是否重复下) |
| 17 | Klein低显存图像编辑 | /models/cmmvpdpm500011xh9mtpnmnrp | 低显存编辑模型 |
| 18 | LTX2.3音画同步视频模型 | /models/cmmvp3lm200001xh9ebe93wfa | 音画同步(口型?) |
| 19 | FireRed(小红书图片编辑模型) | /models/cmmvmqmq00001a6ix9coxtkbn | 小红书图片编辑 |

## 二、下载流程(每包)

1. 打开详情页 `https://hub.datong-ai.cn/models/<站内ID>`(可能要求登录:站右上「登录/注册」)
2. 详情页取网盘分享链接与提取码(夸克/百度网盘等,按站内提示)
3. 网盘转存到自己的盘 → 客户端或网页下载(**免费网盘限速,大包几十 GB 要分批/过夜**)
4. 校验:模型 .safetensors/.gguf 大小与站内标注一致(safetensors 用 ComfyUI 加载不报错即好)
5. 按**包内已有文件夹结构**放到 228 ComfyUI `models/` 对应子目录:
   - 底模/diffusion: `models/diffusion_models/`(Wan/flux/ltx 底膜)
   - 出图底模(非 diffusion_models 类型): `models/checkpoints/`
   - lora: `models/loras/`; 文本编码器: `models/text_encoders/`; VAE: `models/vae/`
   - clip vision: `models/clip_vision/`; controlnet: `models/controlnet/`
   - 放大: `models/upscale_models/`; onnx/vitpose: 按其包内说明(常放 ComfyUI 外或 `models/onnx`)

## 三、部署目标机(2026-09 现状)

- **228**(192.168.50.228):ComfyUI 8188,wuhaXL/Z-Image/Qwen 出图 + Wan2.2/LTX 视频。大桶视频模型主目标。
- 显存注意:10GB 卡跑 14B 用 gguf Q4/Q8 量化版;fp8 scaled 版看实际显存再定。
- 与 50.23 H3(16G)工作流互补:下载归 228,超分仍走 50.73 Topaz。

## 四、验证闭环

- 下完一个包:228 ComfyUI 里跑一次对应工作流(如 bernini → 出 4s 测试视频)才算完成
- 每包状态在本文件 #一 表格备注列更新(⏳待下载 / ⬇️下载中 / ✅已部署 / ⚠️跳过)
