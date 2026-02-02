// ==================== Firebase 配置 ====================
// ✅ 配置已設定完成

const firebaseConfig = {
  apiKey: "AIzaSyBbBNjiBz1app7yySjHVkq4teiM18Yxv0I",
  authDomain: "chinese-new-year-orders.firebaseapp.com",
  projectId: "chinese-new-year-orders",
  storageBucket: "chinese-new-year-orders.firebasestorage.app",
  messagingSenderId: "551401435476",
  appId: "1:551401435476:web:5645075ce84d03525858c1",
};

// ⚠️ 重要提醒：
// 1. 請到 Firebase Console 複製您的配置
// 2. 替換上面的 YOUR_API_KEY、YOUR_PROJECT_ID 等內容
// 3. 完成後儲存檔案

// 初始化 Firebase
let db = null;
let isFirebaseEnabled = false;

try {
  // 檢查配置是否已設定（檢查是否還是預設的佔位符）
  if (
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes("YOUR_API_KEY")
  ) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    isFirebaseEnabled = true;
    console.log("✅ Firebase 已成功連接！");
    console.log("📊 資料將同步到雲端資料庫");
  } else {
    console.warn("⚠️ Firebase 配置尚未設定");
    console.warn("📝 請編輯 firebase-config.js 填入您的 Firebase 配置");
    console.warn("💾 目前使用本地 localStorage 儲存");
  }
} catch (error) {
  console.error("❌ Firebase 初始化失敗:", error);
  console.warn("💾 將使用本地 localStorage 儲存");
  isFirebaseEnabled = false;
}
