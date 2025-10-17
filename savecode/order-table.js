(() => {
    const API_ENDPOINT = 'http://localhost:3000/api/orders'; 
    
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
    const noOrdersMessage = document.getElementById('noOrdersMessage');

    let allOrders = [];
    let currentOrder = null;

    async function loadOrders() {
        try {
            const response = await fetch(API_ENDPOINT); 
            if (!response.ok) {
                throw new Error(`Failed to fetch orders, status: ${response.status}`);
            }
            
            const orders = await response.json();
            
            orders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date)); 
            return orders; 
        } catch (error) {
            console.error('Error loading orders from API:', error);
            noOrdersMessage.style.display = 'block';
            noOrdersMessage.textContent = '❌ ไม่สามารถเชื่อมต่อฐานข้อมูลได้ หรือไม่มีออเดอร์';
            return [];
        }
    }
    
    function spicyLabel(val) {
        if (val === 'mild') return 'น้อย';
        if (val === 'medium') return 'ปานกลาง';
        if (val === 'hot') return 'มาก';
        return '';
    }
    
    function spicyChipClass(val) {
        if (val === 'mild') return 'spicy-chip--mild';
        if (val === 'medium') return 'spicy-chip--medium';
        if (val === 'hot') return 'spicy-chip--hot';
        return '';
    }

    function statusChipClass(val) {
        if (val === 'pending') return 'status-chip--pending';
        if (val === 'confirmed') return 'status-chip--confirmed';
        if (val === 'cancelled') return 'status-chip--cancelled';
        if (val === 'completed') return 'status-chip--completed';
        return '';
    }
    
    function statusLabel(val) {
        if (val === 'pending') return 'รอรับออเดอร์';
        if (val === 'confirmed') return 'กำลังทำ';
        if (val === 'cancelled') return 'ยกเลิกแล้ว';
        if (val === 'completed') return 'เสร็จสิ้น';
        return '';
    }

    function formatDateTime(isoString) {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            return { date: 'N/A', time: 'N/A' };
        }
        
        const dateOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: false };
        
        return {
            date: date.toLocaleDateString('th-TH', dateOptions),
            time: date.toLocaleTimeString('th-TH', timeOptions)
        };
    }
    
    async function renderOrderList(selectId = null) {
        allOrders = await loadOrders(); 
        
        orderListBody.innerHTML = '';
        orderDetailPanel.classList.remove('is-active'); 
        currentOrder = null;
        
        if (allOrders.length === 0) {
            noOrdersMessage.style.display = 'block';
            noOrdersMessage.textContent = '✅ ไม่มีรายการออเดอร์ที่รอการจัดการ';
            updateActionButtons(null);
            return;
        }

        noOrdersMessage.style.display = 'none';

        let initialSelectId = selectId || allOrders.find(o => o.status === 'pending')?.id;
        if (!initialSelectId && allOrders.length > 0) {
            initialSelectId = allOrders[0].id;
        }
        
        allOrders.forEach(order => {
            const row = orderListRowTemplate.content.cloneNode(true);
            const rowNode = row.querySelector('.order-row');
            const { date, time } = formatDateTime(order.order_date);
            const orderIdDisplay = order.order_id || order.id.toString().slice(-4);
            
            rowNode.dataset.id = order.id;
            
            row.querySelector('.td-id').textContent = orderIdDisplay;
            row.querySelector('.td-datetime').textContent = `${date} ${time}`;
            row.querySelector('.td-spicy').innerHTML = `<span class="spicy-chip ${spicyChipClass(order.spicy_level)}">${spicyLabel(order.spicy_level)}</span>`;
            row.querySelector('.td-total').textContent = order.total_price.toLocaleString();
            
            // สถานะ
            const statusEl = row.querySelector('.td-status');
            statusEl.innerHTML = `<span class="status-chip ${statusChipClass(order.status)}">${statusLabel(order.status)}</span>`;

            // ปุ่มลบ
            const deleteBtn = row.querySelector('.btn--delete');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // หยุดการเลือกแถว
                deleteOrder(order.id, orderIdDisplay);
            });
            
            // กำหนดสถานะที่ถูกเลือก
            if (order.id === initialSelectId) {
                rowNode.classList.add('active');
                selectOrder(order.id);
            }
            
            rowNode.addEventListener('click', () => {
                // ยกเลิกการเลือกแถวเดิม
                document.querySelectorAll('.order-row').forEach(r => r.classList.remove('active'));
                rowNode.classList.add('active');
                selectOrder(order.id);
            });
            
            orderListBody.appendChild(row);
        });
    }

    function selectOrder(orderId) {
        currentOrder = allOrders.find(o => o.id === orderId);
        
        if (currentOrder) {
            renderOrderDetail(currentOrder);
            orderDetailPanel.classList.add('is-active'); 
        } else {
            orderDetailPanel.classList.remove('is-active'); 
        }
    }

    function renderOrderDetail(order) {
        const { date, time } = formatDateTime(order.order_date);
        const orderIdDisplay = order.order_id || order.id.toString().slice(-4);

        orderIdTitle.textContent = `รายละเอียดออเดอร์ #${orderIdDisplay}`;
        orderMetaDate.textContent = date;
        orderMetaTime.textContent = time;

        // รายการสินค้า
        orderItemsBody.innerHTML = '';
        order.items.forEach(item => {
            const row = orderRowTemplate.content.cloneNode(true);
            row.querySelector('.td-menu-detail').textContent = item.name;
            row.querySelector('.td-qty-detail').textContent = `${item.qty} ไม้`;
            row.querySelector('.td-price-detail').textContent = `${item.price} บาท`;
            row.querySelector('.td-total-detail').textContent = (item.qty * item.price).toLocaleString();
            orderItemsBody.appendChild(row);
        });

        // สรุป
        orderSpicyChip.textContent = spicyLabel(order.spicy_level);
        orderSpicyChip.className = `spicy-chip ${spicyChipClass(order.spicy_level)}`;
        orderTotalCount.textContent = order.total_qty;
        orderTotalPrice.textContent = order.total_price.toLocaleString();
        
        updateActionButtons(order);
    }
    
    function updateActionButtons(order) {
        // ปิดปุ่มทั้งหมดก่อน
        btnCancel.disabled = true;
        btnConfirm.disabled = true;
        btnComplete.disabled = true;

        if (!order) return;
        
        // เปิดปุ่มตามสถานะปัจจุบัน
        if (order.status === 'pending') {
            btnCancel.disabled = false;
            btnConfirm.disabled = false;
        } else if (order.status === 'confirmed') {
            btnCancel.disabled = false;
            btnComplete.disabled = false;
        } 
        // ออเดอร์ที่ยกเลิกแล้ว ('cancelled') หรือเสร็จสิ้นแล้ว ('completed') ไม่ต้องเปิดปุ่มใดๆ
    }

    async function deleteOrder(orderId, orderIdDisplay) {
        if (confirm(`คุณต้องการลบออเดอร์ที่ ${orderIdDisplay} อย่างถาวรใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
            try {
                const response = await fetch(`${API_ENDPOINT}/${orderId}`, {
                    method: 'DELETE', 
                });

                if (!response.ok) {
                    throw new Error(`Failed to delete order, status: ${response.status}`);
                }
                
                alert(`ออเดอร์ที่ ${orderIdDisplay} ถูกลบเรียบร้อย`);
                renderOrderList();
            } catch (error) {
                console.error('Error deleting order:', error);
                alert('❌ เกิดข้อผิดพลาดในการลบออเดอร์');
                renderOrderList(currentOrder?.id);
            }
        }
    }

    async function handleActionButtonClick(newStatus, actionLabel) {
        if (!currentOrder) return;
        const orderId = currentOrder.order_id || currentOrder.id.toString().slice(-4);
        
        if (confirm(`คุณต้องการ${actionLabel}ออเดอร์ที่ ${orderId} ใช่หรือไม่?`)) {
            try {
                updateActionButtons(null); 
                
                const response = await fetch(`${API_ENDPOINT}/${currentOrder.id}/status`, {
                    method: 'PATCH', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) {
                    throw new Error(`Failed to update status, status: ${response.status}`);
                }
                
                alert(`ออเดอร์ที่ ${orderId} ถูก${actionLabel}เรียบร้อย`);
                
                renderOrderList(); 

            } catch (error) {
                console.error('Error updating order status:', error);
                alert('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ');
                renderOrderList(currentOrder.id); 
            }
        }
    }

    btnCancel.addEventListener('click', () => handleActionButtonClick('cancelled', 'ยกเลิก'));
    btnConfirm.addEventListener('click', () => handleActionButtonClick('confirmed', 'รับออเดอร์'));
    btnComplete.addEventListener('click', () => handleActionButtonClick('completed', 'เสร็จสิ้น'));

    renderOrderList();
})();