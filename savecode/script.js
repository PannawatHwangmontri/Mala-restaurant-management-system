(() => {
  const API_ENDPOINT = 'http://localhost:3000/api/orders';
  const STORAGE_KEY = 'mala_cart_v1';
  const STORAGE_SPICY = 'mala_spicy_v1';

  const orderBar = document.getElementById('orderBar');
  const openSummaryBtn = document.getElementById('openSummary');
  const orderCountEl = document.getElementById('orderCount');
  const orderTotalEl = document.getElementById('orderTotal');

  const modal = document.getElementById('summaryModal');
  const modalCountEl = document.getElementById('modalCount');
  const modalTotalEl = document.getElementById('modalTotal');
  const summaryList = document.getElementById('summaryList');
  const rowTemplate = document.getElementById('summaryRowTemplate');
  const closeModalBtns = modal.querySelectorAll('[data-close="true"]');
  const placeOrderBtn = document.getElementById('placeOrder');

  const spicyInputs = Array.from(document.querySelectorAll('input[name="spicy"]'));
  const itemNodes = Array.from(document.querySelectorAll('.item'));
  const itemUI = new Map();

  let cart = loadCart();

  itemNodes.forEach(node => {
    const id = node.dataset.id;
    const itemInfo = {
      id: id,
      name: node.dataset.name,
      price: parseInt(node.dataset.price)
    };
    itemUI.set(id, { node, itemInfo, qtyEl: node.querySelector('.qty'), plusBtn: node.querySelector('.btn-qty.plus'), minusBtn: node.querySelector('.btn-qty.minus') });
    updateItemUI(id);
    node.querySelector('.btn-qty.plus').addEventListener('click', () => updateCart(id, 1));
    node.querySelector('.btn-qty.minus').addEventListener('click', () => updateCart(id, -1));
  });

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Map(JSON.parse(raw)) : new Map();
    } catch {
      return new Map();
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cart.entries())));
    } catch {
      // noop
    }
  }

  function updateCart(id, change) {
    const item = cart.get(id) || { qty: 0 };
    const newQty = Math.max(0, item.qty + change);
    if (newQty > 0) {
      cart.set(id, { ...item, qty: newQty });
    } else {
      cart.delete(id);
    }
    saveCart();
    updateItemUI(id);
    updateSummaryBar();
  }

  function updateItemUI(id) {
    const { node, itemInfo, qtyEl, plusBtn, minusBtn } = itemUI.get(id);
    const item = cart.get(id);
    if (item) {
      node.classList.add('item--selected');
      qtyEl.textContent = item.qty;
      // [FIX 1] แก้ไข: เมื่อสินค้ามีจำนวน >= 1 ให้ปุ่มลบทำงานเสมอ
      minusBtn.disabled = false; 
    } else {
      node.classList.remove('item--selected');
      qtyEl.textContent = 0; 
      minusBtn.disabled = true;
    }
  }

  function calculateTotals() {
    let totalQty = 0;
    let totalPrice = 0;
    for (const [id, item] of cart.entries()) {
      const itemInfo = itemUI.get(id).itemInfo;
      totalQty += item.qty;
      totalPrice += item.qty * itemInfo.price;
    }
    return { totalQty, totalPrice };
  }

  function updateSummaryBar() {
    const { totalQty, totalPrice } = calculateTotals();
    orderCountEl.textContent = totalQty;
    orderTotalEl.textContent = totalPrice.toLocaleString();
    
    // แถบสรุปแสดงเมื่อมีสินค้า 1 ชิ้นหรือมากกว่า
    orderBar.classList.toggle('order-bar--hidden', totalQty === 0); 
    placeOrderBtn.disabled = totalQty === 0;
  }

  function updateSummaryTotals({ totalQty, totalPrice }) {
    modalCountEl.textContent = totalQty;
    modalTotalEl.textContent = totalPrice.toLocaleString();
    placeOrderBtn.disabled = totalQty === 0;
  }

  function openSummary() {
    updateSummaryList();
    modal.classList.add('open');
  }

  function closeSummary() {
    modal.classList.remove('open');
  }

  function updateSummaryList() {
    summaryList.innerHTML = '';
    const { totalQty, totalPrice } = calculateTotals();
    for (const [id, item] of cart.entries()) {
      const itemInfo = itemUI.get(id).itemInfo;
      const row = rowTemplate.content.cloneNode(true);
      row.querySelector('.td-menu-name').textContent = itemInfo.name;
      row.querySelector('.qty').textContent = item.qty;
      row.querySelector('.td-price-value').textContent = itemInfo.price;
      row.querySelector('.row-total').textContent = (item.qty * itemInfo.price).toLocaleString();
      
      const minusBtn = row.querySelector('.btn-qty.minus');
      const plusBtn = row.querySelector('.btn-qty.plus');
      
      // [FIX 2] แก้ไข: เมื่อมีสินค้าใน list ให้ปุ่มลบทำงานเสมอ
      minusBtn.disabled = false; 

      minusBtn.addEventListener('click', () => {
        updateCart(id, -1);
        updateSummaryList();
        updateSummaryTotals(calculateTotals());
      });
      plusBtn.addEventListener('click', () => {
        updateCart(id, 1);
        updateSummaryList();
        updateSummaryTotals(calculateTotals());
      });

      summaryList.appendChild(row);
    }
    updateSummaryTotals({ totalQty, totalPrice });
    
    // ตั้งค่าความเผ็ดใน Modal
    const savedSpicy = getSpicy();
    spicyInputs.find(i => i.value === savedSpicy).checked = true;
  }

  async function saveOrder(order) {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to place order, status: ${response.status}`);
      }
      
      // ล้างตะกร้าและปิด Modal
      cart.clear();
      saveCart();
      itemNodes.forEach(node => updateItemUI(node.dataset.id));
      updateSummaryBar();
      closeSummary();
      
      // แสดงข้อความสำเร็จ
      alert('✅ สั่งอาหารสำเร็จ! รอพนักงานเตรียมอาหารสักครู่');
      
    } catch (error) {
      console.error('Error placing order:', error);
      alert('❌ สั่งอาหารไม่สำเร็จ โปรดลองอีกครั้ง');
    }
  }

  placeOrderBtn.addEventListener('click', async () => {
    const { totalQty, totalPrice } = calculateTotals();
    if (totalQty === 0) return;
    
    const items = Array.from(cart.entries()).map(([id, item]) => {
      const itemInfo = itemUI.get(id).itemInfo;
      return {
        id: id,
        name: itemInfo.name,
        price: itemInfo.price,
        qty: item.qty
      };
    });
    
    const order = {
      items: items,
      totalQty: totalQty,
      totalPrice: totalPrice,
      spicyLevel: getSpicy(), 
      status: 'pending', 
      orderDate: new Date().toISOString() 
    };
    
    saveOrder(order);
  });
  
  function initSpicy() {
    const saved = getSpicy();
    if (!saved) return;
    const match = spicyInputs.find(i => i.value === saved);
    if (match) match.checked = true;
  }
  function saveSpicy(val) { try { localStorage.setItem(STORAGE_SPICY, val); } catch { } }
  function getSpicy() {
    try {
      const selectedInput = spicyInputs.find(i => i.checked);
      const val = selectedInput ? selectedInput.value : localStorage.getItem(STORAGE_SPICY) || 'mild';
      return val;
    } catch {
      return 'mild';
    }
  }
  function spicyLabel(val) {
    if (val === 'mild') return 'น้อย';
    if (val === 'medium') return 'ปานกลาง';
    if (val === 'hot') return 'มาก';
    return '';
  }

  // Event Listeners
  openSummaryBtn.addEventListener('click', openSummary);
  closeModalBtns.forEach(btn => btn.addEventListener('click', closeSummary));
  spicyInputs.forEach(input => input.addEventListener('change', (e) => saveSpicy(e.target.value)));

  // Init
  initSpicy();
  updateSummaryBar();
})();