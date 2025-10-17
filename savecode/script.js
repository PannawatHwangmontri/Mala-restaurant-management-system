// script.js - ลบ Logic ความเผ็ดออก
(() => {
  // Local Storage Keys
  const STORAGE_KEY = 'mala_cart_v1';
  // ✅ ลบ: const STORAGE_SPICY = 'mala_spicy_v1';
  const ORDERS_STORAGE_KEY = 'mala_all_orders_v1';
  const LAST_ORDER_ID_KEY = 'mala_last_order_id';


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
  // ✅ ลบ: const spicyDisplayChip = document.querySelector('.selected-spicy-display .spicy-chip');


  // ลบ: const spicyInputs = Array.from(document.querySelectorAll('input[name="spicy"]'));
  const itemNodes = Array.from(document.querySelectorAll('.item'));

  // เตรียมข้อมูลรายการสินค้า (Item Data Structure)
  const itemData = itemNodes.map(node => ({
    id: node.dataset.id,
    name: node.dataset.name,
    price: parseInt(node.dataset.price),
  }));

  // สร้าง UI object สำหรับการอ้างอิงง่าย (Item UI Map)
  const itemUI = itemNodes.map(node => {
    const item = itemData.find(i => i.id === node.dataset.id);
    return {
      ...item,
      qtyInput: node.querySelector('.qty-input'),
      minusBtn: node.querySelector('.btn-minus'),
      plusBtn: node.querySelector('.btn-plus'),
      node: node, // เก็บ Node ไว้ในกรณีที่ต้องการใช้
    };
  });

  // ตะกร้าสินค้า (Cart State)
  let cart = loadCart();

  // ----------------------------------------
  // Local Storage Helpers
  // ----------------------------------------

  function loadCart() {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      const map = new Map(savedCart ? JSON.parse(savedCart) : []);
      if (map.size > 0) {
        orderBar.classList.add('order-bar--active');
      } else {
        orderBar.classList.remove('order-bar--active');
      }
      return map;
    } catch (e) {
      console.error("Error loading cart from localStorage", e);
      return new Map();
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cart.entries())));
    } catch (e) {
      console.error("Error saving cart to localStorage", e);
    }
  }

  function clearCart() {
    cart.clear();
    saveCart();
    updateUI();
  }

  // ✅ ลบ: getSpicy, saveSpicy

  // ฟังก์ชัน: สร้าง Order ID ใหม่
  function getNextOrderId() {
    let lastId = parseInt(localStorage.getItem(LAST_ORDER_ID_KEY) || '0');
    lastId += 1;
    localStorage.setItem(LAST_ORDER_ID_KEY, lastId.toString());
    return lastId;
  }
  
  // ฟังก์ชัน: โหลดออเดอร์ทั้งหมด
  function loadAllOrders() {
    try {
        const savedOrdersJSON = localStorage.getItem(ORDERS_STORAGE_KEY);
        return savedOrdersJSON ? JSON.parse(savedOrdersJSON) : [];
    } catch (e) {
        console.error("Error loading all orders from localStorage", e);
        return [];
    }
  }

  // ฟังก์ชัน: บันทึกออเดอร์ใหม่ลง Local Storage
  function saveOrderToLocalStorage(order) {
    let allOrders = loadAllOrders(); // โหลดทั้งหมดที่มีอยู่
    allOrders.push(order); // เพิ่มออเดอร์ใหม่
    try {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(allOrders)); // บันทึกกลับ
    } catch (e) {
        console.error("Error saving new order to localStorage", e);
    }
  }

  // ----------------------------------------
  // UI Updates
  // ----------------------------------------

  function updateItemQty(itemId, change) {
    const item = itemData.find(i => i.id === itemId);
    if (!item) return;

    let currentQty = cart.get(itemId)?.qty || 0;
    let newQty = currentQty + change;

    if (newQty < 0) newQty = 0;

    if (newQty === 0) {
      cart.delete(itemId);
    } else {
      cart.set(itemId, { ...item, qty: newQty });
    }

    saveCart();
    updateUI();
  }

  function updateUI() {
    let totalCount = 0;
    let totalPrice = 0;

    // 1. อัพเดท Input และ Status ของแต่ละรายการ
    itemUI.forEach(item => {
      const cartItem = cart.get(item.id);
      const qty = cartItem ? cartItem.qty : 0;
      
      item.qtyInput.value = qty;
      item.node.classList.toggle('item--selected', qty > 0);

      totalCount += qty;
      totalPrice += qty * item.price;
    });

    // 2. อัพเดทแถบสรุปด้านล่าง (Order Bar)
    orderCountEl.textContent = totalCount;
    orderTotalEl.textContent = totalPrice.toLocaleString('th-TH');

    // 3. ควบคุมการแสดงผล Order Bar
    if (totalCount > 0) {
      orderBar.classList.add('order-bar--active');
      openSummaryBtn.disabled = false;
    } else {
      orderBar.classList.remove('order-bar--active');
      openSummaryBtn.disabled = true;
    }
  }

  // ✅ ลบ: updateSpicyUI

  function updateModalSummary() {
    summaryList.innerHTML = ''; // Clear previous list

    let totalCount = 0;
    let totalPrice = 0;

    Array.from(cart.values()).forEach(item => {
      const row = rowTemplate.content.cloneNode(true);
      const total = item.qty * item.price;

      row.querySelector('.td-menu').textContent = item.name;
      row.querySelector('.td-qty').textContent = item.qty;
      row.querySelector('.td-price-per-unit').textContent = item.price.toLocaleString('th-TH');
      row.querySelector('.td-total-price').textContent = total.toLocaleString('th-TH');
      
      const removeBtn = row.querySelector('.btn-remove-item');
      if (removeBtn) {
          removeBtn.addEventListener('click', () => {
              cart.delete(item.id);
              saveCart();
              updateUI();
              updateModalSummary(); // อัพเดท Modal ใหม่
              if (cart.size === 0) {
                  modal.style.display = 'none'; // ปิด Modal ถ้าตะกร้าว่าง
              }
          });
      }

      summaryList.appendChild(row);

      totalCount += item.qty;
      totalPrice += total;
    });

    modalCountEl.textContent = totalCount;
    modalTotalEl.textContent = totalPrice.toLocaleString('th-TH');
  }


  // ----------------------------------------
  // Core Logic: Cart Manipulation and Order Submission
  // ----------------------------------------
  
  // ฟังก์ชัน: ส่งออเดอร์ (บันทึก Local Storage)
  async function placeOrder() {
    placeOrderBtn.disabled = true;

    if (cart.size === 0) {
      alert('ตะกร้าว่างเปล่า! กรุณาเลือกรายการสินค้าก่อน');
      placeOrderBtn.disabled = false;
      return;
    }

    // เตรียมข้อมูลออเดอร์
    const orderItems = Array.from(cart.values()).map(item => ({
      name: item.name,
      qty: item.qty,
      price: item.price,
      total: item.qty * item.price,
      id: item.id
    }));
    
    const totalCount = orderItems.reduce((acc, item) => acc + item.qty, 0);
    const totalPrice = orderItems.reduce((acc, item) => acc + item.total, 0);

    const newOrderId = getNextOrderId(); // ใช้งานฟังก์ชันสร้าง ID ใหม่

    const orderData = {
      id: newOrderId,
      orderDate: new Date().toISOString(),
      status: 'pending',
      // ✅ ลบ: spicyLevel: getSpicy(),
      items: orderItems,
      totalCount: totalCount,
      totalPrice: totalPrice,
    };
    
    try {
        saveOrderToLocalStorage(orderData); // บันทึกออเดอร์ใหม่ลง Local Storage
        
        // เมื่อส่งสำเร็จ:
        clearCart();
        modal.style.display = 'none';
        
        alert(`✅ ส่งออเดอร์สำเร็จ! หมายเลข: ${String(newOrderId).padStart(4, '0')}\nกรุณารอรับออเดอร์`);
        
    } catch (error) {
      console.error('Error submitting order to Local Storage:', error);

      alert('❌ ไม่สามารถส่งออเดอร์ได้: ปัญหาในการบันทึกข้อมูลลง Local Storage');
      placeOrderBtn.disabled = false;
    }
  }

  // ----------------------------------------
  // Initialization
  // ----------------------------------------

  // Add event listeners
 itemUI.forEach(item => {
  item.minusBtn.addEventListener('click', () => updateItemQty(item.id, -1));
  item.plusBtn.addEventListener('click', () => updateItemQty(item.id, 1));
});

openSummaryBtn.addEventListener('click', () => {
  if (cart.size > 0) {
      updateModalSummary();
      // ✅ ลบ: updateSpicyUI(getSpicy());
      modal.style.display = 'flex'; 
  } else {
      alert('กรุณาเลือกรายการสินค้าก่อนดูสรุปออเดอร์');
  }
});

closeModalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
});

// ให้ Modal ปิดเมื่อคลิกนอก Modal (ถ้าต้องการ)
window.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.style.display = 'none';
  }
});

placeOrderBtn.addEventListener('click', placeOrder);

// โหลดข้อมูลเริ่มต้นและอัพเดท UI
// ✅ ลบ: const initialSpicyLevel = getSpicy();
// ✅ ลบ: updateSpicyUI(initialSpicyLevel);
updateUI();
})();