# 菜品圖片資料夾

請將菜品圖片放置於此資料夾中。

## 圖片命名對照表

| 菜品名稱               | 圖片檔名               |
| ---------------------- | ---------------------- |
| 甘蔗香燻雞             | `smoked-chicken.jpg`   |
| 糖醋海鱸魚             | `sweet-sour-fish.jpg`  |
| 洪家筍干Q蹄膀          | `pork-knuckle.jpg`     |
| 皇品魚翅蝦仁羹         | `shrimp-soup.jpg`      |
| 櫻花蝦米糕             | `shrimp-rice-cake.jpg` |
| 御品干貝佛跳牆(不含甕) | `buddha-jumps.jpg`     |
| 蜜汁全排骨(五支)       | `honey-ribs.jpg`       |
| 白雪旗魚丸(一斤)       | `fish-balls.jpg`       |
| 極鮮旗魚卷             | `fish-roll.jpg`        |

## 圖片建議規格

- **格式**：JPG 或 PNG
- **尺寸**：建議 300x300 像素（正方形最佳）
- **檔案大小**：建議小於 200KB（優化載入速度）

## 注意事項

1. 檔名必須與上表完全一致（區分大小寫）
2. 如果圖片不存在，會顯示預設的餐盤圖示 🍽️
3. 新增菜品時，請在 `ChineseNewYear_Dishes.js` 中設定對應的 `image` 欄位

## 修改圖片路徑

如需使用不同的檔名或路徑，請編輯 `ChineseNewYear_Dishes.js` 中的 `DISHES` 陣列：

```javascript
{ name: "菜品名稱", price: 價格, image: "images/dishes/您的圖片檔名.jpg" }
```
