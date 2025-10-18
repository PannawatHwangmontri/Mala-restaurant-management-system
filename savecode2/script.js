// script.js - ปรับปรุงให้โหลดรายการเมนูจาก Local Storage และใช้ Base64 สำหรับรูปภาพ
(() => {
  // Local Storage Keys
  const STORAGE_KEY = 'mala_cart_v1';
  const ORDERS_STORAGE_KEY = 'mala_all_orders_v1';
  const LAST_ORDER_ID_KEY = 'mala_last_order_id';
  // คีย์สำหรับรายการเมนูที่ดึงมาจากหน้าจัดการสินค้า
  const PRODUCTS_STORAGE_KEY = 'mala_menu_items'; 


  // ----------------------------------------
  // Elements
  // ----------------------------------------
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
  
  // ✅ Element ใหม่สำหรับ Spicy Level Form และ Note
  const spicyLevelForm = document.getElementById('spicyLevelForm'); 
  const orderNoteEl = document.getElementById('orderNote');
  
  // Element สำหรับ Menu Dynamic Generation
  const menuCategoryContainer = document.getElementById('menuCategoryContainer');
  const categoryTemplate = document.getElementById('categoryTemplate');
  const itemTemplate = document.getElementById('itemTemplate');

  // ----------------------------------------
  // Data State
  // ----------------------------------------
  
  // โครงสร้างเมนูที่ดึงมาจาก Local Storage
  let MENU_ITEMS = []; 
  
  // แผนที่เก็บข้อมูลสินค้าใน UI: { sku: { name, price, plusBtn, minusBtn, qtyEl } }
  let itemUI = new Map(); 

  // แผนที่เก็บตะกร้าสินค้า: { sku: qty }
  let cart = new Map(); 

  // ----------------------------------------
  // 1. Menu Initialization and Rendering
  // ----------------------------------------
  
  /** ข้อมูลเมนูเริ่มต้น (ใช้ Base64 ว่างแทน URL) */
  const defaultMenuItems = [
    { id: 'sku-lukchin', name: 'ลูกชิ้น', category: 'cat-fresh', price: 5, imageBase64: '' }, 
    { id: 'sku-pakkad', name: 'ผักกาดขาว', category: 'cat-veggie', price: 7, imageBase64: '' },
    { id: 'sku-muk', name: 'ปลาหมึกกรอบ', category: 'cat-fresh', price: 10, imageBase64: '' },
    { id: 'sku-moo', name: 'เนื้อหมู', category: 'cat-meat', price: 15, imageBase64: '' }
  ];

  /** โหลดรายการเมนูจาก Local Storage หรือใช้ค่า Default */
  const loadMenuItems = () => {
    try {
        const storedItems = localStorage.getItem(PRODUCTS_STORAGE_KEY);
        if (storedItems) {
            MENU_ITEMS = JSON.parse(storedItems);
        } else {
            // ถ้า Local Storage ว่าง ให้ใช้รายการเริ่มต้นและบันทึกไว้
            MENU_ITEMS = defaultMenuItems;
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(MENU_ITEMS));
        }
        
        // จัดกลุ่มสินค้าตามหมวดหมู่
        const groupedMenu = MENU_ITEMS.reduce((acc, item) => {
            if (!acc[item.category]) {
                acc[item.category] = [];
            }
            acc[item.category].push(item);
            return acc;
        }, {});
        return groupedMenu;

    } catch (e) {
        console.error("Error loading menu items:", e);
        return {}; // คืนค่าว่างถ้าเกิดข้อผิดพลาด
    }
  };

  /** แปลง category ID เป็นชื่อที่ใช้แสดงผล */
  const getCategoryTitle = (categoryId) => {
    switch (categoryId) {
        case 'cat-fresh': return 'หมวดของสด';
        case 'cat-meat': return 'หมวดเนื้อสัตว์';
        case 'cat-veggie': return 'หมวดผัก';
        case 'cat-other': return 'หมวดอื่นๆ';
        default: return 'ไม่ระบุหมวดหมู่';
    }
  };

  /** สร้าง UI ของเมนูทั้งหมด */
  const renderMenuUI = (groupedMenu) => {
    menuCategoryContainer.innerHTML = ''; // ล้างเมนูเดิม
    itemUI.clear(); // ล้างข้อมูล UI เดิม

    // เรียงลำดับหมวดหมู่
    const sortedCategories = Object.keys(groupedMenu).sort();
    
    sortedCategories.forEach(categoryKey => {
        const categoryItems = groupedMenu[categoryKey];
        if (categoryItems.length === 0) return;

        // 1. สร้างโครงสร้างหมวดหมู่
        const catNode = categoryTemplate.content.cloneNode(true);
        const catSection = catNode.querySelector('.category');
        const catTitleEl = catNode.querySelector('.category-title');
        const itemListEl = catNode.querySelector('.item-list');
        
        catTitleEl.textContent = getCategoryTitle(categoryKey);
        catSection.setAttribute('aria-labelledby', categoryKey + '-title');
        catTitleEl.id = categoryKey + '-title';

        // 2. สร้างรายการสินค้าในหมวดหมู่
        categoryItems.forEach(item => {
            const itemNode = itemTemplate.content.cloneNode(true);
            const itemLi = itemNode.querySelector('.item');
            
            // ใช้ class ใหม่: item-name, item-price
            itemNode.querySelector('.item-name').textContent = item.name;
            itemNode.querySelector('.item-price').textContent = `${item.price} บาท`;
            itemNode.querySelector('.item-thumb').src = item.imageBase64 || 'images/default.png'; // ใช้รูปภาพจาก Base64

            // ✅ ดึงปุ่มและตัวนับจำนวนตาม class ใหม่
            const plusBtn = itemNode.querySelector('.btn-plus');
            const minusBtn = itemNode.querySelector('.btn-minus');
            const qtyEl = itemNode.querySelector('.item-qty-count');

            // กำหนด ID ให้กับ Element หลักเพื่อใช้ในการอ้างอิง
            itemLi.dataset.id = item.id;
            plusBtn.dataset.id = item.id;
            minusBtn.dataset.id = item.id;

            // บันทึกข้อมูล UI
            itemUI.set(item.id, {
                id: item.id,
                name: item.name,
                price: item.price,
                plusBtn: plusBtn,
                minusBtn: minusBtn,
                qtyEl: qtyEl
            });

            itemListEl.appendChild(itemNode);
        });

        menuCategoryContainer.appendChild(catNode);
    });
    
    // 3. ผูก Event Listener (ใช้ Event Delegation)
    document.querySelector('.menu-category').addEventListener('click', handleQuantityControl);
  };

  // ----------------------------------------
  // 2. Cart Management
  // ----------------------------------------

  /** โหลดตะกร้าจาก Local Storage */
  const loadCart = () => {
    try {
      const savedCart = localStorage.getItem(STORAGE_KEY);
      if (savedCart) {
        // แปลง JSON string กลับเป็น Map
        cart = new Map(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error("Error loading cart:", e);
      cart = new Map();
    }
  };

  /** บันทึกตะกร้าลง Local Storage */
  const saveCart = () => {
    try {
      // แปลง Map เป็น Array ก่อนบันทึกเป็น JSON string
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(cart.entries())));
    } catch (e) {
      console.error("Error saving cart:", e);
    }
  };
  
  /** ล้างตะกร้า */
  const clearCart = () => {
      // 1. ล้างข้อมูลใน Map และ Local Storage
      cart.clear();
      saveCart();

      // 2. อัปเดต UI ของทุกรายการในเมนูให้เป็น 0
      itemUI.forEach(item => {
          updateItemUI(item.id, 0);
      });

      // 3. อัปเดต Order Bar
      updateOrderBarUI();
  };

  /** อัปเดต UI ของสินค้า 1 ชิ้น */
  const updateItemUI = (id, newQty) => {
    const item = itemUI.get(id);
    if (!item) return;

    item.qtyEl.textContent = newQty;

    // เปิด/ปิดปุ่มตามจำนวน
    item.minusBtn.disabled = newQty === 0;
  };

  /** อัปเดต UI ของ Order Bar และปุ่ม "สรุปออเดอร์" */
  const updateOrderBarUI = () => {
    let totalItems = 0;
    let totalPrice = 0;

    cart.forEach((qty, id) => {
      const item = itemUI.get(id);
      if (item) {
        totalItems += qty;
        totalPrice += qty * item.price;
      }
    });

    orderCountEl.textContent = totalItems;
    orderTotalEl.textContent = totalPrice;
    
    // เปิดใช้งานปุ่ม "สรุปออเดอร์" ถ้ามีสินค้าในตะกร้า
    openSummaryBtn.disabled = totalItems === 0;
  };
  
  /** จัดการการเพิ่ม/ลดจำนวนสินค้า */
  const handleQuantityControl = (e) => {
    // ใช้ .closest เพื่อให้แน่ใจว่าคลิกที่ปุ่มที่มี class 'btn-qty'
    const target = e.target.closest('.btn-qty');
    if (!target) return;

    const id = target.dataset.id;
    const action = target.dataset.action;
    let currentQty = cart.get(id) || 0;

    if (action === 'plus') {
      currentQty += 1;
    } else if (action === 'minus') {
      currentQty -= 1;
    }

    if (currentQty > 0) {
      cart.set(id, currentQty);
    } else {
      cart.delete(id); // ลบออกจากตะกร้าถ้าเป็น 0
    }

    // 1. อัปเดต UI ของ Item นั้น
    updateItemUI(id, currentQty);
    
    // 2. อัปเดต UI ของ Order Bar และบันทึก
    updateOrderBarUI();
    saveCart();
  };

  /** อัปเดตรายการสินค้าใน Modal Summary */
  const updateModalSummary = () => {
    summaryList.innerHTML = '';
    let modalTotalItems = 0;
    let modalTotalPrice = 0;
    
    // ✅ ล้างค่า Spicy Level และ Note เดิมทุกครั้งที่เปิด Modal
    spicyLevelForm.reset();
    orderNoteEl.value = '';

    cart.forEach((qty, id) => {
      const item = itemUI.get(id);
      if (item) {
        const total = qty * item.price;
        modalTotalItems += qty;
        modalTotalPrice += total;

        const rowNode = rowTemplate.content.cloneNode(true);
        rowNode.querySelector('.summary-name').textContent = item.name;
        rowNode.querySelector('.summary-qty').textContent = `${qty} ไม้`;
        rowNode.querySelector('.summary-total').textContent = `${total} บ.`;
        summaryList.appendChild(rowNode);
      }
    });

    modalCountEl.textContent = modalTotalItems;
    modalTotalEl.textContent = modalTotalPrice;
    
    // อัปเดต Footer ของ Modal ด้วย
    document.querySelector('.popup__footer #modalCount').textContent = modalTotalItems;
    document.querySelector('.popup__footer #modalTotal').textContent = modalTotalPrice;
  };
  
  // ----------------------------------------
  // 3. Order Submission
  // ----------------------------------------
  
  /** สร้าง ID ออเดอร์ใหม่โดยการเพิ่มจากค่าล่าสุดใน Local Storage */
  const generateNewOrderId = () => {
      let lastId = parseInt(localStorage.getItem(LAST_ORDER_ID_KEY) || '0', 10);
      lastId += 1;
      localStorage.setItem(LAST_ORDER_ID_KEY, lastId);
      return lastId;
  };

  /** บันทึกออเดอร์ใหม่ลง Local Storage */
  const saveOrderToLocalStorage = (newOrder) => {
      try {
          const savedOrdersJSON = localStorage.getItem(ORDERS_STORAGE_KEY);
          let allOrders = savedOrdersJSON ? JSON.parse(savedOrdersJSON) : [];
          
          allOrders.push(newOrder);
          
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(allOrders));
      } catch (e) {
          console.error("Error saving new order to localStorage", e);
          throw new Error("ไม่สามารถบันทึกออเดอร์ได้");
      }
  };


  /** จัดการการสั่งอาหาร (Place Order) */
  const placeOrder = () => {
    if (cart.size === 0) {
      alert('⚠️ กรุณาเลือกสินค้าก่อนสั่งอาหาร!');
      return;
    }

    try {
      // 1. ดึงข้อมูลที่จำเป็น
      const now = new Date();
      const orderItems = Array.from(cart).map(([id, qty]) => {
        const item = itemUI.get(id);
        return {
          id: id,
          name: item.name,
          price: item.price,
          qty: qty,
          total: item.price * qty,
        };
      });

      // 🎯 ดึงระดับความเผ็ดและหมายเหตุ
      const selectedSpicyLevelEl = spicyLevelForm.querySelector('input[name="spicy"]:checked');
      const spicyLevel = selectedSpicyLevelEl ? selectedSpicyLevelEl.value : '0'; // ค่าเริ่มต้นคือ 0 (ไม่เผ็ด)
      const note = orderNoteEl.value.trim();

      const totalItems = Array.from(cart.values()).reduce((sum, qty) => sum + qty, 0);
      const totalPrice = orderItems.reduce((sum, item) => sum + item.total, 0);

      // 2. สร้าง Object ออเดอร์
      const newOrder = {
        id: generateNewOrderId(), // สร้าง ID ใหม่
        orderDate: now.toISOString().split('T')[0],
        orderTime: now.toTimeString().split(' ')[0].substring(0, 5),
        items: orderItems,
        totalItems: totalItems, 
        totalPrice: totalPrice, 
        status: 'pending', // สถานะเริ่มต้น
        spicyLevel: spicyLevel, // ✅ เพิ่มระดับความเผ็ด
        note: note, // ✅ เพิ่มหมายเหตุ
        timestamp: now.getTime(),
      };

      // 3. บันทึก/ส่งออเดอร์
      saveOrderToLocalStorage(newOrder);

      // 4. ล้างตะกร้าและปิด Modal
      clearCart();
      modal.style.display = 'none';

      // 5. แสดงข้อความแจ้งเตือน (ตามรูปภาพ)
      // ระดับความเผ็ดที่แสดงใน Alert
      const spicyText = {
        '0': 'ไม่เผ็ด',
        '1': 'เผ็ดน้อย',
        '2': 'เผ็ดกลาง',
        '3': 'เผ็ดมาก'
      };
      
      const newOrderId = newOrder.id;
      // 🎯 แสดง Alert Pop-up ที่มีรายละเอียดครบถ้วน
      alert(
        `✅ สั่งอาหารสำเร็จ\n\n` +
        `หมายเลขออเดอร์: #${String(newOrderId).padStart(4, '0')}\n` +
        `จำนวนไม้รวม: ${totalItems} ไม้\n` +
        `ราคารวม: ${totalPrice} บาท\n` +
        `ระดับความเผ็ด: ${spicyText[spicyLevel]}\n` +
        `หมายเหตุ: ${note || '-'}\n\n` +
        `ออเดอร์ของคุณกำลังถูกดำเนินการ`
      );

    } catch (e) {
      console.error("Error placing order:", e);
      alert('❌ สั่งซื้อไม่สำเร็จ: ' + e.message);
    }
  };


  // ----------------------------------------
  // 4. Initialization
  // ----------------------------------------

  const initialize = () => {
    // 1. โหลดข้อมูลเมนู
    const groupedMenu = loadMenuItems();
    
    // 2. สร้าง UI เมนู
    renderMenuUI(groupedMenu);

    // 3. โหลดตะกร้า
    loadCart();

    // 4. อัปเดต UI ของ Qty และ Order Bar
    // ใช้ Map เพื่อตรวจสอบว่าสินค้าที่อยู่ใน Cart ยังมีอยู่ใน Menu หรือไม่
    const newCart = new Map();
    cart.forEach((qty, id) => {
        const item = itemUI.get(id);
        if (item) {
            updateItemUI(id, qty); // อัปเดต Qty ใน UI
            newCart.set(id, qty);
        }
    });
    cart = newCart; // อัปเดต Cart ให้เหลือเฉพาะสินค้าที่มีอยู่ใน Menu

    updateOrderBarUI();


    // Add Event Listeners สำหรับ Modal/Order Submission
    openSummaryBtn.addEventListener('click', () => {
      if (cart.size > 0) {
          updateModalSummary();
          modal.style.display = 'flex';
      }
    });

    closeModalBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });
    
    placeOrderBtn.addEventListener('click', placeOrder);

    // ปิด Modal เมื่อคลิกนอก Modal
    window.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
    
  };

  initialize();

})();