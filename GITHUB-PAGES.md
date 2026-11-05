# 《咪咪咪大作戰》GitHub Pages 發布方式

## 最簡單的方式：GitHub Actions

1. 在 GitHub 建立一個新的 repository，例如 `mimimimi-game`。
2. 將本專案根目錄內的所有檔案上傳到 repository 的 `main` 分支。
3. 到 repository 的 **Settings → Pages**。
4. 在 **Build and deployment → Source** 選擇 **GitHub Actions**。
5. 回到 **Actions** 頁面，等待 `Deploy game to GitHub Pages` 完成。
6. 完成後網址通常是：

   `https://你的GitHub帳號.github.io/mimimimi-game/`

工作流程會自動執行 `npm install`、`npm run build`，再把 `dist` 發布到 Pages。之後每次推送到 `main`，遊戲都會自動更新。

## 本機預覽

```bash
npm install
npm run dev
```

用瀏覽器開啟終端機顯示的網址即可遊玩。手機可以直接點擊畫面中的物件與兔子技能按鈕。

## 遊戲玩法

第一關找回 5 根胡蘿蔔：點擊窗簾、木箱、入口牌子、好吃兔肚子，並在找到前四根後點擊咪咪咪。第二關先收集影子、腳印、笑聲三個線索，再點擊咪咪咪分身，最後點擊月亮鈴鐺。
