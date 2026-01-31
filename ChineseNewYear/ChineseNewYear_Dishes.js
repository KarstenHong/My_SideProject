// ==================== 權限控管 ====================

// 管理員模式控制
let isAdminMode = false;

// 切換管理員模式（開發者功能）
window.toggleAdminMode = function (password) {
  const correctPassword = "admin2026"; // 可以自行修改密碼

  if (!isAdminMode) {
    // 開啟管理員模式
    const inputPassword = password || prompt("請輸入管理員密碼：");

    if (inputPassword === correctPassword) {
      isAdminMode = true;
      console.log(
        "%c🔓 管理員模式已啟用 ✓",
        "color: #27ae60; font-size: 16px; font-weight: bold;",
      );
      console.log(
        "%c現在可以編輯和刪除訂單",
        "color: #27ae60; font-size: 14px;",
      );

      // 顯示統計面板
      const statsPanel = document.querySelector(".statistics-panel.admin-only");
      if (statsPanel) {
        statsPanel.style.setProperty("display", "grid", "important");
      }

      // 顯示菜品管理區
      const dishManagement = document.querySelector(
        ".dish-management-section.admin-only",
      );
      if (dishManagement) {
        dishManagement.style.setProperty("display", "block", "important");
      }

      // 重新載入訂單以顯示編輯/刪除按鈕
      loadOrders();

      showAlert("管理員模式已啟用\n現在可以編輯和刪除訂單", "success");
      return "已啟用";
    } else {
      console.log("%c❌ 密碼錯誤", "color: #e74c3c; font-size: 14px;");
      showAlert("密碼錯誤", "error");
      return "密碼錯誤";
    }
  } else {
    // 關閉管理員模式
    isAdminMode = false;
    console.log(
      "%c🔒 管理員模式已關閉",
      "color: #e74c3c; font-size: 16px; font-weight: bold;",
    );

    // 隱藏統計面板
    const statsPanel = document.querySelector(".statistics-panel.admin-only");
    if (statsPanel) {
      statsPanel.style.setProperty("display", "none", "important");
    }

    // 隱藏菜品管理區
    const dishManagement = document.querySelector(
      ".dish-management-section.admin-only",
    );
    if (dishManagement) {
      dishManagement.style.setProperty("display", "none", "important");
    }

    // 重新載入訂單以隱藏編輯/刪除按鈕
    loadOrders();

    showAlert("管理員模式已關閉", "info");
    return "已關閉";
  }
};

// 快速鍵啟用管理員模式 (Ctrl + Shift + A)
document.addEventListener("keydown", function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    e.preventDefault();
    toggleAdminMode();
  }
});

// ==================== 個資隱碼處理 ====================

// 姓名隱碼：只顯示姓氏，名字用○代替
function maskName(name) {
  if (!name || name.length === 0) return "○○";
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + "○";
  // 三個字以上：顯示第一個字，其餘用○
  return name[0] + "○".repeat(name.length - 1);
}

// 電話隱碼：保留前4碼和後3碼，中間用****代替
function maskPhone(phone) {
  if (!phone) return "****";
  const cleaned = phone.toString().replace(/\D/g, "");
  if (cleaned.length <= 4) return "****";
  if (cleaned.length <= 7) return cleaned.substring(0, 3) + "****";
  // 標準手機號碼：0912****678
  return (
    cleaned.substring(0, 4) + "****" + cleaned.substring(cleaned.length - 3)
  );
}

// 群組隱碼：顯示前兩個字，其餘用**代替
function maskGroup(group) {
  if (!group || group === "未分組") return "未分組";
  if (group.length <= 2) return group;
  return group.substring(0, 2) + "**";
}

// 判斷訂單是否需要隱碼
function shouldMaskOrder() {
  // 只有管理員模式才不隱碼，其他一律隱碼
  return !isAdminMode;
}

// ==================== Firebase 資料同步功能 ====================

// Firebase 即時監聽器
let ordersUnsubscribe = null;

// 啟動 Firebase 即時監聽
function startFirebaseRealtimeListener() {
  if (!isFirebaseEnabled) {
    console.log("Firebase 未啟用，使用本地資料");
    return;
  }

  console.log("🔄 啟動 Firebase 即時監聽...");

  // 監聽 orders 集合的所有變更
  ordersUnsubscribe = db.collection("orders").onSnapshot(
    (snapshot) => {
      console.log("📡 收到 Firebase 資料更新");

      orders = [];
      snapshot.forEach((doc) => {
        orders.push({
          firebaseId: doc.id, // 儲存 Firebase 文檔 ID
          ...doc.data(),
        });
      });

      console.log(`✅ 已同步 ${orders.length} 筆訂單`);

      // 備份到 localStorage
      localStorage.setItem("orders", JSON.stringify(orders));

      // 更新畫面
      filteredOrders = [...orders];
      loadOrders();
    },
    (error) => {
      console.error("❌ Firebase 監聽失敗:", error);
      showAlert("雲端連線中斷，將使用本地資料", "warning");
    },
  );
}

// 停止 Firebase 監聽（頁面關閉時）
function stopFirebaseListener() {
  if (ordersUnsubscribe) {
    ordersUnsubscribe();
    console.log("🛑 已停止 Firebase 監聽");
  }
}

// 檢查訂單號碼是否已存在（從 Firebase）
async function checkOrderNumberExists(orderNumber) {
  if (!isFirebaseEnabled) {
    // 本地模式檢查
    return orders.some((o) => o.orderNumber === orderNumber);
  }

  try {
    const snapshot = await db
      .collection("orders")
      .where("orderNumber", "==", orderNumber)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error("檢查訂單號碼失敗:", error);
    // 降級到本地檢查
    return orders.some((o) => o.orderNumber === orderNumber);
  }
}

// 新增訂單到 Firebase
async function addOrderToFirebase(orderData) {
  if (!isFirebaseEnabled) {
    console.log("Firebase 未啟用，僅儲存到本地");
    // 本地模式
    orders.unshift(orderData);
    localStorage.setItem("orders", JSON.stringify(orders));

    // 更新畫面
    filteredOrders = [...orders];
    loadOrders();

    return orderData;
  }

  try {
    const docRef = await db.collection("orders").add({
      ...orderData,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ 訂單已新增到 Firebase:", docRef.id);

    // 不需要手動更新 orders，即時監聽會自動更新
    return { ...orderData, firebaseId: docRef.id };
  } catch (error) {
    console.error("❌ 新增到 Firebase 失敗:", error);
    showAlert("無法同步到雲端，請檢查網路連線", "error");
    throw error;
  }
}

// 更新 Firebase 訂單
async function updateOrderInFirebase(firebaseId, orderData) {
  if (!isFirebaseEnabled || !firebaseId) {
    console.log("Firebase 未啟用或無效的文檔ID");
    return;
  }

  try {
    await db
      .collection("orders")
      .doc(firebaseId)
      .update({
        ...orderData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    console.log("✅ 訂單已更新到 Firebase:", firebaseId);
  } catch (error) {
    console.error("❌ 更新到 Firebase 失敗:", error);
    showAlert("無法同步更新到雲端", "error");
    throw error;
  }
}

// 從 Firebase 刪除訂單
async function deleteOrderFromFirebase(firebaseId) {
  if (!isFirebaseEnabled || !firebaseId) {
    return;
  }

  try {
    await db.collection("orders").doc(firebaseId).delete();
    console.log("✅ 訂單已從 Firebase 刪除:", firebaseId);
    // 不需要手動更新 orders，即時監聽會自動更新
  } catch (error) {
    console.error("❌ 從 Firebase 刪除失敗:", error);
    throw error;
  }
}

// 從 Firebase 載入菜品（保持監聽）
function startDishesListener() {
  if (!isFirebaseEnabled) {
    return;
  }

  db.collection("settings")
    .doc("dishes")
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          const firebaseDishes = doc.data().list;
          console.log(`✅ 菜品已更新: ${firebaseDishes.length} 個`);
          DISHES = firebaseDishes;
          localStorage.setItem("dishes", JSON.stringify(DISHES));
          renderDishesInForm(); // 重新渲染菜品列表
        }
      },
      (error) => {
        console.error("❌ 監聽菜品失敗:", error);
      },
    );
}

// 儲存菜品到 Firebase
async function saveDishesToFirebase() {
  if (!isFirebaseEnabled) {
    return;
  }

  try {
    await db.collection("settings").doc("dishes").set({
      list: DISHES,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    console.log("✅ 菜品已同步到 Firebase");
  } catch (error) {
    console.error("❌ 同步菜品到 Firebase 失敗:", error);
  }
}

// 頁面關閉時清理監聽器
window.addEventListener("beforeunload", () => {
  stopFirebaseListener();
});

// ==================== 原有程式碼 ====================

// 訂單數據存儲
let orders = [];
let groups = JSON.parse(localStorage.getItem("groups")) || [
  "電話訂購",
  "台灣特浦",
  "三隆鄉親",
  "茂叔代訂",
  "可可代訂",
];

// 分頁變數
let currentPage = 1;
let pageSize = 20;
let filteredOrders = [];

// 儲存菜品到 localStorage
async function saveDishes() {
  localStorage.setItem("dishes", JSON.stringify(DISHES));
  console.log("菜品已儲存:", DISHES);

  // 同步到 Firebase
  if (isFirebaseEnabled) {
    await saveDishesToFirebase();
  }
}

// 菜品列表 - 從 localStorage 載入，如果沒有則使用預設值
let DISHES = JSON.parse(localStorage.getItem("dishes")) || [
  { name: "甘蔗香燻雞", price: 680 },
  { name: "糖醋海鱸魚", price: 400 },
  { name: "洪家筍干Q蹄膀", price: 700 },
  { name: "皇品魚翅蝦仁羹", price: 700 },
  { name: "櫻花蝦米糕", price: 400 },
  { name: "御品干貝佛跳牆(不含甕)", price: 850 },
  { name: "蜜汁全排骨(五支)", price: 320 },
  { name: "白雪旗魚丸(一斤)", price: 230 },
  { name: "極鮮旗魚卷", price: 130 },
];

// 如果是首次使用，儲存預設菜品
if (!localStorage.getItem("dishes")) {
  localStorage.setItem("dishes", JSON.stringify(DISHES));
  console.log("首次載入，已儲存預設菜品");
}

// 安全載入訂單數據並驗證
try {
  const storedOrders = JSON.parse(localStorage.getItem("orders")) || [];
  // 過濾掉損壞的訂單（沒有 dishQuantities 的訂單）
  orders = storedOrders.filter((order) => {
    if (!order.dishQuantities || !order.customer) {
      console.warn("發現損壞的訂單，已自動移除:", order);
      return false;
    }
    return true;
  });
  // 如果有損壞的訂單被移除，更新 localStorage
  if (orders.length !== storedOrders.length) {
    localStorage.setItem("orders", JSON.stringify(orders));
    console.log(`已清理 ${storedOrders.length - orders.length} 筆損壞的訂單`);
  }
} catch (error) {
  console.error("載入訂單失敗，重置為空陣列:", error);
  orders = [];
  localStorage.setItem("orders", JSON.stringify(orders));
}

// 切換菜品管理區域顯示（開發者功能）
window.toggleDishManagement = function () {
  const section = document.getElementById("dishManagementSection");
  if (section) {
    const isHidden = section.style.display === "none";
    section.style.display = isHidden ? "block" : "none";
    console.log(
      `%c菜品管理功能已${isHidden ? "開啟" : "關閉"} ✓`,
      `color: ${
        isHidden ? "#27ae60" : "#e74c3c"
      }; font-size: 14px; font-weight: bold;`,
    );
    return isHidden ? "已開啟" : "已關閉";
  }
  console.error("找不到菜品管理區域");
  return "錯誤";
};

// 自訂提示窗函數
function showAlert(message, type = "info", callback = null) {
  const overlay = document.getElementById("customAlert");
  const icon = document.getElementById("alertIcon");
  const messageEl = document.getElementById("alertMessage");
  const buttonsEl = document.getElementById("alertButtons");

  // 設置圖標
  const icons = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };

  icon.textContent = icons[type] || icons.info;
  icon.className = `custom-alert-icon ${type}`;

  // 設置消息
  messageEl.textContent = message;

  // 設置按鈕
  buttonsEl.innerHTML = `
        <button class="custom-alert-btn custom-alert-btn-primary" onclick="closeAlert()">確定</button>
    `;

  // 顯示提示窗
  overlay.classList.add("show");

  // 如果有回調函數，設置確定按鈕的點擊事件
  if (callback) {
    const btn = buttonsEl.querySelector("button");
    btn.onclick = function () {
      closeAlert();
      callback();
    };
  }
}

function showConfirm(message, onConfirm, onCancel = null) {
  const overlay = document.getElementById("customAlert");
  const icon = document.getElementById("alertIcon");
  const messageEl = document.getElementById("alertMessage");
  const buttonsEl = document.getElementById("alertButtons");

  // 設置圖標
  icon.textContent = "❓";
  icon.className = "custom-alert-icon warning";

  // 設置消息
  messageEl.textContent = message;

  // 設置按鈕
  buttonsEl.innerHTML = `
        <button class="custom-alert-btn custom-alert-btn-secondary" id="cancelBtn">取消</button>
        <button class="custom-alert-btn custom-alert-btn-primary" id="confirmBtn">確定</button>
    `;

  // 顯示提示窗
  overlay.classList.add("show");

  // 設置按鈕事件
  document.getElementById("confirmBtn").onclick = function () {
    closeAlert();
    if (onConfirm) onConfirm();
  };

  document.getElementById("cancelBtn").onclick = function () {
    closeAlert();
    if (onCancel) onCancel();
  };
}

function closeAlert() {
  const overlay = document.getElementById("customAlert");
  overlay.classList.remove("show");
}

// 初始化頁面
document.addEventListener("DOMContentLoaded", async function () {
  console.log("頁面載入完成");
  console.log("DISHES 陣列:", DISHES);
  console.log("orders 陣列長度:", orders.length);

  // 開發者提示（不顯示密碼）
  console.log(
    "%c💡 管理員功能",
    "color: #f39c12; font-size: 16px; font-weight: bold;",
  );
  console.log(
    "%c啟用管理員模式：toggleAdminMode() 或按 Ctrl+Shift+A",
    "color: #3498db; font-size: 14px;",
  );
  console.log(
    "%c顯示菜品管理：toggleDishManagement()",
    "color: #3498db; font-size: 14px;",
  );

  // Firebase 即時同步
  if (isFirebaseEnabled) {
    console.log("🔥 啟動 Firebase 即時同步模式");
    try {
      // 啟動訂單即時監聽
      startFirebaseRealtimeListener();

      // 啟動菜品即時監聽
      startDishesListener();

      console.log("✅ Firebase 即時同步已啟動");
      console.log("📡 所有資料變更將即時同步給所有使用者");
    } catch (error) {
      console.error("❌ Firebase 啟動失敗，使用本地資料", error);
    }
  } else {
    // 本地模式：從 localStorage 載入
    console.log("💾 使用本地資料模式");
    filteredOrders = [...orders];
    loadOrders();
  }

  renderDishesInForm(); // 渲染菜品列表
  loadOrders();
  updateStatistics(); // 更新統計面板
  setupEventListeners();
  updateGroupOptions();
});

// 更新統計面板
function updateStatistics() {
  const totalOrdersEl = document.getElementById("totalOrders");
  const totalRevenueEl = document.getElementById("totalRevenue");
  const popularDishEl = document.getElementById("popularDish");

  // 如果不在有統計面板的頁面，直接返回
  if (!totalOrdersEl || !totalRevenueEl || !popularDishEl) {
    return;
  }

  // 計算總訂單數
  totalOrdersEl.textContent = orders.length;

  // 計算總金額
  const totalRevenue = orders.reduce(
    (sum, order) => sum + (order.total || 0),
    0,
  );
  totalRevenueEl.textContent = `NT$ ${totalRevenue.toLocaleString()}`;

  // 計算熱門菜品
  const dishCounts = {};
  orders.forEach((order) => {
    if (order.dishQuantities) {
      Object.keys(order.dishQuantities).forEach((dishName) => {
        const qty = order.dishQuantities[dishName] || 0;
        if (qty > 0) {
          dishCounts[dishName] = (dishCounts[dishName] || 0) + qty;
        }
      });
    }
  });

  const sortedDishes = Object.entries(dishCounts).sort((a, b) => b[1] - a[1]);
  if (sortedDishes.length > 0) {
    popularDishEl.textContent = `${sortedDishes[0][0]} (${sortedDishes[0][1]})`;
  } else {
    popularDishEl.textContent = "-";
  }
}

// 設置事件監聽器
function setupEventListeners() {
  // 表單提交
  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    // ⚠️ 檢查是否為 order.html（它有自己的 submitOrder 函數）
    // order.html 使用 inline onsubmit="submitOrder(event)"
    // 只有其他頁面（ChineseNewYear_Dishes.html 等）才使用這個事件監聽器
    const hasInlineSubmit = orderForm.getAttribute("onsubmit");
    if (!hasInlineSubmit) {
      orderForm.addEventListener("submit", handleFormSubmit);
    }
  }

  // 搜索輸入即時搜尋
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", searchOrders);
  }

  // 群組篩選
  const groupFilter = document.getElementById("groupFilter");
  if (groupFilter) {
    groupFilter.addEventListener("change", searchOrders);
  }

  // 離開頁面前的提醒
  window.addEventListener("beforeunload", function (e) {
    // 只有當有訂單資料時才提醒
    if (orders.length > 0) {
      const message = "您有訂單資料尚未匯出備份，確定要離開嗎？";
      e.preventDefault();
      e.returnValue = message; // Chrome 需要設定 returnValue
      return message; // 其他瀏覽器
    }
  });
}

// 增加數量（點擊數量框）
function incrementQuantity(quantityBox) {
  const row = quantityBox.closest(".dish-input-row");
  const display = quantityBox.querySelector(".quantity-display");
  let currentQty = parseInt(display.textContent) || 0;
  currentQty++;
  display.textContent = currentQty;

  // 更新樣式
  if (currentQty > 0) {
    quantityBox.classList.add("has-value");
  } else {
    quantityBox.classList.remove("has-value");
  }

  // 更新小計和總計
  updateRowSubtotal(row);

  // 判斷是在訂購表單還是編輯模式
  const isEditMode = row.closest("#editFormContainer") !== null;
  if (isEditMode) {
    calculateEditTotal();
  } else {
    calculateTotal();
  }
}

// 重置所有數量
function resetAllQuantities() {
  showConfirm("確定要重置所有菜品數量嗎？", () => {
    document.querySelectorAll(".quantity-box").forEach((box) => {
      const display = box.querySelector(".quantity-display");
      display.textContent = "0";
      box.classList.remove("has-value");
    });

    document.querySelectorAll(".dish-input-row").forEach((row) => {
      updateRowSubtotal(row);
    });

    calculateTotal();
  });
}

// 重置單一菜品數量
function resetDishQuantity(button) {
  const row = button.closest(".dish-input-row");
  const quantityBox = row.querySelector(".quantity-box");
  const display = quantityBox.querySelector(".quantity-display");

  display.textContent = "0";
  quantityBox.classList.remove("has-value");

  // 更新小計和總計
  updateRowSubtotal(row);

  // 判斷是在訂購表單還是編輯模式
  const isEditMode = row.closest("#editFormContainer") !== null;
  if (isEditMode) {
    calculateEditTotal();
  } else {
    calculateTotal();
  }
}

// 更新單行小計
function updateRowSubtotal(row) {
  const price = parseInt(row.getAttribute("data-price"));
  const quantityBox = row.querySelector(".quantity-box");
  const quantity =
    parseInt(quantityBox.querySelector(".quantity-display").textContent) || 0;
  const subtotal = price * quantity;
  row.querySelector(".dish-subtotal").textContent =
    "NT$ " + subtotal.toLocaleString();
}

// 計算總金額
function calculateTotal() {
  let total = 0;
  // 只計算訂購表單中的菜品（不包括菜品管理區）
  const form = document.getElementById("orderForm");
  if (form) {
    form.querySelectorAll(".dish-input-row").forEach((row) => {
      const price = parseInt(row.getAttribute("data-price"));
      const quantityBox = row.querySelector(".quantity-box");
      const quantity =
        parseInt(quantityBox.querySelector(".quantity-display").textContent) ||
        0;
      total += price * quantity;
    });
  }

  const orderTotalEl = document.getElementById("orderTotal");
  if (orderTotalEl) {
    orderTotalEl.textContent = total.toLocaleString();
  }
}

// 新增群組
function addNewGroup() {
  const groupName = prompt("請輸入新群組名稱：");
  if (groupName && groupName.trim()) {
    const trimmedName = groupName.trim();
    if (!groups.includes(trimmedName)) {
      groups.push(trimmedName);
      localStorage.setItem("groups", JSON.stringify(groups));
      updateGroupOptions();
      document.getElementById("customerGroup").value = trimmedName;
    } else {
      showAlert("此群組已存在！", "error");
    }
  }
}

// 更新群組選項
function updateGroupOptions() {
  const groupSelect = document.getElementById("customerGroup");
  const groupFilter = document.getElementById("groupFilter");

  // 如果不在有這些元素的頁面，直接返回
  if (!groupSelect && !groupFilter) {
    return;
  }

  // 更新表單群組選項
  if (groupSelect) {
    groupSelect.innerHTML = '<option value="">請選擇或新增群組</option>';
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      groupSelect.appendChild(option);
    });
  }

  // 更新篩選群組選項
  if (groupFilter) {
    groupFilter.innerHTML = '<option value="">所有群組</option>';
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group;
      option.textContent = group;
      groupFilter.appendChild(option);
    });
  }
}

// 處理表單提交
async function handleFormSubmit(e) {
  e.preventDefault();

  const orderNumber = document.getElementById("orderNumber").value.trim();

  // 從 Firebase 即時檢查訂單號碼是否重複
  const isDuplicate = await checkOrderNumberExists(orderNumber);
  if (isDuplicate) {
    showAlert("此訂單號碼已存在，請使用不同的號碼！", "error");
    return;
  }

  const customerData = {
    name: document.getElementById("customerName").value,
    phone: document.getElementById("customerPhone").value,
    group: document.getElementById("customerGroup").value,
    note: document.getElementById("customerNote").value,
  };

  // 收集數量 > 0 的菜品（只從訂購表單中收集）
  const dishQuantities = {};
  let hasOrder = false;

  const form = document.getElementById("orderForm");
  form.querySelectorAll(".dish-input-row").forEach((row) => {
    const dishName = row.getAttribute("data-name");
    const quantityBox = row.querySelector(".quantity-box");
    if (quantityBox) {
      const quantity =
        parseInt(quantityBox.querySelector(".quantity-display").textContent) ||
        0;
      dishQuantities[dishName] = quantity;
      if (quantity > 0) hasOrder = true;
    }
  });

  if (!hasOrder) {
    showAlert("請至少訂購一個菜品（數量 > 0）", "error");
    return;
  }

  // 計算總金額
  let total = 0;
  DISHES.forEach((dish) => {
    const qty = dishQuantities[dish.name] || 0;
    total += dish.price * qty;
  });

  const orderData = {
    id: Date.now(),
    orderNumber: orderNumber,
    customer: customerData,
    dishQuantities: dishQuantities,
    total: total,
    createdAt: new Date().toISOString(),
  };

  console.log("準備儲存的訂單:", orderData);

  try {
    // 直接新增到 Firebase（會自動觸發即時監聯更新畫面）
    await addOrderToFirebase(orderData);

    console.log("✅ 訂單已成功新增");

    resetForm();
    showAlert("訂單已成功建立！", "success");

    const ordersSection = document.querySelector(".orders-section");
    if (ordersSection) {
      ordersSection.scrollIntoView({ behavior: "smooth" });
    }
  } catch (error) {
    console.error("新增訂單失敗:", error);
    showAlert("新增訂單失敗，請稍後再試", "error");
  }
}

// 重置表單
function resetForm() {
  const form = document.getElementById("orderForm");
  if (!form) {
    return; // 不在有表單的頁面
  }

  form.reset();
  document.querySelectorAll(".quantity-box").forEach((box) => {
    const display = box.querySelector(".quantity-display");
    display.textContent = "0";
    box.classList.remove("has-value");
  });
  document.querySelectorAll(".dish-input-row").forEach((row) => {
    const subtotalEl = row.querySelector(".dish-subtotal");
    if (subtotalEl) {
      subtotalEl.textContent = "NT$ 0";
    }
  });

  const orderTotalEl = document.getElementById("orderTotal");
  if (orderTotalEl) {
    orderTotalEl.textContent = "0";
  }
}

// 保存訂單到 LocalStorage
// 儲存訂單到本地（僅用於本地模式或備份）
function saveOrders() {
  try {
    localStorage.setItem("orders", JSON.stringify(orders));
    console.log("訂單已儲存到 localStorage，共", orders.length, "筆");
  } catch (error) {
    console.error("儲存訂單失敗:", error);
  }
}

// 載入訂單（表格版本 + 分頁）
function loadOrders() {
  const tbody = document.getElementById("ordersTableBody");

  // 如果不在訂單管理頁面，直接返回
  if (!tbody) {
    console.log("目前頁面不包含訂單表格，跳過 loadOrders");
    return;
  }

  // 確保 filteredOrders 有值（僅在未初始化時設定）
  if (!Array.isArray(filteredOrders)) {
    filteredOrders = [...orders];
  }

  // 訂單號碼排序（由小到大）
  filteredOrders.sort((a, b) => {
    const numA = a.orderNumber || a.id.toString();
    const numB = b.orderNumber || b.id.toString();

    // 嘗試轉換成數字比較
    const parseNum = (str) => {
      const num = parseInt(str.replace(/\D/g, ""));
      return isNaN(num) ? 0 : num;
    };

    const valA = parseNum(numA);
    const valB = parseNum(numB);

    if (valA !== valB) {
      return valA - valB;
    }

    // 如果數字相同，用字串比較
    return numA.localeCompare(numB);
  });

  // 如果沒有訂單
  if (filteredOrders.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="no-orders-row">目前沒有訂單</td></tr>';
    updatePaginationInfo();
    return;
  }

  // 計算分頁
  const totalPages = Math.ceil(filteredOrders.length / pageSize);
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  if (currentPage < 1) {
    currentPage = 1;
  }

  // 計算當前頁的訂單範圍
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredOrders.length);
  const currentOrders = filteredOrders.slice(startIndex, endIndex);

  // 生成表格行
  tbody.innerHTML = currentOrders
    .map((order) => {
      // 判斷是否需要隱碼
      const needMask = shouldMaskOrder();
      const orderNumber = order.orderNumber || order.id;

      // 根據權限決定顯示的資料
      const displayName = needMask
        ? maskName(order.customer.name)
        : order.customer.name;
      const displayPhone = needMask
        ? maskPhone(order.customer.phone)
        : order.customer.phone;
      const displayGroup = needMask
        ? maskGroup(order.customer.group)
        : order.customer.group || "未分組";

      // 根據管理員模式決定是否顯示編輯/刪除按鈕
      const adminButtons = isAdminMode
        ? `
            <button class="btn-edit-small" onclick="editOrder(${order.id})">編輯</button>
            <button class="btn-delete-small" onclick="deleteOrder(${order.id})">刪除</button>
          `
        : "";

      return `
        <tr>
          <td class="order-number" data-label="訂單號碼">${orderNumber}</td>
          <td data-label="訂購人">${displayName}</td>
          <td data-label="聯絡電話">${displayPhone}</td>
          <td data-label="所屬群組">${displayGroup}</td>
          <td class="order-date" data-label="訂購日期">${formatDate(
            order.createdAt,
          )}</td>
          <td class="order-total" data-label="總金額">NT$ ${order.total.toLocaleString()}</td>
          <td class="order-actions" data-label="操作">
            <button class="btn-detail" onclick="showOrderDetail(${
              order.id
            })">詳情</button>
            ${adminButtons}
          </td>
        </tr>
      `;
    })
    .join("");

  // 更新分頁資訊
  updatePaginationInfo();
  updatePaginationButtons();
  updateStatistics(); // 更新統計面板
}

// 更新分頁資訊顯示
function updatePaginationInfo() {
  const pageInfoEl = document.getElementById("pageInfo");
  const currentPageEl = document.getElementById("currentPage");

  if (!pageInfoEl || !currentPageEl) {
    return; // 不在訂單管理頁面
  }

  const totalOrders = filteredOrders.length;
  const totalPages = Math.ceil(totalOrders / pageSize);
  const startIndex = totalOrders === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalOrders);

  pageInfoEl.textContent = `顯示第 ${startIndex}-${endIndex} 筆，共 ${totalOrders} 筆訂單`;
  currentPageEl.textContent = `第 ${currentPage} / ${totalPages} 頁`;
}

// 更新分頁按鈕狀態
function updatePaginationButtons() {
  const firstBtn = document.getElementById("firstPageBtn");
  const prevBtn = document.getElementById("prevPageBtn");
  const nextBtn = document.getElementById("nextPageBtn");
  const lastBtn = document.getElementById("lastPageBtn");

  if (!firstBtn || !prevBtn || !nextBtn || !lastBtn) {
    return; // 不在訂單管理頁面
  }

  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  firstBtn.disabled = currentPage === 1;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages || totalPages === 0;
  lastBtn.disabled = currentPage === totalPages || totalPages === 0;
}

// 換頁功能
function changePage(direction) {
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  switch (direction) {
    case "first":
      currentPage = 1;
      break;
    case "prev":
      if (currentPage > 1) currentPage--;
      break;
    case "next":
      if (currentPage < totalPages) currentPage++;
      break;
    case "last":
      currentPage = totalPages;
      break;
  }

  loadOrders();
}

// 變更每頁顯示數量
function changePageSize() {
  const select = document.getElementById("pageSizeSelect");
  pageSize = parseInt(select.value);
  currentPage = 1; // 重置到第一頁
  loadOrders();
}

// 顯示訂單詳情
function showOrderDetail(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order) return;

  // 安全檢查
  if (!order.dishQuantities) {
    showAlert("訂單資料異常，無法顯示詳情");
    return;
  }

  // 判斷是否需要隱碼
  const needMask = shouldMaskOrder();
  const orderNumber = order.orderNumber || order.id;
  const displayName = needMask
    ? maskName(order.customer.name)
    : order.customer.name;
  const displayPhone = needMask
    ? maskPhone(order.customer.phone)
    : order.customer.phone;
  const displayGroup = needMask
    ? maskGroup(order.customer.group)
    : order.customer.group || "未分組";

  // 計算訂購的菜品
  const orderedDishes = DISHES.filter(
    (dish) => order.dishQuantities[dish.name] > 0,
  );

  // 生成詳情內容
  const detailContent = `
    <div class="order-detail-wrapper">
      <h3 class="order-detail-title">訂單詳情 - ${orderNumber}</h3>
      
      <div class="customer-info-box">
        <h4 class="section-title">訂購人資訊</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">姓名：</span>
            <span class="info-value">${displayName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">電話：</span>
            <span class="info-value">${displayPhone}</span>
          </div>
          <div class="info-item">
            <span class="info-label">群組：</span>
            <span class="info-value">${displayGroup}</span>
          </div>
          <div class="info-item">
            <span class="info-label">日期：</span>
            <span class="info-value">${formatDate(order.createdAt)}</span>
          </div>
        </div>
        ${
          order.customer.note
            ? `<div class="info-note"><span class="info-label">備註：</span><span class="info-value">${order.customer.note}</span></div>`
            : ""
        }
      </div>

      <div class="dishes-detail-box">
        <h4 class="section-title">訂購菜品</h4>
        <div class="dishes-detail-table">
          <table class="detail-table">
            <thead>
              <tr>
                <th>菜品名稱</th>
                <th>單價</th>
                <th>數量</th>
                <th>小計</th>
              </tr>
            </thead>
            <tbody>
              ${orderedDishes
                .map((dish) => {
                  const qty = order.dishQuantities[dish.name];
                  const subtotal = dish.price * qty;
                  return `
                  <tr>
                    <td data-label="菜品">${dish.name}</td>
                    <td data-label="單價">NT$ ${dish.price.toLocaleString()}</td>
                    <td data-label="數量">${qty}</td>
                    <td data-label="小計"><strong>NT$ ${subtotal.toLocaleString()}</strong></td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3">總金額：</td>
                <td class="total-amount">NT$ ${order.total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;

  // 顯示 Modal
  const modal = document.getElementById("orderDetailModal");
  const contentDiv = document.getElementById("orderDetailContainer");
  contentDiv.innerHTML = detailContent;
  modal.style.display = "flex";
}

// 關閉訂單詳情
function closeOrderDetailModal() {
  document.getElementById("orderDetailModal").style.display = "none";
}

// 格式化日期
function formatDate(dateInput) {
  let date;

  // 處理 Firebase Timestamp 物件
  if (dateInput && typeof dateInput.toDate === "function") {
    date = dateInput.toDate();
  }
  // 處理已經是 Date 物件的情況
  else if (dateInput instanceof Date) {
    date = dateInput;
  }
  // 處理字串格式（ISO 8601 等）
  else if (typeof dateInput === "string") {
    date = new Date(dateInput);
  }
  // 處理數字時間戳（毫秒）
  else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  }
  // 無效輸入
  else {
    console.warn("無效的日期格式:", dateInput);
    return "無效日期";
  }

  // 檢查日期是否有效
  if (isNaN(date.getTime())) {
    console.warn("無法解析日期:", dateInput);
    return "無效日期";
  }

  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}/${String(date.getDate()).padStart(2, "0")} ${String(
    date.getHours(),
  ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// 編輯訂單
function editOrder(orderId) {
  const order = orders.find((o) => o.id === orderId);
  if (!order || !order.dishQuantities) return;

  const dishRowsHTML = DISHES.map((dish) => {
    const qty = order.dishQuantities[dish.name] || 0;
    const subtotal = dish.price * qty;
    const hasValueClass = qty > 0 ? "has-value" : "";
    return `
            <div class="dish-input-row" data-name="${dish.name}" data-price="${
              dish.price
            }">
                <div class="dish-name">${dish.name}</div>
                <div class="dish-price">NT$ ${dish.price.toLocaleString()}</div>
                <div class="quantity-box ${hasValueClass}" onclick="incrementQuantity(this)">
                    <span class="quantity-display">${qty}</span>
                </div>
                <div class="dish-subtotal">NT$ ${subtotal.toLocaleString()}</div>
                <button type="button" class="btn-reset-dish" onclick="resetDishQuantity(this)" title="重置此菜品數量">🔄</button>
            </div>
        `;
  }).join("");

  const modalContent = `
        <form id="editOrderForm">
            <div class="form-group">
                <h3>訂購人資料</h3>
                <div class="form-row">
                    <div class="form-field">
                        <label for="editOrderNumber">訂單號碼 *</label>
                        <input type="text" id="editOrderNumber" value="${
                          order.orderNumber || order.id
                        }" required>
                    </div>
                    <div class="form-field">
                        <label for="editCustomerName">姓名 *</label>
                        <input type="text" id="editCustomerName" value="${
                          order.customer.name
                        }" required>
                    </div>
                    <div class="form-field">
                        <label for="editCustomerPhone">聯絡電話 *</label>
                        <input type="tel" id="editCustomerPhone" value="${
                          order.customer.phone
                        }" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-field">
                        <label for="editCustomerGroup">所屬群組 *</label>
                        <select id="editCustomerGroup" required>
                            <option value="">請選擇群組</option>
                            ${groups
                              .map(
                                (group) =>
                                  `<option value="${group}" ${
                                    order.customer.group === group
                                      ? "selected"
                                      : ""
                                  }>${group}</option>`,
                              )
                              .join("")}
                        </select>
                    </div>
                </div>
                <div class="form-field">
                    <label for="editCustomerNote">備註</label>
                    <textarea id="editCustomerNote" rows="2">${
                      order.customer.note || ""
                    }</textarea>
                </div>
            </div>
            
            <div class="form-group">
                <h3>菜品訂購（點擊數量快速增加）</h3>
                <div class="dishes-table">
                    <div class="dishes-header">
                        <div>菜品名稱</div>
                        <div>單價</div>
                        <div>數量</div>
                        <div>小計</div>
                        <div>操作</div>
                    </div>
                    ${dishRowsHTML}
                </div>
                <div class="quantity-controls">
                    <button type="button" class="btn-reset-quantities" onclick="resetEditQuantities()">🔄 重置所有數量</button>
                </div>
            </div>
            
            <div class="form-group">
                <div class="total-section">
                    <h3>訂單總金額：NT$ <span id="editOrderTotal">${order.total.toLocaleString()}</span></h3>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="submit" class="btn-primary">更新訂單</button>
                <button type="button" class="btn-secondary" onclick="closeEditModal()">取消</button>
            </div>
        </form>
    `;

  document.getElementById("editFormContainer").innerHTML = modalContent;
  document.getElementById("editModal").style.display = "block";

  // 設置編輯表單事件監聽
  document
    .getElementById("editOrderForm")
    .addEventListener("submit", function (e) {
      handleEditSubmit(e, orderId);
    });
}

// 重置編輯模式的數量
function resetEditQuantities() {
  showConfirm("確定要重置所有菜品數量嗎？", () => {
    document
      .querySelectorAll("#editFormContainer .quantity-box")
      .forEach((box) => {
        const display = box.querySelector(".quantity-display");
        display.textContent = "0";
        box.classList.remove("has-value");
      });

    document
      .querySelectorAll("#editFormContainer .dish-input-row")
      .forEach((row) => {
        updateRowSubtotal(row);
      });

    calculateEditTotal();
  });
}

// 計算編輯模式的總金額
function calculateEditTotal() {
  let total = 0;
  document
    .querySelectorAll("#editFormContainer .dish-input-row")
    .forEach((row) => {
      const price = parseInt(row.getAttribute("data-price"));
      const quantityBox = row.querySelector(".quantity-box");
      const quantity =
        parseInt(quantityBox.querySelector(".quantity-display").textContent) ||
        0;
      total += price * quantity;
    });
  document.getElementById("editOrderTotal").textContent =
    total.toLocaleString();
}

// 處理編輯表單提交
async function handleEditSubmit(e, orderId) {
  e.preventDefault();

  const orderIndex = orders.findIndex((o) => o.id === orderId);
  if (orderIndex === -1) return;

  const editOrderNumber = document
    .getElementById("editOrderNumber")
    .value.trim();

  // 檢查訂單號碼是否與其他訂單重複（排除自己）
  const isDuplicate = orders.some(
    (order, index) =>
      index !== orderIndex && order.orderNumber === editOrderNumber,
  );
  if (isDuplicate) {
    showAlert("此訂單號碼已存在，請使用不同的號碼！", "error");
    return;
  }

  const customerData = {
    name: document.getElementById("editCustomerName").value,
    phone: document.getElementById("editCustomerPhone").value,
    group: document.getElementById("editCustomerGroup").value,
    note: document.getElementById("editCustomerNote").value,
  };

  const dishQuantities = {};
  let hasOrder = false;

  document
    .querySelectorAll("#editFormContainer .dish-input-row")
    .forEach((row) => {
      const dishName = row.getAttribute("data-name");
      const quantityBox = row.querySelector(".quantity-box");
      const quantity =
        parseInt(quantityBox.querySelector(".quantity-display").textContent) ||
        0;
      dishQuantities[dishName] = quantity;
      if (quantity > 0) hasOrder = true;
    });

  if (!hasOrder) {
    showAlert("請至少訂購一個菜品（數量 > 0）", "error");
    return;
  }

  let total = 0;
  DISHES.forEach((dish) => {
    const qty = dishQuantities[dish.name] || 0;
    total += dish.price * qty;
  });

  const updatedOrderData = {
    orderNumber: editOrderNumber,
    customer: customerData,
    dishQuantities: dishQuantities,
    total: total,
  };

  try {
    if (isFirebaseEnabled && orders[orderIndex].firebaseId) {
      // Firebase 模式：更新到 Firebase（即時監聽會自動更新畫面）
      await updateOrderInFirebase(
        orders[orderIndex].firebaseId,
        updatedOrderData,
      );
      showAlert("訂單已成功更新！", "success");
    } else {
      // 本地模式：更新陣列並儲存到 localStorage
      orders[orderIndex] = {
        ...orders[orderIndex],
        ...updatedOrderData,
      };
      saveOrders();
      filteredOrders = [...orders]; // 重置為全部訂單
      loadOrders();
      showAlert("訂單已成功更新！", "success");
    }

    closeEditModal();
  } catch (error) {
    console.error("更新訂單失敗:", error);
    showAlert("更新訂單失敗：" + (error.message || "請稍後再試"), "error");
  }
}

// 關閉編輯Modal
function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

// 刪除訂單
function deleteOrder(orderId) {
  showConfirm("確定要刪除此訂單嗎？", async () => {
    try {
      const orderToDelete = orders.find((o) => o.id === orderId);

      if (!orderToDelete) {
        showAlert("找不到訂單", "error");
        return;
      }

      if (isFirebaseEnabled && orderToDelete.firebaseId) {
        // Firebase 模式：直接從 Firebase 刪除（會自動觸發即時監聽更新畫面）
        await deleteOrderFromFirebase(orderToDelete.firebaseId);
        showAlert("訂單已刪除", "success");
      } else {
        // 本地模式：從陣列中移除
        orders = orders.filter((o) => o.id !== orderId);
        localStorage.setItem("orders", JSON.stringify(orders));

        filteredOrders = [...orders];
        loadOrders();

        showAlert("訂單已刪除", "success");
      }
    } catch (error) {
      console.error("刪除訂單失敗:", error);
      showAlert("刪除訂單失敗，請稍後再試", "error");
    }
  });
}

// 搜尋訂單
function searchOrders() {
  const searchInput = document.getElementById("searchInput");
  const groupFilterEl = document.getElementById("groupFilter");

  // 如果不在搜尋頁面，直接返回
  if (!searchInput || !groupFilterEl) {
    return;
  }

  const searchTerm = searchInput.value.toLowerCase();
  const groupFilter = groupFilterEl.value;

  // 重置到第一頁
  currentPage = 1;

  // 應用篩選條件到全局 filteredOrders
  filteredOrders = [...orders];

  // 群組篩選
  if (groupFilter) {
    filteredOrders = filteredOrders.filter(
      (order) => order.customer.group === groupFilter,
    );
  }

  // 關鍵字搜尋（只在有輸入搜尋詞時才進行）
  if (searchTerm) {
    filteredOrders = filteredOrders.filter((order) => {
      return (
        (order.orderNumber &&
          order.orderNumber.toLowerCase().includes(searchTerm)) ||
        order.customer.name.toLowerCase().includes(searchTerm) ||
        order.customer.phone.includes(searchTerm) ||
        (order.customer.group &&
          order.customer.group.toLowerCase().includes(searchTerm)) ||
        DISHES.some(
          (dish) =>
            dish.name.toLowerCase().includes(searchTerm) &&
            order.dishQuantities &&
            order.dishQuantities[dish.name] > 0,
        )
      );
    });
  }

  // 顯示搜尋結果提示
  if (groupFilter || searchTerm) {
    const filterInfo = [];
    if (groupFilter) filterInfo.push(`群組: ${groupFilter}`);
    if (searchTerm) filterInfo.push(`關鍵字: ${searchTerm}`);
    console.log(
      `🔍 搜尋條件：${filterInfo.join(", ")} | 結果：${
        filteredOrders.length
      } 筆`,
    );
  }

  // 使用表格版本的 loadOrders 重新渲染
  loadOrders();
}

// 清除搜尋
function clearSearch() {
  const searchInput = document.getElementById("searchInput");
  const groupFilterEl = document.getElementById("groupFilter");

  // 如果不在搜尋頁面，直接返回
  if (!searchInput || !groupFilterEl) {
    return;
  }

  searchInput.value = "";
  groupFilterEl.value = "";
  currentPage = 1;
  // 重置 filteredOrders 為全部訂單
  filteredOrders = [...orders];
  loadOrders();
}

// 更新統計資料
// updateStatistics 函數已移除（統計資訊已整合到匯出功能中）

// 匯入 Excel
function importFromExcel(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      // 讀取第一個工作表
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        showAlert("Excel 檔案中沒有資料", "warning");
        return;
      }

      // 準備待處理的訂單陣列
      const pendingOrders = [];
      let skippedCount = 0;

      jsonData.forEach((row, index) => {
        // 跳過統計列
        if (row["訂購人"] === "【統計】") {
          return;
        }

        // 驗證必要欄位
        if (!row["訂購人"] || !row["聯絡電話"]) {
          skippedCount++;
          return;
        }

        // 收集菜品數量
        const dishQuantities = {};
        let hasOrder = false;

        DISHES.forEach((dish) => {
          const qty = parseInt(row[dish.name]) || 0;
          dishQuantities[dish.name] = qty;
          if (qty > 0) hasOrder = true;
        });

        // 如果沒有訂購任何菜品，跳過此筆
        if (!hasOrder) {
          skippedCount++;
          return;
        }

        // 計算總金額
        let total = 0;
        DISHES.forEach((dish) => {
          const qty = dishQuantities[dish.name] || 0;
          total += dish.price * qty;
        });

        // 取得匯入的訂單號碼
        const importOrderNumber = row["訂單號碼"]
          ? row["訂單號碼"].toString()
          : "";

        // 建立訂單物件
        const order = {
          id: Date.now() + index,
          orderNumber: importOrderNumber || (Date.now() + index).toString(),
          customer: {
            name: row["訂購人"].toString(),
            phone: row["聯絡電話"].toString(),
            group: row["所屬群組"] || "未分組",
            note: row["備註"] || "",
          },
          dishQuantities: dishQuantities,
          total: total,
          createdAt: new Date().toISOString(),
        };

        pendingOrders.push(order);
      });

      // 清除 file input
      event.target.value = "";

      // 開始處理訂單（逐筆檢查重複）
      processPendingOrders(pendingOrders, skippedCount);
    } catch (error) {
      console.error("匯入錯誤：", error);
      showAlert("匯入失敗，請確認檔案格式是否正確", "error");
    }
  };

  reader.onerror = function () {
    showAlert("檔案讀取失敗", "error");
  };

  reader.readAsArrayBuffer(file);
}

// 處理待匯入的訂單（逐筆檢查重複）
let pendingOrdersQueue = [];
let currentOrderIndex = 0;
let importStats = {
  imported: 0,
  updated: 0,
  duplicate: 0,
  skipped: 0,
};

function processPendingOrders(pendingOrders, skippedCount) {
  pendingOrdersQueue = pendingOrders;
  currentOrderIndex = 0;
  importStats = {
    imported: 0,
    updated: 0,
    duplicate: 0,
    skipped: skippedCount,
  };

  processNextOrder();
}

function processNextOrder() {
  if (currentOrderIndex >= pendingOrdersQueue.length) {
    // 所有訂單處理完成
    finishImport();
    return;
  }

  const order = pendingOrdersQueue[currentOrderIndex];

  // 檢查訂單號碼是否重複
  const existingByOrderNumber = orders.find(
    (o) => o.orderNumber === order.orderNumber,
  );

  // 檢查客戶是否已存在（根據姓名和電話）
  const existingByCustomer = orders.find(
    (o) =>
      o.customer.name === order.customer.name &&
      o.customer.phone === order.customer.phone,
  );

  if (existingByOrderNumber || existingByCustomer) {
    // 發現重複，顯示處理視窗
    const existingOrder = existingByOrderNumber || existingByCustomer;
    const duplicateType = existingByOrderNumber ? "訂單號碼" : "客戶資訊";
    showDuplicateOrderModal(existingOrder, order, duplicateType);
  } else {
    // 沒有重複，直接加入
    orders.unshift(order);
    importStats.imported++;
    currentOrderIndex++;
    processNextOrder();
  }
}

function showDuplicateOrderModal(existingOrder, newOrder, duplicateType) {
  const modal = document.getElementById("duplicateOrderModal");
  const duplicateInfo = document.getElementById("duplicateInfo");
  const existingDetail = document.getElementById("existingOrderDetail");
  const importDetail = document.getElementById("importOrderDetail");
  const progress = document.getElementById("duplicateProgress");

  // 設定提示訊息
  duplicateInfo.textContent = `發現重複的${duplicateType}：${
    duplicateType === "訂單號碼" ? newOrder.orderNumber : newOrder.customer.name
  }`;

  // 設定進度
  progress.textContent = `處理進度：${currentOrderIndex + 1} / ${
    pendingOrdersQueue.length
  }`;

  // 渲染現有訂單詳情
  existingDetail.innerHTML = renderOrderDetail(existingOrder);

  // 渲染匯入訂單詳情
  importDetail.innerHTML = renderOrderDetail(newOrder);

  // 顯示 modal
  modal.style.display = "block";
}

function renderOrderDetail(order) {
  let html = `
    <div class="detail-row">
      <span class="detail-label">訂單號碼：</span>
      <span class="detail-value">${order.orderNumber}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">訂購人：</span>
      <span class="detail-value">${order.customer.name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">聯絡電話：</span>
      <span class="detail-value">${order.customer.phone}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">所屬群組：</span>
      <span class="detail-value">${order.customer.group}</span>
    </div>
  `;

  if (order.customer.note) {
    html += `
      <div class="detail-row">
        <span class="detail-label">備註：</span>
        <span class="detail-value">${order.customer.note}</span>
      </div>
    `;
  }

  html += `<div class="dishes-section"><h4>📋 訂購明細</h4>`;

  let hasDishes = false;
  DISHES.forEach((dish) => {
    const qty = order.dishQuantities[dish.name] || 0;
    if (qty > 0) {
      hasDishes = true;
      const subtotal = dish.price * qty;
      html += `
        <div class="dish-item">
          <span>${dish.name} × ${qty}</span>
          <span>NT$ ${subtotal.toLocaleString()}</span>
        </div>
      `;
    }
  });

  if (!hasDishes) {
    html += `<p style="color: #999; text-align: center;">無訂購項目</p>`;
  }

  html += `</div>`;

  html += `
    <div class="total-section">
      <span>總金額：</span>
      <span>NT$ ${order.total.toLocaleString()}</span>
    </div>
  `;

  return html;
}

function handleDuplicateOrder(action) {
  const modal = document.getElementById("duplicateOrderModal");
  const newOrder = pendingOrdersQueue[currentOrderIndex];

  if (action === "skip") {
    // 跳過此筆
    importStats.duplicate++;

    // 關閉 modal
    modal.style.display = "none";

    // 處理下一筆
    currentOrderIndex++;
    processNextOrder();
  } else if (action === "update") {
    // 更新覆蓋
    const existingIndex = orders.findIndex(
      (o) =>
        o.orderNumber === newOrder.orderNumber ||
        (o.customer.name === newOrder.customer.name &&
          o.customer.phone === newOrder.customer.phone),
    );
    if (existingIndex >= 0) {
      orders[existingIndex] = newOrder;
      importStats.updated++;
    }

    // 關閉 modal
    modal.style.display = "none";

    // 處理下一筆
    currentOrderIndex++;
    processNextOrder();
  }
}

function showCustomOrderNumberInput() {
  const section = document.getElementById("customOrderNumberSection");
  const input = document.getElementById("customOrderNumber");
  const newOrder = pendingOrdersQueue[currentOrderIndex];

  // 顯示輸入區
  section.style.display = "block";

  // 預設值：原訂單號碼 + 後綴
  input.value = `${newOrder.orderNumber}_副本`;

  // 聚焦並選取文字
  setTimeout(() => {
    input.focus();
    input.select();
  }, 100);
}

function hideCustomOrderNumberInput() {
  const section = document.getElementById("customOrderNumberSection");
  section.style.display = "none";
}

function confirmCustomOrderNumber() {
  const input = document.getElementById("customOrderNumber");
  const customOrderNumber = input.value.trim();

  if (!customOrderNumber) {
    showAlert("請輸入訂單號碼", "warning");
    return;
  }

  // 檢查新的訂單號碼是否已存在
  const exists = orders.find((o) => o.orderNumber === customOrderNumber);
  if (exists) {
    showAlert(
      `訂單號碼「${customOrderNumber}」已存在，請使用其他號碼`,
      "error",
    );
    return;
  }

  // 強制加入（使用自訂的訂單號碼）
  const modal = document.getElementById("duplicateOrderModal");
  const newOrder = pendingOrdersQueue[currentOrderIndex];

  newOrder.orderNumber = customOrderNumber;
  orders.unshift(newOrder);
  importStats.imported++;

  // 隱藏輸入區
  hideCustomOrderNumberInput();

  // 關閉 modal
  modal.style.display = "none";

  // 處理下一筆
  currentOrderIndex++;
  processNextOrder();
}

function finishImport() {
  // 儲存並更新
  saveOrders();
  filteredOrders = [...orders]; // 重置為全部訂單
  loadOrders();

  // 組合提示訊息
  let message = "匯入完成！\n";
  if (importStats.imported > 0) message += `新增：${importStats.imported} 筆\n`;
  if (importStats.updated > 0) message += `更新：${importStats.updated} 筆\n`;
  if (importStats.duplicate > 0)
    message += `重複略過：${importStats.duplicate} 筆\n`;
  if (importStats.skipped > 0) message += `無效略過：${importStats.skipped} 筆`;

  showAlert(message.trim(), "success");

  // 清空隊列
  pendingOrdersQueue = [];
  currentOrderIndex = 0;
}

// 匯出 Excel - 橫向格式，菜品在標題列（依據搜尋結果匯出）
function exportToExcel() {
  // 使用 filteredOrders（搜尋/篩選後的結果），如果沒有篩選則使用全部訂單
  const ordersToExport = filteredOrders.length > 0 ? filteredOrders : orders;

  if (ordersToExport.length === 0) {
    showAlert("目前沒有訂單可以匯出", "warning");
    return;
  }

  // 檢查是否有篩選條件
  const searchInput = document.getElementById("searchInput");
  const groupFilterEl = document.getElementById("groupFilter");
  const searchTerm = searchInput ? searchInput.value : "";
  const groupFilter = groupFilterEl ? groupFilterEl.value : "";
  const isFiltered = searchTerm || groupFilter;

  // 準備標題列
  const headers = ["訂單號碼", "訂購人", "聯絡電話", "所屬群組", "備註"];
  DISHES.forEach((dish) => {
    headers.push(dish.name);
  });
  headers.push("訂購總金額");

  // 準備資料列
  const excelData = [];

  ordersToExport.forEach((order) => {
    if (!order.dishQuantities) return;
    const row = {
      訂單號碼: order.orderNumber || order.id,
      訂購人: order.customer.name,
      聯絡電話: order.customer.phone,
      所屬群組: order.customer.group || "未分組",
      備註: order.customer.note || "-",
    };

    DISHES.forEach((dish) => {
      row[dish.name] = order.dishQuantities[dish.name] || 0;
    });

    row["訂購總金額"] = order.total;

    excelData.push(row);
  });

  // 新增統計列
  const statsRow = {
    訂單號碼: "",
    訂購人: "【統計】",
    聯絡電話: "",
    所屬群組: "",
    備註: "",
  };

  // 計算每個菜品的總數量（基於匯出的訂單）
  DISHES.forEach((dish) => {
    const totalQty = ordersToExport.reduce((sum, order) => {
      if (!order.dishQuantities) return sum;
      return sum + (order.dishQuantities[dish.name] || 0);
    }, 0);
    statsRow[dish.name] = totalQty;
  });

  // 計算所有訂單的總金額（基於匯出的訂單）
  const grandTotal = ordersToExport.reduce((sum, order) => {
    if (!order.total) return sum;
    return sum + order.total;
  }, 0);

  statsRow["訂購總金額"] = grandTotal;
  excelData.push(statsRow);

  // 建立工作簿
  const ws = XLSX.utils.json_to_sheet(excelData, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "年菜訂單");

  // 設定欄位寬度
  const colWidths = [
    { wch: 15 }, // 訂單號碼
    { wch: 12 }, // 訂購人
    { wch: 12 }, // 聯絡電話
    { wch: 12 }, // 所屬群組
    { wch: 20 }, // 備註
  ];
  DISHES.forEach(() => colWidths.push({ wch: 10 })); // 各菜品
  colWidths.push({ wch: 12 }); // 訂購總金額
  ws["!cols"] = colWidths;

  // 產生檔案名稱
  let fileName = `年菜訂單`;
  if (isFiltered) {
    if (groupFilter) fileName += `_${groupFilter}`;
    if (searchTerm) fileName += `_搜尋結果`;
  }
  fileName += `_${new Date().toISOString().split("T")[0]}.xlsx`;

  // 下載檔案
  XLSX.writeFile(wb, fileName);

  const message = isFiltered
    ? `已匯出 ${ordersToExport.length} 筆搜尋結果！`
    : `已匯出全部 ${ordersToExport.length} 筆訂單！`;

  showAlert(message, "success");
}

// 匯出 PDF - 使用 html2canvas 支援中文（依據搜尋結果匯出）
async function exportToPDF() {
  // 使用 filteredOrders（搜尋/篩選後的結果），如果沒有篩選則使用全部訂單
  const ordersToExport = filteredOrders.length > 0 ? filteredOrders : orders;

  if (ordersToExport.length === 0) {
    showAlert("目前沒有訂單可以匯出", "warning");
    return;
  }

  // 檢查是否有篩選條件
  const searchInput = document.getElementById("searchInput");
  const groupFilterEl = document.getElementById("groupFilter");
  const searchTerm = searchInput ? searchInput.value : "";
  const groupFilter = groupFilterEl ? groupFilterEl.value : "";
  const isFiltered = searchTerm || groupFilter;

  try {
    // 訂單按編號排序（由小到大）
    const sortedOrders = [...ordersToExport].sort((a, b) => {
      const numA =
        parseInt((a.orderNumber || a.id).toString().replace(/\D/g, "")) || 0;
      const numB =
        parseInt((b.orderNumber || b.id).toString().replace(/\D/g, "")) || 0;
      return numA - numB;
    });

    // 計算統計資料
    const grandTotal = sortedOrders.reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );

    // 各群組統計
    const groupStats = {};
    sortedOrders.forEach((order) => {
      const group = order.customer.group || "未分組";
      if (!groupStats[group]) {
        groupStats[group] = { count: 0, total: 0 };
      }
      groupStats[group].count++;
      groupStats[group].total += order.total || 0;
    });

    // 各菜品統計
    const dishStats = {};
    DISHES.forEach((dish) => {
      const totalQty = sortedOrders.reduce((sum, order) => {
        if (!order.dishQuantities) return sum;
        return sum + (order.dishQuantities[dish.name] || 0);
      }, 0);
      if (totalQty > 0) {
        dishStats[dish.name] = { qty: totalQty, price: dish.price };
      }
    });

    // ==================== 創建第一頁：統計摘要 ====================
    const summaryDiv = document.createElement("div");
    summaryDiv.style.cssText =
      "width: 210mm; height: 297mm; padding: 15mm 20mm; background: white; font-family: 'Microsoft JhengHei', Arial, sans-serif; box-sizing: border-box; display: flex; flex-direction: column; position: absolute; left: -9999px; top: 0;";

    let titleText = "新年年菜訂單統計報表";
    if (isFiltered) {
      if (groupFilter) titleText += ` - ${groupFilter}`;
      if (searchTerm) titleText += ` (搜尋結果)`;
    }

    let summaryHTML = `
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #e74c3c; font-size: 24px; margin: 0 0 8px 0;">🧧 ${titleText} 🧧</h1>
        <p style="font-size: 12px; color: #666; margin: 0;">匯出日期：${new Date().toLocaleDateString(
          "zh-TW",
        )}</p>
        ${
          isFiltered
            ? `<p style="font-size: 11px; color: #e74c3c; margin: 5px 0 0 0;">📊 本報表為篩選結果</p>`
            : ""
        }
      </div>
      
      <div style="margin-bottom: 18px;">
        <h2 style="color: #e74c3c; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid #e74c3c; padding-bottom: 6px;">【基本統計】</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div style="background: #fff3e6; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #666; margin-bottom: 6px;">總訂單數</div>
            <div style="font-size: 28px; font-weight: bold; color: #e74c3c;">${
              sortedOrders.length
            } 筆</div>
          </div>
          <div style="background: #e8f8f5; padding: 15px; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; color: #666; margin-bottom: 6px;">總金額</div>
            <div style="font-size: 28px; font-weight: bold; color: #27ae60;">NT$ ${grandTotal.toLocaleString()}</div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 18px;">
        <h2 style="color: #e74c3c; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid #e74c3c; padding-bottom: 6px;">【各群組訂購統計】</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e74c3c; color: white;">
              <th style="padding: 10px; text-align: left; font-size: 13px;">群組名稱</th>
              <th style="padding: 10px; text-align: center; font-size: 13px;">訂單數量</th>
              <th style="padding: 10px; text-align: right; font-size: 13px;">金額小計</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(groupStats)
              .map(
                ([group, stats]) => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px; font-size: 12px;">${group}</td>
                <td style="padding: 8px; text-align: center; font-size: 12px;">${
                  stats.count
                } 筆</td>
                <td style="padding: 8px; text-align: right; font-size: 12px; color: #27ae60; font-weight: bold;">NT$ ${stats.total.toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      
      <div style="flex: 1; overflow: hidden;">
        <h2 style="color: #e74c3c; font-size: 16px; margin: 0 0 12px 0; border-bottom: 2px solid #e74c3c; padding-bottom: 6px;">【各菜品訂購統計】</h2>
        <div style="max-height: 100%; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #e74c3c; color: white;">
                <th style="padding: 10px; text-align: left; font-size: 13px;">菜品名稱</th>
                <th style="padding: 10px; text-align: center; font-size: 13px;">訂購數量</th>
                <th style="padding: 10px; text-align: right; font-size: 13px;">單價</th>
                <th style="padding: 10px; text-align: right; font-size: 13px;">小計金額</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(dishStats)
                .map(([dish, data]) => {
                  const subtotal = data.qty * data.price;
                  return `
                  <tr style="border-bottom: 1px solid #ddd;">
                    <td style="padding: 8px; font-size: 12px;">${dish}</td>
                    <td style="padding: 8px; text-align: center; font-size: 12px; font-weight: bold;">${
                      data.qty
                    } 份</td>
                    <td style="padding: 8px; text-align: right; font-size: 12px;">NT$ ${data.price.toLocaleString()}</td>
                    <td style="padding: 8px; text-align: right; font-size: 12px; color: #27ae60; font-weight: bold;">NT$ ${subtotal.toLocaleString()}</td>
                  </tr>
                `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    summaryDiv.innerHTML = summaryHTML;
    document.body.appendChild(summaryDiv);

    // ==================== 轉換為 PDF ====================
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4"); // 第一頁直向（統計摘要）

    // 第一頁：統計摘要（直向）
    const summaryCanvas = await html2canvas(summaryDiv, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const summaryImgData = summaryCanvas.toDataURL("image/png");
    const imgWidth = 210;
    const imgHeight = (summaryCanvas.height * imgWidth) / summaryCanvas.width;
    pdf.addImage(summaryImgData, "PNG", 0, 0, imgWidth, imgHeight);

    // 清理統計摘要的臨時元素
    document.body.removeChild(summaryDiv);

    // ==================== 分批渲染訂單明細頁（橫向）====================
    // 每頁顯示的訂單數量（根據 A4 橫向頁面大小調整）
    const ORDERS_PER_PAGE = 25;
    const totalPages = Math.ceil(sortedOrders.length / ORDERS_PER_PAGE);

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      // 新增橫向頁面
      pdf.addPage("a4", "landscape");

      // 計算此頁的訂單範圍
      const startIndex = pageIndex * ORDERS_PER_PAGE;
      const endIndex = Math.min(
        startIndex + ORDERS_PER_PAGE,
        sortedOrders.length,
      );
      const pageOrders = sortedOrders.slice(startIndex, endIndex);
      const isLastPage = pageIndex === totalPages - 1;

      // 創建此頁的 HTML
      const pageDiv = document.createElement("div");
      pageDiv.style.cssText =
        "width: 297mm; height: 210mm; padding: 8mm 10mm; background: white; font-family: 'Microsoft JhengHei', Arial, sans-serif; box-sizing: border-box; position: absolute; left: -9999px; top: 0;";

      let pageHTML = `
        <div style="text-align: center; margin-bottom: 8px;">
          <h1 style="color: #e74c3c; font-size: 18px; margin: 0 0 3px 0;">訂單明細</h1>
          <p style="font-size: 10px; color: #666; margin: 0;">共 ${sortedOrders.length} 筆訂單 ｜ 第 ${pageIndex + 1} / ${totalPages} 頁</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
          <thead>
            <tr style="background: #e74c3c; color: white;">
              <th style="padding: 5px 3px; text-align: center; border: 1px solid #c0392b; font-size: 9px; white-space: nowrap;">序號</th>
              <th style="padding: 5px 3px; text-align: left; border: 1px solid #c0392b; font-size: 9px; white-space: nowrap;">訂單號碼</th>
              <th style="padding: 5px 3px; text-align: left; border: 1px solid #c0392b; font-size: 9px; white-space: nowrap;">訂購人</th>
              <th style="padding: 5px 3px; text-align: left; border: 1px solid #c0392b; font-size: 9px; white-space: nowrap;">電話</th>
              <th style="padding: 5px 3px; text-align: left; border: 1px solid #c0392b; font-size: 9px; white-space: nowrap;">群組</th>
      `;

      // 動態生成菜品欄位標題
      DISHES.forEach((dish) => {
        pageHTML += `<th style="padding: 5px 2px; text-align: center; border: 1px solid #c0392b; font-size: 8px; white-space: nowrap;">${dish.name}</th>`;
      });

      pageHTML += `
              <th style="padding: 5px 3px; text-align: right; border: 1px solid #c0392b; font-size: 9px; white-space: nowrap;">總金額</th>
            </tr>
          </thead>
          <tbody>
      `;

      // 生成此頁的訂單資料列
      pageOrders.forEach((order, index) => {
        const globalIndex = startIndex + index;
        const rowStyle =
          index % 2 === 0 ? "background: #f9f9f9;" : "background: white;";

        pageHTML += `
          <tr style="${rowStyle}">
            <td style="padding: 4px 3px; text-align: center; border: 1px solid #ddd; font-size: 9px;">${globalIndex + 1}</td>
            <td style="padding: 4px 3px; border: 1px solid #ddd; font-size: 9px;">${order.orderNumber || order.id}</td>
            <td style="padding: 4px 3px; border: 1px solid #ddd; font-size: 9px;">${order.customer.name}</td>
            <td style="padding: 4px 3px; border: 1px solid #ddd; font-size: 8px;">${order.customer.phone}</td>
            <td style="padding: 4px 3px; border: 1px solid #ddd; font-size: 8px;">${order.customer.group || "未分組"}</td>
        `;

        // 填入各菜品的訂購數量
        DISHES.forEach((dish) => {
          const qty = order.dishQuantities
            ? order.dishQuantities[dish.name] || 0
            : 0;
          const cellStyle =
            qty > 0 ? "font-weight: bold; color: #e74c3c;" : "color: #999;";
          pageHTML += `<td style="padding: 4px 2px; text-align: center; border: 1px solid #ddd; font-size: 9px; ${cellStyle}">${qty > 0 ? qty : "-"}</td>`;
        });

        pageHTML += `
            <td style="padding: 4px 3px; text-align: right; border: 1px solid #ddd; font-weight: bold; color: #27ae60; font-size: 9px;">NT$ ${(order.total || 0).toLocaleString()}</td>
          </tr>
        `;
      });

      // 如果是最後一頁，添加統計列
      if (isLastPage) {
        pageHTML += `
          <tr style="background: #fff3cd; font-weight: bold;">
            <td colspan="2" style="padding: 5px 3px; text-align: center; border: 1px solid #ddd; color: #e74c3c; font-size: 9px;">【統計】</td>
            <td colspan="3" style="padding: 5px 3px; border: 1px solid #ddd;"></td>
        `;

        // 計算各菜品總數量
        DISHES.forEach((dish) => {
          const totalQty = sortedOrders.reduce((sum, order) => {
            if (!order.dishQuantities) return sum;
            return sum + (order.dishQuantities[dish.name] || 0);
          }, 0);
          pageHTML += `<td style="padding: 5px 2px; text-align: center; border: 1px solid #ddd; color: #e74c3c; font-size: 9px;">${totalQty > 0 ? totalQty : "-"}</td>`;
        });

        pageHTML += `
            <td style="padding: 5px 3px; text-align: right; border: 1px solid #ddd; color: #27ae60; font-size: 9px;">NT$ ${grandTotal.toLocaleString()}</td>
          </tr>
        `;
      }

      pageHTML += `
          </tbody>
        </table>
      `;

      pageDiv.innerHTML = pageHTML;
      document.body.appendChild(pageDiv);

      // 渲染此頁為圖片
      const pageCanvas = await html2canvas(pageDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const pageImgData = pageCanvas.toDataURL("image/png");
      const landscapeWidth = 297;
      const landscapeHeight = 210;

      pdf.addImage(pageImgData, "PNG", 0, 0, landscapeWidth, landscapeHeight);

      // 清理臨時元素
      document.body.removeChild(pageDiv);
    }

    // 下載 PDF
    let fileName = `年菜訂單`;
    if (isFiltered) {
      if (groupFilter) fileName += `_${groupFilter}`;
      if (searchTerm) fileName += `_搜尋結果`;
    }
    fileName += `_${new Date().toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);

    const message = isFiltered
      ? `已匯出 ${sortedOrders.length} 筆搜尋結果的 PDF！`
      : `已匯出全部 ${sortedOrders.length} 筆訂單的 PDF！`;

    showAlert(message, "success");
  } catch (error) {
    console.error("PDF 匯出失敗:", error);
    showAlert(`PDF 匯出失敗：${error.message}`, "error");
  }
}

// Modal點擊外部關閉
window.onclick = function (event) {
  const editModal = document.getElementById("editModal");
  const addDishModal = document.getElementById("addDishModal");
  if (event.target === editModal) {
    closeEditModal();
  }
  if (event.target === addDishModal) {
    closeAddDishModal();
  }
};

// ==================== 菜品管理功能 ====================

// 顯示新增菜品 Modal
function showAddDishModal() {
  document.getElementById("addDishModal").style.display = "block";
  document.getElementById("addDishForm").reset();
}

// 關閉新增菜品 Modal
function closeAddDishModal() {
  document.getElementById("addDishModal").style.display = "none";
}

// 處理新增菜品
function handleAddDish(event) {
  event.preventDefault();

  const name = document.getElementById("newDishName").value.trim();
  const price = parseInt(document.getElementById("newDishPrice").value);

  // 檢查菜品名稱是否重複
  if (DISHES.some((dish) => dish.name === name)) {
    showAlert("此菜品名稱已存在！", "error");
    return;
  }

  // 新增菜品
  DISHES.push({ name, price });
  saveDishes();

  // 重新渲染菜品列表
  renderDishesInForm();
  renderDishManagementList();

  closeAddDishModal();
  showAlert("菜品新增成功！", "success");
}

// 刪除菜品
function deleteDish(dishName) {
  showConfirm(`確定要刪除「${dishName}」嗎？`, () => {
    // 檢查是否有訂單使用此菜品
    const hasOrders = orders.some(
      (order) => order.dishQuantities && order.dishQuantities[dishName] > 0,
    );

    if (hasOrders) {
      showAlert("此菜品已有訂單使用，無法刪除！", "warning");
      return;
    }

    // 刪除菜品
    DISHES = DISHES.filter((dish) => dish.name !== dishName);
    saveDishes();

    // 重新渲染
    renderDishesInForm();
    renderDishManagementList();

    showAlert("菜品已刪除！", "success");
  });
}

// 渲染表單中的菜品列表
function renderDishesInForm() {
  // 明確選擇訂購表單中的 dishes-table（不是菜品管理區的）
  const form = document.getElementById("orderForm");
  if (!form) {
    console.log("目前頁面不包含訂單表單，跳過 renderDishesInForm");
    return;
  }

  const container = form.querySelector(".dishes-table");
  if (!container) {
    console.log(
      "目前頁面不包含訂單表單中的 .dishes-table 容器，跳過 renderDishesInForm",
    );
    return;
  }

  console.log("開始渲染菜品到訂單表單，共", DISHES.length, "個菜品");

  // 保留表頭
  const header = container.querySelector(".dishes-header");
  if (!header) {
    console.error("找不到 .dishes-header");
    return;
  }

  // 先儲存表頭的 HTML
  const headerHTML = header.outerHTML;

  // 清空容器
  container.innerHTML = headerHTML;

  // 渲染菜品
  DISHES.forEach((dish) => {
    const row = document.createElement("div");
    row.className = "dish-input-row";
    row.setAttribute("data-name", dish.name);
    row.setAttribute("data-price", dish.price);
    row.innerHTML = `
            <div class="dish-name">${dish.name}</div>
            <div class="dish-price">NT$ ${dish.price}</div>
            <div class="quantity-box" onclick="incrementQuantity(this)">
                <span class="quantity-display">0</span>
            </div>
            <div class="dish-subtotal">NT$ 0</div>
            <button type="button" class="btn-reset-dish" onclick="resetDishQuantity(this)" title="重置此菜品數量">🔄</button>
        `;
    container.appendChild(row);
  });

  console.log(
    "菜品渲染完成，容器內現在有",
    container.children.length,
    "個元素",
  );
}

// 渲染菜品管理列表
function renderDishManagementList() {
  const container = document.getElementById("manageDishList");
  if (!container) return;

  container.innerHTML = "";

  if (DISHES.length === 0) {
    container.innerHTML =
      '<div style="padding: 20px; text-align: center; color: #999;">尚無菜品</div>';
    return;
  }

  DISHES.forEach((dish) => {
    const row = document.createElement("div");
    row.className = "dish-input-row";
    row.innerHTML = `
            <div class="dish-name">${dish.name}</div>
            <div class="dish-price">NT$ ${dish.price}</div>
            <button type="button" class="btn-delete" onclick="deleteDish('${dish.name}')">🗑️ 刪除</button>
        `;
    container.appendChild(row);
  });
}

// 切換菜品列表顯示
function toggleDishList() {
  const container = document.getElementById("dishListContainer");
  if (container.style.display === "none") {
    container.style.display = "block";
    renderDishManagementList();
  } else {
    container.style.display = "none";
  }
}
