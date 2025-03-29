// 全域變數
let currentRestaurant = null;
let restaurants = [];
let history = [];
let initialX = 0;
let currentX = 0;

// Google Apps Script 部署 URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxGMB37MNcZXdEuQp4S8eZyC2tBg8ksroVj4t-q-YRprSZTc5nN2W6BHiz3UC4P_a_kgw/exec';

// DOM元素
const mainScreen = document.getElementById('mainScreen');
const historyScreen = document.getElementById('historyScreen');
const addRestaurantScreen = document.getElementById('addRestaurantScreen');
const cardContainer = document.getElementById('cardContainer');
const historyBtn = document.getElementById('historyBtn');
const addRestaurantBtn = document.getElementById('addRestaurantBtn');
const dislikeBtn = document.getElementById('dislikeBtn');
const likeBtn = document.getElementById('likeBtn');
const backFromHistoryBtn = document.getElementById('backFromHistoryBtn');
const backFromAddBtn = document.getElementById('backFromAddBtn');
const addRestaurantForm = document.getElementById('addRestaurantForm');
const historyList = document.getElementById('historyList');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // 載入餐廳資料
        await loadRestaurants();

        // 載入歷史記錄
        await loadHistory();

        // 顯示第一個餐廳
        showNextRestaurant();

        // 設置事件監聽器
        setupEventListeners();
    } catch (error) {
        showNotification('無法連接到伺服器，請稍後再試');
        console.error('初始化錯誤:', error);
    }
});

// 設置事件監聽器
function setupEventListeners() {
    // 導航按鈕
    historyBtn.addEventListener('click', showHistoryScreen);
    addRestaurantBtn.addEventListener('click', showAddRestaurantScreen);
    backFromHistoryBtn.addEventListener('click', showMainScreen);
    backFromAddBtn.addEventListener('click', showMainScreen);

    // 操作按鈕
    dislikeBtn.addEventListener('click', () => handleSwipe('dislike'));
    likeBtn.addEventListener('click', () => handleSwipe('like'));

    // 表單提交
    addRestaurantForm.addEventListener('submit', handleAddRestaurant);

    // 卡片滑動事件
    const card = document.querySelector('.card');
    card.addEventListener('touchstart', handleTouchStart, {passive: true});
    card.addEventListener('touchmove', handleTouchMove, {passive: true});
    card.addEventListener('touchend', handleTouchEnd, {passive: true});

    // 滑鼠滑動事件（桌面環境）
    card.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
}

// JSONP 函數 - 處理 GET 請求
function fetchJsonp(url) {
    return new Promise((resolve, reject) => {
        // 創建唯一的回調函數名
        const callbackName = 'jsonp_callback_' + Date.now();

        // 設置超時
        const timeout = setTimeout(() => {
            // 清理
            cleanup();
            reject(new Error('JSONP 請求超時'));
        }, 10000);

        // 清理函數
        const cleanup = () => {
            if (window[callbackName]) delete window[callbackName];
            if (script.parentNode) script.parentNode.removeChild(script);
            clearTimeout(timeout);
        };

        // 設置回調
        window[callbackName] = (data) => {
            cleanup();
            resolve(data);
        };

        // 創建 script 標籤
        const script = document.createElement('script');
        script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${callbackName}`;
        script.onerror = () => {
            cleanup();
            reject(new Error('JSONP 請求失敗'));
        };

        // 加入文檔
        document.head.appendChild(script);
    });
}

// 載入餐廳資料
async function loadRestaurants() {
    try {
        console.log('開始加載餐廳數據...');
        const result = await fetchJsonp(`${GAS_URL}?action=getRestaurants`);
        console.log('餐廳數據加載成功:', result);

        restaurants = result.data || [];

        if (restaurants.length === 0) {
            showNotification('尚未有餐廳資料，請先新增餐廳');
        }
    } catch (error) {
        console.error('載入餐廳錯誤:', error);
        showNotification('無法載入餐廳資料: ' + error.message);
        restaurants = []; // 確保失敗時也有一個空陣列
    }
}

// 載入歷史記錄
async function loadHistory() {
    try {
        console.log('開始加載歷史記錄...');
        const result = await fetchJsonp(`${GAS_URL}?action=getHistory`);
        console.log('歷史記錄加載成功:', result);

        history = result.data || [];

        // 更新歷史畫面
        updateHistoryScreen();
    } catch (error) {
        console.error('載入歷史錯誤:', error);
        showNotification('無法載入歷史記錄: ' + error.message);
        history = []; // 確保失敗時也有一個空陣列
    }
}

// 顯示下一個餐廳
function showNextRestaurant() {
    if (restaurants.length === 0) {
        cardContainer.innerHTML = `
            <div class="card">
                <div class="card-content">
                    <p style="text-align: center; margin-top: 40%;">沒有可用的餐廳資料<br>請點擊右上角 + 新增餐廳</p>
                </div>
            </div>
        `;
        return;
    }

    // 隨機選擇餐廳
    const randomIndex = Math.floor(Math.random() * restaurants.length);
    currentRestaurant = restaurants[randomIndex];

    // 創建卡片
    const hasImage = currentRestaurant.image && currentRestaurant.image.trim() !== '';

    cardContainer.innerHTML = `
        <div class="card" id="restaurant-card">
            ${hasImage ?
                `<div class="card-image" style="background-image: url('${currentRestaurant.image}')"></div>` :
                `<div class="card-default-image"><i class="fas fa-utensils"></i></div>`
            }
            <div class="card-content">
                <div>
                    <h3 class="card-title">${currentRestaurant.name}</h3>
                    ${currentRestaurant.type ? `<p class="card-type">${currentRestaurant.type}</p>` : ''}
                    ${currentRestaurant.location ? `<p class="card-location"><i class="fas fa-map-marker-alt"></i> ${currentRestaurant.location}</p>` : ''}
                </div>
            </div>
        </div>
    `;

    // 重新設置觸控事件
    const card = document.querySelector('.card');
    card.addEventListener('touchstart', handleTouchStart, {passive: true});
    card.addEventListener('touchmove', handleTouchMove, {passive: true});
    card.addEventListener('touchend', handleTouchEnd, {passive: true});

    // 重新設置滑鼠事件
    card.addEventListener('mousedown', handleMouseDown);
}

// 處理滑動選擇
async function handleSwipe(action) {
    if (!currentRestaurant) return;

    const card = document.querySelector('.card');
    const isLiked = action === 'like';

    if (isLiked) {
        card.classList.add('swiping-right');
    } else {
        card.classList.add('swiping-left');
    }

    // 創建隱藏的iframe用於表單提交
    let resultFrame = document.getElementById('result_frame');
    if (!resultFrame) {
        resultFrame = document.createElement('iframe');
        resultFrame.id = 'result_frame';
        resultFrame.name = 'result_frame';
        resultFrame.style.display = 'none';
        document.body.appendChild(resultFrame);
    }

    // 創建表單提交
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${GAS_URL}?action=saveSelection`;
    form.target = 'result_frame';
    form.style.display = 'none';

    // 添加表單字段
    const addField = (name, value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    };

    addField('restaurantId', currentRestaurant.id || '');
    addField('restaurantName', currentRestaurant.name || '');
    addField('type', currentRestaurant.type || '');
    addField('location', currentRestaurant.location || '');
    addField('isLiked', isLiked ? 'true' : 'false');
    addField('date', new Date().toISOString());

    // 添加和提交表單
    document.body.appendChild(form);
    form.submit();

    // 清理表單
    setTimeout(() => {
        if (document.body.contains(form)) {
            document.body.removeChild(form);
        }
    }, 100);

    // 手動更新本地歷史數據
    const selection = {
        restaurantId: currentRestaurant.id,
        restaurantName: currentRestaurant.name,
        type: currentRestaurant.type,
        location: currentRestaurant.location,
        isLiked,
        date: new Date().toISOString()
    };

    // 更新本地歷史記錄
    history.unshift(selection);

    // 更新歷史記錄畫面
    updateHistoryScreen();

    // 顯示通知
    showNotification(isLiked ? '已加入我的最愛' : '已跳過這家餐廳');

    // 等待動畫完成
    setTimeout(() => {
        showNextRestaurant();
    }, 300);
}

// 新增餐廳
async function handleAddRestaurant(event) {
    event.preventDefault();

    // 獲取表單數據
    const nameInput = document.getElementById('restaurantName');
    const typeInput = document.getElementById('restaurantType');
    const locationInput = document.getElementById('restaurantLocation');
    const imageInput = document.getElementById('restaurantImage');

    if (nameInput.value.trim() === '') {
        showNotification('請輸入餐廳名稱');
        return;
    }

    // 創建隱藏的iframe用於表單提交
    let resultFrame = document.getElementById('result_frame');
    if (!resultFrame) {
        resultFrame = document.createElement('iframe');
        resultFrame.id = 'result_frame';
        resultFrame.name = 'result_frame';
        resultFrame.style.display = 'none';
        document.body.appendChild(resultFrame);
    }

    // 創建表單
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = `${GAS_URL}?action=addRestaurant`;
    form.target = 'result_frame';
    form.style.display = 'none';

    // 添加表單字段
    const addField = (name, value) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    };

    addField('name', nameInput.value.trim());
    addField('type', typeInput.options[typeInput.selectedIndex].value);
    addField('location', locationInput.value.trim());
    addField('image', imageInput.value.trim());

    // 添加和提交表單
    document.body.appendChild(form);
    form.submit();

    // 清理表單
    setTimeout(() => {
        document.body.removeChild(form);
    }, 100);

    // 顯示通知
    showNotification('餐廳已添加');

    // 重載餐廳數據
    setTimeout(async () => {
        await loadRestaurants();
        addRestaurantForm.reset();
        showMainScreen();
        showNextRestaurant();
    }, 1000);
}

// 更新歷史記錄畫面
function updateHistoryScreen() {
    if (history.length === 0) {
        historyList.innerHTML = '<p class="empty-message">尚無歷史記錄</p>';
        return;
    }

    historyList.innerHTML = '';

    history.forEach(item => {
        const date = new Date(item.date);
        const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-name">${item.restaurantName}</div>
                ${item.type ? `<div class="history-details">${item.type}</div>` : ''}
                <div class="history-date">${formattedDate}</div>
            </div>
            <div class="history-action ${item.isLiked ? 'liked' : 'disliked'}">
                <i class="fas fa-${item.isLiked ? 'heart' : 'times'}"></i>
            </div>
        `;

        historyList.appendChild(historyItem);
    });
}

// 畫面切換函數
function showMainScreen() {
    mainScreen.classList.add('active');
    historyScreen.classList.remove('active');
    addRestaurantScreen.classList.remove('active');
}

function showHistoryScreen() {
    mainScreen.classList.remove('active');
    historyScreen.classList.add('active');
    addRestaurantScreen.classList.remove('active');
}

function showAddRestaurantScreen() {
    mainScreen.classList.remove('active');
    historyScreen.classList.remove('active');
    addRestaurantScreen.classList.add('active');
}

// 顯示通知
function showNotification(message) {
    notificationText.textContent = message;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 觸控事件處理
function handleTouchStart(event) {
    initialX = event.touches[0].clientX;
}

function handleTouchMove(event) {
    if (initialX === 0) return;

    currentX = event.touches[0].clientX;
    const diffX = currentX - initialX;

    // 如果移動距離很小，不做任何反應
    if (Math.abs(diffX) < 30) return;

    const card = event.currentTarget;
    const swipePercent = Math.min(Math.abs(diffX) / 200, 1);
    const rotate = diffX > 0 ? 20 * swipePercent : -20 * swipePercent;

    card.style.transform = `translateX(${diffX}px) rotate(${rotate}deg)`;
}

function handleTouchEnd(event) {
    if (initialX === 0) return;

    const diffX = currentX - initialX;
    const card = event.currentTarget;

    // 重置卡片位置
    card.style.transform = '';

    // 如果滑動距離足夠大
    if (Math.abs(diffX) > 100) {
        if (diffX > 0) {
            handleSwipe('like');
        } else {
            handleSwipe('dislike');
        }
    }

    // 重置變數
    initialX = 0;
    currentX = 0;
}

// 滑鼠事件處理
let isMouseDown = false;

function handleMouseDown(event) {
    isMouseDown = true;
    initialX = event.clientX;
}

function handleMouseMove(event) {
    if (!isMouseDown) return;

    currentX = event.clientX;
    const diffX = currentX - initialX;

    // 如果移動距離很小，不做任何反應
    if (Math.abs(diffX) < 30) return;

    const card = document.querySelector('.card');
    if (!card) return;

    const swipePercent = Math.min(Math.abs(diffX) / 200, 1);
    const rotate = diffX > 0 ? 20 * swipePercent : -20 * swipePercent;

    card.style.transform = `translateX(${diffX}px) rotate(${rotate}deg)`;
}

function handleMouseUp(event) {
    if (!isMouseDown) return;

    const diffX = currentX - initialX;
    const card = document.querySelector('.card');

    if (card) {
        // 重置卡片位置
        card.style.transform = '';

        // 如果滑動距離足夠大
        if (Math.abs(diffX) > 100) {
            if (diffX > 0) {
                handleSwipe('like');
            } else {
                handleSwipe('dislike');
            }
        }
    }

    // 重置變數
    isMouseDown = false;
    initialX = 0;
    currentX = 0;
}