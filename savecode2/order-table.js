// order-table.js - แก้ไขเพื่อใช้ Local Storage ในการจัดการข้อมูลออเดอร์
(() => {
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
    
    // ✅ เพิ่ม Element ใหม่สำหรับแสดงหมายเหตุ
    const orderNoteDisplay = document.getElementById('orderNoteDisplay');
    
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
            // แปลง Date/Time
            row.querySelector('.td-datetime').textContent = `${order.orderDate || '--'} ${order.orderTime || '--'}`;
            // ใช้ totalItems แทน totalCount ที่ไม่ได้มีในโครงสร้างออเดอร์ที่สร้างใหม่
            row.querySelector('.td-qty').textContent = order.totalItems || 0; 
            row.querySelector('.td-price').textContent = order.totalPrice.toFixed(0); 
            
            const statusSpan = row.querySelector('.td-status span');
            const statusText = getStatusText(order.status);
            statusSpan.textContent = statusText;
            statusSpan.className = `status-${order.status}`;
            
            // ผูก Event Listener
            row.addEventListener('click', () => selectOrder(order.id));

            orderListBody.appendChild(row);
        });
    }

    function getStatusText(status) {
        switch (status) {
            case 'pending': return 'รอรับ';
            case 'confirmed': return 'กำลังทำ';
            case 'completed': return 'เสร็จสิ้น';
            case 'cancelled': return 'ยกเลิก';
            default: return 'ไม่ทราบ';
        }
    }

    function updateStatusCount() {
        const counts = allOrders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            acc['all'] = (acc['all'] || 0) + 1;
            return acc;
        }, {});

        statusButtons.forEach(btn => {
            const status = btn.dataset.status;
            const countEl = btn.querySelector('.status-count');
            countEl.textContent = counts[status] || 0;
        });
    }

    function filterOrders(status) {
        currentFilterStatus = status;
        
        // อัปเดต Active State ของปุ่ม
        statusButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.status === status) {
                btn.classList.add('active');
            }
        });

        let filteredOrders = allOrders;
        if (status !== 'all') {
            filteredOrders = allOrders.filter(order => order.status === status);
        }
        
        renderOrderList(filteredOrders);
    }

    function selectOrder(orderId) {
        const order = allOrders.find(o => o.id === orderId);
        if (order) {
            currentOrder = order;
            renderOrderDetail(order);
            
            // ลบ class 'selected' ออกจากแถวทั้งหมด
            document.querySelectorAll('.order-row').forEach(row => row.classList.remove('selected'));
            // เพิ่ม class 'selected' ให้กับแถวที่ถูกเลือก
            document.querySelector(`.order-row[data-id="${orderId}"]`).classList.add('selected');
        }
    }

    // ----------------------------------------
    // Order Detail Management
    // ----------------------------------------

    function clearOrderDetail() {
        currentOrder = null;
        orderDetailPanel.classList.add('empty');
        orderIdTitle.textContent = 'เลือกออเดอร์';
        orderMetaDate.textContent = '--';
        orderMetaTime.textContent = '--';
        orderSpicyChip.textContent = '';
        orderTotalCount.textContent = '0';
        orderTotalPrice.textContent = '0';
        orderItemsBody.innerHTML = '';
        orderNoteDisplay.textContent = ''; // ✅ ล้างหมายเหตุ
        updateActionButtons(null);
        document.querySelectorAll('.order-row').forEach(row => row.classList.remove('selected'));
    }

    /** แสดงรายละเอียดของออเดอร์ที่เลือก */
    const renderOrderDetail = (order) => {
        orderDetailPanel.classList.remove('empty');
        orderItemsBody.innerHTML = '';

        // 1. รายละเอียดสินค้า
        order.items.forEach(item => {
            const rowNode = orderRowTemplate.content.querySelector('.tr--item-detail').cloneNode(true);
            rowNode.querySelector('.td-menu-detail').textContent = item.name;
            rowNode.querySelector('.td-qty-detail').textContent = `${item.qty} ไม้`;
            rowNode.querySelector('.td-price-detail').textContent = `${item.price} บ.`;
            rowNode.querySelector('.td-total-detail').textContent = `${item.total} บ.`;
            orderItemsBody.appendChild(rowNode);
        });

        // 2. ข้อมูล Meta
        orderIdTitle.textContent = `ออเดอร์ #${String(order.id).padStart(4, '0')}`;
        orderMetaDate.textContent = order.orderDate || '--';
        orderMetaTime.textContent = order.orderTime || '--';
        
        // 🎯 กำหนดการแสดงผลระดับความเผ็ด
        const spicyText = {
            '0': 'ไม่เผ็ด',
            '1': 'เผ็ดน้อย',
            '2': 'เผ็ดกลาง',
            '3': 'เผ็ดมาก'
        };
        const spicyLevel = order.spicyLevel || '0'; // ป้องกันค่าว่าง
        orderSpicyChip.textContent = spicyText[spicyLevel];

        // 🎯 แสดงหมายเหตุ (ถ้ามี)
        orderNoteDisplay.textContent = order.note || 'ไม่มี';

        // 3. สรุปยอด
        orderTotalCount.textContent = order.totalItems || 0;
        orderTotalPrice.textContent = order.totalPrice.toFixed(0);

        // 4. อัปเดตปุ่ม Action
        updateActionButtons(order.status);
    };

    /** อัปเดตสถานะของปุ่ม Action ตามสถานะปัจจุบันของออเดอร์ */
    function updateActionButtons(status) {
        btnCancel.disabled = true;
        btnConfirm.disabled = true;
        btnComplete.disabled = true;

        switch (status) {
            case 'pending':
                btnCancel.disabled = false;
                btnConfirm.disabled = false;
                break;
            case 'confirmed':
                btnCancel.disabled = false;
                btnComplete.disabled = false;
                break;
            // case 'completed' / 'cancelled': ทุกปุ่มปิด
        }
    }

    /** อัปเดตสถานะใน Local Storage และ UI */
    function updateOrderStatus(orderId, newStatus) {
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            throw new Error(`Order ID ${orderId} not found in state.`);
        }

        allOrders[orderIndex].status = newStatus;
        saveAllOrdersToStorage(allOrders); // บันทึกกลับไปที่ Local Storage
        
        // อัปเดต UI
        filterOrders(currentFilterStatus); // โหลดรายการใหม่ตาม Filter
        
        // เลือกออเดอร์เดิมอีกครั้งเพื่ออัปเดตรายละเอียด
        const updatedOrder = allOrders.find(o => o.id === orderId);
        if (updatedOrder) {
            selectOrder(orderId);
        } else {
            clearOrderDetail(); // ถ้าออเดอร์หายไปจาก Filter (เช่น จาก pending ไป completed)
        }
    }

    /** จัดการการคลิกปุ่ม Action */
    function handleActionButtonClick(newStatus, actionName) {
        if (currentOrder && currentOrder.id) {
            const orderId = currentOrder.id;
            
            try {
                // อัปเดตสถานะ (ฟังก์ชันนี้มีการเรียก filterOrders และ selectOrder อยู่แล้ว)
                updateOrderStatus(orderId, newStatus);
            

            } catch (error) {
                console.error('Error updating order status:', error);
                
                let message = error.message.includes('not found')
                    ? 'ไม่พบออเดอร์ใน Local Storage'
                    : error.message;

                
                // loadOrders(); // 💡 ลบการเรียกซ้ำเพื่อป้องกัน Error ที่เกิดจากข้อมูลออเดอร์มีปัญหา
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
    clearOrderDetail(); // ล้างรายละเอียดเริ่มต้น

})();