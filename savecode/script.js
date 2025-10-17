// script.js
(() => {
  const API_ENDPOINT = 'http://localhost:3000/api/orders';
  const STORAGE_KEY = 'mala_cart_v1';
  const STORAGE_SPICY = 'mala_spicy_v1';

  // ดึง Element ที่ต้องใช้งาน (Elements to be used)
  const orderBar = document.getElementById('orderBar');
  const openSummaryBtn = document.getElementById('openSummary');
  const orderCountEl = document.getElementById('orderCount');
  const orderTotalEl = document.getElementById('orderTotal');

  const modal = document.getElementById('summaryModal');
  const modalCountEl = document.getElementById('modalCount');
  const modalTotalEl = document.getElementById('modalTotal');
  const summaryList = document.getElementById('summaryList'); // Container for list items
  const rowTemplate = document.getElementById('summaryRowTemplate');
  const closeModalBtns = modal.querySelectorAll('[data-close="true"]');
  const placeOrderBtn = document.getElementById('placeOrder');

  const spicyInputs = Array.from(document.querySelectorAll('input[name="spicy"]'));
  const itemNodes = Array.from(document.querySelectorAll('.item'));
  const itemUI = new Map();

  let cart = loadCart();

  // Initialize item UIs and add listeners for item cards
  itemNodes.forEach(node => {
    const id = node.dataset.id;
    const itemInfo = {
      id: id,
      name: node.dataset.name,
      price: parseInt(node.dataset.price)
    };
    
    // Store UI elements for quick update
    const uiData = {
      node,
      itemInfo,
      qtyEl: node.querySelector('.qty'),
      minusBtn: node.querySelector('.btn-qty.minus'),
      plusBtn: node.querySelector('.btn-qty.plus')
    };
    itemUI.set(id, uiData);

    // Add event listeners to menu quantity buttons
    uiData.plusBtn.addEventListener('click', () => handleQtyChange(id, 1));
    uiData.minusBtn.addEventListener('click', () => handleQtyChange(id, -1));

    // Initial UI update for menu card
    updateItemUI(id);
  });

  // -------------------------
  // Cart Management Functions
  // -------------------------

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function saveCart() {
    try {
      const nonZeroItems = Object.fromEntries(
        Object.entries(cart).filter(([, item]) => item.qty > 0)
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nonZeroItems));
      cart = nonZeroItems; // Update cart reference to clean version
    } catch {}
  }

  const handleQtyChange = (id, change) => {
    const uiData = itemUI.get(id);
    if (!uiData) return;

    // Initialize item in cart if it doesn't exist
    if (!cart[id]) {
      cart[id] = { qty: 0, price: uiData.itemInfo.price, name: uiData.itemInfo.name };
    }

    // Calculate new quantity
    const newQty = cart[id].qty + change;

    if (newQty < 0) return; // Prevent negative quantity

    cart[id].qty = newQty;

    saveCart();
    updateItemUI(id);
    updateCartUI();
    
    // If modal is open, re-render it
    if (modal.classList.contains('popup--active')) {
      renderSummary();
    }
  };


  // -------------------------
  // UI Update Functions
  // -------------------------

  function updateItemUI(id) {
    const item = cart[id];
    const uiData = itemUI.get(id);
    const qty = item ? item.qty : 0;
    
    // Update quantity displayed on the menu card
    if (uiData.qtyEl) {
        uiData.qtyEl.textContent = qty;
    }
    
    // Visually disable minus button if qty is 0
    if (uiData.minusBtn) {
        uiData.minusBtn.disabled = qty === 0;
    }
  }

  function updateCartUI() {
    let totalQty = 0;
    let totalPrice = 0;

    for (const id in cart) {
      if (cart.hasOwnProperty(id)) {
        const item = cart[id];
        totalQty += item.qty;
        totalPrice += item.qty * item.price;
      }
    }

    // Update Order Bar UI
    orderCountEl.textContent = totalQty;
    orderTotalEl.textContent = totalPrice;
    
    // Enable/Disable summary button
    const hasItems = totalQty > 0;
    openSummaryBtn.disabled = !hasItems;
    placeOrderBtn.disabled = !hasItems; // Also update Place Order button in modal
  }

  function renderSummary() {
    summaryList.innerHTML = ''; // Clear existing list
    let modalTotalQty = 0;
    let modalTotalPrice = 0;

    for (const [id, item] of Object.entries(cart)) {
      if (item.qty <= 0) continue;

      const row = rowTemplate.content.cloneNode(true).firstElementChild;
      
      const itemTotal = item.qty * item.price;
      modalTotalQty += item.qty;
      modalTotalPrice += itemTotal;

      // Populate data
      row.dataset.id = id; // Add data-id for easy lookup
      row.querySelector('.td-name-value').textContent = `${item.name} (${item.price} บาท/ไม้)`;
      row.querySelector('.qty').textContent = item.qty;
      row.querySelector('.row-total').textContent = itemTotal;

      // 🛠️ FIX: Attach event listeners to buttons in the modal row
      const minusBtn = row.querySelector('.btn-qty.minus');
      const plusBtn = row.querySelector('.btn-qty.plus');
      
      minusBtn.disabled = item.qty === 0;

      minusBtn.addEventListener('click', () => handleQtyChange(id, -1));
      plusBtn.addEventListener('click', () => handleQtyChange(id, 1));
      
      summaryList.appendChild(row);
    }

    // Update Modal Totals
    modalCountEl.textContent = modalTotalQty;
    modalTotalEl.textContent = modalTotalPrice;
    
    // Update Place Order button state
    placeOrderBtn.disabled = modalTotalQty === 0; 
    
    // If cart becomes empty while modal is open, close it (optional, but good UX)
    if (modalTotalQty === 0) {
        closeModal();
    }
  }
  
  function closeModal() {
    modal.classList.remove('popup--active');
  }

  // -------------------------
  // Spicy Level Logic
  // -------------------------
  function initSpicy() {
    const saved = getSpicyFromStorage();
    if (!saved) return;
    const match = spicyInputs.find(i => i.value === saved);
    // Ensure only one is checked, prioritize saved value, otherwise default to "mild"
    spicyInputs.forEach(i => i.checked = false); 
    if (match) {
        match.checked = true;
    } else {
        document.querySelector('input[name="spicy"][value="mild"]').checked = true;
    }
  }

  function saveSpicy(val) {
    try {
      localStorage.setItem(STORAGE_SPICY, val);
    } catch {}
  }

  function getSpicy() {
    // Get current selection from radio buttons
    const selectedInput = spicyInputs.find(i => i.checked);
    return selectedInput ? selectedInput.value : getSpicyFromStorage() || 'mild';
  }

  function getSpicyFromStorage() {
    try {
      return localStorage.getItem(STORAGE_SPICY);
    } catch {
      return 'mild';
    }
  }

  function spicyLabel(val) {
    if (val === 'mild') return 'น้อย';
    if (val === 'medium') return 'ปานกลาง';
    if (val === 'hot') return 'มาก';
    return 'ไม่ระบุ';
  }

  // -------------------------
  // Event Listeners
  // -------------------------

  openSummaryBtn.addEventListener('click', () => {
    renderSummary();
    modal.classList.add('popup--active');
  });

  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Save spicy level whenever a radio button changes
  spicyInputs.forEach(input => {
    input.addEventListener('change', (e) => saveSpicy(e.target.value));
  });

  placeOrderBtn.addEventListener('click', async () => {
    if (Object.keys(cart).length === 0) {
        alert('กรุณาเลือกรายการสินค้าก่อนสั่งซื้อ');
        return;
    }
    
    const items = [];
    let totalQty = 0;
    let totalPrice = 0;

    Object.entries(cart).forEach(([, item]) => {
      totalQty += item.qty;
      totalPrice += item.qty * item.price;
      items.push({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: item.qty
      });
    });

    const order = {
      items: items,
      totalQty: totalQty,
      totalPrice: totalPrice,
      spicyLevel: getSpicy(), 
      status: 'pending', 
      orderDate: new Date().toISOString() 
    };

    try {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = 'กำลังส่ง...';

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Success
        alert(`🎉 สั่งซื้อสำเร็จ! ${order.totalQty} ไม้ ราคารวม ${order.totalPrice} บาท`);
        
        // 🛠️ FIX: Clear cart after successful order
        cart = {}; 
        saveCart();
        
        // Update all UIs
        itemUI.forEach((_, id) => updateItemUI(id));
        updateCartUI();
        closeModal();

    } catch (error) {
        console.error('Error placing order:', error);
        alert('❌ เกิดข้อผิดพลาดในการสั่งซื้อ กรุณาลองใหม่อีกครั้ง');
    } finally {
        placeOrderBtn.textContent = 'ยืนยันคำสั่งซื้อ';
        updateCartUI(); // Re-enable if cart is not empty, otherwise remains disabled
    }
  });


  // -------------------------
  // Initialization
  // -------------------------
  function init() {
      // Load saved spicy level on page load
      initSpicy();
      // Apply initial UI updates based on loaded cart
      itemUI.forEach((_, id) => updateItemUI(id));
      updateCartUI();
  }
  
  init();

})();