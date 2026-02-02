// ==================== Firebase 配置範例 ====================
// ⚠️ 使用說明：
// 1. 複製此檔案並重新命名為 firebase-config.js
// 2. 到 Firebase Console 複製您的配置
// 3. 替換下面的 YOUR_XXX 內容
// 4. firebase-config.js 已加入 .gitignore，不會被上傳到 GitHub

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
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
