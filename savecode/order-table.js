// order-table.js - แก้ไขเพื่อใช้ Local Storage ในการจัดการข้อมูลออเดอร์
(() => {
    // ⛔ ลบ const API_ENDPOINT = 'http://localhost:3000/api/orders'; 
    // ✅ คีย์สำหรับเก็บออเดอร์ทั้งหมด
    const ORDERS_STORAGE_KEY = 'mala_all_orders_v1';
    
    // ดึง Element ที่ต้องใช้งาน
    const orderDetailPanel = document.getElementById('orderDetailPanel');
    const orderIdTitle = document.getElementById('orderIdTitle');
    const orderMetaDate = document.querySelector('.order-meta-date');
    const orderMetaTime = document.querySelector('.order-meta-time');
    const orderItemsBody = document.getElementById('orderItemsBody');
    const orderRowTemplate = document.getElementById('orderRowTemplate');
    const orderSpicyChip = document.getElementById('orderSpicyChip');
    const orderTotalCount = document.getElementById('orderTotalCount');
    const orderTotalPrice = document.getElementById('orderTotalPrice');
    const btnCancel = document.querySelector('.btn--cancel');
    const btnConfirm = document.querySelector('.btn--confirm');
    const btnComplete = document.querySelector('.btn--complete'); 
    
    // Element สำหรับตารางรายการ
    const orderListBody = document.getElementById('orderListBody');
    const orderListRowTemplate = document.getElementById('orderListRowTemplate');
    const statusButtons = document.querySelectorAll('.nav-btn-status');

    let allOrders = []; // เก็บออเดอร์ทั้งหมดที่โหลดมาจาก Local Storage
    let currentOrder = null;
    let currentFilterStatus = 'all';

    // ----------------------------------------
    // Local Storage Helpers
    // ----------------------------------------

    // ✅ ฟังก์ชันสำหรับโหลดออเดอร์ทั้งหมดจาก Local Storage
    function loadAllOrdersFromStorage() {
        try {
            const savedOrdersJSON = localStorage.getItem(ORDERS_STORAGE_KEY);
            return savedOrdersJSON ? JSON.parse(savedOrdersJSON) : [];
        } catch (e) {
            console.error("Error loading all orders from localStorage", e);
            return [];
        }
    }

    // ✅ ฟังก์ชันสำหรับบันทึกออเดอร์ทั้งหมดกลับไปที่ Local Storage
    function saveAllOrdersToStorage(orders) {
        try {
            localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
        } catch (e) {
            console.error("Error saving all orders to localStorage", e);
        }
    }

    // ----------------------------------------
    // Order List Management
    // ----------------------------------------
    
    // ✅ แก้ไข: โหลดข้อมูลจาก Local Storage แทน API
    function loadOrders() {
        allOrders = loadAllOrdersFromStorage();
        // จัดเรียงตาม ID/วันที่ จากมากไปน้อย (ออเดอร์ใหม่สุดอยู่บน)
        allOrders.sort((a, b) => b.id - a.id); 
        filterOrders(currentFilterStatus); // แสดงออเดอร์ที่ถูกกรองตามสถานะปัจจุบัน
    }

    function renderOrderList(orders) {
        orderListBody.innerHTML = ''; // ล้างรายการเก่า
        updateStatusCount(); // อัพเดทจำนวนในปุ่ม Filter

        if (orders.length === 0) {
            orderListBody.innerHTML = '<div class="no-orders">ไม่มีออเดอร์ในสถานะนี้</div>';
            return;
        }

        orders.forEach(order => {
            const row = orderListRowTemplate.content.querySelector('.order-row').cloneNode(true);
            
            // สร้าง Element ใหม่แล้วกำหนด Attribute
            row.dataset.id = order.id;
            row.dataset.status = order.status;
            
            row.querySelector('.td-id').textContent = String(order.id).padStart(4, '0');
            // แปลง ISO Date เป็นรูปแบบที่อ่านง่าย
            const dateObj = new Date(order.orderDate);
            row.querySelector('.td-datetime').textContent = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            row.querySelector('.td-qty').textContent = order.totalCount;
            row.querySelector('.td-spicy').textContent = getSpicyText(order.spicyLevel);
            row.querySelector('.td-total').textContent = order.totalPrice.toLocaleString('th-TH');
            row.querySelector('.td-status').textContent = getStatusText(order.status);
            row.querySelector('.td-status').className = `td td-status status--${order.status}`;
            
            // Event Listener สำหรับการคลิกเลือกออเดอร์
            row.addEventListener('click', () => {
                // ล้าง selection เดิม
                document.querySelectorAll('.order-row--selected').forEach(r => r.classList.remove('order-row--selected'));
                // เลือกแถวปัจจุบัน
                row.classList.add('order-row--selected');
                selectOrder(order);
            });

            orderListBody.appendChild(row);
        });
    }

    function filterOrders(status) {
        currentFilterStatus = status;

        // อัพเดท Active Button
        document.querySelectorAll('.nav-btn-status').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) {
                btn.classList.add('active');
            }
        });

        const filteredOrders = status === 'all'
            ? allOrders
            : allOrders.filter(order => order.status === status);

        renderOrderList(filteredOrders);
    }
    
    // ✅ เพิ่ม: อัพเดทจำนวนในปุ่ม Filter
    function updateStatusCount() {
        const counts = { all: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };

        allOrders.forEach(order => {
            counts.all++;
            if (counts.hasOwnProperty(order.status)) {
                counts[order.status]++;
            }
        });

        statusButtons.forEach(btn => {
            const status = btn.dataset.status;
            // ดึง span ที่มี class status-count ภายในปุ่ม
            const countSpan = btn.querySelector('.status-count');
            if (countSpan) {
                countSpan.textContent = counts[status] || 0;
            }
        });
    }


    // ----------------------------------------
    // Order Detail Management
    // ----------------------------------------

    function selectOrder(order) {
        currentOrder = order;
        orderDetailPanel.classList.remove('order-detail-panel--placeholder');
        
        // 1. Header
        orderIdTitle.textContent = String(order.id).padStart(4, '0');
        const dateObj = new Date(order.orderDate);
        orderMetaDate.textContent = `วันที่ ${dateObj.toLocaleDateString('th-TH')}`;
        orderMetaTime.textContent = `เวลา ${dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;

        // 2. Items
        orderItemsBody.innerHTML = '';
        order.items.forEach(item => {
            const row = orderRowTemplate.content.cloneNode(true);
            row.querySelector('.td-menu-detail').textContent = item.name;
            row.querySelector('.td-qty-detail').textContent = item.qty;
            row.querySelector('.td-price-detail').textContent = item.price.toLocaleString('th-TH');
            row.querySelector('.td-total-detail').textContent = item.total.toLocaleString('th-TH');
            orderItemsBody.appendChild(row);
        });

        // 3. Footer
        orderSpicyChip.textContent = getSpicyText(order.spicyLevel);
        orderSpicyChip.className = `spicy-chip ${getSpicyClass(order.spicyLevel)}`;
        orderTotalCount.textContent = order.totalCount;
        orderTotalPrice.textContent = order.totalPrice.toLocaleString('th-TH');

        // 4. Action Buttons (เปิด/ปิดตามสถานะปัจจุบัน)
        updateActionButtons(order.status);
    }
    
    function clearOrderDetail() {
        currentOrder = null;
        orderDetailPanel.classList.add('order-detail-panel--placeholder');
        orderItemsBody.innerHTML = ''; // ล้างรายละเอียดรายการ
        
        // ปิดปุ่มทั้งหมด
        updateActionButtons('default');
        
        // ล้าง selection ในตารางรายการ
        document.querySelectorAll('.order-row--selected').forEach(r => r.classList.remove('order-row--selected'));
    }

    function updateActionButtons(status) {
        // รีเซ็ตทั้งหมด
        [btnCancel, btnConfirm, btnComplete].forEach(btn => btn.disabled = true);

        switch (status) {
            case 'pending': // รอรับ -> สามารถ ยกเลิก หรือ รับออเดอร์
                btnCancel.disabled = false;
                btnConfirm.disabled = false;
                break;
            case 'confirmed': // กำลังทำ -> สามารถ ยกเลิก หรือ เสร็จสิ้น
                btnCancel.disabled = false;
                btnComplete.disabled = false;
                break;
            case 'completed': // เสร็จสิ้น -> ทำอะไรไม่ได้
            case 'cancelled': // ยกเลิก -> ทำอะไรไม่ได้
            case 'default': // ไม่มีออเดอร์ถูกเลือก
            default:
                break;
        }
    }


    // ----------------------------------------
    // Status and Spicy Helpers
    // ----------------------------------------

    function getSpicyText(level) {
        const map = { mild: 'น้อย', medium: 'ปานกลาง', hot: 'มาก' };
        return map[level] || 'ไม่ระบุ';
    }

    function getSpicyClass(level) {
        return `chip--${level}`;
    }

    function getStatusText(status) {
        const map = { 
            pending: 'รอรับ', 
            confirmed: 'กำลังทำ', 
            completed: 'เสร็จสิ้น', 
            cancelled: 'ยกเลิก' 
        };
        return map[status] || 'ไม่ระบุ';
    }


    // ----------------------------------------
    // Action Handlers
    // ----------------------------------------

    // ✅ แก้ไข: อัพเดทสถานะใน Local Storage แทน API
    function updateOrderStatus(orderId, newStatus) {
        // 1. ค้นหาออเดอร์ใน AllOrders
        const orderIndex = allOrders.findIndex(order => order.id === orderId);

        if (orderIndex === -1) {
            throw new Error(`Order ID ${orderId} not found`);
        }
        
        // 2. อัพเดทสถานะใน Array
        allOrders[orderIndex].status = newStatus;
        
        // 3. บันทึกกลับไปที่ Local Storage
        saveAllOrdersToStorage(allOrders);

        // 4. อัพเดท UI
        // โหลดและกรองรายการใหม่ (เนื่องจากออเดอร์อาจหายไปจาก filter ปัจจุบัน)
        filterOrders(currentFilterStatus); 
        
        // อัพเดทรายละเอียด (currentOrder อาจไม่อยู่ใน filter ปัจจุบันแล้ว)
        const updatedOrder = allOrders.find(o => o.id === orderId);
        if (updatedOrder) {
            selectOrder(updatedOrder);
        } else {
            clearOrderDetail();
        }
    }

    function handleActionButtonClick(newStatus, actionName) {
        if (!currentOrder) {
            alert('กรุณาเลือกออเดอร์ที่ต้องการดำเนินการ');
            return;
        }
        
        const orderId = currentOrder.id;
        
        if (confirm(`คุณต้องการ ${actionName} ออเดอร์ #${String(orderId).padStart(4, '0')} ใช่หรือไม่?`)) {
            try {
                // เรียกใช้ฟังก์ชัน Local Storage
                updateOrderStatus(orderId, newStatus);
                alert(`✅ ${actionName} ออเดอร์ #${String(orderId).padStart(4, '0')} เรียบร้อยแล้ว`);

            } catch (error) {
                console.error('Error updating order status:', error);
                
                let message = error.message.includes('not found')
                    ? 'ไม่พบออเดอร์ใน Local Storage'
                    : error.message;

                alert('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + message); 
                loadOrders(); // โหลดใหม่เพื่อคืนสถานะเดิม
            }
        }
    }

    // Event Listeners สำหรับปุ่ม Actions
    btnCancel.addEventListener('click', () => handleActionButtonClick('cancelled', 'ยกเลิก'));
    btnConfirm.addEventListener('click', () => handleActionButtonClick('confirmed', 'รับออเดอร์'));
    btnComplete.addEventListener('click', () => handleActionButtonClick('completed', 'เสร็จสิ้น'));

    // Event Listeners สำหรับปุ่ม Filter สถานะ
    document.querySelectorAll('.nav-btn-status').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // ดึง status จาก dataset ของปุ่มที่ถูกคลิก
            filterOrders(e.currentTarget.dataset.status);
            
            // ล้างรายละเอียดออเดอร์ทุกครั้งที่เปลี่ยน Filter
            clearOrderDetail();
        });
    });

    // เริ่มโหลดข้อมูลเมื่อเปิดหน้า Order Table
    loadOrders();
    clearOrderDetail(); // แสดง Placeholder ตอนเริ่มต้น
})();